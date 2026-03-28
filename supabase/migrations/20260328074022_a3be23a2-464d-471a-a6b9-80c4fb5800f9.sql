-- Categories table (admin-managed)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Advertiser category selection
CREATE TABLE public.advertiser_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'waiting_list')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advertiser_id)
);
ALTER TABLE public.advertiser_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category" ON public.advertiser_categories FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Users can insert own category" ON public.advertiser_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Users can update own category" ON public.advertiser_categories FOR UPDATE TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins can manage all advertiser categories" ON public.advertiser_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  paystack_customer_code text,
  paystack_dva_account_number text,
  paystack_dva_bank_name text,
  is_activated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = advertiser_id);
CREATE POLICY "Admins can manage all wallets" ON public.wallets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('funding', 'charge', 'activation', 'refund')),
  description text,
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.advertiser_id = auth.uid())
);
CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add website column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;

-- Add activation_fee and usd_to_ngn settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('activation_fee_usd', '10', 'Card activation fee in USD'),
  ('usd_to_ngn_rate', '1500', 'USD to NGN exchange rate')
ON CONFLICT DO NOTHING;