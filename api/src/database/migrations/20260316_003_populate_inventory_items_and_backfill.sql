-- ============================================================================
-- POPULATE inventory_items for all products + backfill missing journal entries
-- ============================================================================

-- ========= 1. POPULATE INVENTORY_ITEMS =========
-- Maps each product to its category's inventory GL account + Cost of Sales (5000)
INSERT INTO inventory_items (product_id, inventory_account_id, cogs_account_id, name, cost_price)
SELECT
    p.id,
    inv_acct.id,
    cogs_acct.id,
    p.name,
    0
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN chart_of_accounts inv_acct ON inv_acct.code = CASE c.name
    WHEN 'Beers'       THEN '4002'
    WHEN 'Brandy'      THEN '4003'
    WHEN 'Cider'       THEN '4004'
    WHEN 'Cognac'      THEN '4005'
    WHEN 'Gin'         THEN '4006'
    WHEN 'Liqueur'     THEN '4007'
    WHEN 'Rum'         THEN '4008'
    WHEN 'Soft Drinks' THEN '4009'
    WHEN 'Spirit'      THEN '4010'
    WHEN 'Tequila'     THEN '4011'
    WHEN 'Vodka'       THEN '4012'
    WHEN 'Whisky'      THEN '4013'
    WHEN 'Wine'        THEN '4014'
    ELSE '4001'
END
CROSS JOIN (SELECT id FROM chart_of_accounts WHERE code = '5000') cogs_acct
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_items ii WHERE ii.product_id = p.id
);

-- ========= 2. BACKFILL MISSING PURCHASE JOURNAL ENTRIES =========
-- Single atomic CTE: creates journal entries, debit lines, and credit lines together.

WITH receipts_to_post AS (
    SELECT DISTINCT r.id AS receipt_id, r.purchase_date, r.invoice_number, r.supplier_id
    FROM inventory_receipts r
    JOIN inventory_receipt_items ri ON ri.receipt_id = r.id
    JOIN inventory_items ii ON ii.product_id = ri.product_id
    WHERE NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.source_type = 'inventory_receipt'
          AND je.source_id = r.id
    )
    AND ri.line_total > 0
),
new_entries AS (
    INSERT INTO journal_entries (entry_date, source_type, source_id, description)
    SELECT
        rtp.purchase_date,
        'inventory_receipt',
        rtp.receipt_id,
        'Inventory purchase (backfill) - ' || COALESCE(rtp.invoice_number, 'no ref')
    FROM receipts_to_post rtp
    RETURNING id, source_id
),
debit_lines AS (
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    SELECT
        ne.id,
        ii.inventory_account_id,
        sum(ri.line_total),
        0
    FROM new_entries ne
    JOIN inventory_receipt_items ri ON ri.receipt_id = ne.source_id
    JOIN inventory_items ii ON ii.product_id = ri.product_id
    WHERE ri.line_total > 0
    GROUP BY ne.id, ii.inventory_account_id
    RETURNING journal_entry_id, debit
)
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
SELECT
    ne.id,
    COALESCE(s.account_id, ap.id),
    0,
    dl.receipt_total
FROM new_entries ne
JOIN (
    SELECT journal_entry_id, sum(debit) AS receipt_total
    FROM debit_lines
    GROUP BY journal_entry_id
) dl ON dl.journal_entry_id = ne.id
JOIN inventory_receipts r ON r.id = ne.source_id
LEFT JOIN suppliers s ON s.id = r.supplier_id
CROSS JOIN (SELECT id FROM chart_of_accounts WHERE code = '2100') ap;
