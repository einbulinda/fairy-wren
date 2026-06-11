-- Real-time NOTIFY triggers to replace Supabase real-time subscriptions.
-- Each trigger fires pg_notify() with a JSON payload so the Node.js app
-- can LISTEN and broadcast events via Socket.io.

-- Generic notify function reused by all triggers
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := json_build_object(
    'table',     TG_TABLE_NAME,
    'event',     TG_OP,
    'new',       CASE WHEN TG_OP <> 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    'old',       CASE WHEN TG_OP <> 'INSERT' THEN row_to_json(OLD) ELSE NULL END
  )::text;

  PERFORM pg_notify('db_changes', payload);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- bills
DROP TRIGGER IF EXISTS trg_bills_notify ON bills;
CREATE TRIGGER trg_bills_notify
  AFTER INSERT OR UPDATE OR DELETE ON bills
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- payments
DROP TRIGGER IF EXISTS trg_payments_notify ON payments;
CREATE TRIGGER trg_payments_notify
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- products
DROP TRIGGER IF EXISTS trg_products_notify ON products;
CREATE TRIGGER trg_products_notify
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- stock_takes
DROP TRIGGER IF EXISTS trg_stock_takes_notify ON stock_takes;
CREATE TRIGGER trg_stock_takes_notify
  AFTER UPDATE ON stock_takes
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();
