
-- 1) Parent groups table (Engagement / Performance / Commerce)
CREATE TABLE public.category_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.category_groups TO anon;
GRANT SELECT ON public.category_groups TO authenticated;
GRANT ALL ON public.category_groups TO service_role;

ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read category groups"
  ON public.category_groups FOR SELECT USING (true);

CREATE POLICY "Admins manage category groups"
  ON public.category_groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Categories get a group + a mode (online/offline)
ALTER TABLE public.categories
  ADD COLUMN group_id uuid REFERENCES public.category_groups(id) ON DELETE SET NULL,
  ADD COLUMN mode text NOT NULL DEFAULT 'online'
    CHECK (mode IN ('online','offline'));

-- 3) Seed the three online groups
INSERT INTO public.category_groups (slug, name, description, display_order) VALUES
  ('engagement',  'Engagement', 'Reward-based attention: musicians, creators, content campaigns.', 1),
  ('performance', 'Performance', 'Trackable actions: app installs, signups, purchases on websites/apps.', 2),
  ('commerce',    'Commerce',   'Sales-driven: ecommerce, fintech, real estate, product vendors.', 3);

-- 4) Map existing rows
UPDATE public.categories SET group_id = (SELECT id FROM public.category_groups WHERE slug='engagement'),  mode='online'
  WHERE name = 'Engagement Ads';
UPDATE public.categories SET group_id = (SELECT id FROM public.category_groups WHERE slug='performance'), mode='online'
  WHERE name = 'Performance Ads';
UPDATE public.categories SET group_id = (SELECT id FROM public.category_groups WHERE slug='commerce'),    mode='online'
  WHERE name IN ('Commerce Ads', 'Fintech', 'Product Vendors', 'Real estate');
UPDATE public.categories SET group_id = NULL, mode='offline'
  WHERE name = 'Offline Ads';
-- Partnership rows (Banks & MFBs) stay as-is: group_id NULL, mode='online', is_partnership=true

CREATE INDEX IF NOT EXISTS idx_categories_group_id ON public.categories(group_id);
CREATE INDEX IF NOT EXISTS idx_categories_mode     ON public.categories(mode);
