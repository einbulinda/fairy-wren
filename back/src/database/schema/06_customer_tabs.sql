-- =====================================================
-- 5. CUSTOMER TABS (for regular customers)
-- =====================================================
CREATE TABLE customer_tabs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    notes TEXT,
    waitress_id UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'settled')),
        total_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        settled_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE tab_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tab_id UUID REFERENCES customer_tabs(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE
    SET NULL,
        product_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_customer_tabs_status ON customer_tabs(status);
CREATE INDEX idx_tab_items_tab ON tab_items(tab_id);