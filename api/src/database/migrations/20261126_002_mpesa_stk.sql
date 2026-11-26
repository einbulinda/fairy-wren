-- ============================================================================
-- Migration: KCB M-Pesa Express (STK Push)
-- Date: 2026-11-26
-- Plan: plans/KCB_STK_PUSH_IMPLEMENTATION_PLAN.md
--
-- The cashier sends a PIN prompt to the customer's phone for a bill. KCB
-- calls us back with the result; on success the payment is recorded in
-- mpesa_transactions (source 'kcb_stk') and applied to the bill with
-- allocate_mpesa_transaction(), so journals, the register and the Z-report
-- are shared with the till IPN.
--
-- Money is recorded once. Whichever message proves the payment first (STK
-- callback or till IPN) applies it; the other is linked to it:
--   * IPN with the same transaction id as the callback's receipt → the
--     UNIQUE(transaction_id) insert dedupes it automatically.
--   * IPN carrying our FW reference after the prompt was paid → stored with
--     status 'linked' (duplicate_of set), no journal, never listed as open.
--   * IPN for a prompt with no successful callback yet → the IPN is applied
--     to the prompt's bill and the prompt is marked paid (via 'ipn').
--   * No reference match, but same phone + amount within 10 minutes of a
--     paid prompt → possible_duplicate_of is set; hidden from the POS inbox
--     until a manager decides.
-- ============================================================================

-- ── 1. Payment reference: FW + 4 Crockford base32 chars (plan §8) ───────────
-- The sequence never cycles, and the affine shuffle is a bijection on
-- 0..2^20-1, so a reference is never issued twice.
CREATE SEQUENCE IF NOT EXISTS public.mpesa_stk_ref_seq
    MINVALUE 1 MAXVALUE 1048576 NO CYCLE;

CREATE OR REPLACE FUNCTION public.mpesa_stk_ref_for(p_n bigint)
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

CREATE OR REPLACE FUNCTION public.mpesa_stk_next_ref()
RETURNS text LANGUAGE plpgsql AS $function$
BEGIN
    RETURN mpesa_stk_ref_for(nextval('mpesa_stk_ref_seq'));
EXCEPTION WHEN sequence_generator_limit_exceeded THEN
    RAISE EXCEPTION 'MPESA_STK_REFS_EXHAUSTED';
END;
$function$;

-- ── 2. Prompts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mpesa_stk_requests (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id               uuid NOT NULL REFERENCES public.bills(id),
    requested_by          uuid REFERENCES public.profiles(id),
    phone                 text NOT NULL CHECK (phone ~ '^254[17][0-9]{8}$'),
    amount                numeric(12, 2) NOT NULL CHECK (amount > 0 AND amount = trunc(amount)),
    account_ref           text NOT NULL,
    callback_token_hash   text NOT NULL,
    merchant_request_id   text,
    checkout_request_id   text,
    status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'waiting', 'paid', 'cancelled',
                                            'failed', 'no_response', 'request_failed')),
    result_code           integer,
    result_desc           text,
    mpesa_receipt         text,
    paid_amount           numeric(12, 2),
    paid_at               timestamptz,
    paid_via              text CHECK (paid_via IN ('callback', 'ipn')),
    mpesa_transaction_id  uuid REFERENCES public.mpesa_transactions(id),
    -- Why a callback or IPN was not applied automatically (amount mismatch,
    -- bill already settled, …). Shown to managers.
    problem               text,
    raw_request           jsonb,
    raw_response          jsonb,
    raw_callback          jsonb,
    callback_received_at  timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mpesa_stk_requests_account_ref_key UNIQUE (account_ref),
    CONSTRAINT mpesa_stk_requests_token_key UNIQUE (callback_token_hash),
    CONSTRAINT mpesa_stk_requests_merchant_key UNIQUE (merchant_request_id)
);

-- One prompt in flight per bill.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mpesa_stk_one_active_per_bill
    ON public.mpesa_stk_requests (bill_id) WHERE status IN ('pending', 'waiting');
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_bill
    ON public.mpesa_stk_requests (bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_status_created
    ON public.mpesa_stk_requests (status, created_at);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_receipt
    ON public.mpesa_stk_requests (mpesa_receipt) WHERE mpesa_receipt IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_phone_paid
    ON public.mpesa_stk_requests (phone, paid_at) WHERE status = 'paid';

-- ── 3. mpesa_transactions: STK source, linked duplicates ────────────────────
ALTER TABLE public.mpesa_transactions DROP CONSTRAINT IF EXISTS mpesa_transactions_source_check;
ALTER TABLE public.mpesa_transactions ADD CONSTRAINT mpesa_transactions_source_check
    CHECK (source IN ('kcb_till', 'kcb_account', 'kcb_stk'));

ALTER TABLE public.mpesa_transactions DROP CONSTRAINT IF EXISTS mpesa_transactions_status_check;
ALTER TABLE public.mpesa_transactions ADD CONSTRAINT mpesa_transactions_status_check
    CHECK (status IN ('unallocated', 'partially_allocated', 'allocated', 'linked'));

ALTER TABLE public.mpesa_transactions
    ADD COLUMN IF NOT EXISTS stk_request_id uuid REFERENCES public.mpesa_stk_requests(id),
    ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.mpesa_transactions(id),
    ADD COLUMN IF NOT EXISTS possible_duplicate_of uuid REFERENCES public.mpesa_transactions(id);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_stk_request
    ON public.mpesa_transactions (stk_request_id) WHERE stk_request_id IS NOT NULL;

-- ── 4. Live updates to the POS (slim payload, no phone) ─────────────────────
CREATE OR REPLACE FUNCTION public.notify_mpesa_stk_change()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.problem IS NOT DISTINCT FROM OLD.problem THEN
        RETURN NEW;
    END IF;
    PERFORM pg_notify('db_changes', json_build_object(
        'table', TG_TABLE_NAME,
        'event', TG_OP,
        'new', json_build_object(
            'id', NEW.id,
            'bill_id', NEW.bill_id,
            'requested_by', NEW.requested_by,
            'amount', NEW.amount,
            'account_ref', NEW.account_ref,
            'status', NEW.status,
            'result_code', NEW.result_code,
            'result_desc', left(NEW.result_desc, 200),
            'mpesa_receipt', NEW.mpesa_receipt,
            'problem', left(NEW.problem, 200),
            'updated_at', NEW.updated_at
        ),
        'old', NULL
    )::text);
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_mpesa_stk_requests_notify ON public.mpesa_stk_requests;
CREATE TRIGGER trg_mpesa_stk_requests_notify
    AFTER INSERT OR UPDATE ON public.mpesa_stk_requests
    FOR EACH ROW EXECUTE FUNCTION notify_mpesa_stk_change();

-- ── 5. Apply money to the prompt's bill (shared by callback and IPN paths) ──
-- Applies p_txn_id to the bill of p_req, as the cashier who sent the prompt.
-- Never raises for business reasons: if the bill can no longer take the
-- money (paid in cash meanwhile, closed, …) the payment stays open in the
-- inbox and the reason is returned.
CREATE OR REPLACE FUNCTION public.mpesa_stk_apply_to_bill(p_req mpesa_stk_requests, p_txn_id uuid)
RETURNS text LANGUAGE plpgsql AS $function$
DECLARE
    v_remaining numeric;
    v_payable   numeric;
    v_amount    numeric;
BEGIN
    SELECT amount - allocated_amount INTO v_remaining
    FROM mpesa_transactions WHERE id = p_txn_id;

    IF v_remaining <= 0 THEN
        RETURN 'payment already matched';
    END IF;

    SELECT payable_amount INTO v_payable FROM bill_totals WHERE bill_id = p_req.bill_id;
    v_amount := LEAST(v_remaining, COALESCE(v_payable, 0));
    IF v_amount <= 0 THEN
        RETURN 'bill has no balance left';
    END IF;

    BEGIN
        PERFORM allocate_mpesa_transaction(
            p_txn_id,
            jsonb_build_array(jsonb_build_object(
                'type', 'bill', 'bill_id', p_req.bill_id, 'amount', v_amount::text)),
            p_req.requested_by,
            NULL);
    EXCEPTION WHEN raise_exception THEN
        RETURN SQLERRM || COALESCE(': ' || NULLIF(PG_EXCEPTION_DETAIL, ''), '');
    END;

    IF v_amount < v_remaining THEN
        RETURN format('applied %s; %s left open for the cashier', v_amount, v_remaining - v_amount);
    END IF;
    RETURN NULL;
END;
$function$;

-- ── 6. STK callback ─────────────────────────────────────────────────────────
-- Called with a request the API found by its secret callback token.
-- p_phone is already normalised to 2547…/2541… by the API.
CREATE OR REPLACE FUNCTION public.apply_mpesa_stk_callback(
    p_request_id     uuid,
    p_merchant_id    text,
    p_checkout_id    text,
    p_result_code    integer,
    p_result_desc    text,
    p_receipt        text,
    p_amount         numeric,
    p_phone          text,
    p_paid_at        timestamptz,
    p_raw            jsonb
) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_req      mpesa_stk_requests%ROWTYPE;
    v_status   text;
    v_txn_id   uuid;
    v_problem  text;
BEGIN
    SELECT * INTO v_req FROM mpesa_stk_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('applied', false, 'reason', 'unknown request');
    END IF;

    UPDATE mpesa_stk_requests
    SET raw_callback = p_raw, callback_received_at = now(), updated_at = now()
    WHERE id = v_req.id;

    -- The callback must be about the request we sent.
    IF v_req.merchant_request_id IS NOT NULL
       AND p_merchant_id IS DISTINCT FROM v_req.merchant_request_id THEN
        UPDATE mpesa_stk_requests
        SET problem = 'Callback ignored: MerchantRequestID does not match', updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('applied', false, 'reason', 'merchant request id mismatch');
    END IF;

    IF v_req.status = 'paid' THEN
        UPDATE mpesa_stk_requests
        SET mpesa_receipt = COALESCE(mpesa_receipt, p_receipt), updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('applied', false, 'reason', 'already paid');
    END IF;

    -- ── Not paid ──
    IF p_result_code IS DISTINCT FROM 0 THEN
        IF v_req.status NOT IN ('pending', 'waiting', 'no_response', 'request_failed') THEN
            RETURN json_build_object('applied', false, 'reason', 'already final');
        END IF;
        v_status := CASE p_result_code
                        WHEN 1032 THEN 'cancelled'      -- cancelled by the customer
                        WHEN 1037 THEN 'no_response'    -- phone unreachable
                        ELSE 'failed'                   -- 2001 wrong PIN, anything else
                    END;
        UPDATE mpesa_stk_requests
        SET status = v_status, result_code = p_result_code, result_desc = p_result_desc,
            merchant_request_id = COALESCE(merchant_request_id, p_merchant_id),
            checkout_request_id = COALESCE(checkout_request_id, p_checkout_id),
            updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('applied', true, 'status', v_status);
    END IF;

    -- ── Paid ──
    IF p_receipt IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        UPDATE mpesa_stk_requests
        SET problem = 'Success callback without receipt or amount', result_code = 0,
            result_desc = p_result_desc, updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('applied', false, 'reason', 'missing receipt or amount');
    END IF;

    -- Record the money (an IPN with the same id may already exist).
    INSERT INTO mpesa_transactions (
        source, transaction_id, bill_reference, msisdn, amount, currency,
        transaction_type, narration, transaction_at, raw_payload, signature_valid,
        stk_request_id
    ) VALUES (
        'kcb_stk', p_receipt, v_req.account_ref, p_phone, p_amount, 'KES',
        'MPESA', 'STK push ' || v_req.account_ref, COALESCE(p_paid_at, now()), p_raw, false,
        v_req.id
    )
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING id INTO v_txn_id;

    IF v_txn_id IS NULL THEN
        SELECT id INTO v_txn_id FROM mpesa_transactions WHERE transaction_id = p_receipt;
        UPDATE mpesa_transactions SET stk_request_id = COALESCE(stk_request_id, v_req.id)
        WHERE id = v_txn_id;
    END IF;

    -- Only auto-apply when the payment is exactly what we asked for.
    IF p_amount <> v_req.amount THEN
        v_problem := format('Paid %s but the prompt was for %s; left open for the cashier', p_amount, v_req.amount);
    ELSIF p_phone IS DISTINCT FROM v_req.phone THEN
        v_problem := 'Paid from a different phone than the prompt; left open for the cashier';
    ELSE
        v_problem := mpesa_stk_apply_to_bill(v_req, v_txn_id);
    END IF;

    UPDATE mpesa_stk_requests
    SET status = 'paid', paid_via = 'callback', result_code = 0, result_desc = p_result_desc,
        merchant_request_id = COALESCE(merchant_request_id, p_merchant_id),
        checkout_request_id = COALESCE(checkout_request_id, p_checkout_id),
        mpesa_receipt = p_receipt, paid_amount = p_amount, paid_at = COALESCE(p_paid_at, now()),
        mpesa_transaction_id = v_txn_id, problem = v_problem, updated_at = now()
    WHERE id = v_req.id;

    RETURN json_build_object('applied', true, 'status', 'paid',
                             'transaction_id', v_txn_id, 'problem', v_problem);
END;
$function$;

-- ── 7. Link an incoming till IPN to a prompt ────────────────────────────────
-- Called right after a new IPN is stored, before any receipt journal.
-- Returns {action: 'linked' | 'applied' | 'flagged' | 'none', …}.
CREATE OR REPLACE FUNCTION public.link_mpesa_ipn_to_stk(p_txn_id uuid)
RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_txn     mpesa_transactions%ROWTYPE;
    v_req     mpesa_stk_requests%ROWTYPE;
    v_ref     text;
    v_problem text;
BEGIN
    SELECT * INTO v_txn FROM mpesa_transactions WHERE id = p_txn_id FOR UPDATE;
    IF NOT FOUND OR v_txn.source <> 'kcb_till' OR v_txn.status <> 'unallocated'
       OR v_txn.allocated_amount > 0 OR v_txn.stk_request_id IS NOT NULL THEN
        RETURN json_build_object('action', 'none');
    END IF;

    -- Our reference in what the customer's payment carried, or the receipt
    -- a callback already gave us.
    v_ref := upper(substring(concat_ws(' ', v_txn.bill_reference, v_txn.narration)
                             FROM '(?i)FW[0-9A-HJKMNP-TV-Z]{4}'));

    SELECT * INTO v_req FROM mpesa_stk_requests
    WHERE (v_ref IS NOT NULL AND account_ref = v_ref)
       OR mpesa_receipt = v_txn.transaction_id
       OR (mpesa_receipt IS NOT NULL AND v_txn.narration ILIKE '%' || mpesa_receipt || '%')
    ORDER BY (account_ref = v_ref) DESC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        IF v_req.status = 'paid' AND v_req.mpesa_transaction_id IS NOT NULL
           AND v_req.mpesa_transaction_id <> v_txn.id THEN
            -- Same money as the callback already recorded: mark used.
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
            UPDATE mpesa_stk_requests
            SET problem = format('Till payment %s of %s carried this prompt''s reference but the prompt was for %s',
                                 v_txn.transaction_id, v_txn.amount, v_req.amount),
                updated_at = now()
            WHERE id = v_req.id;
            RETURN json_build_object('action', 'none', 'request_id', v_req.id, 'reason', 'amount differs');
        END IF;

        -- No successful callback (yet): the IPN proves the payment.
        v_problem := mpesa_stk_apply_to_bill(v_req, v_txn.id);
        UPDATE mpesa_stk_requests
        SET status = 'paid', paid_via = 'ipn',
            mpesa_receipt = COALESCE(mpesa_receipt, v_txn.transaction_id),
            paid_amount = v_txn.amount, paid_at = v_txn.transaction_at,
            mpesa_transaction_id = v_txn.id, problem = v_problem, updated_at = now()
        WHERE id = v_req.id;
        RETURN json_build_object('action', 'applied', 'request_id', v_req.id, 'problem', v_problem);
    END IF;

    -- Safety net while KCB hasn't told us which IPN field carries our
    -- reference: same phone and amount as a prompt paid in the last 10 min.
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

-- ── 8. Prompts nobody answered ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_mpesa_stk_requests(p_after interval DEFAULT interval '3 minutes')
RETURNS integer LANGUAGE plpgsql AS $function$
DECLARE
    v_count integer;
BEGIN
    UPDATE mpesa_stk_requests
    SET status = 'no_response',
        result_desc = COALESCE(result_desc, 'No answer from the customer''s phone'),
        updated_at = now()
    WHERE status IN ('pending', 'waiting')
      AND created_at < now() - p_after;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Permission: send_mpesa_stk ("Send M-Pesa Prompt", Users → System Roles).
-- Starts with the roles that can already match M-Pesa payments, so nothing
-- changes for cashiers until a manager removes it from a role.
-- Users must log in again to pick it up.
-- ---------------------------------------------------------------------------
UPDATE public.system_roles
SET permissions = permissions || '["send_mpesa_stk"]'::jsonb
WHERE permissions @> '["allocate_mpesa"]'::jsonb
  AND NOT permissions @> '["send_mpesa_stk"]'::jsonb;
