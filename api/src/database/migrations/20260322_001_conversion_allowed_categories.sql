-- Add allowed categories for bulk breaking conversions
-- When set, only products in these categories will appear as convertible
ALTER TABLE public.reorder_level_settings
  ADD COLUMN IF NOT EXISTS conversion_allowed_categories UUID[] DEFAULT '{}';

-- Add created_by to inventory_movements to track who performed movements
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Fix product_conversions.created_by FK to point to profiles instead of auth.users
ALTER TABLE public.product_conversions
  DROP CONSTRAINT IF EXISTS product_conversions_created_by_fkey;
ALTER TABLE public.product_conversions
  ADD CONSTRAINT product_conversions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Recreate execute_product_conversion with correct inventory_movements columns
CREATE OR REPLACE FUNCTION public.execute_product_conversion(
    p_source_product_id UUID,
    p_target_product_id UUID,
    p_source_qty        NUMERIC,
    p_target_qty        NUMERIC,
    p_notes             TEXT DEFAULT NULL,
    p_user_id           UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_stock  NUMERIC;
  v_source_cost   NUMERIC;
  v_target_cost   NUMERIC;
  v_out_id        UUID;
  v_in_id         UUID;
  v_conv_id       UUID;
BEGIN
  -- Validate products exist
  SELECT cost_price INTO v_source_cost
    FROM public.products WHERE id = p_source_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source product not found';
  END IF;

  SELECT cost_price INTO v_target_cost
    FROM public.products WHERE id = p_target_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target product not found';
  END IF;

  -- Check available stock (quantity is already signed: positive=in, negative=out)
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_source_stock
  FROM public.inventory_movements
  WHERE product_id = p_source_product_id;

  IF v_source_stock < p_source_qty THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_source_stock, p_source_qty;
  END IF;

  -- Calculate cost per target unit (proportional from source cost)
  IF v_source_cost IS NOT NULL AND v_source_cost > 0 THEN
    v_target_cost := (p_source_qty * v_source_cost) / p_target_qty;
  END IF;

  -- Create conversion_out movement (deduct from source — negative qty for trigger)
  INSERT INTO public.inventory_movements (product_id, movement_date, quantity, movement_type, reference_type, reference_id, notes, created_by)
  VALUES (p_source_product_id, CURRENT_DATE, -p_source_qty, 'conversion_out', 'conversion', gen_random_uuid(), p_notes, p_user_id)
  RETURNING id INTO v_out_id;

  -- Create conversion_in movement (add to target)
  INSERT INTO public.inventory_movements (product_id, movement_date, quantity, movement_type, reference_type, reference_id, notes, created_by)
  VALUES (p_target_product_id, CURRENT_DATE, p_target_qty, 'conversion_in', 'conversion', gen_random_uuid(), p_notes, p_user_id)
  RETURNING id INTO v_in_id;

  -- Log the conversion
  INSERT INTO public.product_conversions
    (source_product_id, target_product_id, source_qty, target_qty,
     notes, created_by, source_movement_id, target_movement_id)
  VALUES
    (p_source_product_id, p_target_product_id, p_source_qty, p_target_qty,
     p_notes, p_user_id, v_out_id, v_in_id)
  RETURNING id INTO v_conv_id;

  RETURN jsonb_build_object(
    'conversion_id', v_conv_id,
    'source_movement_id', v_out_id,
    'target_movement_id', v_in_id,
    'source_qty', p_source_qty,
    'target_qty', p_target_qty
  );
END;
$$;
