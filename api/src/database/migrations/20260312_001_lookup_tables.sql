-- Migration: Dynamic lookup tables for account classes and system roles
-- Date: 2026-03-12
-- Description:
--   1. Creates account_classes lookup table with all known classes
--   2. Creates system_roles lookup table with current roles
--   3. Replaces CHECK constraints with FK references on chart_of_accounts and profiles

-- 1. Create account_classes lookup table
CREATE TABLE IF NOT EXISTS public.account_classes (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category = ANY (ARRAY ['asset', 'liability', 'equity', 'income', 'expense'])
    ),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed account classes
INSERT INTO account_classes (code, label, category, sort_order) VALUES
    ('asset',                  'Asset',                  'asset',     1),
    ('current_asset',          'Current Asset',          'asset',     2),
    ('non_current_asset',      'Non-Current Asset',      'asset',     3),
    ('liability',              'Liability',              'liability', 10),
    ('current_liability',      'Current Liability',      'liability', 11),
    ('non_current_liability',  'Non-Current Liability',  'liability', 12),
    ('equity',                 'Equity',                 'equity',    20),
    ('income',                 'Income',                 'income',    30),
    ('expense',                'Expense',                'expense',   40),
    ('cost_of_sales',          'Cost of Sales',          'expense',   41),
    ('finance_cost',           'Finance Cost',           'expense',   42),
    ('admin_cost',             'Admin Cost',             'expense',   43),
    ('operating_cost',         'Operating Cost',         'expense',   44)
ON CONFLICT (code) DO NOTHING;

-- 3. Create system_roles lookup table
CREATE TABLE IF NOT EXISTS public.system_roles (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed system roles
INSERT INTO system_roles (code, label, sort_order) VALUES
    ('waitress',   'Waitress',   1),
    ('bartender',  'Bartender',  2),
    ('manager',    'Manager',    3),
    ('owner',      'Owner',      4)
ON CONFLICT (code) DO NOTHING;

-- 5. Drop the CHECK constraint on chart_of_accounts.account_class and add FK
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    -- Find the CHECK constraint on account_class
    SELECT con.conname INTO v_constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.chart_of_accounts'::regclass
      AND con.contype = 'c'
      AND att.attname = 'account_class';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.chart_of_accounts DROP CONSTRAINT %I', v_constraint_name);
    END IF;
END;
$$;

ALTER TABLE public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_class_fk
    FOREIGN KEY (account_class) REFERENCES public.account_classes(code);

-- 6. Drop the CHECK constraint on profiles.role and add FK
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    SELECT con.conname INTO v_constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.profiles'::regclass
      AND con.contype = 'c'
      AND att.attname = 'role';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint_name);
    END IF;
END;
$$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_fk
    FOREIGN KEY (role) REFERENCES public.system_roles(code);
