-- Migration: Add payee_type and payee_id to cheques table
-- Date: 2026-03-13
-- Description: Supports selecting payee from suppliers or employees,
--   and links cheque to the payee record for statement tracking.

ALTER TABLE public.cheques
    ADD COLUMN IF NOT EXISTS payee_type varchar(20) DEFAULT 'other'
        CHECK (payee_type IN ('supplier', 'employee', 'other')),
    ADD COLUMN IF NOT EXISTS payee_id uuid;
