-- Add columns to categories table to control which event types are allowed
ALTER TABLE categories
ADD COLUMN allow_download BOOLEAN DEFAULT TRUE,
ADD COLUMN allow_signup BOOLEAN DEFAULT TRUE,
ADD COLUMN allow_purchase BOOLEAN DEFAULT TRUE;

-- Set some defaults for existing partnership categories if needed
UPDATE categories SET allow_purchase = TRUE WHERE is_partnership = TRUE;
