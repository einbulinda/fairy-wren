-- ============================================================================
-- Migration: Realign bank reconciliation tables with the API / ERP
-- Created: 26/11/2026
--
-- 20260327_003 created bank_statement_lines with debit / credit /
-- reference_number, but the API, the ERP and the later design use
-- deposit / withdrawal / reference and statement start / end dates.
-- The installed import function read 'debit'/'credit' keys while the
-- ERP sends 'deposit'/'withdrawal', so every imported line saved as 0.
--
-- This migration converts the tables in place (existing rows are kept:
-- credit -> deposit, debit -> withdrawal) and replaces the functions and
-- views. Safe to run on a database built either way.
-- ============================================================================

-- Views depend on the columns being dropped; recreated at the end.
DROP VIEW IF EXISTS public.v_bank_reconciliation_summary;
DROP VIEW IF EXISTS public.v_unreconciled_bank_transactions;

-- ---------------------------------------------------------------------------
-- 1. bank_statements: statement period + description
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_statements
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS end_date date,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS file_name text,
    ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'bank_statements'
                 AND column_name = 'statement_number') THEN
        EXECUTE $q$
            UPDATE public.bank_statements
            SET description = COALESCE(description, statement_number)
            WHERE description IS NULL
        $q$;
    END IF;
END $$;

UPDATE public.bank_statements
SET start_date  = COALESCE(start_date, statement_date),
    end_date    = COALESCE(end_date, statement_date),
    description = COALESCE(description, 'Statement ' || statement_date::text)
WHERE start_date IS NULL OR end_date IS NULL OR description IS NULL;

ALTER TABLE public.bank_statements
    ALTER COLUMN start_date SET NOT NULL,
    ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE public.bank_statements
    DROP CONSTRAINT IF EXISTS bank_statements_period_check;
ALTER TABLE public.bank_statements
    ADD CONSTRAINT bank_statements_period_check CHECK (end_date >= start_date);

-- ---------------------------------------------------------------------------
-- 2. bank_statement_lines: deposit / withdrawal / reference
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_statement_lines
    ADD COLUMN IF NOT EXISTS reference varchar(100),
    ADD COLUMN IF NOT EXISTS deposit numeric(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS withdrawal numeric(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_number integer;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'bank_statement_lines'
                 AND column_name = 'credit') THEN
        -- Bank credit = money in (deposit), bank debit = money out (withdrawal).
        EXECUTE $q$
            UPDATE public.bank_statement_lines
            SET deposit    = COALESCE(credit, 0),
                withdrawal = COALESCE(debit, 0),
                reference  = COALESCE(reference, reference_number)
        $q$;
    END IF;
END $$;

ALTER TABLE public.bank_statement_lines
    DROP COLUMN IF EXISTS amount,          -- generated from credit - debit
    DROP COLUMN IF EXISTS debit,
    DROP COLUMN IF EXISTS credit,
    DROP COLUMN IF EXISTS reference_number;

UPDATE public.bank_statement_lines SET deposit = 0 WHERE deposit IS NULL;
UPDATE public.bank_statement_lines SET withdrawal = 0 WHERE withdrawal IS NULL;
ALTER TABLE public.bank_statement_lines
    ALTER COLUMN deposit SET NOT NULL,
    ALTER COLUMN withdrawal SET NOT NULL;

ALTER TABLE public.bank_statement_lines
    DROP CONSTRAINT IF EXISTS bank_statement_lines_amounts_check;
ALTER TABLE public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_amounts_check
    CHECK (deposit >= 0 AND withdrawal >= 0);

-- Both earlier designs had a different status list; accept all of them.
ALTER TABLE public.bank_statement_lines
    DROP CONSTRAINT IF EXISTS bank_statement_lines_match_status_check;
ALTER TABLE public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_match_status_check
    CHECK (match_status IN ('unmatched', 'matched', 'adjusted', 'disputed', 'ignored'));

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_matched_txn
    ON public.bank_statement_lines(matched_transaction_id);

-- ---------------------------------------------------------------------------
-- 3. Views
-- ---------------------------------------------------------------------------

-- Every bank-account journal line not yet matched to a statement line.
-- (The previous version only listed cheque/payment/manual journals, which
-- hid supplier payments and M-Pesa receipts from matching.)
CREATE VIEW public.v_unreconciled_bank_transactions AS
SELECT
    jl.id                                         AS journal_line_id,
    je.id                                         AS journal_entry_id,
    je.entry_date,
    je.reference,
    je.description,
    je.description                                AS entry_description,
    je.source_type,
    je.source_id,
    jl.account_id,
    coa.code                                      AS account_code,
    coa.name                                      AS account_name,
    jl.debit,
    jl.credit,
    COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0) AS net_amount
FROM journal_lines jl
JOIN journal_entries je   ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE NOT EXISTS (
    SELECT 1
    FROM bank_statement_lines bsl
    JOIN bank_statements bs ON bs.id = bsl.statement_id
    WHERE bsl.matched_transaction_id = je.id
      AND bsl.matched_transaction_type = 'journal_entry'
      AND bsl.match_status IN ('matched', 'adjusted')
      AND bs.status <> 'cancelled'
);

-- One row per statement: line totals, match counts, and the GL balance of
-- the bank account at the statement end date.
CREATE VIEW public.v_bank_reconciliation_summary AS
SELECT
    bs.id                 AS statement_id,
    bs.bank_account_id,
    coa.code              AS bank_account_code,
    coa.name              AS bank_account_name,
    bs.statement_date,
    bs.start_date,
    bs.end_date,
    bs.description,
    bs.opening_balance,
    bs.closing_balance,
    bs.status,
    bs.reconciled_at,
    COALESCE(l.total_deposits, 0)    AS total_deposits,
    COALESCE(l.total_withdrawals, 0) AS total_withdrawals,
    COALESCE(l.total_lines, 0)       AS total_lines,
    COALESCE(l.matched_count, 0)     AS matched_count,
    COALESCE(l.unmatched_count, 0)   AS unmatched_count,
    COALESCE(l.adjusted_count, 0)    AS adjusted_count,
    COALESCE(gl.gl_balance, 0)       AS gl_balance,
    bs.closing_balance - COALESCE(gl.gl_balance, 0) AS variance
FROM bank_statements bs
JOIN chart_of_accounts coa ON coa.id = bs.bank_account_id
LEFT JOIN LATERAL (
    SELECT SUM(bsl.deposit)    AS total_deposits,
           SUM(bsl.withdrawal) AS total_withdrawals,
           COUNT(*)            AS total_lines,
           COUNT(*) FILTER (WHERE bsl.match_status = 'matched')   AS matched_count,
           COUNT(*) FILTER (WHERE bsl.match_status = 'unmatched') AS unmatched_count,
           COUNT(*) FILTER (WHERE bsl.match_status = 'adjusted')  AS adjusted_count
    FROM bank_statement_lines bsl
    WHERE bsl.statement_id = bs.id
) l ON true
LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS gl_balance
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.account_id = bs.bank_account_id
      AND je.entry_date <= bs.end_date
) gl ON true;

-- ---------------------------------------------------------------------------
-- 4. Functions (signatures / return types changed, so drop first)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.import_bank_statement(uuid, date, varchar, numeric, numeric, jsonb, uuid, text);
DROP FUNCTION IF EXISTS public.import_bank_statement(uuid, date, text, numeric, numeric, jsonb, uuid, text);
DROP FUNCTION IF EXISTS public.import_bank_statement(uuid, date, date, date, text, numeric, numeric, jsonb, uuid, text);
DROP FUNCTION IF EXISTS public.auto_match_bank_statement(uuid, numeric);
DROP FUNCTION IF EXISTS public.auto_match_bank_statement(uuid, numeric, integer);
DROP FUNCTION IF EXISTS public.manual_match_statement_line(uuid, uuid, varchar, uuid, text);
DROP FUNCTION IF EXISTS public.rpc_get_bank_reconciliation(uuid, uuid);
DROP FUNCTION IF EXISTS public.rpc_get_suggested_matches(uuid);

-- Import a statement and its lines. Returns the new statement id.
-- p_lines: [{transaction_date, description, reference, deposit, withdrawal}]
CREATE FUNCTION public.import_bank_statement(
    p_bank_account_id uuid,
    p_statement_date  date,
    p_start_date      date,
    p_end_date        date,
    p_description     text,
    p_opening_balance numeric,
    p_closing_balance numeric,
    p_lines           jsonb,
    p_imported_by     uuid,
    p_file_name       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts
                   WHERE id = p_bank_account_id AND active = true) THEN
        RAISE EXCEPTION 'INVALID_BANK_ACCOUNT';
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
        RAISE EXCEPTION 'INVALID_STATEMENT_PERIOD';
    END IF;

    IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
        RAISE EXCEPTION 'STATEMENT_LINES_REQUIRED';
    END IF;

    INSERT INTO bank_statements (
        bank_account_id, statement_date, start_date, end_date,
        opening_balance, closing_balance, description, file_name,
        imported_by, status
    ) VALUES (
        p_bank_account_id, p_statement_date, p_start_date, p_end_date,
        p_opening_balance, p_closing_balance,
        COALESCE(NULLIF(p_description, ''),
                 'Statement ' || p_start_date::text || ' to ' || p_end_date::text),
        p_file_name, p_imported_by, 'draft'
    )
    RETURNING id INTO v_statement_id;

    INSERT INTO bank_statement_lines (
        statement_id, transaction_date, description, reference,
        deposit, withdrawal, line_number
    )
    SELECT
        v_statement_id,
        (l.value->>'transaction_date')::date,
        l.value->>'description',
        NULLIF(l.value->>'reference', ''),
        COALESCE(NULLIF(l.value->>'deposit', '')::numeric, 0),
        COALESCE(NULLIF(l.value->>'withdrawal', '')::numeric, 0),
        l.ordinality::integer
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS l(value, ordinality);

    RETURN v_statement_id;
END;
$$;

-- Match unmatched lines to unreconciled GL entries on the statement's bank
-- account by amount (within p_match_threshold) and date (within
-- p_date_tolerance days). Returns {matched, unmatched}.
CREATE FUNCTION public.auto_match_bank_statement(
    p_statement_id     uuid,
    p_match_threshold  numeric DEFAULT 0.01,
    p_date_tolerance   integer DEFAULT 2
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_bank_account_id uuid;
    v_line            RECORD;
    v_match           RECORD;
    v_matched         integer := 0;
    v_unmatched       integer := 0;
BEGIN
    SELECT bank_account_id INTO v_bank_account_id
    FROM bank_statements WHERE id = p_statement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'STATEMENT_NOT_FOUND';
    END IF;

    FOR v_line IN
        SELECT id, transaction_date, deposit - withdrawal AS net
        FROM bank_statement_lines
        WHERE statement_id = p_statement_id AND match_status = 'unmatched'
        ORDER BY transaction_date, line_number
    LOOP
        -- The view excludes entries matched earlier in this loop.
        SELECT u.journal_entry_id INTO v_match
        FROM v_unreconciled_bank_transactions u
        WHERE u.account_id = v_bank_account_id
          AND ABS(u.net_amount - v_line.net) <= p_match_threshold
          AND ABS(u.entry_date - v_line.transaction_date) <= p_date_tolerance
        ORDER BY ABS(u.entry_date - v_line.transaction_date), u.entry_date
        LIMIT 1;

        IF FOUND THEN
            UPDATE bank_statement_lines
            SET match_status = 'matched',
                matched_transaction_id = v_match.journal_entry_id,
                matched_transaction_type = 'journal_entry',
                matched_at = now(),
                match_notes = 'Auto-matched'
            WHERE id = v_line.id;
            v_matched := v_matched + 1;
        ELSE
            v_unmatched := v_unmatched + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('matched', v_matched, 'unmatched', v_unmatched);
END;
$$;

CREATE FUNCTION public.manual_match_statement_line(
    p_line_id          uuid,
    p_transaction_id   uuid,
    p_transaction_type varchar,
    p_matched_by       uuid,
    p_notes            text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE bank_statement_lines
    SET match_status = 'matched',
        matched_transaction_id = p_transaction_id,
        matched_transaction_type = p_transaction_type,
        matched_by = p_matched_by,
        matched_at = now(),
        match_notes = p_notes
    WHERE id = p_line_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'STATEMENT_LINE_NOT_FOUND';
    END IF;

    RETURN jsonb_build_object('success', true, 'line_id', p_line_id);
END;
$$;

-- {statement: {...}, lines: [...]} for one statement, or the latest
-- statement of a bank account. NULL when none exists.
CREATE FUNCTION public.rpc_get_bank_reconciliation(
    p_bank_account_id uuid DEFAULT NULL,
    p_statement_id    uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid := p_statement_id;
    v_result       jsonb;
BEGIN
    IF v_statement_id IS NULL AND p_bank_account_id IS NOT NULL THEN
        SELECT id INTO v_statement_id
        FROM bank_statements
        WHERE bank_account_id = p_bank_account_id
        ORDER BY statement_date DESC, created_at DESC
        LIMIT 1;
    END IF;

    IF v_statement_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'statement', jsonb_build_object(
            'id', bs.id,
            'bank_account_id', bs.bank_account_id,
            'statement_date', bs.statement_date,
            'start_date', bs.start_date,
            'end_date', bs.end_date,
            'opening_balance', bs.opening_balance,
            'closing_balance', bs.closing_balance,
            'description', bs.description,
            'file_name', bs.file_name,
            'status', bs.status,
            'notes', bs.notes,
            'imported_by', bs.imported_by,
            'reconciled_by', bs.reconciled_by,
            'reconciled_at', bs.reconciled_at,
            'created_at', bs.created_at
        ),
        'lines', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'id', bsl.id,
                       'line_number', bsl.line_number,
                       'transaction_date', bsl.transaction_date,
                       'description', bsl.description,
                       'reference', bsl.reference,
                       'deposit', bsl.deposit,
                       'withdrawal', bsl.withdrawal,
                       'match_status', bsl.match_status,
                       'matched_transaction_id', bsl.matched_transaction_id,
                       'matched_transaction_type', bsl.matched_transaction_type,
                       'matched_by', bsl.matched_by,
                       'matched_at', bsl.matched_at,
                       'match_notes', bsl.match_notes
                   ) ORDER BY bsl.transaction_date, bsl.line_number)
            FROM bank_statement_lines bsl
            WHERE bsl.statement_id = v_statement_id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM bank_statements bs
    WHERE bs.id = v_statement_id;

    RETURN v_result;
END;
$$;

-- Up to 10 unreconciled GL entries on the line's bank account with the same
-- net amount (±0.01) within 7 days.
CREATE FUNCTION public.rpc_get_suggested_matches(p_line_id uuid)
RETURNS TABLE (
    journal_entry_id uuid,
    journal_line_id  uuid,
    entry_date       date,
    reference        text,
    description      text,
    debit            numeric,
    credit           numeric,
    net_amount       numeric,
    source_type      text
)
LANGUAGE plpgsql AS $$
DECLARE
    v_net             numeric;
    v_date            date;
    v_bank_account_id uuid;
BEGIN
    SELECT bsl.deposit - bsl.withdrawal, bsl.transaction_date, bs.bank_account_id
    INTO v_net, v_date, v_bank_account_id
    FROM bank_statement_lines bsl
    JOIN bank_statements bs ON bs.id = bsl.statement_id
    WHERE bsl.id = p_line_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT u.journal_entry_id, u.journal_line_id, u.entry_date, u.reference,
           u.description, u.debit, u.credit, u.net_amount, u.source_type
    FROM v_unreconciled_bank_transactions u
    WHERE u.account_id = v_bank_account_id
      AND ABS(u.net_amount - v_net) <= 0.01
      AND ABS(u.entry_date - v_date) <= 7
    ORDER BY ABS(u.entry_date - v_date)
    LIMIT 10;
END;
$$;
