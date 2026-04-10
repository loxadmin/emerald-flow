
-- Retroactive escrow fix for pre-existing active campaigns

-- 1. Deduct total escrow ($304) from wallet
UPDATE wallets 
SET balance = balance - 304, updated_at = now()
WHERE id = '44d32f00-5b43-4412-b458-49a803a84309';

-- 2. Create charge transaction for LOXY campaign ($202)
INSERT INTO wallet_transactions (wallet_id, amount, type, status, description)
VALUES ('44d32f00-5b43-4412-b458-49a803a84309', 202, 'charge', 'completed', 'Campaign escrow: LOXY (retroactive fix)');

-- 3. Create charge transaction for det campaign ($102)
INSERT INTO wallet_transactions (wallet_id, amount, type, status, description)
VALUES ('44d32f00-5b43-4412-b458-49a803a84309', 102, 'charge', 'completed', 'Campaign escrow: det (retroactive fix)');
