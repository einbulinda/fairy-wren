-- =============================================================
-- Product Movement Analysis: FAST / SLOW / NON_MOVING classification
-- based on days since last sale
-- =============================================================

-- Add movement threshold settings to existing config table
ALTER TABLE reorder_level_settings
  ADD COLUMN IF NOT EXISTS fast_moving_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS slow_moving_days INTEGER NOT NULL DEFAULT 90;

-- =============================================================
-- Function: get_product_movement_analysis
-- Returns every tracked product with its last sale date,
-- days since last sale, stock value, and movement category.
-- =============================================================
CREATE OR REPLACE FUNCTION get_product_movement_analysis(
  p_fast_days INTEGER DEFAULT 30,
  p_slow_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  product_id       UUID,
  product_name     VARCHAR,
  category_name    VARCHAR,
  unit             VARCHAR,
  current_stock    INTEGER,
  cost_price       NUMERIC,
  reorder_level    INTEGER,
  stock_value      NUMERIC,
  last_sale_date   TIMESTAMPTZ,
  days_since_last_sale INTEGER,
  movement_category VARCHAR
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id                                       AS product_id,
    p.name                                     AS product_name,
    c.name                                     AS category_name,
    p.unit                                     AS unit,
    COALESCE(p.current_stock, 0)::INTEGER      AS current_stock,
    COALESCE(p.cost_price, 0)                  AS cost_price,
    COALESCE(p.reorder_level, 0)::INTEGER      AS reorder_level,
    (COALESCE(p.current_stock, 0) * COALESCE(p.cost_price, 0))::NUMERIC AS stock_value,
    ls.last_sale_date,
    COALESCE(
      EXTRACT(DAY FROM (NOW() - ls.last_sale_date))::INTEGER,
      9999
    )                                          AS days_since_last_sale,
    CASE
      WHEN ls.last_sale_date IS NULL THEN 'NON_MOVING'
      WHEN EXTRACT(DAY FROM (NOW() - ls.last_sale_date))::INTEGER <= p_fast_days THEN 'FAST'
      WHEN EXTRACT(DAY FROM (NOW() - ls.last_sale_date))::INTEGER <= p_slow_days THEN 'SLOW'
      ELSE 'NON_MOVING'
    END                                        AS movement_category
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT MAX(b.created_at) AS last_sale_date
    FROM round_items ri
    JOIN rounds r  ON r.id  = ri.round_id
    JOIN bills  b  ON b.id  = r.bill_id
    WHERE ri.product_id = p.id
      AND b.status = 'completed'
  ) ls ON TRUE
  WHERE p.track_inventory = TRUE
    AND p.active = TRUE
  ORDER BY days_since_last_sale DESC;
$$;
