-- Link map_assets → assets. Every existing map_asset gets a matching assets row.
-- See PWA_Features/asset-register.md §4.2
-- Pre-flight check confirmed every map_assets.icon_key exists in asset_types.icon_key.

ALTER TABLE map_assets
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS map_assets_asset_idx ON map_assets (asset_id);

-- Backfill: create an assets row for every map_asset that does not already have one.
-- Joins through floor_plans → sites → organisations to derive the tenancy.
DO $$
DECLARE
  r RECORD;
  v_asset_id uuid;
BEGIN
  FOR r IN
    SELECT
      ma.id              AS map_asset_id,
      ma.label,
      ma.icon_key,
      fp.site_id,
      s.organisation_id,
      at.id              AS asset_type_id
    FROM map_assets ma
    JOIN floor_plans fp ON fp.id = ma.floor_plan_id
    JOIN sites       s  ON s.id  = fp.site_id
    JOIN asset_types at ON at.icon_key = ma.icon_key
    WHERE ma.asset_id IS NULL
  LOOP
    INSERT INTO assets (organisation_id, site_id, asset_type_id, name, status)
    VALUES (r.organisation_id, r.site_id, r.asset_type_id, r.label, 'active')
    RETURNING id INTO v_asset_id;

    UPDATE map_assets SET asset_id = v_asset_id WHERE id = r.map_asset_id;
  END LOOP;
END $$;

-- Verify: every active map_asset must now have an asset_id.
-- (We do not enforce NOT NULL on map_assets.asset_id yet — leave room for transitional placements.)
DO $$
DECLARE
  v_orphans int;
BEGIN
  SELECT COUNT(*) INTO v_orphans
  FROM map_assets
  WHERE asset_id IS NULL AND removed_at IS NULL;

  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % map_assets without asset_id', v_orphans;
  END IF;
END $$;
