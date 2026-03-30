-- Migration: Create events table for public club website
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  dj_act        TEXT,
  image_url     TEXT,
  ticket_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- Index for public page query (published events by date)
CREATE INDEX IF NOT EXISTS idx_events_date_status ON events (event_date DESC, status);

COMMENT ON TABLE events IS 'Club events displayed on the public Fairy Wren website';
COMMENT ON COLUMN events.status IS 'draft = hidden, published = visible on public website';
