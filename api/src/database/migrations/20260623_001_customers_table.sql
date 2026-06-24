-- Migration: Create customers master table and link bills via customer_id
-- Bills retain their customer_name string; customer_id is added as an optional FK
-- that gets populated when a bill is confirmed as belonging to a customer account.

CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
