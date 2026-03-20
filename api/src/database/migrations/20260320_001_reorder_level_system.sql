-- ============================================================
-- Automated Reorder Level (ROL) Calculation System
-- ROL = (Avg Daily Demand × Lead Time) + Safety Stock
-- Safety Stock = Z × σ × √Lead Time
-- ============================================================

-- 1. Add lead_time_days to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER NOT NULL DEFAULT 3;

-- 2. Create product_inventory_policies table
CREATE TABLE IF NOT EXISTS public.product_inventory_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Calculated values
  avg_daily_demand NUMERIC NOT NULL DEFAULT 0,
  demand_std_dev NUMERIC NOT NULL DEFAULT 0,
  lead_time_days NUMERIC NOT NULL DEFAULT 3,
  safety_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,

  -- Configuration
  service_level NUMERIC NOT NULL DEFAULT 0.95,
  lookback_days INTEGER NOT NULL DEFAULT 90,
  manual_override BOOLEAN NOT NULL DEFAULT false,

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'calculated',
  primary_supplier_id UUID REFERENCES public.suppliers(id),

  -- Audit
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(product_id)
);

-- 3. Create reorder_level_settings table (single-row global config)
CREATE TABLE IF NOT EXISTS public.reorder_level_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_service_level NUMERIC NOT NULL DEFAULT 0.95,
  default_lookback_days INTEGER NOT NULL DEFAULT 90,
  default_lead_time_days INTEGER NOT NULL DEFAULT 3,
  default_reorder_level NUMERIC NOT NULL DEFAULT 5,
  auto_refresh_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Insert default row if none exists
INSERT INTO public.reorder_level_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.reorder_level_settings);

-- 4. Core calculation function
CREATE OR REPLACE FUNCTION public.calculate_reorder_levels(
  p_product_ids UUID[] DEFAULT NULL,
  p_lookback_days INTEGER DEFAULT 90,
  p_service_level NUMERIC DEFAULT 0.95
)
RETURNS TABLE (
  product_id UUID,
  avg_daily_demand NUMERIC,
  demand_std_dev NUMERIC,
  lead_time_days NUMERIC,
  safety_stock NUMERIC,
  reorder_level NUMERIC,
  primary_supplier_id UUID,
  source TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_z_score NUMERIC;
  v_default_lead_time INTEGER;
  v_default_rol NUMERIC;
BEGIN
  -- Map service level to Z-score
  v_z_score := CASE
    WHEN p_service_level >= 0.99  THEN 2.33
    WHEN p_service_level >= 0.975 THEN 1.96
    WHEN p_service_level >= 0.95  THEN 1.65
    WHEN p_service_level >= 0.90  THEN 1.28
    ELSE 1.04
  END;

  -- Get defaults from settings
  SELECT rls.default_lead_time_days, rls.default_reorder_level
  INTO v_default_lead_time, v_default_rol
  FROM reorder_level_settings rls
  LIMIT 1;

  v_default_lead_time := COALESCE(v_default_lead_time, 3);
  v_default_rol := COALESCE(v_default_rol, 5);

  RETURN QUERY
  WITH target_products AS (
    SELECT p.id AS pid
    FROM products p
    WHERE p.track_inventory = true
      AND p.active = true
      AND (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
  ),

  -- Daily demand from round_items -> rounds -> bills (completed only)
  daily_sales AS (
    SELECT
      ri.product_id AS pid,
      DATE(r.created_at) AS sale_date,
      SUM(ri.quantity) AS daily_qty
    FROM round_items ri
    JOIN rounds r ON r.id = ri.round_id
    JOIN bills b ON b.id = r.bill_id
    WHERE b.status = 'completed'
      AND r.created_at >= (CURRENT_DATE - p_lookback_days)
      AND ri.product_id IN (SELECT tp.pid FROM target_products tp)
    GROUP BY ri.product_id, DATE(r.created_at)
  ),

  demand_stats AS (
    SELECT
      ds.pid,
      COALESCE(AVG(ds.daily_qty), 0) AS avg_demand,
      COALESCE(STDDEV_POP(ds.daily_qty), 0) AS std_demand,
      COUNT(DISTINCT ds.sale_date) AS days_with_sales
    FROM daily_sales ds
    GROUP BY ds.pid
  ),

  -- Primary supplier: most recent supplier for each product
  supplier_lookup AS (
    SELECT DISTINCT ON (iri.product_id)
      iri.product_id AS pid,
      ir.supplier_id,
      s.lead_time_days AS supplier_lead_time
    FROM inventory_receipt_items iri
    JOIN inventory_receipts ir ON ir.id = iri.receipt_id
    JOIN suppliers s ON s.id = ir.supplier_id
    WHERE iri.product_id IN (SELECT tp.pid FROM target_products tp)
    ORDER BY iri.product_id, ir.purchase_date DESC
  )

  SELECT
    tp.pid AS product_id,
    ROUND(COALESCE(dms.avg_demand, 0), 4) AS avg_daily_demand,
    ROUND(COALESCE(dms.std_demand, 0), 4) AS demand_std_dev,
    COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC AS lead_time_days,
    -- Safety Stock = Z * sigma * sqrt(lead_time)
    ROUND(
      v_z_score * COALESCE(dms.std_demand, 0)
        * SQRT(COALESCE(sl.supplier_lead_time, v_default_lead_time)),
      2
    ) AS safety_stock,
    -- ROL = (avg_daily_demand * lead_time) + safety_stock
    -- Minimum of default_rol for products with no sales
    GREATEST(
      ROUND(
        (COALESCE(dms.avg_demand, 0)
          * COALESCE(sl.supplier_lead_time, v_default_lead_time))
        + (v_z_score * COALESCE(dms.std_demand, 0)
          * SQRT(COALESCE(sl.supplier_lead_time, v_default_lead_time))),
        2
      ),
      CASE WHEN COALESCE(dms.days_with_sales, 0) = 0
        THEN v_default_rol ELSE 0 END
    ) AS reorder_level,
    sl.supplier_id AS primary_supplier_id,
    CASE
      WHEN COALESCE(dms.days_with_sales, 0) = 0 THEN 'default'
      ELSE 'calculated'
    END AS source
  FROM target_products tp
  LEFT JOIN demand_stats dms ON dms.pid = tp.pid
  LEFT JOIN supplier_lookup sl ON sl.pid = tp.pid;
END;
$$;

-- 5. Refresh / upsert function
CREATE OR REPLACE FUNCTION public.refresh_reorder_levels(
  p_product_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_lookback INTEGER;
  v_service_level NUMERIC;
  v_rec RECORD;
BEGIN
  -- Get global settings
  SELECT default_lookback_days, default_service_level
  INTO v_lookback, v_service_level
  FROM reorder_level_settings
  LIMIT 1;

  v_lookback := COALESCE(v_lookback, 90);
  v_service_level := COALESCE(v_service_level, 0.95);

  FOR v_rec IN
    SELECT * FROM calculate_reorder_levels(p_product_ids, v_lookback, v_service_level)
  LOOP
    -- Upsert policy (skip manual overrides)
    INSERT INTO product_inventory_policies (
      product_id, avg_daily_demand, demand_std_dev, lead_time_days,
      safety_stock, reorder_level, service_level, lookback_days,
      primary_supplier_id, source, last_calculated_at
    ) VALUES (
      v_rec.product_id, v_rec.avg_daily_demand, v_rec.demand_std_dev,
      v_rec.lead_time_days, v_rec.safety_stock, v_rec.reorder_level,
      v_service_level, v_lookback,
      v_rec.primary_supplier_id, v_rec.source, now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      avg_daily_demand = EXCLUDED.avg_daily_demand,
      demand_std_dev = EXCLUDED.demand_std_dev,
      lead_time_days = EXCLUDED.lead_time_days,
      safety_stock = EXCLUDED.safety_stock,
      reorder_level = EXCLUDED.reorder_level,
      service_level = EXCLUDED.service_level,
      lookback_days = EXCLUDED.lookback_days,
      primary_supplier_id = EXCLUDED.primary_supplier_id,
      source = EXCLUDED.source,
      last_calculated_at = now(),
      updated_at = now()
    WHERE product_inventory_policies.manual_override = false;

    -- Update products.reorder_level (skip manual overrides)
    UPDATE products
    SET reorder_level = v_rec.reorder_level
    WHERE id = v_rec.product_id
      AND NOT EXISTS (
        SELECT 1 FROM product_inventory_policies pip
        WHERE pip.product_id = v_rec.product_id
          AND pip.manual_override = true
      );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
