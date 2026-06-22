-- Migration: Correct bill_totals to treat return lines as negative credits
-- Date: 2026-06-22
-- Description: Migration 001 excluded is_return lines from the subtotal.
--   That approach is still wrong: the original non-return round_item for the
--   returned product remains in the bill at its original quantity, so simply
--   excluding the return line leaves the original charge uncredited.
--
--   Correct model (matches POS calculations.js itemLineTotal):
--     return line value = -(price * quantity)   [credit to customer]
--     normal line value = +(price * quantity)   [charge to customer]
--
--   Example — 2 Beers @ 100, exchange 1 Beer for 1 Whisky @ 150:
--     Round 1: Beer qty=2 → +200
--     Round 2: Return Beer qty=1 (is_return=true) → -100  [credit]
--              Replacement Whisky qty=1 (is_return=false) → +150
--     CORRECT TOTAL = 250
--
--   With 001 (exclude approach): 200 + 150 = 350  ← still wrong
--   With this fix (credit approach): 200 - 100 + 150 = 250  ← correct

-- ── 1. Fix v_bill_item_totals ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_bill_item_totals AS
SELECT b.id AS bill_id,
    sum(
        CASE WHEN COALESCE(ri.is_return, false) = true
             THEN -(ri.price * ri.quantity::numeric)
             ELSE  ri.price * ri.quantity::numeric
        END
    ) AS computed_subtotal
FROM (
        (
            bills b
            JOIN rounds r ON ((r.bill_id = b.id))
        )
        JOIN round_items ri ON ((ri.round_id = r.id))
    )
GROUP BY b.id;

-- ── 2. Fix bill_totals ────────────────────────────────────────────────────────
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
    SELECT sum(
        CASE WHEN COALESCE(ri.is_return, false) = true
             THEN -(ri.quantity::numeric * ri.price)
             ELSE  ri.quantity::numeric * ri.price
        END
    ) AS subtotal
    FROM rounds r
    JOIN round_items ri ON ri.round_id = r.id
    WHERE r.bill_id = b.id
) item_totals ON true
LEFT JOIN LATERAL (
    SELECT
        sum(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) AS amount_paid,
        sum(CASE WHEN p.status = 'pending'   THEN p.amount ELSE 0 END) AS pending_amount
    FROM payments p
    WHERE p.bill_id = b.id
) pay_totals ON true;

-- ── 3. Backfill: close any 'open' bills whose balance_due is now <= 0 ─────────
UPDATE public.bills
SET status = 'completed'
WHERE status = 'open'
  AND id IN (
      SELECT bill_id
      FROM public.bill_totals
      WHERE balance_due <= 0
  );
