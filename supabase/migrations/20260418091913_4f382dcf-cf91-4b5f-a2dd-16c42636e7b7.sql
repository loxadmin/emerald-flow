
-- Quiz change requests: advertisers can flag generated quiz questions for admin review
CREATE TABLE public.quiz_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  question_id UUID NOT NULL,
  advertiser_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all quiz requests"
  ON public.quiz_change_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Advertisers view own quiz requests"
  ON public.quiz_change_requests FOR SELECT
  USING (auth.uid() = advertiser_id);

CREATE POLICY "Advertisers create own quiz requests"
  ON public.quiz_change_requests FOR INSERT
  WITH CHECK (
    auth.uid() = advertiser_id
    AND EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_id AND campaigns.advertiser_id = auth.uid()
    )
  );

CREATE INDEX idx_quiz_change_requests_campaign ON public.quiz_change_requests(campaign_id);
CREATE INDEX idx_quiz_change_requests_status ON public.quiz_change_requests(status);
