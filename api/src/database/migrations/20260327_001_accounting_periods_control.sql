-- ============================================================================
-- Migration: End of Period Control System
-- Description: Complete period management with closing entries and locking
-- ============================================================================

-- 1. Create accounting periods table
CREATE TABLE IF NOT EXISTS public.accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    period_name VARCHAR(20) NOT NULL, -- e.g., '2026-03'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open' 
        CHECK (status IN ('open', 'closing', 'closed', 'reopened')),
    
    -- Closing information
    closed_by UUID REFERENCES public.profiles(id),
    closed_at TIMESTAMPTZ,
    closed_via VARCHAR(20) CHECK (closed_via IN ('manual', 'auto', 'system')),
    
    -- Reopening information (audit trail)
    reopened_by UUID REFERENCES public.profiles(id),
    reopened_at TIMESTAMPTZ,
    reopen_reason TEXT,
    
    -- Period totals (for quick reference)
    total_revenue NUMERIC(15, 2),
    total_expenses NUMERIC(15, 2),
    net_income NUMERIC(15, 2),
    
    -- Closing journal entry reference
    closing_entry_id UUID REFERENCES public.journal_entries(id),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(year, month)
);

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status 
ON accounting_periods(status) WHERE status IN ('open', 'closing');

CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates 
ON accounting_periods(start_date, end_date);

-- 3. Function to auto-generate periods for a year
CREATE OR REPLACE FUNCTION public.generate_accounting_periods(p_year INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_month INTEGER;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    FOR v_month IN 1..12 LOOP
        v_start_date := make_date(p_year, v_month, 1);
        v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        
        INSERT INTO accounting_periods (
            year, month, period_name, start_date, end_date, status
        )
        VALUES (
            p_year, v_month, 
            p_year || '-' || LPAD(v_month::TEXT, 2, '0'),
            v_start_date, v_end_date,
            CASE 
                WHEN v_end_date < CURRENT_DATE THEN 'closed'
                ELSE 'open'
            END
        )
        ON CONFLICT (year, month) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to check if date is in closed period
CREATE OR REPLACE FUNCTION public.is_period_closed(p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
    FROM accounting_periods
    WHERE p_date BETWEEN start_date AND end_date;
    
    RETURN COALESCE(v_status = 'closed', false);
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Trigger function to prevent posting to closed periods
CREATE OR REPLACE FUNCTION public.trg_check_period_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_period RECORD;
BEGIN
    -- Find the period for this entry date
    SELECT * INTO v_period
    FROM accounting_periods
    WHERE NEW.entry_date BETWEEN start_date AND end_date
    ORDER BY end_date DESC
    LIMIT 1;
    
    -- If period is closed, reject
    IF v_period.status = 'closed' THEN
        RAISE EXCEPTION 'Cannot post to closed period: %. Period was closed on % by %. Reason: %',
            v_period.period_name,
            v_period.closed_at,
            (SELECT name FROM profiles WHERE id = v_period.closed_by),
            COALESCE(v_period.notes, 'No reason provided')
            USING HINT = 'Contact administrator to reopen period if adjustment is needed';
    END IF;
    
    -- If period is in closing process, warn but allow (configurable)
    IF v_period.status = 'closing' THEN
        RAISE WARNING 'Posting to period % which is in closing process',
            v_period.period_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach trigger to journal_entries
DROP TRIGGER IF EXISTS trg_check_period_lock ON journal_entries;
CREATE TRIGGER trg_check_period_lock
    BEFORE INSERT OR UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION trg_check_period_lock();

-- 7. Function to close a period
CREATE OR REPLACE FUNCTION public.close_accounting_period(
    p_year INTEGER,
    p_month INTEGER,
    p_closed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_create_closing_entry BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_period RECORD;
    v_retained_earnings UUID;
    v_closing_entry_id UUID;
    v_total_revenue NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_net_income NUMERIC := 0;
    v_revenue_accounts UUID[];
    v_expense_accounts UUID[];
BEGIN
    -- Get period details
    SELECT * INTO v_period
    FROM accounting_periods
    WHERE year = p_year AND month = p_month;
    
    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Period %-% not found', p_year, p_month;
    END IF;
    
    IF v_period.status = 'closed' THEN
        RAISE EXCEPTION 'Period % is already closed', v_period.period_name;
    END IF;
    
    -- Get retained earnings account (code 3900)
    SELECT id INTO v_retained_earnings
    FROM chart_of_accounts 
    WHERE code = '3900' AND active = true;
    
    IF v_retained_earnings IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings account (3900) not found or inactive';
    END IF;
    
    -- Calculate period totals from income statement
    SELECT 
        COALESCE(SUM(CASE WHEN account_class = 'income' THEN balance ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN account_class IN ('expense', 'cost_of_sales', 'finance_cost', 'admin_cost', 'operating_cost') THEN balance ELSE 0 END), 0)
    INTO v_total_revenue, v_total_expenses
    FROM rpc_income_statement(v_period.start_date, v_period.end_date)
    WHERE is_computed = false;
    
    v_net_income := v_total_revenue - v_total_expenses;
    
    -- Create closing journal entry if requested
    IF p_create_closing_entry AND v_net_income != 0 THEN
        INSERT INTO journal_entries (
            entry_date,
            reference,
            description,
            source_type
        )
        VALUES (
            v_period.end_date,
            format('CLOSE-%s', v_period.period_name),
            format('Closing entries for %s (Net Income: %s)', 
                   v_period.period_name, 
                   TO_CHAR(v_net_income, 'FM999,999,999.00')),
            'period_close'
        )
        RETURNING id INTO v_closing_entry_id;
        
        -- Close revenue accounts (debit revenue to zero it out)
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        SELECT 
            v_closing_entry_id,
            account_id,
            balance,  -- Debit to reduce credit balance
            0
        FROM rpc_income_statement(v_period.start_date, v_period.end_date)
        WHERE account_class = 'income' 
          AND balance > 0
          AND is_computed = false;
        
        -- Close expense accounts (credit expense to zero it out)
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        SELECT 
            v_closing_entry_id,
            account_id,
            0,
            balance  -- Credit to reduce debit balance
        FROM rpc_income_statement(v_period.start_date, v_period.end_date)
        WHERE account_class IN ('expense', 'cost_of_sales', 'finance_cost', 'admin_cost', 'operating_cost')
          AND balance > 0
          AND is_computed = false;
        
        -- Balance to retained earnings
        IF v_net_income > 0 THEN
            -- Profit: Credit retained earnings
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_closing_entry_id, v_retained_earnings, 0, v_net_income);
        ELSIF v_net_income < 0 THEN
            -- Loss: Debit retained earnings
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_closing_entry_id, v_retained_earnings, ABS(v_net_income), 0);
        END IF;
    END IF;
    
    -- Update period status
    UPDATE accounting_periods
    SET status = 'closed',
        closed_by = p_closed_by,
        closed_at = NOW(),
        closed_via = 'manual',
        total_revenue = v_total_revenue,
        total_expenses = v_total_expenses,
        net_income = v_net_income,
        closing_entry_id = v_closing_entry_id,
        notes = p_notes,
        updated_at = NOW()
    WHERE id = v_period.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'period_id', v_period.id,
        'period_name', v_period.period_name,
        'status', 'closed',
        'total_revenue', v_total_revenue,
        'total_expenses', v_total_expenses,
        'net_income', v_net_income,
        'closing_entry_id', v_closing_entry_id,
        'closed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Function to reopen a period (with audit trail)
CREATE OR REPLACE FUNCTION public.reopen_accounting_period(
    p_year INTEGER,
    p_month INTEGER,
    p_reopened_by UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_period RECORD;
BEGIN
    -- Validate reason
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
        RAISE EXCEPTION 'Reopen reason must be at least 10 characters';
    END IF;
    
    SELECT * INTO v_period
    FROM accounting_periods
    WHERE year = p_year AND month = p_month;
    
    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Period %-% not found', p_year, p_month;
    END IF;
    
    IF v_period.status != 'closed' THEN
        RAISE EXCEPTION 'Period % must be closed before reopening', v_period.period_name;
    END IF;
    
    -- Update period
    UPDATE accounting_periods
    SET status = 'reopened',
        reopened_by = p_reopened_by,
        reopened_at = NOW(),
        reopen_reason = p_reason,
        updated_at = NOW()
    WHERE id = v_period.id;
    
    -- Note: Closing entry reversal must be done manually for audit trail
    RETURN jsonb_build_object(
        'success', true,
        'period_id', v_period.id,
        'period_name', v_period.period_name,
        'status', 'reopened',
        'warning', 'Closing entry (journal entry ' || v_period.closing_entry_id || ') must be reversed manually if needed',
        'reopened_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Function to get period status with warnings
CREATE OR REPLACE FUNCTION public.rpc_get_period_status(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
    v_period RECORD;
    v_open_periods INTEGER;
    v_prior_unclosed INTEGER;
BEGIN
    -- Get current period
    SELECT * INTO v_period
    FROM accounting_periods
    WHERE p_date BETWEEN start_date AND end_date;
    
    -- Count open periods
    SELECT COUNT(*) INTO v_open_periods
    FROM accounting_periods
    WHERE status = 'open';
    
    -- Count prior unclosed periods
    SELECT COUNT(*) INTO v_prior_unclosed
    FROM accounting_periods
    WHERE end_date < v_period.start_date
      AND status = 'open';
    
    RETURN jsonb_build_object(
        'current_period', jsonb_build_object(
            'id', v_period.id,
            'name', v_period.period_name,
            'status', v_period.status,
            'start_date', v_period.start_date,
            'end_date', v_period.end_date
        ),
        'statistics', jsonb_build_object(
            'total_open_periods', v_open_periods,
            'prior_unclosed_periods', v_prior_unclosed,
            'can_post', v_period.status IN ('open', 'reopened')
        ),
        'warnings', CASE 
            WHEN v_prior_unclosed > 0 THEN 
                array['There are ' || v_prior_unclosed || ' prior period(s) still open']
            ELSE 
                array[]::TEXT[]
        END
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Seed current and next year periods
SELECT generate_accounting_periods(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
SELECT generate_accounting_periods(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1);

COMMENT ON TABLE public.accounting_periods IS 
    'Accounting periods with closing controls and audit trail';
