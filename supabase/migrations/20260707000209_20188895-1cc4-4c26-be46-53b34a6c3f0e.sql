
-- Convert any package_milestones row whose milestone is commission-based
-- (e.g. Sale) to commission_pct pricing. Default to 5% if unset.
UPDATE public.package_milestones pm
SET pricing_type   = 'commission_pct',
    price_usd      = NULL,
    commission_pct = COALESCE(pm.commission_pct, 5)
FROM public.milestones m
WHERE pm.milestone_id = m.id
  AND m.is_commission_based = true
  AND (pm.pricing_type IS DISTINCT FROM 'commission_pct'
       OR pm.commission_pct IS NULL);
