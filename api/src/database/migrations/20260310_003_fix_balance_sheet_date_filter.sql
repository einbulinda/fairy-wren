-- Migration: Fix balance sheet and trial balance date filtering
-- Date: 2026-03-10
-- Description: The LEFT JOIN pattern was joining journal_lines without
--   restricting by date, then LEFT JOINing journal_entries with a date
--   filter. This caused ALL journal lines to be summed regardless of date,
--   producing incorrect balances. Fixed by using a nested JOIN so that
--   only date-filtered lines are included.

-- 1. Fix rpc_balance_sheet
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
        'asset',
        'current_asset',
        'non_current_asset',
        'liability',
        'current_liability',
        'non_current_liability',
        'equity'
    )
    AND coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
ORDER BY coa.code;
$function$;

-- 2. Fix rpc_trial_balance
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
SELECT coa.id AS account_id,
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
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
ORDER BY coa.code;
$function$;
