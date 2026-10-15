-- Add location targeting columns to campaigns and package_orders
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_countries text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_states text[];

ALTER TABLE public.package_orders ADD COLUMN IF NOT EXISTS target_countries text[];
ALTER TABLE public.package_orders ADD COLUMN IF NOT EXISTS target_states text[];
