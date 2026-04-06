-- ============================================================================
-- Receipt Return / Damaged Goods
-- ----------------------------------------------------------------------------
-- 1. Extend inventory_movements.movement_type to include 'purchase_return'
-- 2. Extend inventory_receipts.status to include 'cancelled'
-- ============================================================================

-- 1. Extend movement_type CHECK constraint
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
    CHECK (movement_type = ANY (ARRAY [
      'purchase'::text,
      'purchase_return'::text,
      'sale'::text,
      'adjustment_in'::text,
      'adjustment_out'::text,
      'opening_balance'::text,
      'conversion_in'::text,
      'conversion_out'::text
    ]));

-- 2. Extend inventory_receipts status CHECK constraint (drop + recreate if exists)
ALTER TABLE public.inventory_receipts
  DROP CONSTRAINT IF EXISTS inventory_receipts_status_check;

ALTER TABLE public.inventory_receipts
  ADD CONSTRAINT inventory_receipts_status_check
    CHECK (status = ANY (ARRAY [
      'posted'::text,
      'cancelled'::text
    ]));
