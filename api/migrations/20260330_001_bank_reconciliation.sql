-- Bank Reconciliation Schema Migration
-- Created: 30/03/2026

-- Tables
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
    statement_date date NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    opening_balance numeric(15, 2) NOT NULL DEFAULT 0,
    closing_balance numeric(15, 2) NOT NULL DEFAULT 0,
    description text,
    status varchar(20) DEFAULT 'draft' CHECK (status IN ('draft', 'reconciled', 'cancelled')),
    imported_by uuid REFERENCES public.profiles(id),
    reconciled_by uuid REFERENCES public.profiles(id),
    reconciled_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    description text,
    reference varchar(100),
    deposit numeric(15, 2) DEFAULT 0,
    withdrawal numeric(15, 2) DEFAULT 0,
    match_status varchar(20) DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'matched', 'adjusted')),
    matched_transaction_id uuid,
    matched_transaction_type varchar(50),
    matched_by uuid REFERENCES public.profiles(id),
    matched_at timestamptz,
    match_notes text,
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_statements_account_date ON public.bank_statements(bank_account_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_statement_id ON public.bank_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_match_status ON public.bank_statement_lines(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_matched_txn ON public.bank_statement_lines(matched_transaction_id);

-- Views
CREATE OR REPLACE VIEW public.v_unreconciled_bank_transactions AS
SELECT
    jl.id AS journal_line_id,
    je.id AS journal_entry_id,
    je.entry_date,
    je.reference,
    je.description AS entry_description,
    jl.account_id,
    jl.debit,
    jl.credit,
    COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0) AS net_amount,
    je.source_type,
    je.source_id
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
LEFT JOIN bank_statement_lines bsl ON bsl.matched_transaction_id = je.id
    AND bsl.matched_transaction_type = 'journal_entry'
    AND bsl.match_status = 'matched'
WHERE bsl.id IS NULL;

CREATE OR REPLACE VIEW public.v_bank_reconciliation_summary AS
SELECT
    bs.id AS statement_id,
    bs.bank_account_id,
    bs.statement_date,
    bs.opening_balance,
    bs.closing_balance,
    bs.status,
    COALESCE(SUM(bsl.deposit), 0) AS total_deposits,
    COALESCE(SUM(bsl.withdrawal), 0) AS total_withdrawals,
    COUNT(*) FILTER (WHERE bsl.match_status = 'matched') AS matched_count,
    COUNT(*) FILTER (WHERE bsl.match_status = 'unmatched') AS unmatched_count,
    COUNT(*) FILTER (WHERE bsl.match_status = 'adjusted') AS adjusted_count
FROM bank_statements bs
LEFT JOIN bank_statement_lines bsl ON bsl.statement_id = bs.id
GROUP BY bs.id, bs.bank_account_id, bs.statement_date, bs.opening_balance, bs.closing_balance, bs.status;

-- Functions
CREATE OR REPLACE FUNCTION public.import_bank_statement(
    p_bank_account_id uuid,
    p_statement_date date,
    p_statement_number text,
    p_opening_balance numeric,
    p_closing_balance numeric,
    p_lines jsonb,
    p_imported_by uuid,
    p_file_name text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid;
    v_line jsonb;
BEGIN
    INSERT INTO bank_statements (
        bank_account_id,
        statement_date,
        start_date,
        end_date,
        opening_balance,
        closing_balance,
        description,
        imported_by
    )
    VALUES (
        p_bank_account_id,
        p_statement_date,
        p_statement_date,
        p_statement_date,
        p_opening_balance,
        p_closing_balance,
        COALESCE(p_statement_number, 'Statement ' || p_statement_date::text),
        p_imported_by
    )
    RETURNING id INTO v_statement_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO bank_statement_lines (
            statement_id,
            transaction_date,
            description,
            reference,
            deposit,
            withdrawal
        )
        VALUES (
            v_statement_id,
            (v_line->>'transaction_date')::date,
            v_line->>'description',
            v_line->>'reference',
            COALESCE((v_line->>'deposit')::numeric, 0),
            COALESCE((v_line->>'withdrawal')::numeric, 0)
        );
    END LOOP;

    RETURN v_statement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_match_bank_statement(
    p_statement_id uuid,
    p_match_threshold numeric DEFAULT 0.01
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_line RECORD;
    v_match RECORD;
    v_matched_count integer := 0;
    v_unmatched_count integer := 0;
BEGIN
    FOR v_line IN
        SELECT id, transaction_date, deposit, withdrawal
        FROM bank_statement_lines
        WHERE statement_id = p_statement_id
          AND match_status = 'unmatched'
    LOOP
        SELECT * INTO v_match
        FROM v_unreconciled_bank_transactions u
        WHERE u.account_id = (SELECT bank_account_id FROM bank_statements WHERE id = p_statement_id)
          AND ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0))) <= p_match_threshold
          AND ABS(u.entry_date - v_line.transaction_date) <= 2
        ORDER BY ABS(u.entry_date - v_line.transaction_date)
        LIMIT 1;

        IF FOUND THEN
            UPDATE bank_statement_lines
            SET match_status = 'matched',
                matched_transaction_id = v_match.journal_entry_id,
                matched_transaction_type = 'journal_entry',
                matched_at = now()
            WHERE id = v_line.id;
            v_matched_count := v_matched_count + 1;
        ELSE
            v_unmatched_count := v_unmatched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('matched', v_matched_count, 'unmatched', v_unmatched_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_match_statement_line(
    p_line_id uuid,
    p_transaction_id uuid,
    p_transaction_type varchar,
    p_matched_by uuid,
    p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
    UPDATE bank_statement_lines
    SET match_status = 'matched',
        matched_transaction_id = p_transaction_id,
        matched_transaction_type = p_transaction_type,
        matched_by = p_matched_by,
        matched_at = now(),
        match_notes = p_notes
    WHERE id = p_line_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_bank_reconciliation(
    p_bank_account_id uuid DEFAULT NULL,
    p_statement_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid;
    v_result jsonb;
BEGIN
    IF p_statement_id IS NOT NULL THEN
        v_statement_id := p_statement_id;
    ELSIF p_bank_account_id IS NOT NULL THEN
        SELECT id INTO v_statement_id
        FROM bank_statements
        WHERE bank_account_id = p_bank_account_id
        ORDER BY statement_date DESC
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
            'status', bs.status,
            'imported_by', bs.imported_by,
            'reconciled_by', bs.reconciled_by,
            'reconciled_at', bs.reconciled_at,
            'created_at', bs.created_at
        ),
        'lines', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', bsl.id,
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
            ) ORDER BY bsl.transaction_date)
            FROM bank_statement_lines bsl
            WHERE bsl.statement_id = v_statement_id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM bank_statements bs
    WHERE bs.id = v_statement_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_suggested_matches(
    p_line_id uuid
) RETURNS TABLE (
    journal_entry_id uuid,
    entry_date date,
    reference text,
    description text,
    debit numeric,
    credit numeric,
    net_amount numeric,
    source_type text
) LANGUAGE plpgsql AS $$
DECLARE
    v_line RECORD;
    v_bank_account_id uuid;
BEGIN
    SELECT * INTO v_line
    FROM bank_statement_lines
    WHERE id = p_line_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT bank_account_id INTO v_bank_account_id
    FROM bank_statements
    WHERE id = v_line.statement_id;

    RETURN QUERY
    SELECT
        u.journal_entry_id,
        u.entry_date,
        u.reference,
        u.entry_description,
        u.debit,
        u.credit,
        u.net_amount,
        u.source_type
    FROM v_unreconciled_bank_transactions u
    WHERE u.account_id = v_bank_account_id
      AND ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0))) <= 0.01
      AND ABS(u.entry_date - v_line.transaction_date) <= 7
    ORDER BY ABS(u.entry_date - v_line.transaction_date), ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0)))
    LIMIT 10;
END;
$$;
