-- Add unique constraint on domain to prevent multiple advertisers from claiming the same domain
ALTER TABLE public.advertiser_websites ADD CONSTRAINT unique_domain_globally UNIQUE (domain);