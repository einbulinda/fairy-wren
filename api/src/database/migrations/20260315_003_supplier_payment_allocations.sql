/*
 ============================================================================
 SUPPLIER PAYMENT ALLOCATIONS
 ----------------------------------------------------------------------------
 Tracks how each supplier payment is allocated against specific invoices
 (inventory_receipts). Supports partial payments across multiple invoices.
 ============================================================================
 */

CREATE TABLE IF NOT EXISTS public.supplier_payment_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.inventory_receipts(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_spa_payment ON public.supplier_payment_allocations(payment_id);
CREATE INDEX idx_spa_invoice ON public.supplier_payment_allocations(invoice_id);

-- Add amount_paid column to inventory_receipts for tracking partial payments
ALTER TABLE public.inventory_receipts
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) DEFAULT 0;

-- Backfill: mark fully paid invoices
UPDATE public.inventory_receipts
SET amount_paid = total_amount
WHERE paid_at IS NOT NULL AND (amount_paid IS NULL OR amount_paid = 0);
