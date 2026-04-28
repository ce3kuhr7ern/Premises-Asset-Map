-- Asset Register v1.0 — canonical record of every physical asset the trust owns.
-- See PWA_Features/asset-register.md §4.1
CREATE TABLE IF NOT EXISTS assets (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id               uuid        NOT NULL REFERENCES sites(id)         ON DELETE CASCADE,
  asset_type_id         uuid        NOT NULL REFERENCES asset_types(id)   ON DELETE RESTRICT,

  name                  text        NOT NULL,
  serial_number         text,
  manufacturer          text,
  model                 text,

  installed_at          date,
  purchased_at          date,
  warranty_expires_at   date,
  last_inspected_at     date,
  next_inspection_due   date,

  status                text        NOT NULL DEFAULT 'active',
  archived_at           timestamptz,

  notes                 text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_site_idx     ON assets (site_id);
CREATE INDEX IF NOT EXISTS assets_type_idx     ON assets (asset_type_id);
CREATE INDEX IF NOT EXISTS assets_status_idx   ON assets (status);
CREATE INDEX IF NOT EXISTS assets_next_due_idx ON assets (next_inspection_due);
