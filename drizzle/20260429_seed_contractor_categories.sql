-- Default contractor categories for v1.0 — see PWA_Features/suppliers.md §4.5
INSERT INTO contractor_categories (slug, name, display_order) VALUES
  ('gas-safe',             'Gas Safe',              10),
  ('electrician',          'Electrician',           20),
  ('plumber',              'Plumber',               30),
  ('fire-safety',          'Fire Safety',           40),
  ('pat-testing',          'PAT Testing',           50),
  ('building-maintenance', 'Building Maintenance',  60),
  ('locksmith',            'Locksmith',             70),
  ('cleaning',             'Cleaning',              80),
  ('pest-control',         'Pest Control',          90),
  ('security',             'Security',             100),
  ('grounds',              'Grounds & Gardens',    110),
  ('other',                'Other',                999)
ON CONFLICT (slug) DO NOTHING;
