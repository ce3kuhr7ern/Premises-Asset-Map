-- Seed default compliance types for v1.0 of Compliance Register.
-- Trustees can add more later via a dedicated settings page (future enhancement).

INSERT INTO compliance_types (name, default_lead_days, default_interval_days) VALUES
  ('Inspection',        60,  365),  -- annual inspections (fire ext, electrical, etc.)
  ('Service',           60,  365),  -- annual servicing (boiler, etc.)
  ('Renewal',           90,  365),  -- annual renewals (insurance, etc.)
  ('Audit',             90, 1825),  -- 5-yearly (e.g. EICR)
  ('Filing',            30,  365),  -- charity commission filings
  ('Policy Review',     60,  730),  -- biennial policy reviews (safeguarding, GDPR)
  ('Insurance Renewal', 90,  365),
  ('PAT Testing',       60,  365),
  ('One-off',           60, NULL)   -- catch-all non-recurring obligation
ON CONFLICT DO NOTHING;
