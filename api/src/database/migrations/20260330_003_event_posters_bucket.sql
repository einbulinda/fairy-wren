-- Migration: Create event-posters storage bucket
-- Date: 2026-03-30
-- NOTE: Run this in Supabase SQL editor OR create the bucket manually in
--       Supabase Dashboard → Storage → New Bucket → name: "event-posters", Public: true

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read event posters'
  ) THEN
    CREATE POLICY "Public read event posters"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'event-posters');
  END IF;
END $$;

-- Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Auth users upload event posters'
  ) THEN
    CREATE POLICY "Auth users upload event posters"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'event-posters');
  END IF;
END $$;

-- Allow authenticated users to delete their uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Auth users delete event posters'
  ) THEN
    CREATE POLICY "Auth users delete event posters"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'event-posters');
  END IF;
END $$;
