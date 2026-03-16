-- Fix void rate: only count voided bills that had items added
-- A bill voided with no items (empty void) should not be counted
DROP FUNCTION IF EXISTS rpc_bill_status_summary(DATE, DATE);
CREATE OR REPLACE FUNCTION rpc_bill_status_summary(p_start_date DATE, p_end_date DATE) RETURNS TABLE(status VARCHAR, count BIGINT) LANGUAGE sql STABLE AS $$
SELECT b.status,
  COUNT(*)::BIGINT AS count
FROM bills b
WHERE b.created_at::date BETWEEN p_start_date AND p_end_date
  AND (
    b.status != 'void'
    OR EXISTS (
      SELECT 1
      FROM rounds r
        JOIN round_items ri ON ri.round_id = r.id
      WHERE r.bill_id = b.id
    )
  )
GROUP BY b.status;
$$;