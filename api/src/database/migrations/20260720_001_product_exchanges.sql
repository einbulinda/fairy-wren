-- ============================================================================
-- 2026-07-20: Product Exchanges
-- Tracks inter-business stock loans/returns: a neighbouring business borrows
-- product from us (direction='outbound') or returns/lends product to us
-- (direction='inbound'). Mirrors the goods-receipt approval workflow:
-- owner/dual-permission users auto-approve, everyone else needs a
-- director/owner to approve before stock actually moves.
-- Run order: 1. CREATE TABLEs, 2. extend movement_type CHECK,
--            3. trigger + functions, 4. seed permissions
-- ============================================================================

-- 1. Business partners (neighbouring businesses we exchange stock with)
CREATE TABLE IF NOT EXISTS public.business_partners (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  notes           TEXT,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Exchange header
CREATE TABLE IF NOT EXISTS public.product_exchanges (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID        NOT NULL REFERENCES public.business_partners(id),
  direction           TEXT        NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  exchange_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  status              TEXT        NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'cancelled')),
  approval_status     TEXT        NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by         UUID        REFERENCES public.profiles(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  related_exchange_id UUID        REFERENCES public.product_exchanges(id),
  notes               TEXT,
  created_by          UUID        REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_exchanges_partner_id ON public.product_exchanges(partner_id);
CREATE INDEX IF NOT EXISTS idx_product_exchanges_approval_status ON public.product_exchanges(approval_status);

-- 3. Exchange line items
CREATE TABLE IF NOT EXISTS public.product_exchange_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id  UUID        NOT NULL REFERENCES public.product_exchanges(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES public.products(id),
  quantity     NUMERIC     NOT NULL CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_exchange_items_exchange_id ON public.product_exchange_items(exchange_id);

-- 4. Extend inventory_movements.movement_type to include exchange movements
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
      'conversion_out'::text,
      'exchange_out'::text,
      'exchange_in'::text
    ]));

-- 5. updated_at maintenance
CREATE TRIGGER update_business_partners_updated_at BEFORE UPDATE ON public.business_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_exchanges_updated_at BEFORE UPDATE ON public.product_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Trigger: post inventory movement for each item as it's inserted,
--    unless the parent exchange is still pending approval.
CREATE OR REPLACE FUNCTION public.post_product_exchange()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_approval_status TEXT;
  v_direction       TEXT;
  v_signed_qty      NUMERIC;
BEGIN
  SELECT approval_status, direction INTO v_approval_status, v_direction
    FROM public.product_exchanges
   WHERE id = NEW.exchange_id;

  IF v_approval_status = 'pending' THEN
    RETURN NEW;
  END IF;

  v_signed_qty := CASE WHEN v_direction = 'outbound' THEN -NEW.quantity ELSE NEW.quantity END;

  INSERT INTO public.inventory_movements (
    product_id, movement_date, quantity,
    movement_type, reference_type, reference_id, notes
  ) VALUES (
    NEW.product_id, CURRENT_DATE, v_signed_qty,
    CASE WHEN v_direction = 'outbound' THEN 'exchange_out' ELSE 'exchange_in' END,
    'product_exchange', NEW.exchange_id,
    'Product exchange – automatic posting'
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_post_product_exchange
  AFTER INSERT ON public.product_exchange_items
  FOR EACH ROW EXECUTE FUNCTION public.post_product_exchange();

-- 7. Function to create an exchange + its line items in one call
CREATE OR REPLACE FUNCTION public.create_product_exchange(
  p_partner_id          UUID,
  p_direction           TEXT,
  p_exchange_date       DATE,
  p_notes               TEXT,
  p_created_by          UUID,
  p_line_items          JSONB,
  p_related_exchange_id UUID DEFAULT NULL,
  p_approval_status     TEXT DEFAULT 'approved'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_exchange_id UUID;
  v_item        JSONB;
BEGIN
  IF p_partner_id IS NULL THEN RAISE EXCEPTION 'PARTNER_REQUIRED'; END IF;
  IF p_direction NOT IN ('outbound', 'inbound') THEN RAISE EXCEPTION 'INVALID_DIRECTION'; END IF;
  IF jsonb_array_length(p_line_items) = 0 THEN RAISE EXCEPTION 'EXCHANGE_ITEMS_REQUIRED'; END IF;

  INSERT INTO public.product_exchanges (
    partner_id, direction, exchange_date, notes, created_by,
    related_exchange_id, approval_status
  ) VALUES (
    p_partner_id, p_direction, COALESCE(p_exchange_date, CURRENT_DATE), p_notes, p_created_by,
    p_related_exchange_id, p_approval_status
  )
  RETURNING id INTO v_exchange_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items) LOOP
    INSERT INTO public.product_exchange_items (
      exchange_id, product_id, quantity
    ) VALUES (
      v_exchange_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC
    );
  END LOOP;

  RETURN v_exchange_id;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- 8. Function to approve a pending exchange and post its inventory movements
CREATE OR REPLACE FUNCTION public.approve_product_exchange(
  p_exchange_id UUID,
  p_approver_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $function$
DECLARE
  v_item            RECORD;
  v_approval_status TEXT;
  v_direction       TEXT;
  v_signed_qty      NUMERIC;
BEGIN
  SELECT approval_status, direction INTO v_approval_status, v_direction
    FROM public.product_exchanges WHERE id = p_exchange_id FOR UPDATE;

  IF v_approval_status IS NULL THEN
    RAISE EXCEPTION 'EXCHANGE_NOT_FOUND';
  END IF;
  IF v_approval_status <> 'pending' THEN
    RAISE EXCEPTION 'EXCHANGE_NOT_PENDING';
  END IF;

  UPDATE public.product_exchanges
     SET approval_status = 'approved',
         approved_by     = p_approver_id,
         approved_at     = NOW()
   WHERE id = p_exchange_id;

  FOR v_item IN
    SELECT product_id, quantity
      FROM public.product_exchange_items
     WHERE exchange_id = p_exchange_id
  LOOP
    v_signed_qty := CASE WHEN v_direction = 'outbound' THEN -v_item.quantity ELSE v_item.quantity END;

    INSERT INTO public.inventory_movements (
      product_id, movement_date, quantity,
      movement_type, reference_type, reference_id, notes
    ) VALUES (
      v_item.product_id, CURRENT_DATE, v_signed_qty,
      CASE WHEN v_direction = 'outbound' THEN 'exchange_out' ELSE 'exchange_in' END,
      'product_exchange', p_exchange_id,
      'Product exchange – approved posting'
    );
  END LOOP;
END;
$function$;

-- 9. Function to reject a pending exchange (no stock effect)
CREATE OR REPLACE FUNCTION public.reject_product_exchange(
  p_exchange_id UUID,
  p_rejector_id UUID,
  p_reason TEXT
) RETURNS VOID LANGUAGE plpgsql AS $function$
DECLARE
  v_approval_status TEXT;
BEGIN
  SELECT approval_status INTO v_approval_status
    FROM public.product_exchanges WHERE id = p_exchange_id FOR UPDATE;

  IF v_approval_status IS NULL THEN
    RAISE EXCEPTION 'EXCHANGE_NOT_FOUND';
  END IF;
  IF v_approval_status <> 'pending' THEN
    RAISE EXCEPTION 'EXCHANGE_NOT_PENDING';
  END IF;

  UPDATE public.product_exchanges
     SET approval_status  = 'rejected',
         rejection_reason = p_reason,
         approved_by      = p_rejector_id,
         approved_at      = NOW(),
         status           = 'cancelled'
   WHERE id = p_exchange_id;
END;
$function$;

-- 10. Seed manage_exchanges + approve_exchanges onto owner (+ director if it exists)
UPDATE public.system_roles
SET permissions = permissions || '["manage_exchanges", "approve_exchanges"]'::jsonb
WHERE code IN ('owner', 'director')
  AND NOT (permissions @> '["manage_exchanges"]'::jsonb);
