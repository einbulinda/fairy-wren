-- Migration: Add configurable exchange approver role setting
INSERT INTO settings (key, value)
VALUES ('exchange_approver_role', 'manager')
ON CONFLICT (key) DO NOTHING;
