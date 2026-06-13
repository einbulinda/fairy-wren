-- Migration: Notification views tracking per user
-- Date: 2026-06-13
-- Description: Records which notification items each ERP user has viewed,
--   so the bell badge only counts genuinely unseen items across all users.

CREATE TABLE IF NOT EXISTS public.notification_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    viewed_at timestamptz DEFAULT now(),
    CONSTRAINT notification_views_user_entity_unique UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_views_user ON public.notification_views(user_id);
