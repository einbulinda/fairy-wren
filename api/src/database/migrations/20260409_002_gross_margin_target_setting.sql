-- Migration: 20260409_002_gross_margin_target_setting.sql
-- Purpose: Add gross_margin_target to the settings table as a configurable
--          global default. Used by the dashboard margin alerts and pricing analysis.
--          Individual business targets per month can still override this.

INSERT INTO settings (key, value)
VALUES ('gross_margin_target', '35')
ON CONFLICT (key) DO NOTHING;
