# Enhanced Stock Take System - Backend Implementation Guide

## Overview

This document outlines all backend changes required to support the enhanced Stock Take Adjustments Report with improved accountability, financial tracking, approval workflows, and comprehensive analytics.

---

## 1. DATABASE SCHEMA CHANGES

### 1.1 Stock Take Sessions Table Enhancement

```sql
-- Add new columns to stock_takes table
ALTER TABLE stock_takes
ADD COLUMN IF NOT EXISTS performed_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS performed_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS stock_take_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS stock_take_type VARCHAR(50) DEFAULT 'full',
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_takes_performed_by ON stock_takes(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_reviewed_by ON stock_takes(reviewed_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_approval_status ON stock_takes(approval_status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_created_at ON stock_takes(created_at);

-- Add check constraints
ALTER TABLE stock_takes
ADD CONSTRAINT chk_stock_take_type
  CHECK (stock_take_type IN ('full', 'partial', 'spot_check', 'cycle_count')),
ADD CONSTRAINT chk_approval_status
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review'));

-- Add comment for documentation
COMMENT ON COLUMN stock_takes.stock_take_name IS 'Descriptive name for the stock take session (e.g., "Weekly Count - Jan 19")';
COMMENT ON COLUMN stock_takes.stock_take_type IS 'Type of stock take: full, partial, spot_check, or cycle_count';
COMMENT ON COLUMN stock_takes.location IS 'Physical location where stock take was performed (e.g., Bar, Storage, Cellar)';
COMMENT ON COLUMN stock_takes.approval_status IS 'Current approval status: pending, approved, rejected, or under_review';
```

### 1.2 Stock Take Items Table Enhancement

```sql
-- Add new columns to stock_take_items table
ALTER TABLE stock_take_items
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_value_adjustment DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS variance_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS previous_adjustment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS adjustment_frequency INTEGER DEFAULT 0;

-- Create computed column for variance percentage (using trigger)
CREATE OR REPLACE FUNCTION calculate_variance_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.system_qty > 0 THEN
    NEW.variance_percentage := ((NEW.physical_qty - NEW.system_qty)::DECIMAL / NEW.system_qty) * 100;
  ELSE
    NEW.variance_percentage := NULL;
  END IF;

  -- Calculate total value adjustment
  NEW.total_value_adjustment := (NEW.physical_qty - NEW.system_qty) * COALESCE(NEW.cost_per_unit, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_variance
BEFORE INSERT OR UPDATE ON stock_take_items
FOR EACH ROW
EXECUTE FUNCTION calculate_variance_percentage();

-- Add check constraints for reason codes
ALTER TABLE stock_take_items
ADD CONSTRAINT chk_reason
  CHECK (reason IS NULL OR reason IN (
    'receiving_error',
    'count_mistake',
    'damaged_broken',
    'theft_shortage',
    'spillage_waste',
    'expired_product',
    'system_error',
    'transfer',
    'other'
  ));

-- Create index for flagged items (large adjustments)
CREATE INDEX IF NOT EXISTS idx_stock_take_items_large_adjustments
ON stock_take_items(stock_take_id)
WHERE ABS(physical_qty - system_qty) > 10;

COMMENT ON COLUMN stock_take_items.reason IS 'Standardized reason code for adjustment';
COMMENT ON COLUMN stock_take_items.notes IS 'Additional notes or explanation for the adjustment';
```

### 1.3 Stock Take Audit Log Table (New)

```sql
-- Create audit log table for tracking all stock take actions
CREATE TABLE IF NOT EXISTS stock_take_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  performed_by_id UUID NOT NULL REFERENCES auth.users(id),
  performed_by_name VARCHAR(200),
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  notes TEXT
);

CREATE INDEX idx_audit_stock_take ON stock_take_audit_log(stock_take_id);
CREATE INDEX idx_audit_timestamp ON stock_take_audit_log(action_timestamp);
CREATE INDEX idx_audit_user ON stock_take_audit_log(performed_by_id);

ALTER TABLE stock_take_audit_log
ADD CONSTRAINT chk_action_type
  CHECK (action_type IN (
    'created',
    'item_added',
    'item_updated',
    'completed',
    'approved',
    'rejected',
    'reopened',
    'deleted'
  ));

COMMENT ON TABLE stock_take_audit_log IS 'Complete audit trail of all stock take operations';
```

### 1.4 User Profiles Enhancement

```sql
-- Ensure users table has necessary fields for reporting
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create view for user details with role info
CREATE OR REPLACE VIEW vw_user_details AS
SELECT
  u.id,
  u.username,
  u.email,
  u.role,
  u.department,
  u.created_at
FROM users u;
```

---

## 2. STORED PROCEDURES & FUNCTIONS

### 2.1 Enhanced Stock Take Creation

```sql
CREATE OR REPLACE FUNCTION create_stock_take_session(
  p_performed_by_id UUID,
  p_stock_take_name VARCHAR(200) DEFAULT NULL,
  p_stock_take_type VARCHAR(50) DEFAULT 'full',
  p_location VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_stock_take_id UUID;
  v_user_name VARCHAR(200);
  v_user_role VARCHAR(50);
BEGIN
  -- Get user details
  SELECT username, role INTO v_user_name, v_user_role
  FROM users WHERE id = p_performed_by_id;

  -- Create stock take session
  INSERT INTO stock_takes (
    performed_by_id,
    performed_by_role,
    stock_take_name,
    stock_take_type,
    location,
    approval_status,
    created_at
  ) VALUES (
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
  ) VALUES (
    v_stock_take_id,
    'created',
    p_performed_by_id,
    v_user_name,
    jsonb_build_object(
      'stock_take_name', p_stock_take_name,
      'stock_take_type', p_stock_take_type,
      'location', p_location
    )
  );

  RETURN v_stock_take_id;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Enhanced Stock Take Item Recording

```sql
CREATE OR REPLACE FUNCTION record_stock_take_item(
  p_stock_take_id UUID,
  p_product_id UUID,
  p_physical_qty INTEGER,
  p_reason VARCHAR(100) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_batch_number VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_system_qty INTEGER;
  v_cost_per_unit DECIMAL(10,2);
  v_adjustment INTEGER;
  v_product_name VARCHAR(200);
  v_previous_adj_date TIMESTAMP WITH TIME ZONE;
  v_adj_frequency INTEGER;
  v_result JSONB;
BEGIN
  -- Get current system quantity and cost
  SELECT
    COALESCE(current_stock, 0),
    COALESCE(unit_cost, 0),
    name
  INTO v_system_qty, v_cost_per_unit, v_product_name
  FROM products
  WHERE id = p_product_id;

  -- Calculate adjustment
  v_adjustment := p_physical_qty - v_system_qty;

  -- Check for previous adjustments
  SELECT
    MAX(sti.created_at),
    COUNT(*)
  INTO v_previous_adj_date, v_adj_frequency
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
    batch_number,
    previous_adjustment_date,
    adjustment_frequency,
    created_at
  ) VALUES (
    p_stock_take_id,
    p_product_id,
    v_system_qty,
    p_physical_qty,
    v_adjustment,
    v_cost_per_unit,
    p_reason,
    p_notes,
    p_batch_number,
    v_previous_adj_date,
    COALESCE(v_adj_frequency, 0),
    NOW()
  );

  -- Build result
  v_result := jsonb_build_object(
    'product_name', v_product_name,
    'system_qty', v_system_qty,
    'physical_qty', p_physical_qty,
    'adjustment', v_adjustment,
    'cost_per_unit', v_cost_per_unit,
    'total_value_adjustment', v_adjustment * v_cost_per_unit,
    'requires_approval', ABS(v_adjustment) > 10
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Stock Take Completion with Validation

```sql
CREATE OR REPLACE FUNCTION complete_stock_take_session(
  p_stock_take_id UUID,
  p_completed_by_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_item_count INTEGER;
  v_total_value_impact DECIMAL(10,2);
  v_flagged_items INTEGER;
  v_requires_approval BOOLEAN;
  v_user_name VARCHAR(200);
  v_result JSONB;
BEGIN
  -- Get completion stats
  SELECT
    COUNT(*),
    COALESCE(SUM(total_value_adjustment), 0),
    COUNT(*) FILTER (WHERE ABS(adjustment) > 10 OR ABS(variance_percentage) > 20)
  INTO v_item_count, v_total_value_impact, v_flagged_items
  FROM stock_take_items
  WHERE stock_take_id = p_stock_take_id;

  -- Check if requires approval
  v_requires_approval := v_flagged_items > 0 OR ABS(v_total_value_impact) > 5000;

  -- Get user name
  SELECT username INTO v_user_name FROM users WHERE id = p_completed_by_id;

  -- Update stock take
  UPDATE stock_takes
  SET
    completed_at = NOW(),
    approval_status = CASE
      WHEN v_requires_approval THEN 'under_review'
      ELSE 'approved'
    END
  WHERE id = p_stock_take_id;

  -- Apply adjustments to inventory if auto-approved
  IF NOT v_requires_approval THEN
    PERFORM apply_stock_take_adjustments(p_stock_take_id);
  END IF;

  -- Log audit entry
  INSERT INTO stock_take_audit_log (
    stock_take_id,
    action_type,
    performed_by_id,
    performed_by_name,
    new_values
  ) VALUES (
    p_stock_take_id,
    'completed',
    p_completed_by_id,
    v_user_name,
    jsonb_build_object(
      'item_count', v_item_count,
      'total_value_impact', v_total_value_impact,
      'flagged_items', v_flagged_items,
      'requires_approval', v_requires_approval
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'item_count', v_item_count,
    'total_value_impact', v_total_value_impact,
    'flagged_items', v_flagged_items,
    'requires_approval', v_requires_approval,
    'status', CASE WHEN v_requires_approval THEN 'under_review' ELSE 'approved' END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Stock Take Approval/Rejection

```sql
CREATE OR REPLACE FUNCTION approve_stock_take(
  p_stock_take_id UUID,
  p_reviewed_by_id UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_reviewer_name VARCHAR(200);
  v_result JSONB;
BEGIN
  -- Get reviewer name
  SELECT username INTO v_reviewer_name FROM users WHERE id = p_reviewed_by_id;

  -- Update stock take
  UPDATE stock_takes
  SET
    approval_status = 'approved',
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
  ) VALUES (
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

CREATE OR REPLACE FUNCTION reject_stock_take(
  p_stock_take_id UUID,
  p_reviewed_by_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_reviewer_name VARCHAR(200);
  v_result JSONB;
BEGIN
  -- Get reviewer name
  SELECT username INTO v_reviewer_name FROM users WHERE id = p_reviewed_by_id;

  -- Update stock take
  UPDATE stock_takes
  SET
    approval_status = 'rejected',
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
  ) VALUES (
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
```

### 2.5 Apply Stock Take Adjustments to Inventory

```sql
CREATE OR REPLACE FUNCTION apply_stock_take_adjustments(
  p_stock_take_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Loop through all items in the stock take
  FOR v_item IN
    SELECT
      product_id,
      adjustment,
      reason,
      notes
    FROM stock_take_items
    WHERE stock_take_id = p_stock_take_id
  LOOP
    -- Update product stock
    UPDATE products
    SET
      current_stock = current_stock + v_item.adjustment,
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
    ) VALUES (
      v_item.product_id,
      CASE WHEN v_item.adjustment > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END,
      ABS(v_item.adjustment),
      'stock_take',
      p_stock_take_id,
      v_item.reason,
      v_item.notes,
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. ENHANCED REPORTING VIEW

```sql
CREATE OR REPLACE VIEW vw_stock_take_adjustments_report AS
SELECT
  st.id AS "stockTakeId",
  st.completed_at AS "completedAt",
  st.created_at AS "createdAt",
  st.stock_take_name AS "stockTakeName",
  st.stock_take_type AS "stockTakeType",
  st.location,
  st.approval_status AS "approvalStatus",
  st.approval_notes AS "approvalNotes",

  -- Performed by user details
  u_performed.id AS "performedById",
  u_performed.username AS "performedBy",
  u_performed.role AS "performedByRole",

  -- Reviewed by user details
  u_reviewed.id AS "reviewedById",
  u_reviewed.username AS "reviewedBy",
  st.reviewed_at AS "reviewedAt",

  -- Product and adjustment details
  p.id AS "productId",
  p.name AS "productName",
  p.category,
  sti.system_qty AS "systemQty",
  sti.physical_qty AS "physicalQty",
  sti.adjustment,
  sti.cost_per_unit AS "costPerUnit",
  sti.total_value_adjustment AS "totalValueAdjustment",
  sti.variance_percentage AS "variancePercentage",
  sti.reason,
  sti.notes,
  sti.batch_number AS "batchNumber",
  sti.expiry_date AS "expiryDate",
  sti.previous_adjustment_date AS "previousAdjustmentDate",
  sti.adjustment_frequency AS "adjustmentFrequency",

  -- Item created timestamp
  sti.created_at AS "itemCreatedAt"

FROM stock_takes st
LEFT JOIN users u_performed ON st.performed_by_id = u_performed.id
LEFT JOIN users u_reviewed ON st.reviewed_by_id = u_reviewed.id
LEFT JOIN stock_take_items sti ON st.id = sti.stock_take_id
LEFT JOIN products p ON sti.product_id = p.id
ORDER BY st.created_at DESC, sti.created_at ASC;

-- Grant access to appropriate roles
GRANT SELECT ON vw_stock_take_adjustments_report TO authenticated;
```

---

## 4. API ENDPOINT UPDATES

### 4.1 Update Stock Take Report Hook

```javascript
// hooks/inventory/useInventoryReports.js

export const useInventoryReports = () => {
  const stockTakeReports = async ({ startDate, endDate }) => {
    try {
      let query = supabase.from("vw_stock_take_adjustments_report").select("*");

      if (startDate) {
        query = query.gte("createdAt", startDate);
      }

      if (endDate) {
        query = query.lte("createdAt", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching stock take reports:", error);
      return { data: null, error };
    }
  };

  return {
    stockTakeReports,
    loading: false,
  };
};
```

### 4.2 Create Stock Take Session API

```javascript
// api/stockTake.js

export const createStockTakeSession = async ({
  userId,
  stockTakeName,
  stockTakeType = "full",
  location,
}) => {
  try {
    const { data, error } = await supabase.rpc("create_stock_take_session", {
      p_performed_by_id: userId,
      p_stock_take_name: stockTakeName,
      p_stock_take_type: stockTakeType,
      p_location: location,
    });

    if (error) throw error;
    return { stockTakeId: data, error: null };
  } catch (error) {
    console.error("Error creating stock take session:", error);
    return { stockTakeId: null, error };
  }
};
```

### 4.3 Record Stock Take Item API

```javascript
export const recordStockTakeItem = async ({
  stockTakeId,
  productId,
  physicalQty,
  reason = null,
  notes = null,
  batchNumber = null,
}) => {
  try {
    const { data, error } = await supabase.rpc("record_stock_take_item", {
      p_stock_take_id: stockTakeId,
      p_product_id: productId,
      p_physical_qty: physicalQty,
      p_reason: reason,
      p_notes: notes,
      p_batch_number: batchNumber,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error recording stock take item:", error);
    return { data: null, error };
  }
};
```

### 4.4 Complete Stock Take API

```javascript
export const completeStockTake = async (stockTakeId, userId) => {
  try {
    const { data, error } = await supabase.rpc("complete_stock_take_session", {
      p_stock_take_id: stockTakeId,
      p_completed_by_id: userId,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error completing stock take:", error);
    return { data: null, error };
  }
};
```

### 4.5 Approve/Reject Stock Take API

```javascript
export const approveStockTake = async (stockTakeId, reviewerId, notes) => {
  try {
    const { data, error } = await supabase.rpc("approve_stock_take", {
      p_stock_take_id: stockTakeId,
      p_reviewed_by_id: reviewerId,
      p_approval_notes: notes,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error approving stock take:", error);
    return { data: null, error };
  }
};

export const rejectStockTake = async (stockTakeId, reviewerId, reason) => {
  try {
    const { data, error } = await supabase.rpc("reject_stock_take", {
      p_stock_take_id: stockTakeId,
      p_reviewed_by_id: reviewerId,
      p_rejection_reason: reason,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error rejecting stock take:", error);
    return { data: null, error };
  }
};
```

---

## 5. MIGRATION SCRIPT

```sql
-- Complete migration script to run in order

BEGIN;

-- Step 1: Enhance stock_takes table
ALTER TABLE stock_takes
ADD COLUMN IF NOT EXISTS performed_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS performed_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS stock_take_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS stock_take_type VARCHAR(50) DEFAULT 'full',
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Step 2: Enhance stock_take_items table
ALTER TABLE stock_take_items
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_value_adjustment DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS variance_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS previous_adjustment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS adjustment_frequency INTEGER DEFAULT 0;

-- Step 3: Create audit log table
CREATE TABLE IF NOT EXISTS stock_take_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  performed_by_id UUID NOT NULL REFERENCES auth.users(id),
  performed_by_name VARCHAR(200),
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  notes TEXT
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_takes_performed_by ON stock_takes(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_reviewed_by ON stock_takes(reviewed_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_approval_status ON stock_takes(approval_status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_created_at ON stock_takes(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_stock_take ON stock_take_audit_log(stock_take_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON stock_take_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON stock_take_audit_log(performed_by_id);

-- Step 5: Add constraints
ALTER TABLE stock_takes
ADD CONSTRAINT chk_stock_take_type
  CHECK (stock_take_type IN ('full', 'partial', 'spot_check', 'cycle_count')),
ADD CONSTRAINT chk_approval_status
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review'));

ALTER TABLE stock_take_items
ADD CONSTRAINT chk_reason
  CHECK (reason IS NULL OR reason IN (
    'receiving_error',
    'count_mistake',
    'damaged_broken',
    'theft_shortage',
    'spillage_waste',
    'expired_product',
    'system_error',
    'transfer',
    'other'
  ));

-- Step 6: Backfill cost_per_unit from products table
UPDATE stock_take_items sti
SET cost_per_unit = p.unit_cost
FROM products p
WHERE sti.product_id = p.id
  AND sti.cost_per_unit IS NULL;

-- Step 7: Create triggers and functions (already defined above in sections 2.1-2.5)
-- Run all function creation scripts here

-- Step 8: Create reporting view
-- Run view creation script from section 3

COMMIT;
```

---

## 6. DATA MIGRATION FOR EXISTING RECORDS

```sql
-- Migrate existing stock takes to have user attribution
-- This assumes you have a default system user or admin user

DO $$
DECLARE
  v_default_user_id UUID;
BEGIN
  -- Get or create a system user for historical records
  SELECT id INTO v_default_user_id
  FROM users
  WHERE username = 'system'
  LIMIT 1;

  IF v_default_user_id IS NULL THEN
    INSERT INTO users (username, role, email)
    VALUES ('system', 'system', 'system@hashersclub.local')
    RETURNING id INTO v_default_user_id;
  END IF;

  -- Update all stock takes without user attribution
  UPDATE stock_takes
  SET
    performed_by_id = v_default_user_id,
    performed_by_role = 'system',
    stock_take_type = 'full',
    approval_status = CASE
      WHEN completed_at IS NOT NULL THEN 'approved'
      ELSE 'pending'
    END
  WHERE performed_by_id IS NULL;

  -- Create audit log entries for migrated records
  INSERT INTO stock_take_audit_log (
    stock_take_id,
    action_type,
    performed_by_id,
    performed_by_name,
    new_values
  )
  SELECT
    id,
    'created',
    v_default_user_id,
    'system',
    jsonb_build_object('migrated', true, 'original_created_at', created_at)
  FROM stock_takes
  WHERE performed_by_id = v_default_user_id;
END $$;
```

---

## 7. TESTING CHECKLIST

### Database Tests

- [ ] All new columns exist in both tables
- [ ] All indexes created successfully
- [ ] All constraints enforced properly
- [ ] Triggers fire correctly on insert/update
- [ ] Stored procedures execute without errors
- [ ] View returns expected data structure

### Functional Tests

- [ ] Create stock take session with user attribution
- [ ] Record items with reason codes and notes
- [ ] Calculate variance percentage correctly
- [ ] Calculate total value adjustment correctly
- [ ] Complete stock take with auto-approval (small adjustments)
- [ ] Complete stock take requiring manual approval (large adjustments)
- [ ] Approve stock take and verify inventory update
- [ ] Reject stock take and verify no inventory change
- [ ] Audit log captures all actions

### Report Tests

- [ ] Report displays all new fields correctly
- [ ] Filters work (status, user, date range)
- [ ] KPIs calculate correctly
- [ ] Export to CSV includes all fields
- [ ] Flagged items identified correctly
- [ ] Financial calculations accurate

### Performance Tests

- [ ] Report loads in <2 seconds with 1000 records
- [ ] Indexes improve query performance
- [ ] View doesn't cause N+1 queries

---

## 8. DEPLOYMENT STEPS

1. **Backup Database**

   ```bash
   pg_dump -U postgres -d fairy_wren_db > backup_$(date +%Y%m%d).sql
   ```

2. **Run Migration Script**

   ```bash
   psql -U postgres -d fairy_wren_db -f migration_stock_take_enhancement.sql
   ```

3. **Verify Schema Changes**

   ```sql
   \d stock_takes
   \d stock_take_items
   \d stock_take_audit_log
   ```

4. **Deploy Stored Procedures**
   - Run all function creation scripts
   - Verify with `\df` command

5. **Deploy View**
   - Create reporting view
   - Grant permissions

6. **Update Frontend**
   - Deploy new React component
   - Update API hooks
   - Test in staging environment

7. **Monitor Performance**
   - Check query execution times
   - Monitor index usage
   - Review audit log growth

---

## 9. ROLLBACK PLAN

```sql
-- If issues arise, rollback with these commands

BEGIN;

-- Drop new objects
DROP VIEW IF EXISTS vw_stock_take_adjustments_report;
DROP TABLE IF EXISTS stock_take_audit_log;
DROP FUNCTION IF EXISTS create_stock_take_session;
DROP FUNCTION IF EXISTS record_stock_take_item;
DROP FUNCTION IF EXISTS complete_stock_take_session;
DROP FUNCTION IF EXISTS approve_stock_take;
DROP FUNCTION IF EXISTS reject_stock_take;
DROP FUNCTION IF EXISTS apply_stock_take_adjustments;
DROP FUNCTION IF EXISTS calculate_variance_percentage;
DROP TRIGGER IF EXISTS trg_calculate_variance ON stock_take_items;

-- Remove columns (optional - may want to keep data)
-- ALTER TABLE stock_takes DROP COLUMN IF EXISTS performed_by_id;
-- ... (drop other columns as needed)

COMMIT;

-- Restore from backup if necessary
-- psql -U postgres -d fairy_wren_db < backup_YYYYMMDD.sql
```

---

## 10. NEXT STEPS & FUTURE ENHANCEMENTS

### Phase 2 Enhancements

1. **Mobile App Integration**
   - Barcode scanning for faster counting
   - Offline mode with sync
   - Photo capture for discrepancies

2. **Advanced Analytics**
   - ML-based shrinkage prediction
   - Automated variance alerts
   - Trend analysis dashboard

3. **Integration Features**
   - Email notifications for approvals
   - SMS alerts for critical discrepancies
   - Export to accounting software

4. **Automation**
   - Scheduled stock takes
   - Auto-generated stock take sessions
   - Predictive reordering based on variance patterns

---

## APPENDIX: REASON CODE REFERENCE

| Code            | Description                         | Common Usage               |
| --------------- | ----------------------------------- | -------------------------- |
| receiving_error | Incorrect quantity received         | Initial stock entry errors |
| count_mistake   | Human error during counting         | Recount required           |
| damaged_broken  | Physical damage to product          | Write-offs                 |
| theft_shortage  | Missing inventory (suspected theft) | Security review needed     |
| spillage_waste  | Product lost to spillage            | Bar operations             |
| expired_product | Removed due to expiration           | Perishables                |
| system_error    | Data entry or system issue          | IT review                  |
| transfer        | Moved between locations             | Inter-location transfers   |
| other           | Miscellaneous reasons               | Specify in notes           |
