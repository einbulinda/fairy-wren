-- SETTINGS TABLE
-- Date: 2026-03-05
-- Purpose: Key-value store for organisation settings (name, currency, Tax PIN, etc.)

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Seed defaults
INSERT INTO settings (key, value) VALUES
  ('organisation_name', 'Fairy Wren Limited'),
  ('currency', 'KES'),
  ('tax_pin', ''),
  ('address', ''),
  ('phone', ''),
  ('email', '')
ON CONFLICT (key) DO NOTHING;
