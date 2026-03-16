-- =============================================================================
-- DIAGNOSTIC QUERY: Why Are Accounts Payable Not Showing in Balance Sheet?
-- =============================================================================

-- 1. CHECK: Do the account class codes exist?
SELECT 'ACCOUNT CLASSES' as check_type, code, label, category
FROM account_classes
WHERE code IN ('current_liability', 'liability', 'current_asset', 'non_current_asset', 'bank', 'equity')
ORDER BY code;

-- 2. CHECK: What account classes are your AP accounts actually using?
SELECT 
    'AP ACCOUNT CLASSES' as check_type,
    coa.code,
    coa.name,
    coa.account_class,
    ac.category as expected_category,
    coa.parent_id,
    parent.code as parent_code,
    coa.is_control_account,
    coa.active
FROM chart_of_accounts coa
LEFT JOIN account_classes ac ON ac.code = coa.account_class
LEFT JOIN chart_of_accounts parent ON parent.id = coa.parent_id
WHERE coa.code LIKE '2100%'
ORDER BY coa.code;

-- 3. CHECK: What are the actual balances of AP accounts?
SELECT 
    'AP BALANCES' as check_type,
    coa.code,
    coa.name,
    coa.account_class,
    COALESCE(SUM(jl.debit), 0) as total_debits,
    COALESCE(SUM(jl.credit), 0) as total_credits,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
        ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
    END as balance,
    COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) as activity_amount
FROM chart_of_accounts coa
LEFT JOIN journal_lines jl ON jl.account_id = coa.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.code LIKE '2100%'
GROUP BY coa.id, coa.code, coa.name, coa.account_class, coa.normal_balance
ORDER BY coa.code;

-- 4. CHECK: Will these accounts appear in the Balance Sheet RPC?
SELECT 
    'BALANCE SHEET VISIBILITY' as check_type,
    coa.code,
    coa.name,
    coa.account_class,
    CASE 
        WHEN coa.account_class IN (
            'asset', 'current_asset', 'non_current_asset', 'bank',
            'liability', 'current_liability', 'non_current_liability',
            'equity'
        ) THEN 'YES - Class OK'
        ELSE 'NO - Class excluded'
    END as class_check,
    CASE 
        WHEN COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0 
            OR coa.parent_id IS NULL 
            OR coa.is_control_account = true 
        THEN 'YES - Passes HAVING'
        ELSE 'NO - Filtered by HAVING clause'
    END as having_check,
    COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) as activity,
    coa.parent_id,
    coa.is_control_account
FROM chart_of_accounts coa
LEFT JOIN journal_lines jl ON jl.account_id = coa.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.code LIKE '2100%'
GROUP BY coa.id, coa.code, coa.name, coa.account_class, coa.parent_id, coa.is_control_account
ORDER BY coa.code;

-- 5. CHECK: Is there a parent Trade Payables account (2100) with proper setup?
SELECT 
    'PARENT ACCOUNT CHECK' as check_type,
    coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.is_control_account,
    coa.active
FROM chart_of_accounts coa
WHERE coa.code = '2100';

-- 6. CHECK: How many supplier accounts are linked to AP accounts?
SELECT 
    'SUPPLIER LINKS' as check_type,
    s.name as supplier_name,
    s.account_id,
    coa.code as ap_account_code,
    coa.name as ap_account_name,
    coa.account_class
FROM suppliers s
LEFT JOIN chart_of_accounts coa ON coa.id = s.account_id
ORDER BY s.name;

-- 7. CHECK: Sample of journal entries for AP accounts (to verify posting is working)
SELECT 
    'SAMPLE JOURNAL ENTRIES' as check_type,
    coa.code,
    coa.name,
    je.entry_date,
    je.source_type,
    jl.debit,
    jl.credit
FROM chart_of_accounts coa
JOIN journal_lines jl ON jl.account_id = coa.id
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.code LIKE '2100%'
ORDER BY je.entry_date DESC
LIMIT 10;
