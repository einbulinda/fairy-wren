-- =====================================================
-- 6. APPROVALS (Voids & Discounts)
-- =====================================================
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('void', 'discount')),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    round_number INTEGER,
    -- For void requests
    item_product_id INTEGER,
    item_product_name VARCHAR(255),
    item_quantity INTEGER,
    item_price DECIMAL(10, 2),
    -- For discount requests
    discount_type VARCHAR(50),
    discount_amount DECIMAL(10, 2),
    -- Common fields
    reason TEXT NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_bill ON approval_requests(bill_id);