-- Migration: Add z_report permission to roles that have approve_payments
-- Grants z_report to managers and admins; basic server roles are excluded.

UPDATE public.system_roles
SET permissions = permissions || '["z_report"]'::jsonb
WHERE permissions @> '["approve_payments"]'::jsonb
  AND NOT (permissions @> '["z_report"]'::jsonb);
