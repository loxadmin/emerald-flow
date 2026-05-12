INSERT INTO public.admin_settings (key, value, description)
VALUES ('category_activation_fee:751aca09-0570-4281-a1e1-e41900dfc138', '35', 'Offline Ads activation fee (USD)')
ON CONFLICT (key) DO NOTHING;