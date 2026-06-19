-- Migration: Add missing 'bank' account class
-- Date: 2026-06-18
-- Description: The bank account class was referenced in RPC functions and
--   the application code but was never seeded into the account_classes table.
--   Without it, accounts with account_class = 'bank' cannot be created due
--   to the FK constraint on chart_of_accounts.

INSERT INTO public.account_classes (code, label, category, sort_order)
VALUES ('bank', 'Bank', 'asset', 4)
ON CONFLICT (code) DO NOTHING;
