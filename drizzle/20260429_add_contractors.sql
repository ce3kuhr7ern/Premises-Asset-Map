-- Suppliers / Contractors v1.0 — see PWA_Features/suppliers.md §4.1

CREATE TABLE IF NOT EXISTS contractor_categories (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  display_order integer     NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contractors (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  contact_name    text,
  email           text,
  phone           text,
  address         text,
  website         text,
  notes           text,
  status          text        NOT NULL DEFAULT 'active',
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractors_org_idx    ON contractors (organisation_id);
CREATE INDEX IF NOT EXISTS contractors_status_idx ON contractors (status);

CREATE TABLE IF NOT EXISTS contractor_category_assignments (
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES contractor_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (contractor_id, category_id)
);

CREATE INDEX IF NOT EXISTS contractor_assign_cat_idx ON contractor_category_assignments (category_id);
