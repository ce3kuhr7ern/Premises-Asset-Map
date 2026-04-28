-- Compliance Register v1.0 — see PWA_Features/compliance-register.md §5

-- compliance_types — what kind of obligation (Inspection, Service, Renewal, etc.)
CREATE TABLE IF NOT EXISTS compliance_types (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text        NOT NULL,
  default_lead_days     integer     NOT NULL DEFAULT 60,
  default_interval_days integer,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- compliance_items — the obligations themselves
CREATE TABLE IF NOT EXISTS compliance_items (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id     uuid        NOT NULL REFERENCES organisations(id)   ON DELETE CASCADE,
  asset_id            uuid                 REFERENCES assets(id)          ON DELETE CASCADE,
  compliance_type_id  uuid                 REFERENCES compliance_types(id) ON DELETE SET NULL,

  name                text        NOT NULL,
  description         text,
  is_recurring        boolean     NOT NULL DEFAULT false,
  interval_days       integer,
  lead_days           integer     NOT NULL DEFAULT 60,

  status              text        NOT NULL DEFAULT 'pending',
  next_due            date,
  last_completed_at   date,
  cost_cents          integer,

  satisfaction_doc_id uuid,                          -- FK added after documents.compliance_item_id migration

  -- Forward-compatible nullable FKs (no constraint yet — added when those modules ship)
  contractor_id       uuid,
  meeting_id          uuid,

  cancelled_at        timestamptz,
  cancelled_reason    text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_items_org_idx     ON compliance_items (organisation_id);
CREATE INDEX IF NOT EXISTS compliance_items_asset_idx   ON compliance_items (asset_id);
CREATE INDEX IF NOT EXISTS compliance_items_status_idx  ON compliance_items (status);
CREATE INDEX IF NOT EXISTS compliance_items_due_idx     ON compliance_items (next_due);
CREATE INDEX IF NOT EXISTS compliance_items_active_due_idx
  ON compliance_items (organisation_id, next_due)
  WHERE status NOT IN ('completed', 'cancelled');

-- compliance_approvals — paper trail of who approved what, when, how
CREATE TABLE IF NOT EXISTS compliance_approvals (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_item_id  uuid        NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  decision            text        NOT NULL,
  channel             text        NOT NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  recorded_by         uuid                 REFERENCES users(id) ON DELETE SET NULL,
  approver_user_ids   uuid[]      NOT NULL DEFAULT '{}',
  notes               text,
  meeting_id          uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_approvals_item_idx ON compliance_approvals (compliance_item_id);

-- compliance_events — append-only timeline
CREATE TABLE IF NOT EXISTS compliance_events (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_item_id  uuid        NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,
  from_status         text,
  to_status           text,
  payload             jsonb       NOT NULL DEFAULT '{}',
  recorded_by         uuid                 REFERENCES users(id) ON DELETE SET NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_events_item_idx ON compliance_events (compliance_item_id, recorded_at DESC);
