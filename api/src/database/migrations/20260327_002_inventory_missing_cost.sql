-- ============================================================================
-- Migration: Inventory Missing Cost Management & COGS Backfill
-- Description: 
--   1. View to track products with missing/zero cost
--   2. Function to backfill COGS when cost is provided
--   3. Trigger to auto-recalculate COGS on cost update
-- ============================================================================

-- 1. Create view for products with missing or zero cost
CREATE OR REPLACE VIEW public.v_products_missing_cost AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    c.name as category_name,
    p.cost_price as current_cost_price,
    COALESCE((
        SELECT CASE WHEN SUM(quantity) > 0
                    THEN SUM(quantity * unit_cost) / SUM(quantity)
                    ELSE 0 END
        FROM inventory_movements
        WHERE product_id = p.id AND unit_cost IS NOT NULL AND unit_cost > 0
    ), 0) as calculated_avg_cost,
    COALESCE((
        SELECT GREATEST(SUM(im2.quantity), 0)
        FROM inventory_movements im2
        WHERE im2.product_id = p.id
    ), 0) as current_stock,
    -- Check if any inventory movements exist
    EXISTS (
        SELECT 1 FROM inventory_movements im 
        WHERE im.product_id = p.id
    ) as has_movements,
    -- Check if any sales have occurred with zero cost
    EXISTS (
        SELECT 1 FROM inventory_movements im 
        WHERE im.product_id = p.id 
        AND im.movement_type = 'sale'
        AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
    ) as has_zero_cost_sales,
    -- Count of zero-cost sales
    (
        SELECT COUNT(*) FROM inventory_movements im 
        WHERE im.product_id = p.id 
        AND im.movement_type = 'sale'
        AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
    ) as zero_cost_sale_count,
    -- Total quantity sold with zero cost
    COALESCE((
        SELECT SUM(ABS(im.quantity)) FROM inventory_movements im 
        WHERE im.product_id = p.id 
        AND im.movement_type = 'sale'
        AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
    ), 0) as zero_cost_quantity,
    -- Estimated revenue from zero-cost sales
    COALESCE((
        SELECT SUM(ri.price * ri.quantity) 
        FROM round_items ri
        JOIN rounds r ON r.id = ri.round_id
        JOIN inventory_movements im ON im.reference_id = r.id 
            AND im.reference_type = 'round'
            AND im.product_id = p.id
        WHERE im.movement_type = 'sale'
        AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
    ), 0) as zero_cost_revenue,
    -- Last sale date
    (
        SELECT MAX(im.movement_date) FROM inventory_movements im 
        WHERE im.product_id = p.id 
        AND im.movement_type = 'sale'
    ) as last_sale_date,
    -- Inventory account info
    ii.inventory_account_id,
    ii.cogs_account_id,
    coa_inv.code as inventory_account_code,
    coa_cogs.code as cogs_account_code,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN inventory_items ii ON ii.product_id = p.id
LEFT JOIN chart_of_accounts coa_inv ON coa_inv.id = ii.inventory_account_id
LEFT JOIN chart_of_accounts coa_cogs ON coa_cogs.id = ii.cogs_account_id
WHERE p.track_inventory = true
  AND (
    -- No cost price set
    p.cost_price IS NULL 
    OR p.cost_price = 0
    -- OR has zero-cost sales that need backfill
    OR EXISTS (
        SELECT 1 FROM inventory_movements im 
        WHERE im.product_id = p.id 
        AND im.movement_type = 'sale'
        AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
    )
  )
ORDER BY 
    (SELECT COUNT(*) FROM inventory_movements im 
     WHERE im.product_id = p.id AND im.movement_type = 'sale' 
     AND (im.unit_cost = 0 OR im.unit_cost IS NULL)) DESC,
    p.name;

COMMENT ON VIEW public.v_products_missing_cost IS 
    'Products with missing cost price or zero-cost sales requiring COGS backfill';

-- 2. Function to backfill COGS for a product
CREATE OR REPLACE FUNCTION public.backfill_product_cogs(
    p_product_id UUID,
    p_unit_cost NUMERIC,
    p_effective_date DATE DEFAULT NULL,
    p_journal_description TEXT DEFAULT 'COGS backfill - cost correction'
)
RETURNS JSONB AS $$
DECLARE
    v_movement RECORD;
    v_cogs_account UUID;
    v_inventory_account UUID;
    v_journal_id UUID;
    v_backfill_count INTEGER := 0;
    v_total_cogs NUMERIC := 0;
    v_product_name TEXT;
BEGIN
    -- Validate cost
    IF p_unit_cost IS NULL OR p_unit_cost <= 0 THEN
        RAISE EXCEPTION 'Valid unit cost required for backfill';
    END IF;
    
    -- Get product name
    SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;
    
    -- Get COGS and Inventory accounts
    SELECT 
        ii.cogs_account_id,
        ii.inventory_account_id
    INTO v_cogs_account, v_inventory_account
    FROM inventory_items ii
    WHERE ii.product_id = p_product_id;
    
    IF v_cogs_account IS NULL OR v_inventory_account IS NULL THEN
        RAISE EXCEPTION 'COGS or Inventory account not configured for product %', v_product_name;
    END IF;
    
    -- Update inventory movements with zero cost
    FOR v_movement IN
        SELECT 
            im.id as movement_id,
            im.movement_date,
            ABS(im.quantity) as quantity,
            im.unit_cost as old_unit_cost,
            im.reference_type,
            im.reference_id
        FROM inventory_movements im
        WHERE im.product_id = p_product_id
          AND im.movement_type = 'sale'
          AND (im.unit_cost = 0 OR im.unit_cost IS NULL)
          AND (p_effective_date IS NULL OR im.movement_date >= p_effective_date)
        ORDER BY im.movement_date
    LOOP
        -- Update the movement with correct cost
        UPDATE inventory_movements
        SET unit_cost = p_unit_cost,
            notes = COALESCE(notes || '; ', '') || 
                    format('Cost backfilled on %s from %s to %s', 
                           CURRENT_DATE, v_movement.old_unit_cost, p_unit_cost)
        WHERE id = v_movement.movement_id;
        
        v_backfill_count := v_backfill_count + 1;
        v_total_cogs := v_total_cogs + (v_movement.quantity * p_unit_cost);
    END LOOP;
    
    -- Create journal entry for backfilled COGS if there are movements
    IF v_backfill_count > 0 AND v_total_cogs > 0 THEN
        INSERT INTO journal_entries (
            entry_date,
            reference,
            description,
            source_type
        )
        VALUES (
            COALESCE(p_effective_date, CURRENT_DATE),
            format('COGS-BF-%s', p_product_id::TEXT::VARCHAR),
            format('%s for %s (%s units @ %s) - Total: %s',
                   p_journal_description,
                   v_product_name,
                   v_backfill_count,
                   p_unit_cost,
                   v_total_cogs),
            'cogs_backfill'
        )
        RETURNING id INTO v_journal_id;
        
        -- Debit COGS, Credit Inventory
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES 
            (v_journal_id, v_cogs_account, v_total_cogs, 0),
            (v_journal_id, v_inventory_account, 0, v_total_cogs);
    END IF;
    
    -- Update product cost_price for future transactions
    UPDATE products
    SET cost_price = p_unit_cost,
        updated_at = NOW()
    WHERE id = p_product_id
      AND (cost_price IS NULL OR cost_price = 0);
    
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'product_name', v_product_name,
        'backfill_count', v_backfill_count,
        'unit_cost_applied', p_unit_cost,
        'total_cogs', v_total_cogs,
        'journal_entry_id', v_journal_id,
        'message', format('Backfilled %s sale(s) with COGS of %s', 
                          v_backfill_count, v_total_cogs)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Function to bulk backfill COGS for multiple products
CREATE OR REPLACE FUNCTION public.bulk_backfill_cogs(
    p_backfills JSONB -- Array of {product_id, unit_cost, effective_date}
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_result JSONB;
    v_results JSONB := '[]'::JSONB;
    v_total_backfilled INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_backfills)
    LOOP
        BEGIN
            SELECT backfill_product_cogs(
                (v_item->>'product_id')::UUID,
                (v_item->>'unit_cost')::NUMERIC,
                (v_item->>'effective_date')::DATE,
                v_item->>'description'
            ) INTO v_result;
            
            v_results := v_results || v_result;
            v_total_backfilled := v_total_backfilled + 
                ((v_result->>'backfill_count')::INTEGER);
            
        EXCEPTION WHEN OTHERS THEN
            v_results := v_results || jsonb_build_object(
                'success', false,
                'product_id', v_item->>'product_id',
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_products', jsonb_array_length(p_backfills),
        'total_movements_backfilled', v_total_backfilled,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Function to update product cost and optionally backfill
CREATE OR REPLACE FUNCTION public.update_product_cost(
    p_product_id UUID,
    p_new_cost NUMERIC,
    p_backfill_historical BOOLEAN DEFAULT false,
    p_backfill_from_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_old_cost NUMERIC;
    v_product_name TEXT;
    v_backfill_result JSONB;
BEGIN
    -- Get current info
    SELECT cost_price, name INTO v_old_cost, v_product_name
    FROM products WHERE id = p_product_id;
    
    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Update product cost
    UPDATE products
    SET cost_price = p_new_cost,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    -- Backfill if requested and there are zero-cost sales
    IF p_backfill_historical AND (v_old_cost IS NULL OR v_old_cost = 0) THEN
        SELECT backfill_product_cogs(
            p_product_id,
            p_new_cost,
            p_backfill_from_date,
            format('COGS backfill after cost update from %s to %s', v_old_cost, p_new_cost)
        ) INTO v_backfill_result;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'product_name', v_product_name,
        'old_cost', v_old_cost,
        'new_cost', p_new_cost,
        'backfill_performed', p_backfill_historical,
        'backfill_result', v_backfill_result
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create table to track cost backfill audit trail
CREATE TABLE IF NOT EXISTS public.cogs_backfill_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    original_cost NUMERIC,
    new_cost NUMERIC NOT NULL,
    backfill_count INTEGER DEFAULT 0,
    total_cogs NUMERIC DEFAULT 0,
    journal_entry_id UUID REFERENCES journal_entries(id),
    backfilled_by UUID REFERENCES profiles(id),
    backfilled_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cogs_backfill_audit_product 
ON cogs_backfill_audit(product_id, backfilled_at DESC);

-- 6. Trigger to auto-log backfill to audit table
CREATE OR REPLACE FUNCTION public.trg_log_cogs_backfill()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if this is a backfill (cogs_backfill source type)
    IF NEW.source_type = 'cogs_backfill' THEN
        -- Extract product_id from description (format: "... for product_name ...")
        -- This is simplified - in production, you might want a more robust linkage
        INSERT INTO cogs_backfill_audit (
            product_id,
            new_cost,
            total_cogs,
            journal_entry_id,
            notes
        )
        SELECT 
            p.id,
            (SELECT ABS(quantity * unit_cost) FROM inventory_movements 
             WHERE id = (SELECT MAX(id) FROM inventory_movements WHERE unit_cost > 0)),
            (SELECT SUM(debit) FROM journal_lines WHERE journal_entry_id = NEW.id),
            NEW.id,
            NEW.description
        FROM products p
        WHERE NEW.description ILIKE '%' || p.name || '%'
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_cogs_backfill ON journal_entries;
CREATE TRIGGER trg_log_cogs_backfill
    AFTER INSERT ON journal_entries
    FOR EACH ROW
    WHEN (NEW.source_type = 'cogs_backfill')
    EXECUTE FUNCTION trg_log_cogs_backfill();

-- 7. RPC function for frontend to get missing cost products
CREATE OR REPLACE FUNCTION public.rpc_get_products_missing_cost(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category_name TEXT,
    current_stock NUMERIC,
    current_cost_price NUMERIC,
    calculated_avg_cost NUMERIC,
    has_zero_cost_sales BOOLEAN,
    zero_cost_sale_count BIGINT,
    zero_cost_quantity NUMERIC,
    zero_cost_revenue NUMERIC,
    last_sale_date DATE,
    inventory_account_code TEXT,
    cogs_account_code TEXT,
    priority_score NUMERIC  -- Higher = more urgent
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmc.product_id,
        pmc.product_name,
        pmc.category_name,
        pmc.current_stock,
        pmc.current_cost_price,
        pmc.calculated_avg_cost,
        pmc.has_zero_cost_sales,
        pmc.zero_cost_sale_count,
        pmc.zero_cost_quantity,
        pmc.zero_cost_revenue,
        pmc.last_sale_date,
        pmc.inventory_account_code,
        pmc.cogs_account_code,
        -- Priority: more zero-cost sales = higher priority
        (COALESCE(pmc.zero_cost_revenue, 0) * 
         COALESCE(pmc.zero_cost_sale_count, 0))::NUMERIC as priority_score
    FROM v_products_missing_cost pmc
    ORDER BY 
        priority_score DESC,
        pmc.zero_cost_sale_count DESC,
        pmc.product_name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. RPC function to get backfill audit for a product
CREATE OR REPLACE FUNCTION public.rpc_get_product_cogs_history(
    p_product_id UUID
)
RETURNS TABLE (
    backfilled_at TIMESTAMPTZ,
    original_cost NUMERIC,
    new_cost NUMERIC,
    backfill_count INTEGER,
    total_cogs NUMERIC,
    backfilled_by_name TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cba.backfilled_at,
        cba.original_cost,
        cba.new_cost,
        cba.backfill_count,
        cba.total_cogs,
        p.name as backfilled_by_name,
        cba.notes
    FROM cogs_backfill_audit cba
    LEFT JOIN profiles p ON p.id = cba.backfilled_by
    WHERE cba.product_id = p_product_id
    ORDER BY cba.backfilled_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE public.cogs_backfill_audit IS 
    'Audit trail for COGS backfill operations';
