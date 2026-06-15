-- Migration: Add parameterized RBAC permissions for sensitive write routes
-- Date: 2026-06-15
-- Description: Seeds new permissions onto the owner role only.
--   Owner can grant any of these to other roles via PUT /system-roles/:code.

UPDATE public.system_roles
SET permissions = permissions
  || '["manage_products", "manage_categories", "process_payments", "manage_feedback", "reconcile_bank", "view_reports"]'::jsonb
WHERE code = 'owner'
  AND NOT (permissions @> '["manage_products"]'::jsonb);
