-- Migration: Exclude return lines from bill subtotal calculations
-- Date: 2026-06-22
-- Description: When an item exchange occurs, two lines are inserted into round_items:
--   a return line (is_return = true) and a replacement line (is_return = false).
--   Both views previously summed ALL round_items with no filter, causing the return
--   line's value to be ADDED to the subtotal rather than excluded.  This inflated
--   bill_totals.balance_due so bills with full payment on exchanged items never
--   satisfied the process_payment() completion check (balance_due <= 0).
--
--   Fix: add AND COALESCE(ri.is_return, false) = false to both affected views.
--
--   Backfill: after the view is corrected, any 'open' bill whose balance_due is
--   now <= 0 was only stuck due to this bug and is marked 'completed'.

-- ── 1. Fix v_bill_item_totals (used by v_bill_totals → v_bill_financials) ─────
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
WHERE COALESCE(ri.is_return, false) = false
GROUP BY b.id;

-- ── 2. Fix bill_totals (used directly by process_payment()) ──────────────────
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
      AND COALESCE(ri.is_return, false) = false
) item_totals ON true
LEFT JOIN LATERAL (
    SELECT
        sum(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) AS amount_paid,
        sum(CASE WHEN p.status = 'pending'   THEN p.amount ELSE 0 END) AS pending_amount
    FROM payments p
    WHERE p.bill_id = b.id
) pay_totals ON true;

-- ── 3. Backfill: close bills that were stuck open due to the inflated subtotal ─
-- Only targets 'open' bills where balance_due is now <= 0 with the corrected view.
-- Excludes void bills. Safe to re-run (WHERE status = 'open' is idempotent).
UPDATE public.bills
SET status = 'completed'
WHERE status = 'open'
  AND id IN (
      SELECT bill_id
      FROM public.bill_totals
      WHERE balance_due <= 0
  );
