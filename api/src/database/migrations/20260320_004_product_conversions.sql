-- =============================================================
-- Product Conversions System
-- Enables converting bulk products (e.g. bottles) into smaller
-- units (e.g. tots) with atomic inventory movements.
-- =============================================================
-- 1. Add volume_ml to products (nullable — only relevant for liquid products)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS volume_ml NUMERIC;
-- 2. Add default_tot_size_ml to reorder_level_settings (single-row config)
ALTER TABLE public.reorder_level_settings
ADD COLUMN IF NOT EXISTS default_tot_size_ml INTEGER NOT NULL DEFAULT 30;
-- 3. Expand movement_type CHECK constraint to include conversion types
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE public.inventory_movements
ADD CONSTRAINT inventory_movements_movement_type_check CHECK (
    movement_type = ANY (
      ARRAY [
        'purchase'::text, 'sale'::text,
        'adjustment_in'::text, 'adjustment_out'::text,
        'opening_balance'::text,
        'conversion_in'::text, 'conversion_out'::text
      ]
    )
  );
-- 4. Product conversions log table
CREATE TABLE IF NOT EXISTS public.product_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id UUID NOT NULL REFERENCES public.products(id),
  target_product_id UUID NOT NULL REFERENCES public.products(id),
  source_qty NUMERIC NOT NULL CHECK (source_qty > 0),
  target_qty NUMERIC NOT NULL CHECK (target_qty > 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- movement references for traceability
  source_movement_id UUID REFERENCES public.inventory_movements(id),
  target_movement_id UUID REFERENCES public.inventory_movements(id)
);
-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_product_conversions_source ON public.product_conversions(source_product_id);
CREATE INDEX IF NOT EXISTS idx_product_conversions_target ON public.product_conversions(target_product_id);
-- 5. RPC: execute_product_conversion
--    Atomically deducts source stock and adds target stock,
--    logging both inventory movements and the conversion record.
CREATE OR REPLACE FUNCTION public.execute_product_conversion(
    p_source_product_id UUID,
    p_target_product_id UUID,
    p_source_qty NUMERIC,
    p_target_qty NUMERIC,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
  ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_source_stock NUMERIC;
v_source_cost NUMERIC;
v_target_cost NUMERIC;
v_out_id UUID;
v_in_id UUID;
v_conv_id UUID;
BEGIN -- Validate products exist
SELECT cost_price INTO v_source_cost
FROM public.products
WHERE id = p_source_product_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Source product not found';
END IF;
SELECT cost_price INTO v_target_cost
FROM public.products
WHERE id = p_target_product_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Target product not found';
END IF;
-- Check available stock (quantity is already signed: positive=in, negative=out)
SELECT COALESCE(SUM(quantity), 0) INTO v_source_stock
FROM public.inventory_movements
WHERE product_id = p_source_product_id;
IF v_source_stock < p_source_qty THEN RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %',
v_source_stock,
p_source_qty;
END IF;
-- Calculate cost per target unit (proportional from source cost)
-- Total cost transferred = source_qty * source_cost_price
-- Cost per target unit = total_cost / target_qty
IF v_source_cost IS NOT NULL
AND v_source_cost > 0 THEN v_target_cost := (p_source_qty * v_source_cost) / p_target_qty;
END IF;
-- Create conversion_out movement (deduct from source — negative qty for trigger)
INSERT INTO public.inventory_movements (
    product_id,
    movement_date,
    quantity,
    movement_type,
    reference_type,
    reference_id,
    notes,
    created_by
  )
VALUES (
    p_source_product_id,
    CURRENT_DATE,
    -p_source_qty,
    'conversion_out',
    'conversion',
    gen_random_uuid(),
    p_notes,
    p_user_id
  )
RETURNING id INTO v_out_id;
-- Create conversion_in movement (add to target)
INSERT INTO public.inventory_movements (
    product_id,
    movement_date,
    quantity,
    movement_type,
    reference_type,
    reference_id,
    notes,
    created_by
  )
VALUES (
    p_target_product_id,
    CURRENT_DATE,
    p_target_qty,
    'conversion_in',
    'conversion',
    gen_random_uuid(),
    p_notes,
    p_user_id
  )
RETURNING id INTO v_in_id;
-- Log the conversion
INSERT INTO public.product_conversions (
    source_product_id,
    target_product_id,
    source_qty,
    target_qty,
    notes,
    created_by,
    source_movement_id,
    target_movement_id
  )
VALUES (
    p_source_product_id,
    p_target_product_id,
    p_source_qty,
    p_target_qty,
    p_notes,
    p_user_id,
    v_out_id,
    v_in_id
  )
RETURNING id INTO v_conv_id;
RETURN jsonb_build_object(
  'conversion_id',
  v_conv_id,
  'source_movement_id',
  v_out_id,
  'target_movement_id',
  v_in_id,
  'source_qty',
  p_source_qty,
  'target_qty',
  p_target_qty
);
END;
$$;