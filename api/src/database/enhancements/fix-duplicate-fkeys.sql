/*
 ======================================================
 FIX DUPLICATE FOREIGN KEYS ON BILLS TABLE
 ======================================================
 Production has duplicate FKs on bills.created_by:
   - bills_created_by_fkey
   - bills_created_by_fkey1

 And potentially inconsistent FK names on bills.updated_by
 between dev (fk_bills_updated_by) and prod.

 This script:
 1. Drops all existing FKs on created_by and updated_by
 2. Re-creates them with consistent names

 After running this, PostgREST hints like
 profiles!bills_created_by_fkey will work in all environments.

 Date: 2026-02-28
 ======================================================
 */

-- Drop any duplicate/inconsistent FKs on created_by
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_created_by_fkey;
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_created_by_fkey1;

-- Drop any duplicate/inconsistent FKs on updated_by
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS fk_bills_updated_by;
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_updated_by_fkey;
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_updated_by_fkey1;

-- Re-create with consistent names
ALTER TABLE public.bills
  ADD CONSTRAINT bills_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.bills
  ADD CONSTRAINT bills_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
