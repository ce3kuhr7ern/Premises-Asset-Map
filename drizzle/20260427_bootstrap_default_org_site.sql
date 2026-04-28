-- Bootstrap a default organisation + site so multi-tenant FKs can be NOT NULL.
-- Single-site MVP per asset-register.md v1.1 §12 — one organisation per site, no overlap.
-- The Organisation Profile module (build order step 3) will later let admins rename these.
--
-- Also adds organisation_id to sites and tightens floor_plans.site_id to NOT NULL once linked.

-- 1. Add organisation_id to sites (nullable initially so we can link existing rows first)
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;

-- 2. Insert a default organisation + site if none exist
DO $$
DECLARE
  v_org_id  uuid;
  v_site_id uuid;
BEGIN
  -- Default organisation
  IF NOT EXISTS (SELECT 1 FROM organisations LIMIT 1) THEN
    INSERT INTO organisations (name) VALUES ('Default Trust') RETURNING id INTO v_org_id;
  ELSE
    SELECT id INTO v_org_id FROM organisations ORDER BY created_at LIMIT 1;
  END IF;

  -- Default site
  IF NOT EXISTS (SELECT 1 FROM sites LIMIT 1) THEN
    INSERT INTO sites (name, organisation_id) VALUES ('Village Hall', v_org_id) RETURNING id INTO v_site_id;
  ELSE
    SELECT id INTO v_site_id FROM sites ORDER BY created_at LIMIT 1;
    UPDATE sites SET organisation_id = v_org_id WHERE organisation_id IS NULL;
  END IF;

  -- Link any unattached floor plans to the default site
  UPDATE floor_plans SET site_id = v_site_id WHERE site_id IS NULL;
END $$;

-- 3. Now that everything is linked, enforce NOT NULL
ALTER TABLE sites
  ALTER COLUMN organisation_id SET NOT NULL;

ALTER TABLE floor_plans
  ALTER COLUMN site_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS sites_organisation_idx ON sites (organisation_id);
