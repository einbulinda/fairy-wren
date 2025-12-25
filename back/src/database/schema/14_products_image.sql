-- Update products table to support image URLs
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_path TEXT;
-- Update check constraint to allow null for image (for backward compatibility)
COMMENT ON COLUMN products.image IS 'Emoji representation (deprecated, use image_url)';
COMMENT ON COLUMN products.image_url IS 'Full URL to product image in storage';
COMMENT ON COLUMN products.image_path IS 'Storage path for the image file';