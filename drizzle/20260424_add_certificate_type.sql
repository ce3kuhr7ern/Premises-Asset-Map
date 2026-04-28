-- Add certificate_type to asset_types (v1.1)
-- Stores the specific certificate reference required for this asset type (e.g. CD11, OFTEC, Gas Safe)
-- Only relevant when requires_certificate is true; nullable because most types won't need it.
ALTER TABLE asset_types
  ADD COLUMN IF NOT EXISTS certificate_type text;
