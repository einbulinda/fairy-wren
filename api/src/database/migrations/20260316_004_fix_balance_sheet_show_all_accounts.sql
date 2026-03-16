-- ============================================================================
-- Migration: Fix Balance Sheet to Show All Accounts (Including Zero-Balance)
-- Date: 2026-03-16
-- Description:
--   The Balance Sheet RPC was filtering out child accounts with zero activity
--   due to the HAVING clause. This broke the account hierarchy display.
--   This migration updates rpc_balance_sheet to show all balance sheet accounts
--   including children of control accounts and accounts with zero balances.
-- ============================================================================

-- 1. Update rpc_balance_sheet to show all accounts including zero-balance children
CREATE OR REPLACE FUNCTION public.rpc_balance_sheet(p_as_of_date date) RETURNS TABLE (
        account_id uuid,
        account_code varchar,
        account_name varchar,
        account_class varchar,
        parent_id uuid,
        normal_balance varchar,
        is_control_account boolean,
        balance numeric
    ) LANGUAGE sql STABLE AS $function$
    -- Balance sheet accounts (asset, liability, equity)
    -- FIXED: Removed restrictive HAVING clause that hid zero-balance child accounts
    SELECT 
        coa.id AS account_id,
        coa.code AS account_code,
        coa.name AS account_name,
        coa.account_class,
        coa.parent_id,
        coa.normal_balance,
        coa.is_control_account,
        CASE
            WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
            ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
        END AS balance
    FROM chart_of_accounts coa
        LEFT JOIN (
            journal_lines jl
            JOIN journal_entries je ON je.id = jl.journal_entry_id
                AND je.entry_date <= p_as_of_date
        ) ON jl.account_id = coa.id
    WHERE coa.account_class IN (
            'asset',
            'current_asset',
            'non_current_asset',
            'bank',
            'liability',
            'current_liability',
            'non_current_liability',
            'equity'
        )
        AND coa.active = true
    GROUP BY 
        coa.id,
        coa.code,
        coa.name,
        coa.account_class,
        coa.parent_id,
        coa.normal_balance,
        coa.is_control_account
    -- FIXED: Show ALL balance sheet accounts, not just those with activity
    -- The frontend can filter zero-balance accounts if needed
    ORDER BY coa.code;
$function$;

-- 2. Also update rpc_trial_balance for consistency (optional but recommended)
-- This ensures both reports use the same logic for account visibility
CREATE OR REPLACE FUNCTION public.rpc_trial_balance(
    p_start_date date,
    p_end_date date
) RETURNS TABLE (
    account_id uuid,
    account_code varchar,
    account_name varchar,
    account_class varchar,
    parent_id uuid,
    normal_balance varchar,
    is_control_account boolean,
    total_debit numeric,
    total_credit numeric,
    balance numeric
) LANGUAGE sql STABLE AS $function$
    SELECT 
        coa.id AS account_id,
        coa.code AS account_code,
        coa.name AS account_name,
        coa.account_class,
        coa.parent_id,
        coa.normal_balance,
        coa.is_control_account,
        COALESCE(SUM(jl.debit), 0) AS total_debit,
        COALESCE(SUM(jl.credit), 0) AS total_credit,
        CASE
            WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
            ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
        END AS balance
    FROM chart_of_accounts coa
        LEFT JOIN (
            journal_lines jl
            JOIN journal_entries je ON je.id = jl.journal_entry_id
                AND je.entry_date >= p_start_date
                AND je.entry_date <= p_end_date
        ) ON jl.account_id = coa.id
    WHERE coa.active = true
    GROUP BY 
        coa.id,
        coa.code,
        coa.name,
        coa.account_class,
        coa.parent_id,
        coa.normal_balance,
        coa.is_control_account
    -- FIXED: Show all accounts, not just those with activity
    ORDER BY coa.code;
$function$;

-- 3. Create a helper view to debug account visibility issues
CREATE OR REPLACE VIEW public.v_balance_sheet_account_visibility AS
SELECT 
    coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    parent.code as parent_code,
    coa.is_control_account,
    coa.active,
    COALESCE(SUM(jl.debit), 0) as total_debits,
    COALESCE(SUM(jl.credit), 0) as total_credits,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
        ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
    END AS balance,
    CASE 
        WHEN coa.account_class IN (
            'asset', 'current_asset', 'non_current_asset', 'bank',
            'liability', 'current_liability', 'non_current_liability',
            'equity'
        ) THEN true 
        ELSE false 
    END as is_balance_sheet_class,
    CASE 
        WHEN coa.active = true 
             AND coa.account_class IN (
                'asset', 'current_asset', 'non_current_asset', 'bank',
                'liability', 'current_liability', 'non_current_liability',
                'equity'
             )
        THEN true 
        ELSE false 
    END as shows_in_balance_sheet
FROM chart_of_accounts coa
LEFT JOIN chart_of_accounts parent ON parent.id = coa.parent_id
LEFT JOIN journal_lines jl ON jl.account_id = coa.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
GROUP BY 
    coa.id, coa.code, coa.name, coa.account_class, 
    coa.parent_id, parent.code, coa.is_control_account, coa.active
ORDER BY coa.code;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the fix)
-- ============================================================================

-- Check AP accounts visibility:
-- SELECT * FROM v_balance_sheet_account_visibility WHERE code LIKE '2100%';

-- Check balance sheet output:
-- SELECT * FROM rpc_balance_sheet(CURRENT_DATE) WHERE account_code LIKE '2100%';

-- Check trial balance output:
-- SELECT * FROM rpc_trial_balance('2026-01-01', CURRENT_DATE) WHERE account_code LIKE '2100%';
