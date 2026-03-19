-- Migration: Create business_targets table
-- Description: Stores monthly business targets for revenue, margin, and staff KPIs
-- Created: 2026-03-18

-- Main targets table
CREATE TABLE IF NOT EXISTS business_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time period (unique constraint prevents duplicates)
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- Financial targets
    target_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,
    target_gross_margin DECIMAL(5, 2) NOT NULL DEFAULT 35.00, -- percentage
    target_net_margin DECIMAL(5, 2) DEFAULT NULL, -- optional
    
    -- Cash flow targets
    target_cash_reserve_days INTEGER DEFAULT 30,
    max_outstanding_ratio DECIMAL(5, 2) DEFAULT 20.00, -- % of monthly revenue
    
    -- Operational targets
    target_avg_bill_value DECIMAL(12, 2) DEFAULT NULL,
    target_bill_count INTEGER DEFAULT NULL,
    target_inventory_turnover DECIMAL(5, 2) DEFAULT 4.00,
    
    -- Staff targets (can be overridden per staff in user_targets table)
    default_staff_target_revenue DECIMAL(12, 2) DEFAULT 50000,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one target per month
    UNIQUE(year, month)
);

-- Index for quick lookups
CREATE INDEX idx_business_targets_period ON business_targets(year, month);
CREATE INDEX idx_business_targets_created_at ON business_targets(created_at);

-- Staff-specific targets (overrides default_staff_target_revenue)
CREATE TABLE IF NOT EXISTS user_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- Individual targets
    target_revenue DECIMAL(12, 2) NOT NULL DEFAULT 50000,
    target_bill_count INTEGER DEFAULT NULL,
    target_avg_bill_value DECIMAL(12, 2) DEFAULT NULL,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One target per user per month
    UNIQUE(user_id, year, month)
);

CREATE INDEX idx_user_targets_lookup ON user_targets(user_id, year, month);
CREATE INDEX idx_user_targets_period ON user_targets(year, month);

-- Category-specific targets (for product categories)
CREATE TABLE IF NOT EXISTS category_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    target_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    target_quantity INTEGER DEFAULT NULL,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(category_id, year, month)
);

CREATE INDEX idx_category_targets_lookup ON category_targets(category_id, year, month);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_business_targets_updated_at ON business_targets;
CREATE TRIGGER update_business_targets_updated_at
    BEFORE UPDATE ON business_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_targets_updated_at ON user_targets;
CREATE TRIGGER update_user_targets_updated_at
    BEFORE UPDATE ON user_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_targets_updated_at ON category_targets;
CREATE TRIGGER update_category_targets_updated_at
    BEFORE UPDATE ON category_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View to get targets with actuals for comparison
CREATE OR REPLACE VIEW monthly_target_progress AS
SELECT 
    bt.year,
    bt.month,
    bt.target_revenue,
    bt.target_gross_margin,
    bt.target_cash_reserve_days,
    bt.default_staff_target_revenue,
    -- These would be joined from actuals in a real implementation
    -- For now, placeholders
    0::DECIMAL as actual_revenue,
    0::DECIMAL as actual_gross_margin,
    0::INTEGER as actual_cash_days
FROM business_targets bt;

-- Seed default targets for current year if none exist
INSERT INTO business_targets (year, month, target_revenue, target_gross_margin, created_at)
SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as year,
    generate_series as month,
    1000000.00 as target_revenue,  -- Default 1M KES
    35.00 as target_gross_margin,  -- Default 35%
    NOW() as created_at
FROM generate_series(1, 12)
WHERE NOT EXISTS (
    SELECT 1 FROM business_targets 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
    AND month = generate_series
)
ON CONFLICT (year, month) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE business_targets IS 'Stores monthly business-wide targets for revenue, margins, and operational KPIs';
COMMENT ON TABLE user_targets IS 'Staff-specific monthly targets that override the default from business_targets';
COMMENT ON TABLE category_targets IS 'Product category monthly revenue/quantity targets';
