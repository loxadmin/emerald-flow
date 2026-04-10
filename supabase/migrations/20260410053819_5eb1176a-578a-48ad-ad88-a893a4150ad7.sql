
-- Add 'escrow' as an allowed wallet_transactions type
ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type = ANY (ARRAY['funding', 'charge', 'activation', 'refund', 'escrow']));
