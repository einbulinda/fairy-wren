-- =====================================================
-- 7. INVENTORY MANAGEMENT
-- =====================================================
CREATE TABLE stock_takes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        performed_by_name VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE stock_take_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_take_id UUID REFERENCES stock_takes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    expected_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    variance INTEGER NOT NULL,
    -- actual - expected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_stock_take_items_stock_take ON stock_take_items(stock_take_id);