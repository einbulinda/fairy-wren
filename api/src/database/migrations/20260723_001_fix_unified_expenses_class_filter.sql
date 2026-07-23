-- Migration: Fix rpc_unified_expenses to match the expense category, not just the
--   literal 'expense' account_class code.
-- Date: 2026-07-23
-- Description: The journal-lines branch of rpc_unified_expenses filtered on
--   coa.account_class = 'expense', which excludes the other expense-category
--   classes (cost_of_sales, finance_cost, admin_cost, operating_cost) that the
--   app already lets you post expense cheques against. In practice almost every
--   real expense account uses one of those subclasses, so cheque-sourced
--   expenses against them were silently missing from the unified expenses view
--   (the Expenses tab). Join account_classes and filter on category instead,
--   matching how the ERP frontend already determines "is this an expense
--   account" (accountClasses.filter(c => c.category === 'expense')).

CREATE OR REPLACE FUNCTION public.rpc_unified_expenses(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, txn_date date, account_name character varying, account_code character varying, account_id uuid, parent_id uuid, supplier_name character varying, credit_account_name character varying, description text, invoice_number character varying, amount numeric, source text, journal_entry_id uuid)
 LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY -- Direct expenses
SELECT e.id,
    e.expense_date AS txn_date,
    coa.name::varchar AS account_name,
    coa.code::varchar AS account_code,
    e.account_id,
    coa.parent_id,
    s.name::varchar AS supplier_name,
    cr.name::varchar AS credit_account_name,
    e.description,
    e.invoice_number::varchar,
    e.amount,
    'expense'::text AS source,
    e.journal_entry_id
FROM expenses e
    JOIN chart_of_accounts coa ON e.account_id = coa.id
    LEFT JOIN suppliers s ON e.supplier_id = s.id
    LEFT JOIN chart_of_accounts cr ON e.credit_account_id = cr.id
WHERE (
        p_start_date IS NULL
        OR e.expense_date >= p_start_date
    )
    AND (
        p_end_date IS NULL
        OR e.expense_date <= p_end_date
    )
UNION ALL
-- Journal lines hitting expense accounts (excluding expense-sourced journals)
SELECT jl.id,
    je.entry_date AS txn_date,
    coa.name::varchar AS account_name,
    coa.code::varchar AS account_code,
    jl.account_id,
    coa.parent_id,
    NULL::varchar AS supplier_name,
    NULL::varchar AS credit_account_name,
    COALESCE(jl.description, je.description) AS description,
    je.reference::varchar AS invoice_number,
    jl.debit AS amount,
    je.source_type::text AS source,
    je.id AS journal_entry_id
FROM journal_lines jl
    JOIN chart_of_accounts coa ON jl.account_id = coa.id
    JOIN account_classes ac ON ac.code = coa.account_class
    JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE ac.category = 'expense'
    AND jl.debit > 0
    AND je.source_type != 'expense'
    AND je.reversed_entry_id IS NULL
    AND (
        p_start_date IS NULL
        OR je.entry_date >= p_start_date
    )
    AND (
        p_end_date IS NULL
        OR je.entry_date <= p_end_date
    )
ORDER BY txn_date DESC;
END;
$function$;
