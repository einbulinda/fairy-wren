-- Fix: ROUND(double precision, integer) does not exist in PostgreSQL
-- Cast SQRT() results to NUMERIC before passing to ROUND()

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
  v_z_score := CASE
    WHEN p_service_level >= 0.99  THEN 2.33
    WHEN p_service_level >= 0.975 THEN 1.96
    WHEN p_service_level >= 0.95  THEN 1.65
    WHEN p_service_level >= 0.90  THEN 1.28
    ELSE 1.04
  END;

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
    ROUND(COALESCE(dms.avg_demand, 0)::NUMERIC, 4) AS avg_daily_demand,
    ROUND(COALESCE(dms.std_demand, 0)::NUMERIC, 4) AS demand_std_dev,
    COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC AS lead_time_days,
    ROUND(
      (v_z_score * COALESCE(dms.std_demand, 0)
        * SQRT(COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC))::NUMERIC,
      2
    ) AS safety_stock,
    GREATEST(
      ROUND(
        ((COALESCE(dms.avg_demand, 0)
          * COALESCE(sl.supplier_lead_time, v_default_lead_time))
        + (v_z_score * COALESCE(dms.std_demand, 0)
          * SQRT(COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC)))::NUMERIC,
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
