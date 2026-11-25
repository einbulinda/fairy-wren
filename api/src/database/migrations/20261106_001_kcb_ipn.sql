-- Migration: KCB Instant Payment Notifications (phase 1 — receive & record)
-- Date: 2026-11-17
-- Description:
--   1. GL account 2300 "M-Pesa Unallocated Receipts" (clearing liability).
--   2. mpesa_transactions: one row per KCB till notification, idempotent on
--      KCB's transactionID.
--   3. post_mpesa_receipt_journal(): Dr 1020 KCB Account / Cr 2300 on receipt,
--      so the ledger matches the bank even before a POS user matches the
--      payment to bills. Allocation to bills (phase 3) then moves the money
--      Dr 2300 / Cr 1201 A/R Open Bills.

-- ── 1. Clearing account ─────────────────────────────────────────────────────
INSERT INTO public.chart_of_accounts (code, name, account_class, normal_balance, is_control_account, active)
SELECT '2300', 'M-Pesa Unallocated Receipts', 'current_liability', 'credit', false, true
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE code = '2300');

-- ── 2. Notifications table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source                      text NOT NULL DEFAULT 'kcb_till'
                                CHECK (source IN ('kcb_till', 'kcb_account')),
    transaction_id              text NOT NULL,          -- KCB receipt number (idempotency key)
    message_id                  text,
    originator_conversation_id  text,
    channel_code                text,
    business_key                text,                   -- our till / biller code (primaryData)
    bill_reference              text,                   -- what the customer typed (notificationData.businessKey)
    msisdn                      text,
    first_name                  text,
    middle_name                 text,
    last_name                   text,
    amount                      numeric(12, 2) NOT NULL CHECK (amount > 0),
    currency                    text NOT NULL DEFAULT 'KES',
    transaction_type            text,
    narration                   text,
    transaction_date_raw        text,
    transaction_at              timestamptz NOT NULL,
    allocated_amount            numeric(12, 2) NOT NULL DEFAULT 0,
    status                      text NOT NULL DEFAULT 'unallocated'
                                CHECK (status IN ('unallocated', 'partially_allocated', 'allocated')),
    receipt_journal_id          uuid REFERENCES public.journal_entries(id),
    raw_payload                 jsonb NOT NULL,
    signature_valid             boolean NOT NULL,
    received_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mpesa_transactions_transaction_id_key UNIQUE (transaction_id),
    CONSTRAINT mpesa_transactions_allocated_range
        CHECK (allocated_amount >= 0 AND allocated_amount <= amount)
);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status_at
    ON public.mpesa_transactions (status, transaction_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_transaction_at
    ON public.mpesa_transactions (transaction_at DESC);

-- ── 3. Receipt journal (idempotent) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_mpesa_receipt_journal(p_txn_id uuid)
RETURNS uuid LANGUAGE plpgsql AS $function$
DECLARE
    v_txn        mpesa_transactions%ROWTYPE;
    v_bank       uuid;
    v_clearing   uuid;
    v_journal_id uuid;
BEGIN
    SELECT * INTO v_txn FROM mpesa_transactions WHERE id = p_txn_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'M-Pesa transaction % not found', p_txn_id;
    END IF;

    IF v_txn.receipt_journal_id IS NOT NULL THEN
        RETURN v_txn.receipt_journal_id;
    END IF;

    SELECT id INTO v_bank     FROM chart_of_accounts WHERE code = '1020';
    SELECT id INTO v_clearing FROM chart_of_accounts WHERE code = '2300';
    IF v_bank IS NULL OR v_clearing IS NULL THEN
        RAISE EXCEPTION 'Missing GL account 1020 (KCB) or 2300 (M-Pesa Unallocated Receipts)';
    END IF;

    INSERT INTO journal_entries (entry_date, source_type, source_id, reference, description)
    VALUES (
        (v_txn.transaction_at AT TIME ZONE 'Africa/Nairobi')::date,
        'mpesa_receipt',
        p_txn_id,
        v_txn.transaction_id,
        'M-Pesa receipt ' || v_txn.transaction_id || ' - unallocated'
    )
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_bank,     v_txn.amount, 0),
           (v_journal_id, v_clearing, 0,            v_txn.amount);

    UPDATE mpesa_transactions
    SET receipt_journal_id = v_journal_id, updated_at = now()
    WHERE id = p_txn_id;

    RETURN v_journal_id;
END;
$function$;
