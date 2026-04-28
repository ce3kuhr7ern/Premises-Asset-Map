-- Document Vault v1.1 — AI auto-categorisation provenance.
-- See PWA_Features/document-vault.md §13.10
-- Records whether/how confidently the AI helped classify each upload.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_suggested  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence real,
  ADD COLUMN IF NOT EXISTS ai_reasoning  text;
