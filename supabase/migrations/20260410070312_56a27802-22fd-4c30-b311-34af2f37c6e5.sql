
-- Fix: Remove overly permissive insert on offerwall_interactions
DROP POLICY IF EXISTS "Service role can insert interactions" ON public.offerwall_interactions;

-- Service role bypasses RLS anyway, so we don't need a permissive insert policy
-- Edge functions using service role key will still be able to insert

-- Fix: campaign_questions - the SELECT true is fine for public read, but let's add insert for admins only
CREATE POLICY "Admins can insert questions"
  ON public.campaign_questions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
