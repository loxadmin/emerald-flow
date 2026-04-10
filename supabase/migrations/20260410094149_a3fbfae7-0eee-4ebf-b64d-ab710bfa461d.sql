-- Allow advertisers to delete their own draft campaigns
CREATE POLICY "Advertisers can delete own draft campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (auth.uid() = advertiser_id AND is_draft = true);

-- Allow advertisers to delete API keys tied to their own campaigns
CREATE POLICY "Advertisers can delete own api keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = api_keys.campaign_id
  AND campaigns.advertiser_id = auth.uid()
));

-- Allow advertisers to delete campaign sources for their own campaigns
CREATE POLICY "Advertisers can delete own sources"
ON public.campaign_sources
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = campaign_sources.campaign_id
  AND campaigns.advertiser_id = auth.uid()
));