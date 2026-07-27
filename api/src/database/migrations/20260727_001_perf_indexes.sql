-- Migration: Add missing indexes on hot foreign-key lookup columns.
-- Date: 2026-07-27
-- Description: pg_stat_user_tables showed payments, journal_lines and
--   round_items serving repeated full-table sequential scans (tens of
--   millions of cumulative tuples read) driven by correlated subqueries
--   that filter on bill_id / journal_entry_id / product_id, none of which
--   had a covering index besides the primary key.

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON public.payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON public.journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_round_items_product_id ON public.round_items(product_id);
