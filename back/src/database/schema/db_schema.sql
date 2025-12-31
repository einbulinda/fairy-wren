-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- FUNCTIONS
-- =====================================================
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;
-- =====================================================
-- PROFILES (USERS)
-- =====================================================
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    role varchar(50) NOT NULL,
    active boolean DEFAULT true,
    pin_hash text NOT NULL,
    pin_fingerprint text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT profiles_role_check CHECK (
        role = ANY (
            ARRAY ['waitress', 'bartender', 'manager', 'owner']
        )
    )
);
CREATE UNIQUE INDEX uniq_profiles_pin_fingerprint ON public.profiles(pin_fingerprint);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER update_categories_updated_at BEFORE
UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    price numeric(10, 2) NOT NULL CHECK (price >= 0),
    category_id uuid NOT NULL REFERENCES categories(id),
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image text,
    image_url text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(active);
CREATE TRIGGER update_products_updated_at BEFORE
UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- BILLS
-- =====================================================
CREATE TABLE public.bills (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name varchar(255),
    status varchar(50) NOT NULL DEFAULT 'open',
    created_by uuid NOT NULL REFERENCES profiles(id),
    subtotal numeric(10, 2) DEFAULT 0,
    tax numeric(10, 2) DEFAULT 0,
    total numeric(10, 2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT bills_status_check CHECK (
        status IN (
            'open',
            'awaiting_confirmation',
            'completed',
            'cancelled'
        )
    )
);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_created_by ON public.bills(created_by);
CREATE TRIGGER update_bills_updated_at BEFORE
UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- ROUNDS
-- =====================================================
CREATE TABLE public.rounds (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_rounds_bill ON public.rounds(bill_id);
-- =====================================================
-- ROUND ITEMS
-- =====================================================
CREATE TABLE public.round_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    price numeric(10, 2) NOT NULL CHECK (price >= 0)
);
CREATE INDEX idx_round_items_round ON public.round_items(round_id);
-- =====================================================
-- CUSTOMER TABS
-- =====================================================
CREATE TABLE public.customer_tabs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name varchar(255) NOT NULL,
    bill_id uuid REFERENCES bills(id),
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
-- =====================================================
-- APPROVAL REQUESTS
-- =====================================================
CREATE TABLE public.approval_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type varchar(100) NOT NULL,
    reference_id uuid NOT NULL,
    requested_by uuid NOT NULL REFERENCES profiles(id),
    status varchar(50) DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    CONSTRAINT approval_status_check CHECK (
        status IN ('pending', 'approved', 'rejected')
    )
);
-- =====================================================
-- INVENTORY
-- =====================================================
CREATE TABLE public.inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL REFERENCES products(id),
    change integer NOT NULL,
    reason varchar(255),
    created_at timestamptz DEFAULT now()
);
-- =====================================================
-- EXPENSES
-- =====================================================
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);
-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name varchar(100) NOT NULL,
    record_id uuid NOT NULL,
    action varchar(50) NOT NULL,
    performed_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);
-- =====================================================
-- SEED DATA (REPLACE HASH + FINGERPRINT)
-- =====================================================
INSERT INTO public.profiles (
        id,
        name,
        role,
        pin_hash,
        pin_fingerprint,
        active
    )
VALUES (
        uuid_generate_v4(),
        'System Owner',
        'owner',
        '<PASTE_BCRYPT_HASH_HERE>',
        '<PASTE_FINGERPRINT_HERE>',
        true
    ) ON CONFLICT (pin_fingerprint) DO NOTHING;