-- Migration: Add 'bank' account class to balance sheet and cash flow RPCs
-- Date: 2026-03-12
-- Description: Bank accounts (petty cash, mpesa, bank) need to appear on
--   balance sheet and cash flow statements as current assets.

-- 1. Update rpc_balance_sheet to include 'bank'
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
SELECT coa.id AS account_id,
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
        'asset', 'current_asset', 'non_current_asset', 'bank',
        'liability', 'current_liability', 'non_current_liability',
        'equity'
    )
    AND coa.active = true
GROUP BY coa.id, coa.code, coa.name, coa.account_class,
    coa.parent_id, coa.normal_balance, coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
ORDER BY coa.code;
$function$;

-- 2. Update rpc_cash_flow_data to include 'bank'
CREATE OR REPLACE FUNCTION public.rpc_cash_flow_data(
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
    opening_balance numeric,
    closing_balance numeric,
    net_change numeric
) LANGUAGE sql STABLE AS $function$
SELECT
    coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account,
    CASE
        WHEN coa.normal_balance = 'credit'
            THEN COALESCE(SUM(CASE WHEN je.entry_date < p_start_date THEN jl.credit - jl.debit ELSE 0 END), 0)
        ELSE COALESCE(SUM(CASE WHEN je.entry_date < p_start_date THEN jl.debit - jl.credit ELSE 0 END), 0)
    END AS opening_balance,
    CASE
        WHEN coa.normal_balance = 'credit'
            THEN COALESCE(SUM(CASE WHEN je.entry_date <= p_end_date THEN jl.credit - jl.debit ELSE 0 END), 0)
        ELSE COALESCE(SUM(CASE WHEN je.entry_date <= p_end_date THEN jl.debit - jl.credit ELSE 0 END), 0)
    END AS closing_balance,
    CASE
        WHEN coa.normal_balance = 'credit'
            THEN COALESCE(SUM(CASE WHEN je.entry_date >= p_start_date AND je.entry_date <= p_end_date THEN jl.credit - jl.debit ELSE 0 END), 0)
        ELSE COALESCE(SUM(CASE WHEN je.entry_date >= p_start_date AND je.entry_date <= p_end_date THEN jl.debit - jl.credit ELSE 0 END), 0)
    END AS net_change
FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.account_class IN (
        'asset', 'current_asset', 'non_current_asset', 'bank',
        'liability', 'current_liability', 'non_current_liability',
        'equity'
    )
    AND coa.active = true
GROUP BY coa.id, coa.code, coa.name, coa.account_class,
    coa.parent_id, coa.normal_balance, coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
ORDER BY coa.code;
$function$;
