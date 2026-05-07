
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT ARRAY['full_name','email','company_name'],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates"
ON public.email_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.email_templates (name, subject, body) VALUES
('Welcome', 'Welcome to Karbali Ads, {{full_name}}!', 'Hi {{full_name}},

Welcome aboard! Your account ({{email}}) is ready. Log in to start creating campaigns and tracking conversions.

- Karbali Ads Team'),
('Wallet Funding Reminder', 'Fund your wallet to activate your account', 'Hi {{full_name}},

Your account is awaiting wallet activation. Top up to start running campaigns immediately.

- Karbali Ads Team'),
('Campaign Approved', 'Your campaign is live', 'Hi {{full_name}},

Good news - your campaign has been approved and is now live. Track its performance from your dashboard.

- Karbali Ads Team');
