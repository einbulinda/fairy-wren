-- =====================================================
-- FAIRY WREN POS SYSTEM - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(6) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('waitress', 'bartender', 'manager', 'owner')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster PIN lookups
CREATE INDEX idx_profiles_pin ON profiles(pin);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- 2. PRODUCTS & CATEGORIES
-- =====================================================

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Hex color code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  stock INTEGER DEFAULT 0,
  image VARCHAR(10), -- Emoji or image URL
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active);

-- =====================================================
-- 3. BILLS & ORDERS
-- =====================================================

CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(255) NOT NULL,
  waitress_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  waitress_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'awaiting_confirmation', 'completed')),
  
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

CREATE INDEX idx_rounds_bill ON rounds(bill_id);

CREATE TABLE round_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_round_items_round ON round_items(round_id);
CREATE INDEX idx_round_items_product ON round_items(product_id);

-- =====================================================
-- 5. CUSTOMER TABS (for regular customers)
-- =====================================================

CREATE TABLE customer_tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  notes TEXT,
  waitress_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'settled')),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_customer_tabs_status ON customer_tabs(status);

CREATE TABLE tab_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id UUID REFERENCES customer_tabs(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tab_items_tab ON tab_items(tab_id);

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

-- =====================================================
-- 7. INVENTORY MANAGEMENT
-- =====================================================

CREATE TABLE stock_takes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
  variance INTEGER NOT NULL, -- actual - expected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_take_items_stock_take ON stock_take_items(stock_take_id);

-- =====================================================
-- 8. EXPENSES
-- =====================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_by_name VARCHAR(255) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- =====================================================
-- 9. AUDIT LOGS
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- 10. SEED DATA
-- =====================================================

-- Insert default categories
INSERT INTO categories (name, color) VALUES
  ('Wines', '#FF6B9D'),
  ('Beers', '#C44569'),
  ('Soft Drinks', '#FFA07A'),
  ('Whiskies', '#4ECDC4');
  ('Rum', '#4ECDC4');
  ('Spirits', '#4ECDC4');
  ('Gin', '#4ECDC4');
  ('Liqueuers', '#4ECDC4');
  ('Vodkas', '#be1e49ff');
  ('Cognags', '#be1e49ff');

-- Insert default products
INSERT INTO products (name, price, category_id, stock, image) VALUES
  ('Whisky', 400, 1, 50, '🥃'),
  ('Vodka', 350, 1, 60, '🍸'),
  ('Beer', 300, 1, 100, '🍺'),
  ('Cider', 320, 1, 45, '🍎'),
  ('Gin', 380, 1, 40, '🍹'),
  ('Rum', 390, 1, 35, '🥃'),
  ('Tequila Shot', 300, 2, 80, '🥃'),
  ('Vodka Shot', 250, 2, 90, '🍸'),
  ('Whisky Shot', 280, 2, 70, '🥃'),
  ('Champagne', 3500, 3, 20, '🍾'),
  ('Wine Bottle', 2500, 3, 25, '🍷'),
  ('Soda', 100, 4, 150, '🥤'),
  ('Juice', 150, 4, 100, '🧃');

-- Insert default users (hash PINs in production!)
INSERT INTO profiles (name, pin, role, active) VALUES
  ('Prudence', '4321', 'bartender', true),
  ('Dan A', '9999', 'manager', true),
  ('Don', '0000', 'owner', true);

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, but only owners can modify
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Only owners can modify profiles" ON profiles
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
  );

-- Bills: Waitresses can only see their own open bills, bartenders and managers see all
CREATE POLICY "Waitresses see own bills" ON bills
  FOR SELECT USING (
    waitress_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('bartender', 'manager', 'owner'))
  );

CREATE POLICY "Waitresses can create bills" ON bills
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('waitress', 'bartender', 'owner'))
  );

CREATE POLICY "Waitresses can update own bills" ON bills
  FOR UPDATE USING (
    waitress_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('bartender', 'manager', 'owner'))
  );

-- Products: Everyone can read, only managers/owners can modify
CREATE POLICY "Anyone can read products" ON products
  FOR SELECT USING (active = true);

CREATE POLICY "Only managers can modify products" ON products
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager', 'owner'))
  );

-- =====================================================
-- 12. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate bill totals
CREATE OR REPLACE FUNCTION calculate_bill_totals()
RETURNS TRIGGER AS $$
DECLARE
  bill_subtotal DECIMAL(10, 2);
  bill_tax DECIMAL(10, 2);
BEGIN
  -- Calculate subtotal from all rounds
  SELECT COALESCE(SUM(ri.price * ri.quantity), 0)
  INTO bill_subtotal
  FROM rounds r
  JOIN round_items ri ON ri.round_id = r.id
  WHERE r.bill_id = NEW.bill_id;
  
  -- Calculate 5% tax
  bill_tax := bill_subtotal * 0.0;
  
  -- Update bill
  UPDATE bills
  SET 
    subtotal = bill_subtotal,
    tax = bill_tax,
    total_amount = bill_subtotal + bill_tax
  WHERE id = NEW.bill_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate bill when round items change
CREATE TRIGGER recalculate_bill_on_round_item_change
AFTER INSERT OR UPDATE OR DELETE ON round_items
FOR EACH ROW EXECUTE FUNCTION calculate_bill_totals();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_user_name VARCHAR(255),
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id VARCHAR(255),
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    details,
    ip_address
  ) VALUES (
    p_user_id,
    p_user_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    inet_client_addr()
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. VIEWS FOR REPORTING
-- =====================================================

-- View for daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_bills,
  SUM(total_amount) as total_sales,
  SUM(subtotal) as total_subtotal,
  SUM(tax) as total_tax,
  AVG(total_amount) as average_bill
FROM bills
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- View for sales by waitress
CREATE OR REPLACE VIEW sales_by_waitress AS
SELECT 
  waitress_id,
  waitress_name,
  COUNT(*) as total_bills,
  SUM(total_amount) as total_sales,
  AVG(total_amount) as average_bill
FROM bills
WHERE status = 'completed'
GROUP BY waitress_id, waitress_name
ORDER BY total_sales DESC;

-- View for product sales analysis
CREATE OR REPLACE VIEW product_sales_analysis AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  SUM(ri.quantity) as total_quantity_sold,
  SUM(ri.price * ri.quantity) as total_revenue
FROM products p
LEFT JOIN round_items ri ON ri.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id
GROUP BY p.id, p.name, p.category_id, c.name
ORDER BY total_revenue DESC;

-- View for low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  id,
  name,
  stock,
  price,
  category_id
FROM products
WHERE stock < 20 AND active = true
ORDER BY stock ASC;

-- =====================================================
-- 14. INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for common queries
CREATE INDEX idx_bills_created_date ON bills(DATE(created_at));
CREATE INDEX idx_bills_status_created ON bills(status, created_at);
CREATE INDEX idx_round_items_product_created ON round_items(product_id, created_at);

-- =====================================================
-- END OF SCHEMA
-- =====================================================