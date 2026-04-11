
DROP POLICY "Advertisers can delete own draft campaigns" ON public.campaigns;

CREATE POLICY "Advertisers can delete own campaigns"
ON public.campaigns
FOR DELETE
USING (auth.uid() = advertiser_id);
