-- Migration: Add type column to customer_feedback
-- Date: 2026-03-30

ALTER TABLE customer_feedback
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'feedback'
    CHECK (type IN ('feedback', 'complaint'));

COMMENT ON COLUMN customer_feedback.type IS 'feedback = general message, complaint = complaint requiring follow-up';
