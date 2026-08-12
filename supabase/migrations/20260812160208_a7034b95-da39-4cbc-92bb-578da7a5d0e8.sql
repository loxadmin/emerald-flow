-- Hot predicates observed in pg_stat_statements
CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON public.events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_campaign_created ON public.events (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clicks_referral_id ON public.clicks (referral_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.clicks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_created ON public.campaigns (advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_notify ON public.campaigns (status, email_notifications_enabled);

CREATE INDEX IF NOT EXISTS idx_package_orders_advertiser ON public.package_orders (advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_orders_status ON public.package_orders (status);

CREATE INDEX IF NOT EXISTS idx_switch_offer_orders_advertiser ON public.switch_offer_orders (advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_switch_offer_orders_status ON public.switch_offer_orders (status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions (wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offerwall_interactions_campaign ON public.offerwall_interactions (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offerwall_interactions_extuser ON public.offerwall_interactions (external_user_id);
CREATE INDEX IF NOT EXISTS idx_extension_clicks_created ON public.extension_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_advertiser ON public.tracking_sessions (advertiser_id, last_seen_at DESC);