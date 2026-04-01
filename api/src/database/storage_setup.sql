-- =============================================================================
-- MANUAL STORAGE SETUP — run this ONCE in the Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste & run
--
-- This cannot be run via the migration runner because storage.objects is owned
-- by supabase_storage_admin and requires superuser privileges to add policies.
-- =============================================================================

-- ── event-posters bucket ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read event posters'
  ) THEN
    CREATE POLICY "Public read event posters"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'event-posters');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth users upload event posters'
  ) THEN
    CREATE POLICY "Auth users upload event posters"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'event-posters');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth users delete event posters'
  ) THEN
    CREATE POLICY "Auth users delete event posters"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'event-posters');
  END IF;
END $$;

-- ── gallery-images bucket ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  8388608,
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
