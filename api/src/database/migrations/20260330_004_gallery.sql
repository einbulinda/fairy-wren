-- Migration: Gallery images table and storage bucket
-- Date: 2026-03-30

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

-- Storage bucket (run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  8388608, -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read gallery images'
  ) THEN
    CREATE POLICY "Public read gallery images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'gallery-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth users upload gallery images'
  ) THEN
    CREATE POLICY "Auth users upload gallery images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'gallery-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth users delete gallery images'
  ) THEN
    CREATE POLICY "Auth users delete gallery images"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'gallery-images');
  END IF;
END $$;
