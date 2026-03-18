-- Drop unique constraint that blocks multiple payments per bill (needed for split payments)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS ux_payments_bill_active;

-- Fix bill_totals fan-out bug: round_items x payments cross product
-- caused payment amounts to be multiplied by number of round items.
-- Uses LATERAL subqueries to aggregate independently.

DROP VIEW IF EXISTS public.bill_totals;
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
