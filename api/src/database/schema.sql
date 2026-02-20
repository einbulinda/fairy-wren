-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
CREATE TABLE public.approval_requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    request_type character varying NOT NULL,
    reference_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status character varying DEFAULT 'pending'::character varying CHECK (
        status::text = ANY (
            ARRAY ['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text]
        )
    ),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT approval_requests_pkey PRIMARY KEY (id),
    CONSTRAINT approval_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    table_name character varying NOT NULL,
    record_id uuid NOT NULL,
    action character varying NOT NULL,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.bills (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    customer_name character varying,
    status character varying NOT NULL DEFAULT 'open'::character varying CHECK (
        status::text = ANY (
            ARRAY ['open'::character varying::text, 'void'::character varying::text, 'awaiting_confirmation'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text]
        )
    ),
    created_by uuid NOT NULL,
    subtotal numeric DEFAULT 0,
    tax numeric DEFAULT 0,
    total numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT bills_pkey PRIMARY KEY (id),
    CONSTRAINT bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT fk_bills_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.capital_contributions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    amount numeric NOT NULL,
    cash_account_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT capital_contributions_pkey PRIMARY KEY (id),
    CONSTRAINT capital_contributions_cash_account_id_fkey FOREIGN KEY (cash_account_id) REFERENCES public.cash_accounts(id)
);
CREATE TABLE public.cash_accounts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    type text CHECK (
        type = ANY (
            ARRAY ['bank'::text, 'petty_cash'::text, 'mobile_money'::text]
        )
    ),
    gl_account_id uuid NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cash_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT cash_accounts_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.chart_of_accounts(id)
);
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    color text NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chart_of_accounts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    account_class text NOT NULL CHECK (
        account_class = ANY (
            ARRAY ['asset'::text, 'liability'::text, 'equity'::text, 'income'::text, 'expense'::text, 'cost_of_sales'::text]
        )
    ),
    parent_id uuid,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    normal_balance text CHECK (
        normal_balance = ANY (ARRAY ['debit'::text, 'credit'::text])
    ),
    is_control_account boolean DEFAULT false,
    code character varying,
    CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT chart_of_accounts_parent_fk FOREIGN KEY (parent_id) REFERENCES public.chart_of_accounts(id)
);
CREATE TABLE public.customer_invoices (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    customer_name text NOT NULL,
    total numeric NOT NULL,
    status text CHECK (
        status = ANY (
            ARRAY ['open'::text, 'partially_paid'::text, 'paid'::text]
        )
    ),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_invoices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer_tabs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    customer_name character varying NOT NULL,
    bill_id uuid,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_tabs_pkey PRIMARY KEY (id),
    CONSTRAINT customer_tabs_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id)
);
CREATE TABLE public.employees (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    mpesa_no text NOT NULL,
    CONSTRAINT employees_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    expense_date date NOT NULL,
    account_id uuid NOT NULL,
    supplier_id uuid,
    description text,
    invoice_number character varying,
    amount numeric NOT NULL CHECK (amount > 0::numeric),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_account_fk FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id)
);
CREATE TABLE public.inventory (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    change integer NOT NULL,
    reason character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.inventory_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    inventory_account_id uuid NOT NULL,
    cogs_account_id uuid NOT NULL,
    product_id uuid UNIQUE,
    CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory_ledger (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    transaction_type character varying NOT NULL CHECK (
        transaction_type::text = ANY (
            ARRAY ['SALE'::character varying::text, 'RESTOCK'::character varying::text, 'VOID_REVERSAL'::character varying::text, 'STOCKTAKE_ADJUSTMENT'::character varying::text, 'MANUAL_ADJUSTMENT'::character varying::text]
        )
    ),
    quantity numeric NOT NULL,
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    unit_cost numeric,
    CONSTRAINT inventory_ledger_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT inventory_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.inventory_movements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    movement_date date NOT NULL,
    quantity numeric NOT NULL,
    movement_type text NOT NULL CHECK (
        movement_type = ANY (
            ARRAY ['purchase'::text, 'sale'::text, 'adjustment_in'::text, 'adjustment_out'::text, 'opening_balance'::text]
        )
    ),
    created_at timestamp with time zone DEFAULT now(),
    reference_type character varying NOT NULL,
    reference_id uuid NOT NULL,
    reason character varying,
    notes character varying,
    unit_cost numeric DEFAULT 0,
    CONSTRAINT inventory_movements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventory_receipt_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    receipt_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric NOT NULL,
    unit_cost numeric NOT NULL DEFAULT 0,
    line_total numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT inventory_receipt_items_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_receipt_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT inventory_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.inventory_receipts(id)
);
CREATE TABLE public.inventory_receipts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    supplier_id uuid NOT NULL,
    invoice_number character varying NOT NULL,
    purchase_date date NOT NULL,
    total_amount numeric NOT NULL DEFAULT 0,
    status character varying NOT NULL DEFAULT 'posted'::character varying,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT inventory_receipts_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT inventory_receipts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.journal_entries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    entry_date date NOT NULL,
    reference text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    source_type text,
    source_id uuid,
    reversed_entry_id uuid,
    CONSTRAINT journal_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_lines (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    CONSTRAINT journal_lines_pkey PRIMARY KEY (id),
    CONSTRAINT journal_lines_account_fk FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id),
    CONSTRAINT journal_lines_entry_fk FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id)
);
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    bill_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0::numeric),
    payment_type character varying NOT NULL CHECK (
        payment_type::text = ANY (
            ARRAY ['cash'::character varying::text, 'mpesa'::character varying::text]
        )
    ),
    is_paid boolean DEFAULT false,
    mpesa_code text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    status USER - DEFINED DEFAULT 'pending'::payment_status,
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id),
    CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id)
);
CREATE TABLE public.payroll_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    payroll_run_id uuid,
    employee_id uuid,
    net_amount numeric NOT NULL,
    CONSTRAINT payroll_items_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_items_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id),
    CONSTRAINT payroll_items_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);
CREATE TABLE public.payroll_runs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    period date NOT NULL,
    status character varying(20) DEFAULT 'draft' CHECK (
        status::text = ANY (
            ARRAY ['draft'::text, 'processed'::text, 'paid'::text]
        )
    ),
    total_gross numeric(15, 2) DEFAULT 0,
    total_deductions numeric(15, 2) DEFAULT 0,
    total_net numeric(15, 2) DEFAULT 0,
    employee_count integer DEFAULT 0,
    journal_entry_id uuid,
    salary_account_id uuid,
    payable_account_id uuid,
    notes text,
    created_by uuid,
    processed_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_runs_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_runs_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id),
    CONSTRAINT payroll_runs_salary_account_id_fkey FOREIGN KEY (salary_account_id) REFERENCES public.chart_of_accounts(id),
    CONSTRAINT payroll_runs_payable_account_id_fkey FOREIGN KEY (payable_account_id) REFERENCES public.chart_of_accounts(id),
    CONSTRAINT payroll_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    price numeric NOT NULL CHECK (price >= 0::numeric),
    category_id uuid NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    unit character varying CHECK (
        unit::text = ANY (
            ARRAY ['packet'::character varying::text, 'bottle'::character varying::text, 'can'::character varying::text, 'glass'::character varying::text, 'tot'::character varying::text]
        )
    ),
    cost_price numeric,
    track_inventory boolean DEFAULT true,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    role character varying NOT NULL CHECK (
        role::text = ANY (
            ARRAY ['waitress'::text, 'bartender'::text, 'manager'::text, 'owner'::text]
        )
    ),
    active boolean DEFAULT true,
    pin_hash text NOT NULL,
    pin_fingerprint text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.round_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    price numeric NOT NULL CHECK (price >= 0::numeric),
    inventory_posted boolean DEFAULT false CHECK (
        inventory_posted = true
        OR inventory_posted = false
    ),
    CONSTRAINT round_items_pkey PRIMARY KEY (id),
    CONSTRAINT round_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT round_items_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id)
);
CREATE TABLE public.rounds (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    bill_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    round_number integer NOT NULL,
    CONSTRAINT rounds_pkey PRIMARY KEY (id),
    CONSTRAINT rounds_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id),
    CONSTRAINT rounds_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.sales (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    sale_date date NOT NULL,
    revenue_account_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0::numeric),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sales_pkey PRIMARY KEY (id),
    CONSTRAINT sales_revenue_account_fk FOREIGN KEY (revenue_account_id) REFERENCES public.chart_of_accounts(id)
);
CREATE TABLE public.stock_take_audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    stock_take_id uuid NOT NULL,
    action_type character varying NOT NULL CHECK (
        action_type::text = ANY (
            ARRAY ['created'::character varying::text, 'item_added'::character varying::text, 'item_updated'::character varying::text, 'completed'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text, 'reopened'::character varying::text, 'deleted'::character varying::text]
        )
    ),
    performed_by_id uuid NOT NULL,
    performed_by_name character varying,
    action_timestamp timestamp with time zone DEFAULT now(),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    notes text,
    CONSTRAINT stock_take_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT stock_take_audit_log_performed_by_id_fkey FOREIGN KEY (performed_by_id) REFERENCES public.profiles(id),
    CONSTRAINT stock_take_audit_log_stock_take_id_fkey FOREIGN KEY (stock_take_id) REFERENCES public.stock_takes(id)
);
CREATE TABLE public.stock_take_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_take_id uuid,
    product_id uuid,
    system_qty integer NOT NULL,
    physical_qty integer NOT NULL,
    variance integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    cost_per_unit numeric,
    total_value_adjustment numeric,
    variance_percentage numeric,
    reason character varying CHECK (
        reason IS NULL
        OR (
            reason::text = ANY (
                ARRAY ['receiving_error'::character varying::text, 'count_mistake'::character varying::text, 'damaged_broken'::character varying::text, 'theft_shortage'::character varying::text, 'spillage_waste'::character varying::text, 'expired_product'::character varying::text, 'system_error'::character varying::text, 'transfer'::character varying::text, 'other'::character varying::text]
            )
        )
    ),
    notes text,
    adjustment_frequency integer DEFAULT 0,
    previous_adjustment_date timestamp with time zone,
    CONSTRAINT stock_take_items_pkey PRIMARY KEY (id),
    CONSTRAINT stock_take_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT stock_take_items_stock_take_id_fkey FOREIGN KEY (stock_take_id) REFERENCES public.stock_takes(id)
);
CREATE TABLE public.stock_takes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT now(),
    performed_by_id uuid,
    performed_by_role character varying,
    stock_take_name character varying,
    stock_take_type character varying DEFAULT 'full'::character varying CHECK (
        stock_take_type::text = ANY (
            ARRAY ['full'::character varying::text, 'partial'::character varying::text, 'spot_check'::character varying::text, 'cycle_count'::character varying::text]
        )
    ),
    reviewed_by_id uuid,
    reviewed_at timestamp with time zone,
    approval_status character varying DEFAULT 'pending'::character varying CHECK (
        approval_status::text = ANY (
            ARRAY ['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text, 'under_review'::character varying::text]
        )
    ),
    approval_notes text,
    completed_at timestamp with time zone,
    adjustments_applied boolean DEFAULT false,
    location character varying,
    CONSTRAINT stock_takes_pkey PRIMARY KEY (id),
    CONSTRAINT stock_takes_performed_by_id_fkey FOREIGN KEY (performed_by_id) REFERENCES public.profiles(id),
    CONSTRAINT stock_takes_reviewed_by_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.supplier_bills (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    supplier_id uuid,
    total numeric NOT NULL,
    status text CHECK (
        status = ANY (
            ARRAY ['open'::text, 'partially_paid'::text, 'paid'::text]
        )
    ),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT supplier_bills_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.suppliers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    phone character varying,
    email character varying,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    contact_person character varying,
    address text,
    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT suppliers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);
/*=======================================================================
 CHEQUES TABLE
 Tracks issued bank cheques. Each cheque auto-creates a journal entry
 (Dr charge account / Cr bank account) via the API cheques service.
 Created: 18/02/2026 - einbulinda
 ============================================================================
 */
CREATE TABLE IF NOT EXISTS public.cheques (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cheque_number varchar(50) NOT NULL,
    payee_name varchar(255) NOT NULL,
    bank_account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    debit_account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    amount numeric(15, 2) NOT NULL CHECK (amount > 0),
    cheque_date date NOT NULL,
    memo text,
    status varchar(20) DEFAULT 'issued' CHECK (status IN ('issued', 'cleared', 'voided')),
    journal_entry_id uuid REFERENCES journal_entries(id),
    cleared_at timestamptz,
    voided_at timestamptz,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);
/*=======================================================================
 SUPPLIER_PAYMENTS TABLE
 Records payments made to suppliers. Each payment auto-creates a journal
 entry (Dr Accounts Payable / Cr Bank Account) via the API service.
 Created: 19/02/2026 - einbulinda
 ============================================================================
 */
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    payment_date date NOT NULL,
    amount numeric(15, 2) NOT NULL CHECK (amount > 0),
    payment_method varchar(20) DEFAULT 'bank' CHECK (
        payment_method IN ('bank', 'cash', 'mpesa', 'cheque')
    ),
    reference varchar(100),
    bank_account_id uuid REFERENCES public.chart_of_accounts(id),
    notes text,
    journal_entry_id uuid REFERENCES public.journal_entries(id),
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);
/*=======================================================================
 EMPLOYEE_SALARY_STRUCTURES TABLE
 Stores each employee's salary breakdown (earnings + deductions + payment
 method). Linked to the profiles table via a unique profile_id. Upserted
 on save — one row per employee.
 Created: 19/02/2026 - einbulinda
 ============================================================================
 */
CREATE TABLE IF NOT EXISTS public.employee_salary_structures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id),
    basic_pay numeric(15, 2) NOT NULL DEFAULT 0,
    housing_allowance numeric(15, 2) DEFAULT 0,
    transport_allowance numeric(15, 2) DEFAULT 0,
    other_allowances numeric(15, 2) DEFAULT 0,
    paye numeric(15, 2) DEFAULT 0,
    nssf numeric(15, 2) DEFAULT 0,
    shif numeric(15, 2) DEFAULT 0,
    housing_levy numeric(15, 2) DEFAULT 0,
    other_deductions numeric(15, 2) DEFAULT 0,
    payment_method varchar(20) DEFAULT 'cash' CHECK (
        payment_method IN ('cash', 'bank', 'mpesa')
    ),
    bank_name varchar(100),
    account_number varchar(50),
    mpesa_number varchar(20),
    full_name varchar(200),
    id_number varchar(50),
    date_of_employment date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
/*=======================================================================
 PAYROLL_RUN_LINES TABLE
 One row per employee per payroll run. Captures a snapshot of the
 employee's earnings and deductions at the time of processing. Cascades
 on delete with the parent payroll_run.
 Created: 19/02/2026 - einbulinda
 ============================================================================
 */
CREATE TABLE IF NOT EXISTS public.payroll_run_lines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id),
    basic_pay numeric(15, 2) NOT NULL,
    housing_allowance numeric(15, 2) DEFAULT 0,
    transport_allowance numeric(15, 2) DEFAULT 0,
    other_allowances numeric(15, 2) DEFAULT 0,
    gross_pay numeric(15, 2) NOT NULL,
    paye numeric(15, 2) DEFAULT 0,
    nssf numeric(15, 2) DEFAULT 0,
    shif numeric(15, 2) DEFAULT 0,
    housing_levy numeric(15, 2) DEFAULT 0,
    other_deductions numeric(15, 2) DEFAULT 0,
    total_deductions numeric(15, 2) NOT NULL,
    net_pay numeric(15, 2) NOT NULL,
    payment_method varchar(20) DEFAULT 'cash',
    full_name varchar(200),
    id_number varchar(50),
    mpesa_number varchar(20),
    is_paid boolean DEFAULT false,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now()
);