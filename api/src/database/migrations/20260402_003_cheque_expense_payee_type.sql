-- Migration: Add 'expense' to cheques payee_type check constraint
-- Date: 2026-04-02
-- Description: Allows expense-type cheques where costs are spread across
--   multiple expense accounts via journal lines rather than a single payee.

ALTER TABLE public.cheques
  DROP CONSTRAINT IF EXISTS cheques_payee_type_check;

ALTER TABLE public.cheques
  ADD CONSTRAINT cheques_payee_type_check
    CHECK (payee_type IN ('supplier', 'employee', 'other', 'expense'));
