-- Migration: Add auto_generated column to business_targets
-- The service layer sends auto_generated to distinguish manually-set
-- targets from fallback-calculated ones.

ALTER TABLE business_targets
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;
