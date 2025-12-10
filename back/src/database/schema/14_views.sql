-- =====================================================
-- 13. VIEWS FOR REPORTING
-- =====================================================
-- View for daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT DATE(created_at) as sale_date,
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
SELECT waitress_id,
    waitress_name,
    COUNT(*) as total_bills,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as average_bill
FROM bills
WHERE status = 'completed'
GROUP BY waitress_id,
    waitress_name
ORDER BY total_sales DESC;
-- View for product sales analysis
CREATE OR REPLACE VIEW product_sales_analysis AS
SELECT p.id,
    p.name,
    p.category_id,
    c.name as category_name,
    SUM(ri.quantity) as total_quantity_sold,
    SUM(ri.price * ri.quantity) as total_revenue
FROM products p
    LEFT JOIN round_items ri ON ri.product_id = p.id
    LEFT JOIN categories c ON c.id = p.category_id
GROUP BY p.id,
    p.name,
    p.category_id,
    c.name
ORDER BY total_revenue DESC;
-- View for low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT id,
    name,
    stock,
    price,
    category_id
FROM products
WHERE stock < 20
    AND active = true
ORDER BY stock ASC;