-- =====================================================
-- 4. ROUNDS & ORDER ITEMS
-- =====================================================
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    added_by VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE round_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE
    SET NULL,
        product_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_rounds_bill ON rounds(bill_id);
CREATE INDEX idx_round_items_round ON round_items(round_id);
CREATE INDEX idx_round_items_product ON round_items(product_id);
rounds.bill_id → bills.id ON DELETE CASCADE;
round_items.round_id → rounds.id ON DELETE CASCADE;
payments.bill_id → bills.id ON DELETE RESTRICT;