-- Migration: Add weekly_sales permission to roles that have z_report (managers/directors/owners)

UPDATE public.system_roles
SET permissions = permissions || '["weekly_sales"]'::jsonb
WHERE permissions @> '["z_report"]'::jsonb
  AND NOT (permissions @> '["weekly_sales"]'::jsonb);
