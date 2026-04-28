-- Document Vault v1.4 — add the "Quote" document type so the upload modal can
-- lock its Type field when launched from a pre-completion compliance item.
-- See PWA_Features/document-vault.md §16
INSERT INTO document_types (name) VALUES ('Quote') ON CONFLICT DO NOTHING;
