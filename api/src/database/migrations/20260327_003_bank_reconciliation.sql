-- ============================================================================
-- Migration: Bank Reconciliation System
-- Description: Complete bank reconciliation with statement import and matching
-- ============================================================================

-- 1. Create bank statements table
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    statement_date DATE NOT NULL,
    statement_number VARCHAR(100),
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_debits NUMERIC(15, 2) DEFAULT 0,
    total_credits NUMERIC(15, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'processing', 'reconciled', 'partial', 'cancelled')),
    file_name TEXT,
    file_path TEXT,
    imported_by UUID REFERENCES profiles(id),
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    reconciled_by UUID REFERENCES profiles(id),
    reconciled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bank_account_id, statement_date, statement_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_account_date 
ON bank_statements(bank_account_id, statement_date DESC);

-- 2. Create bank statement lines table
CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_number VARCHAR(100),
    debit NUMERIC(15, 2) DEFAULT 0,
    credit NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) GENERATED ALWAYS AS (credit - debit) STORED,
    running_balance NUMERIC(15, 2),
    
    -- Matching fields
    match_status VARCHAR(20) DEFAULT 'unmatched' 
        CHECK (match_status IN ('unmatched', 'matched', 'disputed', 'ignored')),
    matched_transaction_id UUID, -- Can reference journal_entries, cheques, etc.
    matched_transaction_type VARCHAR(50), -- 'journal_entry', 'cheque', 'payment', 'manual'
    matched_by UUID REFERENCES profiles(id),
    matched_at TIMESTAMPTZ,
    match_notes TEXT,
    
    line_number INTEGER, -- For ordering from original statement
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_lines_statement 
ON bank_statement_lines(statement_id);

CREATE INDEX IF NOT EXISTS idx_statement_lines_status 
ON bank_statement_lines(statement_id, match_status) 
WHERE match_status = 'unmatched';

CREATE INDEX IF NOT EXISTS idx_statement_lines_date_amount 
ON bank_statement_lines(transaction_date, amount);

-- 3. Create reconciliation summary view
CREATE OR REPLACE VIEW public.v_bank_reconciliation_summary AS
SELECT 
    bs.id as statement_id,
    bs.bank_account_id,
    coa.code as bank_account_code,
    coa.name as bank_account_name,
    bs.statement_date,
    bs.statement_number,
    bs.opening_balance,
    bs.closing_balance,
    bs.status,
    bs.imported_at,
    bs.reconciled_at,
    -- Statement totals
    bs.total_debits as stmt_total_debits,
    bs.total_credits as stmt_total_credits,
    -- GL totals for the period
    COALESCE(gl_totals.gl_debits, 0) as gl_total_debits,
    COALESCE(gl_totals.gl_credits, 0) as gl_total_credits,
    COALESCE(gl_totals.gl_balance, 0) as gl_balance,
    -- Matching stats
    (SELECT COUNT(*) FROM bank_statement_lines 
     WHERE statement_id = bs.id) as total_lines,
    (SELECT COUNT(*) FROM bank_statement_lines 
     WHERE statement_id = bs.id AND match_status = 'matched') as matched_count,
    (SELECT COUNT(*) FROM bank_statement_lines 
     WHERE statement_id = bs.id AND match_status = 'unmatched') as unmatched_count,
    (SELECT SUM(ABS(amount)) FROM bank_statement_lines 
     WHERE statement_id = bs.id AND match_status = 'unmatched') as unmatched_amount,
    -- Calculated variance
    bs.closing_balance - COALESCE(gl_totals.gl_balance, 0) as variance
FROM bank_statements bs
JOIN chart_of_accounts coa ON coa.id = bs.bank_account_id
LEFT JOIN (
    SELECT 
        jl.account_id,
        SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) as gl_debits,
        SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END) as gl_credits,
        SUM(jl.debit - jl.credit) as gl_balance
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.source_type IN ('cheque', 'payment', 'manual', 'period_close')
    GROUP BY jl.account_id
) gl_totals ON gl_totals.account_id = bs.bank_account_id
ORDER BY bs.statement_date DESC;

-- 4. Function to import bank statement
CREATE OR REPLACE FUNCTION public.import_bank_statement(
    p_bank_account_id UUID,
    p_statement_date DATE,
    p_statement_number VARCHAR,
    p_opening_balance NUMERIC,
    p_closing_balance NUMERIC,
    p_lines JSONB, -- Array of {transaction_date, description, reference, debit, credit}
    p_imported_by UUID,
    p_file_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_statement_id UUID;
    v_line JSONB;
    v_count INTEGER := 0;
    v_total_debits NUMERIC := 0;
    v_total_credits NUMERIC := 0;
    v_line_number INTEGER := 0;
BEGIN
    -- Validate bank account
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts 
                   WHERE id = p_bank_account_id 
                   AND account_class IN ('bank', 'current_asset')
                   AND active = true) THEN
        RAISE EXCEPTION 'Invalid or inactive bank account';
    END IF;
    
    -- Create statement header
    INSERT INTO bank_statements (
        bank_account_id, statement_date, statement_number,
        opening_balance, closing_balance,
        imported_by, file_name, status
    )
    VALUES (
        p_bank_account_id, p_statement_date, p_statement_number,
        p_opening_balance, p_closing_balance,
        p_imported_by, p_file_name, 'processing'
    )
    RETURNING id INTO v_statement_id;
    
    -- Insert lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_line_number := v_line_number + 1;
        
        INSERT INTO bank_statement_lines (
            statement_id,
            line_number,
            transaction_date,
            description,
            reference_number,
            debit,
            credit,
            running_balance
        )
        VALUES (
            v_statement_id,
            v_line_number,
            (v_line->>'transaction_date')::DATE,
            v_line->>'description',
            v_line->>'reference',
            COALESCE((v_line->>'debit')::NUMERIC, 0),
            COALESCE((v_line->>'credit')::NUMERIC, 0),
            (v_line->>'running_balance')::NUMERIC
        );
        
        v_count := v_count + 1;
        v_total_debits := v_total_debits + COALESCE((v_line->>'debit')::NUMERIC, 0);
        v_total_credits := v_total_credits + COALESCE((v_line->>'credit')::NUMERIC, 0);
    END LOOP;
    
    -- Update statement totals
    UPDATE bank_statements
    SET 
        total_debits = v_total_debits,
        total_credits = v_total_credits,
        transaction_count = v_count,
        status = 'draft'
    WHERE id = v_statement_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'statement_id', v_statement_id,
        'lines_imported', v_count,
        'total_debits', v_total_debits,
        'total_credits', v_total_credits
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to auto-match statement lines
CREATE OR REPLACE FUNCTION public.auto_match_bank_statement(
    p_statement_id UUID,
    p_match_threshold NUMERIC DEFAULT 0.01 -- Allow small rounding differences
)
RETURNS JSONB AS $$
DECLARE
    v_line RECORD;
    v_match RECORD;
    v_matched_count INTEGER := 0;
    v_bank_account_id UUID;
BEGIN
    -- Get bank account from statement
    SELECT bank_account_id INTO v_bank_account_id
    FROM bank_statements WHERE id = p_statement_id;
    
    -- Process each unmatched line
    FOR v_line IN
        SELECT * FROM bank_statement_lines
        WHERE statement_id = p_statement_id
          AND match_status = 'unmatched'
        ORDER BY transaction_date
    LOOP
        -- Look for matching journal entry
        SELECT 
            jl.journal_entry_id,
            je.reference,
            je.source_type,
            jl.debit,
            jl.credit
        INTO v_match
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE jl.account_id = v_bank_account_id
          AND je.entry_date = v_line.transaction_date
          AND (
              -- Credit in bank = Debit in journal (expense/withdrawal)
              (v_line.credit > 0 AND ABS(jl.debit - v_line.credit) <= p_match_threshold)
              OR
              -- Debit in bank = Credit in journal (income/deposit)
              (v_line.debit > 0 AND ABS(jl.credit - v_line.debit) <= p_match_threshold)
          )
          AND NOT EXISTS (
              -- Not already matched to another line
              SELECT 1 FROM bank_statement_lines bsl
              WHERE bsl.matched_transaction_id = jl.journal_entry_id
                AND bsl.match_status = 'matched'
          )
        LIMIT 1;
        
        IF v_match IS NOT NULL THEN
            UPDATE bank_statement_lines
            SET 
                match_status = 'matched',
                matched_transaction_id = v_match.journal_entry_id,
                matched_transaction_type = v_match.source_type,
                matched_at = NOW()
            WHERE id = v_line.id;
            
            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;
    
    -- Update statement status
    UPDATE bank_statements
    SET status = CASE 
        WHEN (SELECT COUNT(*) FROM bank_statement_lines 
              WHERE statement_id = p_statement_id AND match_status = 'unmatched') = 0 
        THEN 'reconciled'
        ELSE 'partial'
    END
    WHERE id = p_statement_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'statement_id', p_statement_id,
        'auto_matched_count', v_matched_count
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Function to manually match/unmatch lines
CREATE OR REPLACE FUNCTION public.manual_match_statement_line(
    p_line_id UUID,
    p_transaction_id UUID,
    p_transaction_type VARCHAR,
    p_matched_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_line RECORD;
BEGIN
    SELECT * INTO v_line FROM bank_statement_lines WHERE id = p_line_id;
    
    IF v_line IS NULL THEN
        RAISE EXCEPTION 'Statement line not found';
    END IF;
    
    UPDATE bank_statement_lines
    SET 
        match_status = 'matched',
        matched_transaction_id = p_transaction_id,
        matched_transaction_type = p_transaction_type,
        matched_by = p_matched_by,
        matched_at = NOW(),
        match_notes = p_notes
    WHERE id = p_line_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'line_id', p_line_id,
        'matched_to', p_transaction_id,
        'matched_to_type', p_transaction_type
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to get reconciliation report
CREATE OR REPLACE FUNCTION public.rpc_get_bank_reconciliation(
    p_bank_account_id UUID,
    p_statement_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'statement', jsonb_build_object(
            'id', bs.id,
            'date', bs.statement_date,
            'number', bs.statement_number,
            'opening_balance', bs.opening_balance,
            'closing_balance', bs.closing_balance,
            'status', bs.status
        ),
        'bank_account', jsonb_build_object(
            'id', coa.id,
            'code', coa.code,
            'name', coa.name
        ),
        'lines', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', bsl.id,
                'date', bsl.transaction_date,
                'description', bsl.description,
                'reference', bsl.reference_number,
                'debit', bsl.debit,
                'credit', bsl.credit,
                'match_status', bsl.match_status,
                'matched_transaction', CASE 
                    WHEN bsl.matched_transaction_id IS NOT NULL THEN
                        jsonb_build_object(
                            'id', bsl.matched_transaction_id,
                            'type', bsl.matched_transaction_type,
                            'reference', je.reference,
                            'source_type', je.source_type
                        )
                    ELSE NULL
                END
            ) ORDER BY bsl.line_number)
            FROM bank_statement_lines bsl
            LEFT JOIN journal_entries je ON je.id = bsl.matched_transaction_id
            WHERE bsl.statement_id = bs.id
        ),
        'summary', jsonb_build_object(
            'total_lines', (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id),
            'matched', (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'matched'),
            'unmatched', (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'unmatched'),
            'unmatched_debits', (SELECT COALESCE(SUM(debit), 0) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'unmatched'),
            'unmatched_credits', (SELECT COALESCE(SUM(credit), 0) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'unmatched')
        )
    ) INTO v_result
    FROM bank_statements bs
    JOIN chart_of_accounts coa ON coa.id = bs.bank_account_id
    WHERE bs.id = COALESCE(p_statement_id, (
        SELECT id FROM bank_statements 
        WHERE bank_account_id = p_bank_account_id 
        ORDER BY statement_date DESC LIMIT 1
    ));
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. View for unreconciled transactions (GL items not matched to statements)
CREATE OR REPLACE VIEW public.v_unreconciled_bank_transactions AS
SELECT 
    jl.id as journal_line_id,
    je.id as journal_entry_id,
    je.entry_date,
    je.reference,
    je.description,
    je.source_type,
    jl.account_id,
    coa.code as account_code,
    coa.name as account_name,
    jl.debit,
    jl.credit,
    CASE 
        WHEN bsl.id IS NULL THEN 'unreconciled'
        ELSE 'reconciled'
    END as reconciliation_status,
    bsl.statement_id,
    bs.statement_date as reconciled_date
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
LEFT JOIN bank_statement_lines bsl ON bsl.matched_transaction_id = je.id 
    AND bsl.match_status = 'matched'
LEFT JOIN bank_statements bs ON bs.id = bsl.statement_id
WHERE coa.account_class = 'bank'
  AND bsl.id IS NULL  -- Not matched
  AND je.source_type IN ('cheque', 'payment', 'manual', 'cogs_backfill')
ORDER BY je.entry_date DESC;

-- 9. Function to get suggested matches for a statement line
CREATE OR REPLACE FUNCTION public.rpc_get_suggested_matches(
    p_line_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_line RECORD;
    v_bank_account_id UUID;
BEGIN
    -- Get line details
    SELECT bsl.*, bs.bank_account_id 
    INTO v_line
    FROM bank_statement_lines bsl
    JOIN bank_statements bs ON bs.id = bsl.statement_id
    WHERE bsl.id = p_line_id;
    
    IF v_line IS NULL THEN
        RAISE EXCEPTION 'Statement line not found';
    END IF;
    
    RETURN (
        SELECT jsonb_agg(jsonb_build_object(
            'journal_entry_id', jl.journal_entry_id,
            'entry_date', je.entry_date,
            'reference', je.reference,
            'description', je.description,
            'source_type', je.source_type,
            'debit', jl.debit,
            'credit', jl.credit,
            'match_score', CASE
                WHEN je.entry_date = v_line.transaction_date THEN 100
                WHEN ABS(je.entry_date - v_line.transaction_date) <= 2 THEN 80
                ELSE 50
            END
        ) ORDER BY je.entry_date DESC)
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE jl.account_id = v_line.bank_account_id
          AND (
              (v_line.credit > 0 AND jl.debit > 0 AND jl.debit BETWEEN v_line.credit * 0.99 AND v_line.credit * 1.01)
              OR
              (v_line.debit > 0 AND jl.credit > 0 AND jl.credit BETWEEN v_line.debit * 0.99 AND v_line.debit * 1.01)
          )
          AND NOT EXISTS (
              SELECT 1 FROM bank_statement_lines bsl2
              WHERE bsl2.matched_transaction_id = jl.journal_entry_id
                AND bsl2.match_status = 'matched'
          )
        LIMIT 10
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE public.bank_statements IS 
    'Imported bank statements for reconciliation';
COMMENT ON TABLE public.bank_statement_lines IS 
    'Individual transactions from bank statements with matching status';
