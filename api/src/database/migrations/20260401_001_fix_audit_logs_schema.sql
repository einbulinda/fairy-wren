-- Migration: Fix audit_logs table to match application column names
-- Date: 2026-04-01
--
-- The original schema used table_name/record_id but all service code
-- inserts with entity/entity_id/correlation_id/metadata. Every audit
-- insert has been silently failing due to this mismatch.

-- Rename existing columns to match the code
ALTER TABLE audit_logs RENAME COLUMN table_name TO entity;
ALTER TABLE audit_logs RENAME COLUMN record_id  TO entity_id;

-- entity_id is not always a UUID (auth events have no entity), relax the type
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- Add missing columns
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- entity (was table_name) can legitimately be non-null always, keep it NOT NULL

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_logs (performed_by, created_at DESC);
