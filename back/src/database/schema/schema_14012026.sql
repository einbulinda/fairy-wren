-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
CREATE TABLE public.approval_requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    request_type character varying NOT NULL,
    reference_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status character varying DEFAULT 'pending'::character varying CHECK (
        status::text = ANY (
            ARRAY ['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text []
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
    code character varying NOT NULL UNIQUE,
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
    CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT chart_of_accounts_parent_fk FOREIGN KEY (parent_id) REFERENCES public.chart_of_accounts(id)
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
    name character varying NOT NULL,
    inventory_account_id uuid NOT NULL,
    cogs_account_id uuid NOT NULL,
    cost_price numeric NOT NULL,
    CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_asset_fk FOREIGN KEY (inventory_account_id) REFERENCES public.chart_of_accounts(id),
    CONSTRAINT inventory_cogs_fk FOREIGN KEY (cogs_account_id) REFERENCES public.chart_of_accounts(id)
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
    CONSTRAINT inventory_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT inventory_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.inventory_movements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    item_id uuid NOT NULL,
    movement_date date NOT NULL,
    quantity numeric NOT NULL,
    movement_type text NOT NULL CHECK (
        movement_type = ANY (ARRAY ['purchase'::text, 'sale'::text])
    ),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_movements_item_fk FOREIGN KEY (item_id) REFERENCES public.inventory_items(id)
);
CREATE TABLE public.journal_entries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    entry_date date NOT NULL,
    reference text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT journal_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_lines (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    CONSTRAINT journal_lines_pkey PRIMARY KEY (id),
    CONSTRAINT journal_lines_entry_fk FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id),
    CONSTRAINT journal_lines_account_fk FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id)
);
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    bill_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0::numeric),
    payment_type character varying NOT NULL CHECK (
        payment_type::text = ANY (
            ARRAY ['cash'::character varying, 'mpesa'::character varying]::text []
        )
    ),
    is_paid boolean DEFAULT false,
    mpesa_code character varying,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id),
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    price numeric NOT NULL CHECK (price >= 0::numeric),
    category_id uuid NOT NULL,
    current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
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
            ARRAY ['waitress'::text, 'bartender'::text, 'manager'::text, 'owner'::text, 'system developer'::text]
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
    CONSTRAINT round_items_pkey PRIMARY KEY (id),
    CONSTRAINT round_items_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id),
    CONSTRAINT round_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
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
CREATE TABLE public.stock_take_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_take_id uuid,
    product_id uuid,
    system_qty integer NOT NULL,
    physical_qty integer NOT NULL,
    variance integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_take_items_pkey PRIMARY KEY (id),
    CONSTRAINT stock_take_items_stock_take_id_fkey FOREIGN KEY (stock_take_id) REFERENCES public.stock_takes(id),
    CONSTRAINT stock_take_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.stock_takes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_takes_pkey PRIMARY KEY (id),
    CONSTRAINT stock_takes_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
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
    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT suppliers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id),
    CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);