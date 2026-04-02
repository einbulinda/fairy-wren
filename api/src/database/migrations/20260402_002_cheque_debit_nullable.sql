-- Migration: Allow null debit_account_id on cheques for multi-line expense payments.
-- Expense cheques have multiple debit lines in journal_entries and no single debit account.

ALTER TABLE cheques ALTER COLUMN debit_account_id DROP NOT NULL;
