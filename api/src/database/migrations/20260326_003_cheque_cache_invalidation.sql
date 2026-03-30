-- ============================================================================
-- Migration: Cheque Module - Cache Invalidation & Data Flow Fixes
-- Description: 
--   1. Create function to notify on journal entry changes
--   2. Add trigger for real-time balance updates
--   3. Create view for cheque-journal linkage verification
-- ============================================================================

-- 1. Create table to track financial data changes for cache invalidation
CREATE TABLE IF NOT EXISTS public.financial_data_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_type VARCHAR(50) NOT NULL, -- 'journal_created', 'journal_voided', 'cheque_issued', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'cheque', 'journal_entry', 'payment'
    entity_id UUID NOT NULL,
    affected_accounts UUID[] DEFAULT '{}',
    change_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_financial_changes_unprocessed 
ON financial_data_changes(change_timestamp) 
WHERE processed = false;

-- 2. Function to log financial changes (for cache invalidation triggers)
CREATE OR REPLACE FUNCTION public.log_financial_change(
    p_change_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_affected_accounts UUID[]
)
RETURNS void AS $$
BEGIN
    INSERT INTO financial_data_changes (
        change_type, entity_type, entity_id, affected_accounts
    ) VALUES (
        p_change_type, p_entity_type, p_entity_id, p_affected_accounts
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger function to auto-log journal entry changes
CREATE OR REPLACE FUNCTION public.trg_log_journal_change()
RETURNS trigger AS $$
DECLARE
    v_affected_accounts UUID[];
BEGIN
    -- Get affected accounts
    SELECT ARRAY_AGG(DISTINCT account_id) INTO v_affected_accounts
    FROM journal_lines
    WHERE journal_entry_id = NEW.id;
    
    -- Log the change
    PERFORM log_financial_change(
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'journal_created'
            WHEN TG_OP = 'UPDATE' THEN 'journal_updated'
            ELSE 'journal_deleted'
        END,
        'journal_entry',
        NEW.id,
        v_affected_accounts
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger to journal_entries
DROP TRIGGER IF EXISTS trg_log_journal_change ON journal_entries;
CREATE TRIGGER trg_log_journal_change
    AFTER INSERT OR UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION trg_log_journal_change();

-- 5. Create view for cheque-journal verification
CREATE OR REPLACE VIEW public.v_cheque_journal_linkage AS
SELECT 
    c.id as cheque_id,
    c.cheque_number,
    c.transaction_type,
    c.amount,
    c.cheque_date,
    c.status,
    c.bank_account_id,
    c.debit_account_id,
    ba.code as bank_account_code,
    ba.name as bank_account_name,
    da.code as debit_account_code,
    da.name as debit_account_name,
    je.id as journal_entry_id,
    je.reference as journal_reference,
    je.entry_date as journal_date,
    CASE WHEN je.id IS NOT NULL THEN true ELSE false END as has_journal,
    CASE 
        WHEN c.status = 'voided' AND je.id IS NOT NULL 
        THEN EXISTS(SELECT 1 FROM journal_entries rev 
                    WHERE rev.reversed_entry_id = je.id)
        ELSE null
    END as has_reversal,
    c.created_at,
    c.journal_entry_id is not null as is_linked
FROM cheques c
LEFT JOIN chart_of_accounts ba ON ba.id = c.bank_account_id
LEFT JOIN chart_of_accounts da ON da.id = c.debit_account_id
LEFT JOIN journal_entries je ON je.source_id = c.id AND je.source_type = 'cheque'
ORDER BY c.cheque_date DESC, c.created_at DESC;

-- 6. Create function to get cheque with full details (for API)
CREATE OR REPLACE FUNCTION public.rpc_get_cheque_details(p_cheque_id UUID)
RETURNS TABLE (
    cheque_id UUID,
    cheque_number VARCHAR,
    transaction_type VARCHAR,
    amount NUMERIC,
    cheque_date DATE,
    status VARCHAR,
    memo TEXT,
    payee_name VARCHAR,
    payee_type VARCHAR,
    bank_account_id UUID,
    bank_account_code VARCHAR,
    bank_account_name VARCHAR,
    debit_account_id UUID,
    debit_account_code VARCHAR,
    debit_account_name VARCHAR,
    journal_entry_id UUID,
    journal_reference VARCHAR,
    journal_lines JSONB,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.cheque_number,
        c.transaction_type,
        c.amount,
        c.cheque_date,
        c.status,
        c.memo,
        c.payee_name,
        c.payee_type,
        c.bank_account_id,
        ba.code,
        ba.name,
        c.debit_account_id,
        da.code,
        da.name,
        c.journal_entry_id,
        je.reference,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'account_id', jl.account_id,
                'account_code', coa.code,
                'account_name', coa.name,
                'debit', jl.debit,
                'credit', jl.credit
            ))
            FROM journal_lines jl
            JOIN chart_of_accounts coa ON coa.id = jl.account_id
            WHERE jl.journal_entry_id = je.id),
            '[]'::jsonb
        ),
        c.created_at
    FROM cheques c
    LEFT JOIN chart_of_accounts ba ON ba.id = c.bank_account_id
    LEFT JOIN chart_of_accounts da ON da.id = c.debit_account_id
    LEFT JOIN journal_entries je ON je.id = c.journal_entry_id
    WHERE c.id = p_cheque_id;
END;
$$;

-- 7. Create index for faster cheque lookups
CREATE INDEX IF NOT EXISTS idx_cheques_journal_link 
ON cheques(journal_entry_id) 
WHERE journal_entry_id IS NOT NULL;

-- 8. Function to validate cheque accounts before creation
CREATE OR REPLACE FUNCTION public.validate_cheque_accounts(
    p_bank_account_id UUID,
    p_debit_account_id UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    bank_account_valid BOOLEAN,
    debit_account_valid BOOLEAN,
    bank_account_class TEXT,
    debit_account_class TEXT
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_bank_valid BOOLEAN;
    v_debit_valid BOOLEAN;
    v_bank_class TEXT;
    v_debit_class TEXT;
BEGIN
    -- Check bank account
    SELECT true, account_class 
    INTO v_bank_valid, v_bank_class
    FROM chart_of_accounts
    WHERE id = p_bank_account_id 
      AND active = true
      AND account_class IN ('bank', 'current_asset', 'asset');
    
    -- Check debit account
    SELECT true, account_class
    INTO v_debit_valid, v_debit_class
    FROM chart_of_accounts
    WHERE id = p_debit_account_id
      AND active = true;
    
    RETURN QUERY
    SELECT 
        COALESCE(v_bank_valid, false) AND COALESCE(v_debit_valid, false),
        CASE 
            WHEN NOT COALESCE(v_bank_valid, false) THEN 'Invalid bank account'
            WHEN NOT COALESCE(v_debit_valid, false) THEN 'Invalid debit account'
            ELSE NULL
        END,
        COALESCE(v_bank_valid, false),
        COALESCE(v_debit_valid, false),
        v_bank_class,
        v_debit_class;
END;
$$;

COMMENT ON TABLE public.financial_data_changes IS 
    'Tracks changes to financial data for cache invalidation and real-time updates';
