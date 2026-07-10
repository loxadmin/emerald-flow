
update public.categories set goal_options = ARRAY['Ad views','Quiz completions','Media plays','Brand awareness','Points redeemed']::text[] where name = 'Engagement Ads';
update public.categories set goal_options = ARRAY['App installs','Signups','Leads','CPA conversions','Subscriptions']::text[] where name = 'Performance Ads';
update public.categories set goal_options = ARRAY['Sales','Signups','Cart conversions','Repeat purchases','Newsletter opt-ins']::text[] where name = 'Commerce Ads';
update public.categories set goal_options = ARRAY['Sales','Product signups','Repeat purchases','Cart conversions']::text[] where name = 'Product Vendors';
update public.categories set goal_options = ARRAY['Property signups','Inspection bookings','Property sales','Lead capture']::text[] where name = 'Real estate';
update public.categories set goal_options = ARRAY['Store visits','MOQ orders','Distribution reach','Repeat orders']::text[] where name = 'Offline Ads';
