-- Migration: Create customer_feedback table for public contact form
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS customer_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  message    TEXT NOT NULL,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ERP listing (newest first, filter by status)
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON customer_feedback (status, created_at DESC);

COMMENT ON TABLE customer_feedback IS 'Messages submitted via the public Fairy Wren website contact form';
COMMENT ON COLUMN customer_feedback.rating IS '1-5 star rating, optional';
COMMENT ON COLUMN customer_feedback.status IS 'new = unread, read = seen by staff, archived = dismissed';
