-- Migration: Gallery images table
-- Date: 2026-03-30
--
-- Storage bucket (gallery-images) and its RLS policies must be created manually.
-- Run api/src/database/storage_setup.sql in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS gallery_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url          TEXT NOT NULL,
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_active_sort ON gallery_images (active, sort_order ASC);

COMMENT ON TABLE gallery_images IS 'Images shown in the public Fairy Wren website gallery section';
