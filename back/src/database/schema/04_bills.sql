-- =====================================================
-- 3. BILLS & ORDERS
-- =====================================================
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    waitress_id UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        waitress_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (
            status IN ('open', 'awaiting_confirmation', 'completed')
        ),
        -- Payment details
        payment_method VARCHAR(50),
        mpesa_code VARCHAR(100),
        -- Financial summary
        subtotal DECIMAL(10, 2),
        tax DECIMAL(10, 2),
        total_amount DECIMAL(10, 2),
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        marked_paid_at TIMESTAMP WITH TIME ZONE,
        marked_paid_by VARCHAR(255),
        confirmed_at TIMESTAMP WITH TIME ZONE,
        confirmed_by VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_waitress ON bills(waitress_id);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bills_customer_name ON bills(customer_name);
