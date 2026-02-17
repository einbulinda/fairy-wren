CREATE TRIGGER trg_bill_completed_inventory
AFTER
UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION post_bill_inventory_and_cogs();
CREATE TRIGGER update_bills_updated_at BEFORE
UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE
UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_validate_account_hierarchy BEFORE
INSERT
    OR
UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION validate_account_hierarchy();
CREATE TRIGGER trg_validate_expense_account BEFORE
INSERT
    OR
UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION validate_expense_account();
CREATE TRIGGER trg_post_inventory_purchase
AFTER
INSERT ON inventory_receipt_items FOR EACH ROW EXECUTE FUNCTION post_inventory_purchase();
CREATE TRIGGER trg_recalc_receipt_total_after_items
AFTER
INSERT
    OR DELETE
    OR
UPDATE ON inventory_receipt_items FOR EACH ROW EXECUTE FUNCTION recalc_inventory_receipt_total();
CREATE TRIGGER trg_set_inventory_receipt_item_total BEFORE
INSERT
    OR
UPDATE ON inventory_receipt_items FOR EACH ROW EXECUTE FUNCTION set_inventory_receipt_item_total();
CREATE TRIGGER update_inventory_receipts_updated_at BEFORE
UPDATE ON inventory_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE CONSTRAINT TRIGGER trg_validate_journal_balance
AFTER
INSERT
    OR
UPDATE ON journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_journal_balance();
CREATE TRIGGER update_payments_updated_at BEFORE
UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_prevent_negative_stock BEFORE
UPDATE ON products FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();
CREATE TRIGGER update_products_updated_at BEFORE
UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_validate_sales_account BEFORE
INSERT
    OR
UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION validate_revenue_account();
CREATE TRIGGER trg_calculate_variance BEFORE
INSERT
    OR
UPDATE ON stock_take_items FOR EACH ROW EXECUTE FUNCTION calculate_variance_percentage();
CREATE TRIGGER update_suppliers_updated_at BEFORE
UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_check_filters BEFORE
INSERT
    OR
UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE
INSERT
    OR
UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER update_objects_updated_at BEFORE
UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();