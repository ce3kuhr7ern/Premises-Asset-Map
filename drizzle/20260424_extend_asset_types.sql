-- Extend asset_types with display, layer, compliance, and lifecycle columns
ALTER TABLE asset_types
  ADD COLUMN icon_key            text        NOT NULL DEFAULT 'asset-fire-door',
  ADD COLUMN layer               text        NOT NULL DEFAULT 'fire-safety',
  ADD COLUMN is_active           boolean     NOT NULL DEFAULT true,
  ADD COLUMN inspection_interval_days integer,
  ADD COLUMN requires_certificate boolean    NOT NULL DEFAULT false,
  ADD COLUMN notes               text;

-- Seed existing hardcoded asset types from asset-icons.ts
INSERT INTO asset_types (name, icon_key, layer, is_active) VALUES
  ('Fire Extinguisher',     'iso7010-f001', 'fire-safety', true),
  ('Fire Alarm Call Point', 'iso7010-f002', 'fire-safety', true),
  ('Smoke / Heat Detector', 'iso7010-f003', 'fire-safety', true),
  ('Emergency Exit',        'iso7010-e001', 'fire-safety', true),
  ('Fire Door',             'asset-fire-door',    'fire-safety', true),
  ('Fire Hose Reel',        'asset-fire-hose',    'fire-safety', true),
  ('Fire Blanket',          'asset-fire-blanket', 'fire-safety', true),
  ('Distribution Board',    'asset-elec-board',   'electrical',  true),
  ('Light Fitting',         'asset-elec-light',   'electrical',  true),
  ('Socket / Outlet',       'asset-elec-socket',  'electrical',  true),
  ('Stopcock',              'asset-util-stopcock', 'utilities',  true),
  ('Boiler',                'asset-util-boiler',   'utilities',  true),
  ('Door',                  'asset-open-door',    'openings',    true),
  ('Window',                'asset-open-window',  'openings',    true)
ON CONFLICT DO NOTHING;
