
-- Create enums
CREATE TYPE public.campaign_status AS ENUM ('pending', 'active', 'rejected');
CREATE TYPE public.event_type AS ENUM ('download', 'signup', 'purchase');
CREATE TYPE public.source_type AS ENUM ('web', 'android', 'ios');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  budget_remaining NUMERIC NOT NULL DEFAULT 0,
  price_download NUMERIC NOT NULL DEFAULT 0,
  price_signup NUMERIC NOT NULL DEFAULT 0,
  price_purchase NUMERIC NOT NULL DEFAULT 0,
  status campaign_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- API keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Campaign sources
CREATE TABLE public.campaign_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  type source_type NOT NULL DEFAULT 'web',
  url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_sources ENABLE ROW LEVEL SECURITY;

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  redirect_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Clicks
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Users tracking
CREATE TABLE public.users_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id TEXT NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users_tracking ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  external_user_id TEXT NOT NULL,
  event_type event_type NOT NULL,
  amount NUMERIC,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Transactions (billing)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Admin settings (for configurable API keys etc)
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== RLS POLICIES =====================

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users see own, admins see all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Campaigns: advertiser CRUD own, admins full access
CREATE POLICY "Advertisers can view own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers can update own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- API keys: advertiser via campaign ownership
CREATE POLICY "Advertisers can view own api keys" ON public.api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = api_keys.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all api keys" ON public.api_keys
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Campaign sources
CREATE POLICY "Advertisers can view own sources" ON public.campaign_sources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_sources.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Advertisers can insert sources" ON public.campaign_sources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_sources.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all sources" ON public.campaign_sources
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Referrals: admins manage, advertisers view own campaign referrals
CREATE POLICY "Advertisers can view own referrals" ON public.referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = referrals.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all referrals" ON public.referrals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Clicks: admins and campaign owners can view
CREATE POLICY "Advertisers can view own clicks" ON public.clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.referrals
      JOIN public.campaigns ON campaigns.id = referrals.campaign_id
      WHERE referrals.id = clicks.referral_id AND campaigns.advertiser_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage all clicks" ON public.clicks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users tracking: service role inserts, advertisers view own
CREATE POLICY "Advertisers can view own tracking" ON public.users_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = users_tracking.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all tracking" ON public.users_tracking
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Events: service role inserts, advertisers view own
CREATE POLICY "Advertisers can view own events" ON public.events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = events.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Transactions: advertisers view own
CREATE POLICY "Advertisers can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = transactions.campaign_id AND campaigns.advertiser_id = auth.uid())
  );
CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin settings: admins only
CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view settings" ON public.admin_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Insert default admin settings (dummy API keys)
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('stripe_publishable_key', 'pk_test_dummy_key_change_me', 'Stripe publishable key'),
  ('stripe_secret_key', 'sk_test_dummy_key_change_me', 'Stripe secret key (used server-side only)'),
  ('paystack_public_key', 'pk_test_dummy_key_change_me', 'Paystack public key'),
  ('paystack_secret_key', 'sk_test_dummy_key_change_me', 'Paystack secret key (used server-side only)'),
  ('platform_name', 'Karbali', 'Platform display name'),
  ('platform_url', 'https://karbali.com', 'Platform base URL');
