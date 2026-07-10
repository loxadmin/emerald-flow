
-- 1) New advertiser subtype enum values
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'social_media_creator';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'online_vendor';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'realtor';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'fintech';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'food_beverage';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'household_items';
ALTER TYPE advertiser_subtype ADD VALUE IF NOT EXISTS 'telecom';

-- 2) Offline groups
INSERT INTO category_groups (slug, name, description, display_order)
VALUES
  ('daily_essentials','Daily Essentials','Offline everyday goods: food & beverage production, household items manufacturers.', 4),
  ('mainstream','Mainstream','Offline large-scale verticals: telecoms, oil and gas.', 5)
ON CONFLICT (slug) DO NOTHING;

-- 3) Move Fintech from Commerce → Performance
UPDATE categories
SET group_id = (SELECT id FROM category_groups WHERE slug='performance')
WHERE name = 'Fintech';

-- 4) Migrate 'Product Vendors' advertisers to Commerce Ads catch-all, then drop the vendor row + real estate row (never used)
UPDATE advertiser_categories
SET category_id = (SELECT id FROM categories WHERE name='Commerce Ads')
WHERE category_id IN (SELECT id FROM categories WHERE name IN ('Product Vendors','Real estate'));

DELETE FROM ad_packages WHERE category_id IN (SELECT id FROM categories WHERE name IN ('Product Vendors','Real estate','Banks & MFBs'));
DELETE FROM categories WHERE name IN ('Product Vendors','Real estate','Banks & MFBs');

-- 5) Offline catch-all rows per new group
UPDATE categories
SET group_id = (SELECT id FROM category_groups WHERE slug='daily_essentials'),
    name = 'Daily Essentials Ads',
    description = 'Food & beverage production, household goods manufacturers.',
    goal_options = ARRAY['MOQ orders','Repeat orders','Distribution reach','Store visits']
WHERE name = 'Offline Ads';

INSERT INTO categories (name, description, is_active, is_partnership, mode, group_id, goal_options)
VALUES (
  'Mainstream Ads',
  'Telecommunications and oil & gas advertisers.',
  true, false, 'offline',
  (SELECT id FROM category_groups WHERE slug='mainstream'),
  ARRAY['Brand awareness','MOQ orders','Distribution reach','Repeat orders']
)
ON CONFLICT DO NOTHING;

-- 6) Refresh goal options for the online catch-alls
UPDATE categories SET goal_options = ARRAY['Ad views','Video plays','Music streams','Social engagement','Brand awareness']
WHERE name='Engagement Ads';
UPDATE categories SET goal_options = ARRAY['App installs','Signups','Leads','CPA conversions','Subscriptions']
WHERE name='Performance Ads';
UPDATE categories SET goal_options = ARRAY['Sales','Cart conversions','Repeat purchases','Signups']
WHERE name='Commerce Ads';
UPDATE categories SET goal_options = ARRAY['App installs','KYC completions','First deposits','Transactions']
WHERE name='Fintech';
