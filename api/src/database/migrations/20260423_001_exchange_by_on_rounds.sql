-- Migration: Add exchanged_by to rounds table
-- Stores the UUID of the profile whose PIN authorized the item exchange

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS exchanged_by UUID REFERENCES public.profiles(id);
