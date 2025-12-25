-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
-- Set up storage policies
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
    );
CREATE POLICY "Authenticated users can update" ON storage.objects FOR
UPDATE USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
    );
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
);