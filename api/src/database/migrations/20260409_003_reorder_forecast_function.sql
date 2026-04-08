-- Migration: 20260409_003_reorder_forecast_function.sql
-- Purpose: Weekly reorder forecast per product based on actual sales velocity.
--
-- Logic:
--   - Aggregates paid, completed bill line-items over a configurable lookback window.
--   - Splits daily demand into weekday (Mon-Fri) and weekend (Sat-Sun) averages,
--     using the exact count of each day type in the window so a short lookback
--     doesn't skew the average.
--   - Projected weekly demand  = avg_daily × 7
--   - Projected weekend demand = weekend_avg × 2 (falls back to avg_daily if no
--     weekend sales data exists in the window)
--   - Reorder qty = MAX(CEIL(weekly_demand × 1.2 - current_stock), 0)
--   - Preferred supplier = most-recent non-cancelled receipt for the product.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_reorder_forecast(
  p_lookback_days INTEGER DEFAULT 14
)
RETURNS TABLE (
  product_id             UUID,
  product_name           VARCHAR,
  category_name          VARCHAR,
  unit                   VARCHAR,
  current_stock          NUMERIC,
  cost_price             NUMERIC,
  avg_daily_qty          NUMERIC,
  weekday_avg_qty        NUMERIC,
  weekend_avg_qty        NUMERIC,
  projected_weekly_demand  NUMERIC,
  projected_weekend_demand NUMERIC,
  reorder_qty            INTEGER,
  last_supplier_id       UUID,
  last_supplier_name     VARCHAR,
  last_unit_cost         NUMERIC
)
LANGUAGE plpgsql STABLE AS $function$
DECLARE
  v_start_date    DATE    := CURRENT_DATE - p_lookback_days;
  v_weekday_count INTEGER;
  v_weekend_count INTEGER;
BEGIN
  -- Count exact weekday / weekend days in the lookback window
  -- (excludes today so only complete days are counted)
  SELECT
    COUNT(*) FILTER (WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5),
    COUNT(*) FILTER (WHERE EXTRACT(DOW FROM d) IN (0, 6))
  INTO v_weekday_count, v_weekend_count
  FROM generate_series(v_start_date, CURRENT_DATE - 1, '1 day'::interval) AS d;

  RETURN QUERY
  WITH
  -- Step 1: Daily quantity sold per product per day
  daily_sales AS (
    SELECT
      ri.product_id,
      DATE(pm.created_at)                    AS sale_date,
      EXTRACT(DOW FROM pm.created_at)::INTEGER AS day_of_week,  -- 0=Sun … 6=Sat
      SUM(ri.quantity)::NUMERIC              AS daily_qty
    FROM round_items ri
    JOIN rounds    r  ON r.id  = ri.round_id
    JOIN bills     b  ON b.id  = r.bill_id
    JOIN payments  pm ON pm.bill_id = b.id
    WHERE
      b.status    = 'completed'
      AND pm.is_paid = true
      AND DATE(pm.created_at) >= v_start_date
      AND DATE(pm.created_at) <  CURRENT_DATE
    GROUP BY ri.product_id, DATE(pm.created_at), EXTRACT(DOW FROM pm.created_at)
  ),

  -- Step 2: Per-product demand aggregates
  product_sales AS (
    SELECT
      product_id,
      -- Overall: total qty / total days in window
      SUM(daily_qty)::NUMERIC / GREATEST(p_lookback_days, 1) AS avg_daily_qty,
      -- Weekday (Mon-Fri): total weekday qty / number of weekdays in window
      COALESCE(
        SUM(daily_qty) FILTER (WHERE day_of_week BETWEEN 1 AND 5)::NUMERIC
          / NULLIF(v_weekday_count, 0),
        0
      ) AS weekday_avg_qty,
      -- Weekend (Sat-Sun): total weekend qty / number of weekend days in window
      COALESCE(
        SUM(daily_qty) FILTER (WHERE day_of_week IN (0, 6))::NUMERIC
          / NULLIF(v_weekend_count, 0),
        0
      ) AS weekend_avg_qty
    FROM daily_sales
    GROUP BY product_id
  ),

  -- Step 3: Most-recent non-cancelled receipt per product → preferred supplier
  last_receipt AS (
    SELECT DISTINCT ON (iri.product_id)
      iri.product_id,
      ir.supplier_id,
      s.name     AS supplier_name,
      iri.unit_cost
    FROM inventory_receipt_items iri
    JOIN inventory_receipts ir ON ir.id = iri.receipt_id
    JOIN suppliers          s  ON s.id  = ir.supplier_id
    WHERE ir.status != 'cancelled'
    ORDER BY iri.product_id, ir.purchase_date DESC, ir.created_at DESC
  )

  SELECT
    p.id                                              AS product_id,
    p.name                                            AS product_name,
    c.name                                            AS category_name,
    p.unit,
    COALESCE(p.current_stock, 0)                      AS current_stock,
    COALESCE(p.cost_price, 0)                         AS cost_price,
    ROUND(ps.avg_daily_qty,     2)                    AS avg_daily_qty,
    ROUND(ps.weekday_avg_qty,   2)                    AS weekday_avg_qty,
    ROUND(ps.weekend_avg_qty,   2)                    AS weekend_avg_qty,
    ROUND(ps.avg_daily_qty * 7, 1)                    AS projected_weekly_demand,
    -- Weekend demand: use weekend avg if available, otherwise fall back to overall avg
    ROUND(COALESCE(NULLIF(ps.weekend_avg_qty, 0), ps.avg_daily_qty) * 2, 1)
                                                      AS projected_weekend_demand,
    -- Reorder qty: cover one week at 120% of demand, minus what's already in stock
    GREATEST(
      CEIL(ps.avg_daily_qty * 7 * 1.2 - COALESCE(p.current_stock, 0))::INTEGER,
      0
    )                                                 AS reorder_qty,
    lr.supplier_id                                    AS last_supplier_id,
    lr.supplier_name                                  AS last_supplier_name,
    lr.unit_cost                                      AS last_unit_cost
  FROM products p
  LEFT JOIN categories  c  ON c.id = p.category_id
  JOIN  product_sales   ps ON ps.product_id = p.id
  LEFT JOIN last_receipt lr ON lr.product_id = p.id
  WHERE
    p.track_inventory = true
    AND p.active = true
  ORDER BY ps.avg_daily_qty DESC;
END;
$function$;
