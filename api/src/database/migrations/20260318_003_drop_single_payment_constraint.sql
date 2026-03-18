    -- Drop unique index that blocks multiple payments per bill (needed for split payments)
    DROP INDEX IF EXISTS ux_payments_bill_active;
