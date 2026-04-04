-- Update execute_product_conversion to calculate and persist target cost_price
-- Logic:
--   new_tot_cost  = source_cost_price × target_volume_ml / source_volume_ml
--   If target has existing stock with a cost:
--     weighted_avg = (existing_stock × existing_cost + new_qty × new_cost)
--                    / (existing_stock + new_qty)
--   Else (no existing stock or no prior cost):
--     cost = new_tot_cost   (takes effect immediately)
--
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
  v_source_stock      NUMERIC;
  v_source_cost       NUMERIC;
  v_source_volume     NUMERIC;
  v_target_cost       NUMERIC;
  v_target_volume     NUMERIC;
  v_target_stock      NUMERIC;
  v_new_tot_cost      NUMERIC;
  v_final_cost        NUMERIC;
  v_out_id            UUID;
  v_in_id             UUID;
  v_conv_id           UUID;
BEGIN
  -- Fetch source product: cost_price (last purchase price) and volume_ml
  SELECT cost_price, volume_ml
    INTO v_source_cost, v_source_volume
    FROM public.products
   WHERE id = p_source_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source product not found';
  END IF;

  -- Fetch target product: existing cost_price, volume_ml, and current stock
  SELECT cost_price, volume_ml, current_stock
    INTO v_target_cost, v_target_volume, v_target_stock
    FROM public.products
   WHERE id = p_target_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target product not found';
  END IF;

  -- Check available source stock (movements are signed; positive=in, negative=out)
  SELECT COALESCE(SUM(quantity), 0)
    INTO v_source_stock
    FROM public.inventory_movements
   WHERE product_id = p_source_product_id;

  IF v_source_stock < p_source_qty THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_source_stock, p_source_qty;
  END IF;

  -- ── Cost price calculation ────────────────────────────────────────────────
  -- Only possible when both products have volume_ml configured and source has a cost
  IF v_source_cost IS NOT NULL AND v_source_cost > 0
     AND v_source_volume IS NOT NULL AND v_source_volume > 0
     AND v_target_volume IS NOT NULL AND v_target_volume > 0
  THEN
    -- Cost per tot = last purchase price × (tot volume / bottle volume)
    v_new_tot_cost := v_source_cost * v_target_volume / v_source_volume;

    -- Weighted average with existing target stock
    IF v_target_stock IS NOT NULL AND v_target_stock > 0
       AND v_target_cost IS NOT NULL AND v_target_cost > 0
    THEN
      v_final_cost := (
        (v_target_stock * v_target_cost) + (p_target_qty * v_new_tot_cost)
      ) / (v_target_stock + p_target_qty);
    ELSE
      -- No existing stock or no prior cost — new cost takes effect
      v_final_cost := v_new_tot_cost;
    END IF;
  END IF;

  -- ── Inventory movements ───────────────────────────────────────────────────
  -- Deduct from source (negative qty for trigger)
  INSERT INTO public.inventory_movements
    (product_id, movement_date, quantity, movement_type, reference_type, reference_id, notes, created_by)
  VALUES
    (p_source_product_id, CURRENT_DATE, -p_source_qty, 'conversion_out', 'conversion', gen_random_uuid(), p_notes, p_user_id)
  RETURNING id INTO v_out_id;

  -- Add to target
  INSERT INTO public.inventory_movements
    (product_id, movement_date, quantity, movement_type, reference_type, reference_id, notes, created_by)
  VALUES
    (p_target_product_id, CURRENT_DATE, p_target_qty, 'conversion_in', 'conversion', gen_random_uuid(), p_notes, p_user_id)
  RETURNING id INTO v_in_id;

  -- ── Apply computed cost_price to target product ───────────────────────────
  IF v_final_cost IS NOT NULL AND v_final_cost > 0 THEN
    UPDATE public.products
       SET cost_price = ROUND(v_final_cost::NUMERIC, 4)
     WHERE id = p_target_product_id;
  END IF;

  -- ── Log the conversion ────────────────────────────────────────────────────
  INSERT INTO public.product_conversions
    (source_product_id, target_product_id, source_qty, target_qty,
     notes, created_by, source_movement_id, target_movement_id)
  VALUES
    (p_source_product_id, p_target_product_id, p_source_qty, p_target_qty,
     p_notes, p_user_id, v_out_id, v_in_id)
  RETURNING id INTO v_conv_id;

  RETURN jsonb_build_object(
    'conversion_id',       v_conv_id,
    'source_movement_id',  v_out_id,
    'target_movement_id',  v_in_id,
    'source_qty',          p_source_qty,
    'target_qty',          p_target_qty,
    'cost_per_unit',       ROUND(COALESCE(v_final_cost, v_target_cost)::NUMERIC, 4)
  );
END;
$$;
