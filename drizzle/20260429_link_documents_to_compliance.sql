-- Document Vault v1.x — link documents to compliance items.
-- Originally deferred from Document Vault v1.0; landing now alongside Compliance Register.
-- See PWA_Features/document-vault.md §4.1 (compliance_item_id was reserved) and
--     PWA_Features/compliance-register.md §5.2

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS compliance_item_id uuid REFERENCES compliance_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_compliance_idx ON documents (compliance_item_id);

-- Add the deferred FK from compliance_items.satisfaction_doc_id → documents.id now that
-- the linkage direction is bidirectional and both tables exist.
ALTER TABLE compliance_items
  ADD CONSTRAINT compliance_items_satisfaction_doc_fkey
  FOREIGN KEY (satisfaction_doc_id) REFERENCES documents(id) ON DELETE SET NULL;
