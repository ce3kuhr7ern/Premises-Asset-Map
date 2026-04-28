-- Seed default document types for v1.0 of Document Vault.
-- Trust admins can add more later via a dedicated settings page (future enhancement).
INSERT INTO document_types (name) VALUES
  ('Certificate'),
  ('Policy'),
  ('Insurance'),
  ('Governance'),
  ('Inspection Report'),
  ('Risk Assessment'),
  ('Lease / Property'),
  ('Operational')
ON CONFLICT DO NOTHING;
