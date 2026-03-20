-- Add reorder_level column to products
-- Used to flag low-stock products when quantity falls at or below this level.
-- Default 0 means no reorder alert unless explicitly configured.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS reorder_level NUMERIC NOT NULL DEFAULT 0;
