/*
 ======================================================
 REVENUE RECOGNITION AT POINT OF SERVICE
 ======================================================
 Per IFRS 15.31-34, revenue is recognized when control
 transfers to the customer (drink served). Per IAS 2.34,
 COGS is matched to the same period.

 Changes:
 1. New account: 1201 - Accounts Receivable (Open Bills)
 2. New function: post_round_sale() - posts inventory + COGS + revenue at round submission
 3. New function: reverse_bill_sale() - reverses all postings on bill void
 4. Modified: post_payment_journal() - settles A/R instead of recognizing revenue
 5. Modified: process_payment() - removed inventory deduction loops
 6. Dropped: trg_bill_completed_inventory trigger (no longer needed)

 Date: 2026-02-27
 ======================================================
 */

-- 1. Seed A/R Open Bills account
INSERT INTO chart_of_accounts (name, code, account_class, normal_balance, active, is_control_account)
VALUES ('Accounts Receivable - Open Bills', '1201', 'asset', 'debit', true, false)
ON CONFLICT DO NOTHING;

-- 2. Drop the bill completion trigger (inventory now posted at round submission)
DROP TRIGGER IF EXISTS trg_bill_completed_inventory ON bills;

/*
 ======================================================
 3. BACKFILL: Post inventory + revenue for items in
    existing open/awaiting_confirmation bills.

    These items were served before this migration but
    never posted to inventory_movements (old system
    deferred everything to payment confirmation).

    This calls post_round_sale() for each unposted round,
    which handles:
      - inventory_movements (sale, -qty)
      - COGS journal (Dr COGS, Cr Inventory)
      - Revenue journal (Dr A/R 1201, Cr Sales 4000)
      - Sets inventory_posted = true

    Safe to re-run: post_round_sale() has an idempotency
    guard (checks source_type='round_sale' + source_id).
 ======================================================
 */
DO $$
DECLARE
    v_round RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Backfilling open bill rounds...';

    FOR v_round IN
        SELECT DISTINCT r.id AS round_id, b.id AS bill_id, b.customer_name, r.created_at
        FROM rounds r
        JOIN bills b ON b.id = r.bill_id
        JOIN round_items ri ON ri.round_id = r.id
        WHERE b.status IN ('open', 'awaiting_confirmation')
          AND ri.inventory_posted = false
        ORDER BY r.created_at
    LOOP
        RAISE NOTICE 'Posting round % for bill % (%)',
            v_round.round_id, v_round.bill_id, v_round.customer_name;

        PERFORM post_round_sale(v_round.round_id);
        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Backfill complete. Processed % rounds.', v_count;
END;
$$;
