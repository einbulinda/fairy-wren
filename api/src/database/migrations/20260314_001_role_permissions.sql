-- Migration: Add permissions JSONB column to system_roles
-- This enables dynamic role-to-capability mapping instead of hardcoded role checks

ALTER TABLE public.system_roles
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Seed default permissions for existing roles
UPDATE public.system_roles SET permissions = '["pos_access"]'::jsonb
    WHERE code = 'waitress';

UPDATE public.system_roles SET permissions = '["pos_access", "approve_payments", "view_all_bills"]'::jsonb
    WHERE code = 'bartender';

UPDATE public.system_roles SET permissions = '["pos_access", "stock_take", "view_all_bills"]'::jsonb
    WHERE code = 'manager';

UPDATE public.system_roles SET permissions = '["erp_access", "pos_access", "stock_take", "approve_payments", "view_all_bills"]'::jsonb
    WHERE code = 'owner';
