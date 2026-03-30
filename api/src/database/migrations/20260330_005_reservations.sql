-- Migration: Create reservations table
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  reservation_date DATE NOT NULL,
  reservation_time TIME,
  party_size       SMALLINT NOT NULL CHECK (party_size >= 1),
  drink_of_choice  TEXT,
  special_occasion TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_date_status
  ON reservations (reservation_date DESC, status);

COMMENT ON TABLE reservations IS 'Table reservations submitted from the public Fairy Wren website';
COMMENT ON COLUMN reservations.status IS 'pending = new, confirmed = staff confirmed, cancelled, completed';
