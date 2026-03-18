CREATE OR REPLACE VIEW public.v_bill_totals AS
SELECT b.id AS bill_id,
    COALESCE(it.computed_subtotal, (0)::numeric) AS subtotal,
    b.tax,
    (
        COALESCE(it.computed_subtotal, (0)::numeric) + COALESCE(b.tax, (0)::numeric)
    ) AS total
FROM (
        bills b
        LEFT JOIN v_bill_item_totals it ON ((it.bill_id = b.id))
    );
CREATE OR REPLACE VIEW public.inventory_on_hand AS
SELECT product_id,
    GREATEST(sum(quantity), (0)::numeric) AS quantity_on_hand
FROM inventory_movements im
GROUP BY product_id;
CREATE OR REPLACE VIEW public.v_avg_bill_value AS
SELECT avg(total) AS avg_bill_value
FROM v_bill_totals bt;
CREATE OR REPLACE VIEW public.v_bill_payments AS
SELECT bill_id,
    sum(amount) AS paid_amount
FROM payments
WHERE (is_paid = true)
GROUP BY bill_id;
CREATE OR REPLACE VIEW public.v_bill_financials AS
SELECT bt.bill_id,
    bt.total AS bill_total,
    COALESCE(bp.paid_amount, (0)::numeric) AS paid_amount,
    (
        bt.total - COALESCE(bp.paid_amount, (0)::numeric)
    ) AS outstanding_amount
FROM (
        v_bill_totals bt
        LEFT JOIN v_bill_payments bp ON ((bp.bill_id = bt.bill_id))
    );
CREATE OR REPLACE VIEW public.v_category_sales AS
SELECT c.id AS category_id,
    c.name AS category_name,
    sum(ri.quantity) AS total_quantity,
    sum((ri.price * (ri.quantity)::numeric)) AS total_sales
FROM (
        (
            (
                (
                    round_items ri
                    JOIN rounds r ON ((r.id = ri.round_id))
                )
                JOIN bills b ON ((b.id = r.bill_id))
            )
            JOIN products p ON ((p.id = ri.product_id))
        )
        JOIN categories c ON ((c.id = p.category_id))
    )
WHERE ((b.status)::text = 'completed'::text)
GROUP BY c.id,
    c.name;
CREATE OR REPLACE VIEW public.v_bill_item_totals AS
SELECT b.id AS bill_id,
    sum((ri.price * (ri.quantity)::numeric)) AS computed_subtotal
FROM (
        (
            bills b
            JOIN rounds r ON ((r.bill_id = b.id))
        )
        JOIN round_items ri ON ((ri.round_id = r.id))
    )
GROUP BY b.id;
CREATE OR REPLACE VIEW public.v_daily_revenue AS
SELECT date(created_at) AS business_date,
    sum(amount) AS total_revenue
FROM payments p
WHERE (is_paid = true)
GROUP BY (date(created_at));
CREATE OR REPLACE VIEW public.v_payment_type_summary AS
SELECT date(created_at) AS business_date,
    payment_type,
    sum(amount) AS total_amount
FROM payments
WHERE (is_paid = true)
GROUP BY (date(created_at)),
    payment_type;
CREATE OR REPLACE VIEW public.vw_stock_take_adjustments_report AS
SELECT st.id AS 'stockTakeId',
    st.completed_at AS 'completedAt',
    st.created_at AS 'createdAt',
    st.stock_take_name AS 'stockTakeName',
    st.stock_take_type AS 'stockTakeType',
    st.location,
    st.approval_status AS 'approvalStatus',
    st.approval_notes AS 'approvalNotes',
    u_performed.id AS 'performedById',
    u_performed.name AS 'performedBy',
    u_performed.role AS 'performedByRole',
    u_reviewed.id AS 'reviewedById',
    u_reviewed.name AS 'reviewedBy',
    st.reviewed_at AS 'reviewedAt',
    p.id AS 'productId',
    p.name AS 'productName',
    ct.name AS category,
    sti.system_qty AS 'systemQty',
    sti.physical_qty AS 'physicalQty',
    sti.cost_per_unit AS 'costPerUnit',
    sti.total_value_adjustment AS 'totalValueAdjustment',
    sti.variance_percentage AS 'variancePercentage',
    sti.reason,
    sti.notes,
    sti.adjustment_frequency AS 'adjustmentFrequency',
    sti.created_at AS 'itemCreatedAt'
FROM (
        (
            (
                (
                    (
                        stock_takes st
                        LEFT JOIN profiles u_performed ON ((st.performed_by_id = u_performed.id))
                    )
                    LEFT JOIN profiles u_reviewed ON ((st.reviewed_by_id = u_reviewed.id))
                )
                LEFT JOIN stock_take_items sti ON ((st.id = sti.stock_take_id))
            )
            LEFT JOIN products p ON ((sti.product_id = p.id))
        )
        LEFT JOIN categories ct ON ((p.category_id = ct.id))
    )
ORDER BY st.created_at DESC,
    sti.created_at;
CREATE OR REPLACE VIEW public.inventory_avg_cost AS
SELECT product_id,
    sum(quantity) AS qty_on_hand,
    CASE
        WHEN (sum(quantity) = (0)::numeric) THEN (0)::numeric
        ELSE (sum((quantity * unit_cost)) / sum(quantity))
    END AS avg_unit_cost
FROM inventory_movements im
GROUP BY product_id;
CREATE OR REPLACE VIEW public.products_with_stock AS
SELECT p.id,
    p.name,
    p.price,
    p.active,
    p.category_id,
    c.name AS category_name,
    COALESCE(ih.quantity_on_hand, (0)::numeric) AS current_stock
FROM (
        (
            products p
            LEFT JOIN inventory_on_hand ih ON ((ih.product_id = p.id))
        )
        LEFT JOIN categories c ON ((c.id = p.category_id))
    );
CREATE OR REPLACE VIEW public.bill_totals AS
SELECT b.id AS bill_id,
    b.customer_name AS customer,
    b.created_by AS created_by_id,
    u.name AS created_by_name,
    COALESCE(item_totals.subtotal, (0)::numeric) AS subtotal,
    (0)::numeric AS tax,
    COALESCE(item_totals.subtotal, (0)::numeric) AS total,
    COALESCE(pay_totals.amount_paid, (0)::numeric) AS amount_paid,
    COALESCE(pay_totals.pending_amount, (0)::numeric) AS pending_amount,
    (
        COALESCE(item_totals.subtotal, (0)::numeric)
        - COALESCE(pay_totals.amount_paid, (0)::numeric)
    ) AS balance_due,
    (
        COALESCE(item_totals.subtotal, (0)::numeric)
        - COALESCE(pay_totals.amount_paid, (0)::numeric)
        - COALESCE(pay_totals.pending_amount, (0)::numeric)
    ) AS payable_amount
FROM bills b
LEFT JOIN profiles u ON u.id = b.created_by
LEFT JOIN LATERAL (
    SELECT sum(ri.quantity::numeric * ri.price) AS subtotal
    FROM rounds r
    JOIN round_items ri ON ri.round_id = r.id
    WHERE r.bill_id = b.id
) item_totals ON true
LEFT JOIN LATERAL (
    SELECT
        sum(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) AS amount_paid,
        sum(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) AS pending_amount
    FROM payments p
    WHERE p.bill_id = b.id
) pay_totals ON true;
CREATE OR REPLACE VIEW public.inventory_current_stock AS
SELECT im.product_id,
    p.name,
    c.name AS category_name,
    COALESCE(sum(im.quantity), (0)::numeric) AS current_stock
FROM (
        (
            inventory_movements im
            LEFT JOIN products p ON ((im.product_id = p.id))
        )
        LEFT JOIN categories c ON ((p.category_id = c.id))
    )
GROUP BY im.product_id,
    p.name,
    c.name
ORDER BY COALESCE(sum(im.quantity), (0)::numeric) DESC;
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
SELECT id,
    name,
    description,
    secret,
    convert_from(
        vault._crypto_aead_det_decrypt(
            message => decode(secret, 'base64'::text),
            additional => convert_to((id)::text, 'utf8'::name),
            key_id => (0)::bigint,
            context => '\x7067736f6469756d'::bytea,
            nonce => nonce
        ),
        'utf8'::name
    ) AS decrypted_secret,
    key_id,
    nonce,
    created_at,
    updated_at
FROM vault.secrets s;
CREATE OR REPLACE VIEW extensions.pg_stat_statements_info AS
SELECT dealloc,
    stats_reset
FROM pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset);
CREATE OR REPLACE VIEW extensions.pg_stat_statements AS
SELECT userid,
    dbid,
    toplevel,
    queryid,
    query,
    plans,
    total_plan_time,
    min_plan_time,
    max_plan_time,
    mean_plan_time,
    stddev_plan_time,
    calls,
    total_exec_time,
    min_exec_time,
    max_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_dirtied,
    shared_blks_written,
    local_blks_hit,
    local_blks_read,
    local_blks_dirtied,
    local_blks_written,
    temp_blks_read,
    temp_blks_written,
    shared_blk_read_time,
    shared_blk_write_time,
    local_blk_read_time,
    local_blk_write_time,
    temp_blk_read_time,
    temp_blk_write_time,
    wal_records,
    wal_fpi,
    wal_bytes,
    jit_functions,
    jit_generation_time,
    jit_inlining_count,
    jit_inlining_time,
    jit_optimization_count,
    jit_optimization_time,
    jit_emission_count,
    jit_emission_time,
    jit_deform_count,
    jit_deform_time,
    stats_since,
    minmax_stats_since
FROM pg_stat_statements(true) pg_stat_statements(
        userid,
        dbid,
        toplevel,
        queryid,
        query,
        plans,
        total_plan_time,
        min_plan_time,
        max_plan_time,
        mean_plan_time,
        stddev_plan_time,
        calls,
        total_exec_time,
        min_exec_time,
        max_exec_time,
        mean_exec_time,
        stddev_exec_time,
        rows,
        shared_blks_hit,
        shared_blks_read,
        shared_blks_dirtied,
        shared_blks_written,
        local_blks_hit,
        local_blks_read,
        local_blks_dirtied,
        local_blks_written,
        temp_blks_read,
        temp_blks_written,
        shared_blk_read_time,
        shared_blk_write_time,
        local_blk_read_time,
        local_blk_write_time,
        temp_blk_read_time,
        temp_blk_write_time,
        wal_records,
        wal_fpi,
        wal_bytes,
        jit_functions,
        jit_generation_time,
        jit_inlining_count,
        jit_inlining_time,
        jit_optimization_count,
        jit_optimization_time,
        jit_emission_count,
        jit_emission_time,
        jit_deform_count,
        jit_deform_time,
        stats_since,
        minmax_stats_since
    );