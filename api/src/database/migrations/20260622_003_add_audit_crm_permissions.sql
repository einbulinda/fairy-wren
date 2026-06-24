-- Migration: Add view_audit_trail permission to owner role
-- The audit trail viewer requires this permission; owners get it by default.

UPDATE public.system_roles
SET permissions = permissions || '["view_audit_trail"]'::jsonb
WHERE code = 'owner'
  AND NOT (permissions @> '["view_audit_trail"]'::jsonb);
