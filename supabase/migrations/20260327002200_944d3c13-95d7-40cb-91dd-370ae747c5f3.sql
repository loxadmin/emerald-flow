
-- Site content table for admin-editable landing page sections
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text,
  subtitle text,
  content text,
  is_visible boolean DEFAULT true,
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public landing page)
CREATE POLICY "Anyone can view site content" ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage site content" ON public.site_content
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default content
INSERT INTO public.site_content (section_key, title, subtitle, content, sort_order) VALUES
('hero', 'Migrate Customers to Your Brand', 'The performance attribution platform that helps advertisers acquire competitors'' customers and only pay for real results.', NULL, 0),
('about', 'About Karbali', 'We built Karbali to solve a simple problem: advertisers waste money on clicks and impressions that never convert.', 'Karbali is a performance-based attribution platform. We connect advertisers with real users and charge only for measurable outcomes like downloads, signups, and purchases. No wasted ad spend. No guesswork. Just results.', 1),
('how_it_works', 'How It Works', 'From campaign creation to verified results in four simple steps.', '1. Create a Campaign: Set your budget and define what you will pay for (downloads, signups, purchases).\n2. Integrate Our API: Add a simple tracking snippet to your app or website.\n3. Get Approved: Our admin team verifies your integration and activates your campaign.\n4. Track and Pay for Results: Monitor real-time analytics and only pay when users take action.', 2),
('features', 'Why Choose Karbali', 'Built for performance-driven advertisers who demand transparency.', NULL, 3),
('contact', 'Get in Touch', 'Have questions? We would love to hear from you.', 'Email: support@karbali.com\nPhone: +1 (555) 123-4567\nAddress: Lagos, Nigeria', 4),
('footer', 'Karbali', NULL, 'Performance Attribution Platform. Track real outcomes, not vanity metrics.', 5);

-- Auto-assign admin role for specific email on signup
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'adahosabex@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_admin_check
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin();

-- Also try to add admin role if user already exists
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'adahosabex@gmail.com' LIMIT 1;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
