-- ============================================================================
-- Migration: Invoice number on every bill
-- Date: 2026-11-26
--
-- Each bill gets an invoice number in the format chosen for M-Pesa
-- (plans/KCB_STK_PUSH_IMPLEMENTATION_PLAN.md §8): "FW" + 4 Crockford base32
-- characters, e.g. FWZ1SW, from a sequence that never cycles through a
-- one-to-one shuffle, so a number is never issued twice.
--
--   * New bills get one automatically on insert (trigger), whatever code path
--     creates them; it can't be changed afterwards.
--   * Existing bills are backfilled in creation order by
--     backfill_bill_invoice_numbers(), which can be run again at any time.
--   * M-Pesa prompts (STK) now use their bill's invoice number as the
--     account reference instead of a new reference per prompt, so the number
--     printed on the receipt is the one on the customer's M-Pesa SMS.
--
-- Replaces the per-prompt reference from 20261126_002 (same sequence, so
-- numbers already given to prompts are never reused).
-- ============================================================================

-- ── 1. Generator (renamed from the STK reference functions) ─────────────────
ALTER SEQUENCE IF EXISTS public.mpesa_stk_ref_seq RENAME TO bill_invoice_seq;
CREATE SEQUENCE IF NOT EXISTS public.bill_invoice_seq MINVALUE 1 MAXVALUE 1048576 NO CYCLE;

CREATE OR REPLACE FUNCTION public.invoice_number_for(p_n bigint)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE
    v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    v_code     bigint := (p_n * 648059 + 369601) % 1048576;
    v_out      text := '';
BEGIN
    FOR i IN 1..4 LOOP
        v_out  := substr(v_alphabet, (v_code % 32)::int + 1, 1) || v_out;
        v_code := v_code / 32;
    END LOOP;
    RETURN 'FW' || v_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql AS $function$
BEGIN
    RETURN invoice_number_for(nextval('bill_invoice_seq'));
EXCEPTION WHEN sequence_generator_limit_exceeded THEN
    RAISE EXCEPTION 'INVOICE_NUMBERS_EXHAUSTED';
END;
$function$;

DROP FUNCTION IF EXISTS public.mpesa_stk_next_ref();
DROP FUNCTION IF EXISTS public.mpesa_stk_ref_for(bigint);

-- ── 2. Column + guard ───────────────────────────────────────────────────────
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE OR REPLACE FUNCTION public.bills_invoice_number_guard()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.invoice_number IS NULL THEN
            NEW.invoice_number := next_invoice_number();
        END IF;
    ELSIF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
          AND OLD.invoice_number IS NOT NULL THEN
        RAISE EXCEPTION 'INVOICE_NUMBER_IMMUTABLE'
            USING DETAIL = format('bill %s keeps invoice number %s', OLD.id, OLD.invoice_number);
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_bills_invoice_number ON public.bills;
CREATE TRIGGER trg_bills_invoice_number
    BEFORE INSERT OR UPDATE OF invoice_number ON public.bills
    FOR EACH ROW EXECUTE FUNCTION bills_invoice_number_guard();

-- ── 3. Backfill (reusable) ──────────────────────────────────────────────────
-- Numbers bills without one, oldest first. Returns how many were numbered.
-- Locks bills against inserts while it reserves a block of the sequence.
CREATE OR REPLACE FUNCTION public.backfill_bill_invoice_numbers()
RETURNS integer LANGUAGE plpgsql AS $function$
DECLARE
    v_count integer;
    v_first bigint;
BEGIN
    LOCK TABLE bills IN SHARE ROW EXCLUSIVE MODE;

    SELECT count(*) INTO v_count FROM bills WHERE invoice_number IS NULL;
    IF v_count = 0 THEN
        RETURN 0;
    END IF;

    -- Reserve v_first .. v_first + v_count - 1.
    v_first := nextval('bill_invoice_seq');
    IF v_first + v_count - 1 > 1048576 THEN
        RAISE EXCEPTION 'INVOICE_NUMBERS_EXHAUSTED';
    END IF;
    PERFORM setval('bill_invoice_seq', v_first + v_count - 1);

    UPDATE bills b
    SET invoice_number = invoice_number_for(v_first + o.rn - 1)
    FROM (
        SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
        FROM bills WHERE invoice_number IS NULL
    ) o
    WHERE b.id = o.id;

    RETURN v_count;
END;
$function$;

SELECT backfill_bill_invoice_numbers();

ALTER TABLE public.bills ALTER COLUMN invoice_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bills_invoice_number ON public.bills (invoice_number);

-- ── 4. Prompts share their bill's number ────────────────────────────────────
-- Several prompts for one bill (resend, split payment) now carry the same
-- reference, so it is no longer unique per prompt.
ALTER TABLE public.mpesa_stk_requests DROP CONSTRAINT IF EXISTS mpesa_stk_requests_account_ref_key;
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_account_ref
    ON public.mpesa_stk_requests (account_ref, created_at DESC);

-- ── 5. Link a till IPN to a prompt (reference now identifies the bill) ──────
-- Order of preference:
--   1. the prompt whose M-Pesa receipt this IPN carries;
--   2. a prompt of this invoice, same amount, already paid by its callback,
--      not yet linked to another IPN → this IPN is the copy (linked);
--   3. the latest unpaid prompt of this invoice for the same amount → the IPN
--      proves the payment (applied to the bill).
--   4. no prompt, but the bill reference carries an invoice number
--      (e.g. "8040662#FWPD0Z" from the receipt) of an open bill → the payment
--      is applied to that bill automatically, up to its balance; any excess
--      stays open for the cashier. Unknown, closed or fully paid invoice →
--      the payment stays unallocated.
-- Automatic matches (invoice number in the IPN) have no cashier: NULL = automatic.
ALTER TABLE public.mpesa_allocations ALTER COLUMN allocated_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.link_mpesa_ipn_to_stk(p_txn_id uuid)
RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_txn     mpesa_transactions%ROWTYPE;
    v_req     mpesa_stk_requests%ROWTYPE;
    v_ref     text;
    v_problem text;
    v_inv     text;
    v_bill    bills%ROWTYPE;
    v_payable numeric;
    v_amount  numeric;
BEGIN
    SELECT * INTO v_txn FROM mpesa_transactions WHERE id = p_txn_id FOR UPDATE;
    IF NOT FOUND OR v_txn.source <> 'kcb_till' OR v_txn.status <> 'unallocated'
       OR v_txn.allocated_amount > 0 OR v_txn.stk_request_id IS NOT NULL THEN
        RETURN json_build_object('action', 'none');
    END IF;

    v_ref := upper(substring(concat_ws(' ', v_txn.bill_reference, v_txn.narration)
                             FROM '(?i)FW[0-9A-HJKMNP-TV-Z]{4}'));

    -- 1. By receipt
    SELECT * INTO v_req FROM mpesa_stk_requests
    WHERE mpesa_receipt IS NOT NULL
      AND (mpesa_receipt = v_txn.transaction_id
           OR v_txn.narration ILIKE '%' || mpesa_receipt || '%')
    LIMIT 1 FOR UPDATE;

    -- 2. Paid prompt of this invoice → this IPN is its copy
    IF NOT FOUND AND v_ref IS NOT NULL THEN
        SELECT r.* INTO v_req FROM mpesa_stk_requests r
        WHERE r.account_ref = v_ref
          AND r.status = 'paid'
          AND r.paid_via = 'callback'   -- paid via an IPN: a second IPN is new money
          AND r.paid_amount = v_txn.amount
          AND r.mpesa_transaction_id IS NOT NULL
          AND r.mpesa_transaction_id <> v_txn.id
          AND NOT EXISTS (SELECT 1 FROM mpesa_transactions d
                          WHERE d.duplicate_of = r.mpesa_transaction_id)
        ORDER BY r.paid_at DESC
        LIMIT 1 FOR UPDATE;
    END IF;

    -- 3. Unpaid prompt of this invoice for this amount
    IF NOT FOUND AND v_ref IS NOT NULL THEN
        SELECT r.* INTO v_req FROM mpesa_stk_requests r
        WHERE r.account_ref = v_ref
          AND r.status <> 'paid'
          AND r.amount = v_txn.amount
        ORDER BY (r.status IN ('pending', 'waiting')) DESC, r.created_at DESC
        LIMIT 1 FOR UPDATE;
    END IF;

    IF FOUND THEN
        IF v_req.status = 'paid' AND v_req.mpesa_transaction_id IS NOT NULL
           AND v_req.mpesa_transaction_id <> v_txn.id THEN
            UPDATE mpesa_transactions
            SET status = 'linked', duplicate_of = v_req.mpesa_transaction_id,
                stk_request_id = v_req.id, updated_at = now()
            WHERE id = v_txn.id;
            RETURN json_build_object('action', 'linked', 'request_id', v_req.id,
                                     'duplicate_of', v_req.mpesa_transaction_id);
        END IF;

        UPDATE mpesa_transactions SET stk_request_id = v_req.id, updated_at = now()
        WHERE id = v_txn.id;

        IF v_txn.amount <> v_req.amount THEN
            RETURN json_build_object('action', 'none', 'request_id', v_req.id, 'reason', 'amount differs');
        END IF;

        v_problem := mpesa_stk_apply_to_bill(v_req, v_txn.id);
        UPDATE mpesa_stk_requests
        SET status = 'paid', paid_via = 'ipn',
            mpesa_receipt = COALESCE(mpesa_receipt, v_txn.transaction_id),
            paid_amount = v_txn.amount, paid_at = v_txn.transaction_at,
            mpesa_transaction_id = v_txn.id, problem = v_problem, updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('action', 'applied', 'request_id', v_req.id, 'problem', v_problem);
    END IF;

    -- 4. Invoice number in the bill reference (not the narration): pay that bill.
    --    Letters may not touch it on the left, nor letters/digits on the right,
    --    so "8040662#FWPD0Z", "8040662FWPD0Z" and "fwpd0z" match.
    v_inv := upper(substring(v_txn.bill_reference
                             FROM '(?i)(?:^|[^A-Z])(FW[0-9A-HJKMNP-TV-Z]{4})(?:$|[^0-9A-Z])'));
    IF v_inv IS NOT NULL THEN
        SELECT * INTO v_bill FROM bills WHERE invoice_number = v_inv FOR UPDATE;
        IF NOT FOUND THEN
            RETURN json_build_object('action', 'none', 'invoice', v_inv, 'reason', 'no such invoice');
        END IF;
        IF v_bill.status NOT IN ('open', 'awaiting_confirmation') THEN
            RETURN json_build_object('action', 'none', 'invoice', v_inv, 'bill_id', v_bill.id,
                                     'reason', 'bill is ' || v_bill.status);
        END IF;

        SELECT payable_amount INTO v_payable FROM bill_totals WHERE bill_id = v_bill.id;
        v_amount := LEAST(v_txn.amount, COALESCE(v_payable, 0));
        IF v_amount <= 0 THEN
            RETURN json_build_object('action', 'none', 'invoice', v_inv, 'bill_id', v_bill.id,
                                     'reason', 'bill has no balance left');
        END IF;

        BEGIN
            PERFORM allocate_mpesa_transaction(
                v_txn.id,
                jsonb_build_array(jsonb_build_object(
                    'type', 'bill', 'bill_id', v_bill.id, 'amount', v_amount::text)),
                NULL,   -- automatic: no cashier
                NULL);
        EXCEPTION WHEN raise_exception THEN
            RETURN json_build_object('action', 'none', 'invoice', v_inv, 'bill_id', v_bill.id,
                'reason', SQLERRM || COALESCE(': ' || NULLIF(PG_EXCEPTION_DETAIL, ''), ''));
        END;

        RETURN json_build_object('action', 'applied_invoice', 'invoice', v_inv, 'bill_id', v_bill.id,
                                 'amount', v_amount, 'left_open', v_txn.amount - v_amount);
    END IF;

    -- Safety net: same phone and amount as a prompt paid in the last 10 min.
    SELECT * INTO v_req FROM mpesa_stk_requests r
    WHERE r.status = 'paid'
      AND r.phone = v_txn.msisdn
      AND r.paid_amount = v_txn.amount
      AND r.paid_at BETWEEN v_txn.transaction_at - interval '10 minutes'
                        AND v_txn.transaction_at + interval '10 minutes'
      AND r.mpesa_transaction_id IS NOT NULL
      AND r.mpesa_transaction_id <> v_txn.id
      AND NOT EXISTS (SELECT 1 FROM mpesa_transactions d
                      WHERE d.duplicate_of = r.mpesa_transaction_id
                         OR d.possible_duplicate_of = r.mpesa_transaction_id)
    ORDER BY abs(extract(epoch FROM r.paid_at - v_txn.transaction_at))
    LIMIT 1;

    IF FOUND THEN
        UPDATE mpesa_transactions
        SET possible_duplicate_of = v_req.mpesa_transaction_id, updated_at = now()
        WHERE id = v_txn.id;
        RETURN json_build_object('action', 'flagged', 'request_id', v_req.id,
                                 'possible_duplicate_of', v_req.mpesa_transaction_id);
    END IF;

    RETURN json_build_object('action', 'none');
END;
$function$;


-- ---------------------------------------------------------------------------
-- ERP dashboard: outstanding bills carry the invoice number (the return type
-- changes, so the function is dropped and recreated).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rpc_outstanding_bills(date, date);
CREATE FUNCTION public.rpc_outstanding_bills(p_start_date date, p_end_date date) RETURNS TABLE(
        bill_id uuid,
        bill_total numeric,
        paid_amount numeric,
        outstanding_amount numeric,
        customer_name text,
        served_by text,
        created_at timestamp with time zone,
        invoice_number text
    ) LANGUAGE sql STABLE AS $function$
select bf.bill_id,
    bf.bill_total,
    bf.paid_amount,
    bf.outstanding_amount,
    b.customer_name,
    p.name as served_by,
    b.created_at,
    b.invoice_number
from v_bill_financials bf
    join bills b on b.id = bf.bill_id
    left join profiles p on p.id = b.created_by
where date(b.created_at) between p_start_date and p_end_date
    and b.status != 'void'
    and bf.outstanding_amount > 0
order by outstanding_amount desc;
$function$;
