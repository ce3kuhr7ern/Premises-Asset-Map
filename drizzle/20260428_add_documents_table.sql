-- Document Vault v1.0 — central store for certificates, policies, insurance, etc.
-- Files live in Vercel Blob; this table records metadata + the absolute Blob URL.
-- See PWA_Features/document-vault.md §4
CREATE TABLE IF NOT EXISTS documents (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id   uuid        NOT NULL REFERENCES organisations(id)  ON DELETE CASCADE,
  asset_id          uuid                 REFERENCES assets(id)         ON DELETE SET NULL,
  doc_type_id       uuid                 REFERENCES document_types(id) ON DELETE SET NULL,

  name              text        NOT NULL,
  filename          text        NOT NULL,
  mime_type         text        NOT NULL,
  file_size         integer     NOT NULL,
  file_url          text        NOT NULL,

  expires_at        date,
  notes             text,

  uploaded_by       uuid                 REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_org_idx     ON documents (organisation_id);
CREATE INDEX IF NOT EXISTS documents_asset_idx   ON documents (asset_id);
CREATE INDEX IF NOT EXISTS documents_type_idx    ON documents (doc_type_id);
CREATE INDEX IF NOT EXISTS documents_expires_idx ON documents (expires_at);
