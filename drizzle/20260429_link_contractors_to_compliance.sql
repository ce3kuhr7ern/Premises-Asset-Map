-- Compliance Register v1.2 (Suppliers integration) — see PWA_Features/suppliers.md §4.2
-- The compliance_items.contractor_id column has existed since Compliance Register v1.0
-- but with no FK constraint (forward-compat placeholder). Now that the contractors
-- table exists, enforce referential integrity.

ALTER TABLE compliance_items
  ADD CONSTRAINT compliance_items_contractor_fkey
  FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS compliance_items_contractor_idx ON compliance_items (contractor_id);

-- Also add scheduled_for to capture the booking date when a compliance item enters
-- the 'scheduled' lifecycle state.
ALTER TABLE compliance_items
  ADD COLUMN IF NOT EXISTS scheduled_for date;
