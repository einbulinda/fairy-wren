-- ============================================================================
-- Z-Report: Add outstanding bills movement section
-- Shows opening balance, added, paid, and closing outstanding for the day
-- Created: 09/04/2026 - einbulinda
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_z_report(p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $function$
DECLARE
    v_result jsonb;
    v_bills_summary jsonb;
    v_payment_breakdown jsonb;
    v_category_sales jsonb;
    v_product_sales jsonb;
    v_server_performance jsonb;
    v_hourly_sales jsonb;
    v_voids jsonb;
    v_outstanding jsonb;
BEGIN
    /* ---- Bills summary by status ---- */
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE b.status = 'completed'),
        'open', COUNT(*) FILTER (WHERE b.status = 'open'),
        'void', COUNT(*) FILTER (WHERE b.status = 'void'),
        'awaiting', COUNT(*) FILTER (WHERE b.status = 'awaiting_confirmation'),
        'total_revenue', COALESCE(SUM(
            CASE WHEN b.status IN ('completed', 'open', 'awaiting_confirmation')
            THEN bt.computed_subtotal ELSE 0 END
        ), 0),
        'completed_revenue', COALESCE(SUM(
            CASE WHEN b.status = 'completed' THEN bt.computed_subtotal ELSE 0 END
        ), 0),
        'outstanding_revenue', COALESCE(SUM(
            CASE WHEN b.status IN ('open', 'awaiting_confirmation')
            THEN bt.computed_subtotal ELSE 0 END
        ), 0),
        'void_value', COALESCE(SUM(
            CASE WHEN b.status = 'void' THEN bt.computed_subtotal ELSE 0 END
        ), 0)
    ) INTO v_bills_summary
    FROM bills b
    LEFT JOIN v_bill_item_totals bt ON bt.bill_id = b.id
    WHERE b.created_at::date = p_date;

    /* ---- Payment breakdown by type ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'payment_type', pt.payment_type,
        'total_amount', pt.total_amount,
        'count', pt.cnt
    ) ORDER BY pt.total_amount DESC), '[]'::jsonb)
    INTO v_payment_breakdown
    FROM (
        SELECT
            p.payment_type,
            SUM(p.amount) AS total_amount,
            COUNT(*) AS cnt
        FROM payments p
        JOIN bills b ON b.id = p.bill_id
        WHERE b.created_at::date = p_date
          AND p.status = 'confirmed'
        GROUP BY p.payment_type
    ) pt;

    /* ---- Category sales ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_name', cs.category_name,
        'total_quantity', cs.total_quantity,
        'total_sales', cs.total_sales
    ) ORDER BY cs.total_sales DESC), '[]'::jsonb)
    INTO v_category_sales
    FROM (
        SELECT
            c.name AS category_name,
            SUM(ri.quantity) AS total_quantity,
            SUM(ri.price * ri.quantity) AS total_sales
        FROM round_items ri
        JOIN rounds r ON r.id = ri.round_id
        JOIN bills b ON b.id = r.bill_id
        JOIN products p ON p.id = ri.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE r.created_at::date = p_date
          AND b.status != 'void'
        GROUP BY c.name
    ) cs;

    /* ---- Product sales (top 20) ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'product_name', ps.product_name,
        'quantity', ps.total_qty,
        'sales', ps.total_sales
    ) ORDER BY ps.total_sales DESC), '[]'::jsonb)
    INTO v_product_sales
    FROM (
        SELECT
            p.name AS product_name,
            SUM(ri.quantity) AS total_qty,
            SUM(ri.price * ri.quantity) AS total_sales
        FROM round_items ri
        JOIN rounds r ON r.id = ri.round_id
        JOIN bills b ON b.id = r.bill_id
        JOIN products p ON p.id = ri.product_id
        WHERE r.created_at::date = p_date
          AND b.status != 'void'
        GROUP BY p.name
        ORDER BY total_sales DESC
        LIMIT 20
    ) ps;

    /* ---- Server performance ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'server_name', sp.server_name,
        'bills_count', sp.bills_count,
        'revenue', sp.revenue
    ) ORDER BY sp.revenue DESC), '[]'::jsonb)
    INTO v_server_performance
    FROM (
        SELECT
            pf.name AS server_name,
            COUNT(DISTINCT b.id) AS bills_count,
            COALESCE(SUM(ri.price * ri.quantity), 0) AS revenue
        FROM bills b
        JOIN profiles pf ON pf.id = b.created_by
        LEFT JOIN rounds r ON r.bill_id = b.id
        LEFT JOIN round_items ri ON ri.round_id = r.id
        WHERE b.created_at::date = p_date
          AND b.status != 'void'
        GROUP BY pf.name
    ) sp;

    /* ---- Hourly sales distribution ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'hour', hs.hr,
        'revenue', hs.revenue,
        'orders', hs.orders
    ) ORDER BY hs.hr), '[]'::jsonb)
    INTO v_hourly_sales
    FROM (
        SELECT
            EXTRACT(HOUR FROM r.created_at) AS hr,
            SUM(ri.price * ri.quantity) AS revenue,
            COUNT(DISTINCT r.id) AS orders
        FROM rounds r
        JOIN round_items ri ON ri.round_id = r.id
        JOIN bills b ON b.id = r.bill_id
        WHERE r.created_at::date = p_date
          AND b.status != 'void'
        GROUP BY EXTRACT(HOUR FROM r.created_at)
    ) hs;

    /* ---- Voids detail ---- */
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'customer', COALESCE(b.customer_name, 'Walk-in'),
        'value', COALESCE(bt.computed_subtotal, 0),
        'created_by', pf.name,
        'items', (SELECT COUNT(*) FROM rounds r2 JOIN round_items ri2 ON ri2.round_id = r2.id WHERE r2.bill_id = b.id)
    ) ORDER BY bt.computed_subtotal DESC NULLS LAST), '[]'::jsonb)
    INTO v_voids
    FROM bills b
    LEFT JOIN v_bill_item_totals bt ON bt.bill_id = b.id
    LEFT JOIN profiles pf ON pf.id = b.created_by
    WHERE b.created_at::date = p_date
      AND b.status = 'void'
      AND COALESCE(bt.computed_subtotal, 0) > 0;

    /* ---- Outstanding bills movement ---- */
    --
    -- opening : ALL bills currently open/unpaid in the system that predate p_date.
    --           This covers the entire history — bills from days, weeks, or months ago
    --           that have never been fully settled.
    --           Value = bill_total minus any confirmed payments received before p_date.
    --
    -- added   : Bills first created on p_date that are still open at end of day.
    --
    -- paid    : Confirmed payments received on p_date against any pre-existing bill
    --           (whether it remains open or was fully settled today).
    --
    -- closing : Live outstanding — all bills with status open/awaiting at end of day,
    --           net of every confirmed payment to date.
    --
    WITH
    confirmed_payments AS (
        -- All confirmed payments, partitioned by whether they landed before or on p_date
        SELECT
            bill_id,
            SUM(amount) FILTER (WHERE created_at::date <  p_date) AS paid_before,
            SUM(amount) FILTER (WHERE created_at::date =  p_date) AS paid_today
        FROM payments
        WHERE status = 'confirmed'
        GROUP BY bill_id
    ),
    bill_data AS (
        SELECT
            b.id,
            b.created_at::date                              AS bill_date,
            b.status,
            COALESCE(b.customer_name, 'Walk-in')            AS customer_name,
            COALESCE(pf.name, '—')                          AS server_name,
            COALESCE(bt.computed_subtotal, 0)               AS bill_total,
            COALESCE(cp.paid_before, 0)                     AS paid_before,
            COALESCE(cp.paid_today,  0)                     AS paid_today
        FROM bills b
        LEFT JOIN v_bill_item_totals bt ON bt.bill_id = b.id
        LEFT JOIN confirmed_payments cp ON cp.bill_id = b.id
        LEFT JOIN profiles pf           ON pf.id = b.created_by
        WHERE b.status != 'void'
    ),
    agg AS (
        SELECT
            -- Opening: every open/awaiting bill from any date before today,
            -- valued at what was owed at the very start of p_date (before today's payments).
            COALESCE(SUM(GREATEST(bill_total - paid_before, 0))
                FILTER (WHERE bill_date < p_date
                          AND status IN ('open', 'awaiting_confirmation')), 0)          AS opening,

            -- Added: new bills opened today that are still unpaid at end of day.
            COALESCE(SUM(GREATEST(bill_total - paid_before - paid_today, 0))
                FILTER (WHERE bill_date = p_date
                          AND status IN ('open', 'awaiting_confirmation')), 0)          AS added,

            -- Paid: all payments received today on bills that existed before today.
            COALESCE(SUM(paid_today)
                FILTER (WHERE bill_date < p_date AND paid_today > 0), 0)                AS paid,

            -- Closing: live outstanding on all currently open/awaiting bills.
            COALESCE(SUM(GREATEST(bill_total - paid_before - paid_today, 0))
                FILTER (WHERE status IN ('open', 'awaiting_confirmation')), 0)          AS closing,

            -- Count of currently open bills (all ages).
            COUNT(*) FILTER (WHERE status IN ('open', 'awaiting_confirmation'))         AS open_count
        FROM bill_data
    ),
    added_bill_list AS (
        -- Bills created today that are still open (the "added" detail)
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',          id,
            'customer',    customer_name,
            'server',      server_name,
            'bill_total',  bill_total,
            'paid',        paid_before + paid_today,
            'outstanding', GREATEST(bill_total - paid_before - paid_today, 0)
        ) ORDER BY bill_total DESC), '[]'::jsonb) AS data
        FROM bill_data
        WHERE bill_date = p_date
          AND status IN ('open', 'awaiting_confirmation')
    ),
    paid_bill_list AS (
        -- Pre-existing bills that received payments today (the "paid" detail)
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',          id,
            'customer',    customer_name,
            'server',      server_name,
            'bill_total',  bill_total,
            'paid_today',  paid_today,
            'outstanding', GREATEST(bill_total - paid_before - paid_today, 0)
        ) ORDER BY paid_today DESC), '[]'::jsonb) AS data
        FROM bill_data
        WHERE bill_date < p_date
          AND paid_today > 0
    )
    SELECT jsonb_build_object(
        'opening',     a.opening,
        'added',       a.added,
        'paid',        a.paid,
        'closing',     a.closing,
        'open_count',  a.open_count,
        -- positive = outstanding grew (bad), negative = outstanding shrank (good)
        'change_pct', CASE
            WHEN a.opening > 0
            THEN ROUND(((a.closing - a.opening) / a.opening * 100)::numeric, 1)
            ELSE NULL
        END,
        'added_bills', (SELECT data FROM added_bill_list),
        'paid_bills',  (SELECT data FROM paid_bill_list)
    ) INTO v_outstanding
    FROM agg a;

    /* ---- Assemble result ---- */
    v_result := jsonb_build_object(
        'report_date', p_date,
        'bills',       v_bills_summary,
        'payments',    v_payment_breakdown,
        'categories',  v_category_sales,
        'products',    v_product_sales,
        'servers',     v_server_performance,
        'hourly',      v_hourly_sales,
        'voids',       v_voids,
        'outstanding', v_outstanding
    );

    RETURN v_result;
END;
$function$;
