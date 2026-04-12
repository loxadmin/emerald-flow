
CREATE POLICY "Users can update own wallet"
ON public.wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = advertiser_id)
WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Users can insert own wallet transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM wallets
  WHERE wallets.id = wallet_transactions.wallet_id
  AND wallets.advertiser_id = auth.uid()
));
