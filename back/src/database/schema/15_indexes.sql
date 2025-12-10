-- =====================================================
-- 14. INDEXES FOR PERFORMANCE
-- =====================================================
-- Additional indexes for common queries
CREATE INDEX idx_bills_created_date ON bills(DATE(created_at));
CREATE INDEX idx_bills_status_created ON bills(status, created_at);
CREATE INDEX idx_round_items_product_created ON round_items(product_id, created_at);