---Stock Take Creation Function
CREATE OR REPLACE FUNCTION create_stock_take_session(
        p_performed_by_id UUID,
        p_stock_take_name VARCHAR(200) DEFAULT NULL,
        p_stock_take_type VARCHAR(50) DEFAULT 'full',
        p_location VARCHAR(100) DEFAULT NULL
    ) RETURNS UUID AS $$
DECLARE v_stock_take_id UUID;
v_user_name VARCHAR(200);
v_user_role VARCHAR(50);
BEGIN -- Get user details
SELECT name,
    role INTO v_user_name,
    v_user_role
FROM profiles
WHERE id = p_performed_by_id;
-- Create stock take session
INSERT INTO stock_takes (
        performed_by_id,
        performed_by_role,
        stock_take_name,
        stock_take_type,
        location,
        approval_status,
        created_at
    )
VALUES (
        p_performed_by_id,
        v_user_role,
        p_stock_take_name,
        p_stock_take_type,
        p_location,
        'pending',
        NOW()
    )
RETURNING id INTO v_stock_take_id;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        v_stock_take_id,
        'created',
        p_performed_by_id,
        v_user_name,
        jsonb_build_object(
            'stock_take_name',
            p_stock_take_name,
            'stock_take_type',
            p_stock_take_type,
            'location',
            p_location
        )
    );
RETURN v_stock_take_id;
END;
$$ LANGUAGE plpgsql;
--Stock Take Item Recording Function
CREATE OR REPLACE FUNCTION record_stock_take_item(
        p_stock_take_id UUID,
        p_product_id UUID,
        p_physical_qty INTEGER,
        p_reason VARCHAR(100) DEFAULT NULL,
        p_notes TEXT DEFAULT NULL
    ) RETURNS JSONB AS $$
DECLARE v_system_qty INTEGER;
v_cost_per_unit DECIMAL(10, 2);
v_adjustment INTEGER;
v_product_name VARCHAR(200);
v_previous_adj_date TIMESTAMP WITH TIME ZONE;
v_adj_frequency INTEGER;
v_result JSONB;
BEGIN -- Get current system quantity and cost
SELECT COALESCE(current_stock, 0),
    COALESCE(unit_cost, 0),
    name INTO v_system_qty,
    v_cost_per_unit,
    v_product_name
FROM products
WHERE id = p_product_id;
-- Calculate adjustment
v_adjustment := p_physical_qty - v_system_qty;
-- Check for previous adjustments
SELECT MAX(sti.created_at),
    COUNT(*) INTO v_previous_adj_date,
    v_adj_frequency
FROM stock_take_items sti
    JOIN stock_takes st ON sti.stock_take_id = st.id
WHERE sti.product_id = p_product_id
    AND st.completed_at IS NOT NULL
    AND sti.created_at < NOW();
-- Insert stock take item
INSERT INTO stock_take_items (
        stock_take_id,
        product_id,
        system_qty,
        physical_qty,
        adjustment,
        cost_per_unit,
        reason,
        notes,
        previous_adjustment_date,
        adjustment_frequency,
        created_at
    )
VALUES (
        p_stock_take_id,
        p_product_id,
        v_system_qty,
        p_physical_qty,
        v_adjustment,
        v_cost_per_unit,
        p_reason,
        p_notes,
        v_previous_adj_date,
        COALESCE(v_adj_frequency, 0),
        NOW()
    );
-- Build result
v_result := jsonb_build_object(
    'product_name',
    v_product_name,
    'system_qty',
    v_system_qty,
    'physical_qty',
    p_physical_qty,
    'adjustment',
    v_adjustment,
    'cost_per_unit',
    v_cost_per_unit,
    'total_value_adjustment',
    v_adjustment * v_cost_per_unit,
    'requires_approval',
    ABS(v_adjustment) > 10
);
RETURN v_result;
END;
$$ LANGUAGE plpgsql;
---Stock Take Completion with Validation
CREATE OR REPLACE FUNCTION complete_stock_take_session(
        p_stock_take_id UUID,
        p_completed_by_id UUID
    ) RETURNS JSONB AS $$
DECLARE v_item_count INTEGER;
v_total_value_impact DECIMAL(10, 2);
v_flagged_items INTEGER;
v_requires_approval BOOLEAN;
v_user_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get completion stats
SELECT COUNT(*),
    COALESCE(SUM(total_value_adjustment), 0),
    COUNT(*) FILTER (
        WHERE ABS(adjustment) > 10
            OR ABS(variance_percentage) > 20
    ) INTO v_item_count,
    v_total_value_impact,
    v_flagged_items
FROM stock_take_items
WHERE stock_take_id = p_stock_take_id;
-- Check if requires approval
v_requires_approval := v_flagged_items > 0
OR ABS(v_total_value_impact) > 5000;
-- Get user name
SELECT name INTO v_user_name
FROM profiles
WHERE id = p_completed_by_id;
-- Update stock take
UPDATE stock_takes
SET completed_at = NOW(),
    approval_status = CASE
        WHEN v_requires_approval THEN 'under_review'
        ELSE 'approved'
    END
WHERE id = p_stock_take_id;
-- Apply adjustments to inventory if auto-approved
IF NOT v_requires_approval THEN PERFORM apply_stock_take_adjustments(p_stock_take_id);
END IF;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'completed',
        p_completed_by_id,
        v_user_name,
        jsonb_build_object(
            'item_count',
            v_item_count,
            'total_value_impact',
            v_total_value_impact,
            'flagged_items',
            v_flagged_items,
            'requires_approval',
            v_requires_approval
        )
    );
-- Build result
v_result := jsonb_build_object(
    'success',
    true,
    'item_count',
    v_item_count,
    'total_value_impact',
    v_total_value_impact,
    'flagged_items',
    v_flagged_items,
    'requires_approval',
    v_requires_approval,
    'status',
    CASE
        WHEN v_requires_approval THEN 'under_review'
        ELSE 'approved'
    END
);
RETURN v_result;
END;
$$ LANGUAGE plpgsql;
---Stock Take Approval / Rejection
CREATE OR REPLACE FUNCTION approve_stock_take(
        p_stock_take_id UUID,
        p_reviewed_by_id UUID,
        p_approval_notes TEXT DEFAULT NULL
    ) RETURNS JSONB AS $$
DECLARE v_reviewer_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get reviewer name
SELECT name INTO v_reviewer_name
FROM profiles
WHERE id = p_reviewed_by_id;
-- Update stock take
UPDATE stock_takes
SET approval_status = 'approved',
    reviewed_by_id = p_reviewed_by_id,
    reviewed_at = NOW(),
    approval_notes = p_approval_notes
WHERE id = p_stock_take_id;
-- Apply adjustments to inventory
PERFORM apply_stock_take_adjustments(p_stock_take_id);
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'approved',
        p_reviewed_by_id,
        v_reviewer_name,
        jsonb_build_object('notes', p_approval_notes)
    );
v_result := jsonb_build_object('success', true, 'status', 'approved');
RETURN v_result;
END;
$$ LANGUAGE plpgsql;
/*---Stock Take Rejection Function*/
CREATE OR REPLACE FUNCTION reject_stock_take(
        p_stock_take_id UUID,
        p_reviewed_by_id UUID,
        p_rejection_reason TEXT
    ) RETURNS JSONB AS $$
DECLARE v_reviewer_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get reviewer name
SELECT name INTO v_reviewer_name
FROM profiles
WHERE id = p_reviewed_by_id;
-- Update stock take
UPDATE stock_takes
SET approval_status = 'rejected',
    reviewed_by_id = p_reviewed_by_id,
    reviewed_at = NOW(),
    approval_notes = p_rejection_reason
WHERE id = p_stock_take_id;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'rejected',
        p_reviewed_by_id,
        v_reviewer_name,
        jsonb_build_object('reason', p_rejection_reason)
    );
v_result := jsonb_build_object('success', true, 'status', 'rejected');
RETURN v_result;
END;
$$ LANGUAGE plpgsql;
---Apply Stock Take Adjustments to Inventory
CREATE OR REPLACE FUNCTION apply_stock_take_adjustments(p_stock_take_id UUID) RETURNS VOID AS $$
DECLARE v_item RECORD;
BEGIN -- Loop through all items in the stock take
FOR v_item IN
SELECT product_id,
    variance,
    reason,
    notes
FROM stock_take_items
WHERE stock_take_id = p_stock_take_id LOOP -- Update product stock
UPDATE products
SET current_stock = current_stock + v_item.adjustment,
    updated_at = NOW()
WHERE id = v_item.product_id;
-- Log inventory movement
INSERT INTO inventory_movements (
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        reason,
        notes,
        created_at
    )
VALUES (
        v_item.product_id,
        CASE
            WHEN v_item.adjustment > 0 THEN 'adjustment_in'
            ELSE 'adjustment_out'
        END,
        ABS(v_item.variance),
        'stock_take',
        p_stock_take_id,
        v_item.reason,
        v_item.notes,
        NOW()
    );
END LOOP;
END;
$$ LANGUAGE plpgsql;
-----REPORTING VIEWS-----
DROP VIEW IF EXISTS vw_stock_take_adjustments_report CASCADE;
CREATE VIEW vw_stock_take_adjustments_report AS
SELECT st.id AS "stockTakeId",
    st.completed_at AS "completedAt",
    st.created_at AS "createdAt",
    st.stock_take_name AS "stockTakeName",
    st.stock_take_type AS "stockTakeType",
    st.location,
    st.approval_status AS "approvalStatus",
    st.approval_notes AS "approvalNotes",
    -- Performed by user details
    u_performed.id AS "performedById",
    u_performed.name AS "performedBy",
    u_performed.role AS "performedByRole",
    -- Reviewed by user details
    u_reviewed.id AS "reviewedById",
    u_reviewed.name AS "reviewedBy",
    st.reviewed_at AS "reviewedAt",
    -- Product and adjustment details
    p.id AS "productId",
    p.name AS "productName",
    ct.name AS category,
    sti.system_qty AS "systemQty",
    sti.physical_qty AS "physicalQty",
    sti.cost_per_unit AS "costPerUnit",
    sti.total_value_adjustment AS "totalValueAdjustment",
    sti.variance_percentage AS "variancePercentage",
    sti.reason,
    sti.notes,
    sti.adjustment_frequency AS "adjustmentFrequency",
    -- Item created timestamp
    sti.created_at AS "itemCreatedAt"
FROM stock_takes st
    LEFT JOIN profiles u_performed ON st.performed_by_id = u_performed.id
    LEFT JOIN profiles u_reviewed ON st.reviewed_by_id = u_reviewed.id
    LEFT JOIN stock_take_items sti ON st.id = sti.stock_take_id
    LEFT JOIN products p ON sti.product_id = p.id
    LEFT JOIN categories ct ON p.category_id = ct.id
ORDER BY st.created_at DESC,
    sti.created_at ASC;
-- Grant access to appropriate roles
GRANT SELECT ON vw_stock_take_adjustments_report TO authenticated;