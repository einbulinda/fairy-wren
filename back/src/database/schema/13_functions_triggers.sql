-- =====================================================
-- 12. FUNCTIONS & TRIGGERS
-- =====================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE
UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE
UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to auto-calculate bill totals
CREATE OR REPLACE FUNCTION calculate_bill_totals() RETURNS TRIGGER AS $$
DECLARE bill_subtotal DECIMAL(10, 2);
bill_tax DECIMAL(10, 2);
v_round_id UUID;
v_bill_id UUID;
BEGIN -- Determine round_id depending on operation
IF TG_OP = 'DELETE' THEN v_round_id := OLD.round_id;
ELSE v_round_id := NEW.round_id;
END IF;
-- Resolve bill_id via rounds table
SELECT bill_id INTO v_bill_id
FROM rounds
WHERE id = v_round_id;
-- Calculate subtotal from all rounds
SELECT COALESCE(SUM(ri.price * ri.quantity), 0) INTO bill_subtotal
FROM rounds r
    JOIN round_items ri ON ri.round_id = r.id
WHERE r.bill_id = v_bill_id;
-- Calculate 0% tax
bill_tax := bill_subtotal * 0.0;
-- Update bill totals
UPDATE bills
SET subtotal = bill_subtotal,
    tax = bill_tax,
    total_amount = bill_subtotal + bill_tax
WHERE id = v_bill_id;
RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- Trigger to recalculate bill when round items change
CREATE TRIGGER recalculate_bill_on_round_item_change
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON round_items FOR EACH ROW EXECUTE FUNCTION calculate_bill_totals();
-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
        p_user_id UUID,
        p_user_name VARCHAR(255),
        p_action VARCHAR(100),
        p_entity_type VARCHAR(50),
        p_entity_id VARCHAR(255),
        p_details JSONB DEFAULT NULL
    ) RETURNS UUID AS $$
DECLARE audit_id UUID;
BEGIN
INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        details,
        ip_address
    )
VALUES (
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
-- Incrementing stock in the DB
CREATE OR REPLACE FUNCTION increment_stock(product_id UUID, quantity INTEGER) RETURNS TABLE (
        id UUID,
        name TEXT,
        stock INTEGER,
        updated_at TIMESTAMPTZ
    ) LANGUAGE plpgsql AS $$ BEGIN -- Validate input
    IF quantity IS NULL
    OR quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero';
END IF;
-- Update stock atomically
UPDATE products
SET stock = stock + quantity,
    updated_at = NOW()
WHERE id = product_id
RETURNING products.id,
    products.name,
    products.stock,
    products.updated_at INTO id,
    name,
    stock,
    updated_at;
-- Ensure product exists
IF NOT FOUND THEN RAISE EXCEPTION 'Product with id % not found',
product_id;
END IF;
RETURN NEXT;
END;
$$;