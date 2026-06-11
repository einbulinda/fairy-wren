const pool = require("../../config/db");
const logger = require("../../utils/logger");

/**
 * MAIN ENTRY POINT
 * Called after a bill is successfully settled.
 * SAFE: does not throw to caller.
 */
exports.postBillToLedger = async (billId) => {
  try {
    // 1. Prevent double posting
    const alreadyPosted = await isBillAlreadyPosted(billId);
    if (alreadyPosted) {
      logger.info(`Bill ${billId} already posted to ledger. Skipping...`);
      return;
    }

    // 2. Load bill context
    const bill = await getBillWithItems(billId);

    // 3. Post revenue
    const revenueEntryId = await postRevenueJournal(bill);

    // 4. Post COGS
    const cogsEntryId = await postCOGSJournal(bill);

    logger.info("Ledger posting completed", {
      billId,
      revenueEntryId,
      cogsEntryId,
    });
  } catch (err) {
    // VERY IMPORTANT: Do NOT throw
    logger.error("Ledger posting failed", {
      billId,
      error: err.message,
    });
  }
};

/*
 * Indempotency Check
 */

async function isBillAlreadyPosted(billId) {
  const { rows } = await pool.query(
    "SELECT id FROM journal_entries WHERE bill_id = $1 LIMIT 1",
    [billId]
  );
  return rows.length > 0;
}

/**
 * Load Bill + Items + Costs
 */
async function getBillWithItems(billId) {
  const { rows } = await pool.query(
    `SELECT
       b.id,
       b.total_amount,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object('method', pay.method, 'amount', pay.amount))
         FILTER (WHERE pay.id IS NOT NULL),
         '[]'
       ) AS payments,
       COALESCE(
         json_agg(
           jsonb_build_object(
             'quantity', bi.quantity,
             'price', bi.price,
             'products', jsonb_build_object(
               'cost_price', p.cost_price,
               'inventory_account_id', p.inventory_account_id,
               'cogs_account_id', p.cogs_account_id
             )
           )
         ) FILTER (WHERE bi.id IS NOT NULL),
         '[]'
       ) AS bill_items
     FROM bills b
     LEFT JOIN payments pay ON pay.bill_id = b.id
     LEFT JOIN bill_items bi ON bi.bill_id = b.id
     LEFT JOIN products p ON p.id = bi.product_id
     WHERE b.id = $1
     GROUP BY b.id, b.total_amount`,
    [billId]
  );

  if (!rows[0]) {
    throw new Error(`Failed to load bill ${billId}: not found`);
  }
  return rows[0];
}

// Reverse Bill Ledger Entries
exports.reverseBillLedger = async (billId, reason = "Bill voided") => {
  try {
    // 1. Find all journal entries for this bill
    const entries = await getBillJournalEntries(billId);

    if (entries.length === 0) {
      // logger.warn("No journal entries found to reverse", { billId });
      return;
    }

    // 2. Prevent double reversal
    const alreadyReversed = entries.some((e) => e.reversed_entry_id);
    if (alreadyReversed) {
      // logger.warn("Ledger already reversed for bill", { billId });
      return;
    }

    // 3. Reverse each journal entry
    for (const entry of entries) {
      await reverseJournalEntry(entry, reason);
    }

    // logger.info("Ledger reversal completed", { billId });
  } catch (err) {
    // logger.error("Ledger reversal failed", {
    //   billId,
    //   error: err.message,
    // });
  }
};

// Revenue Journal Posting
async function postRevenueJournal(bill) {
  const revenueAccountId = await getRevenueAccount();
  const settlementAccountId = await getSettlementAccount(bill);

  // 1. Create journal entry
  const { rows: entryRows } = await pool.query(
    `INSERT INTO journal_entries (entry_date, reference, description, source_type, source_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [new Date(), `BILL:${bill.id}`, "POS Sale", "bill", bill.id]
  );
  const entry = entryRows[0];

  // 2. Journal lines
  const lines = [
    {
      journal_entry_id: entry.id,
      account_id: settlementAccountId,
      debit: bill.total_amount,
      credit: 0,
    },
    {
      journal_entry_id: entry.id,
      account_id: revenueAccountId,
      debit: 0,
      credit: bill.total_amount,
    },
  ];

  for (const line of lines) {
    await pool.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
       VALUES ($1, $2, $3, $4)`,
      [line.journal_entry_id, line.account_id, line.debit, line.credit]
    );
  }

  return entry.id;
}

// Fetch Journal Entries for a Bill
async function getBillJournalEntries(billId) {
  const { rows } = await pool.query(
    `SELECT
       je.id,
       je.reference,
       je.source_type,
       je.source_id,
       je.reversed_entry_id,
       COALESCE(
         json_agg(
           jsonb_build_object('account_id', jl.account_id, 'debit', jl.debit, 'credit', jl.credit)
         ) FILTER (WHERE jl.id IS NOT NULL),
         '[]'
       ) AS journal_lines
     FROM journal_entries je
     LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
     WHERE je.source_type = 'bill' AND je.source_id = $1
     GROUP BY je.id, je.reference, je.source_type, je.source_id, je.reversed_entry_id`,
    [billId]
  );
  return rows;
}

// Reverse Single Journal Entry
async function reverseJournalEntry(originalEntry, reason) {
  // 1. Create reversal header
  const { rows: entryRows } = await pool.query(
    `INSERT INTO journal_entries (entry_date, reference, description, source_type, source_id, reversed_entry_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      new Date(),
      `${originalEntry.reference}:REV`,
      reason,
      originalEntry.source_type,
      originalEntry.source_id,
      originalEntry.id,
    ]
  );
  const reversalEntry = entryRows[0];

  // 2. Reverse lines
  const reversedLines = originalEntry.journal_lines.map((line) => ({
    journal_entry_id: reversalEntry.id,
    account_id: line.account_id,
    debit: line.credit,
    credit: line.debit,
  }));

  for (const line of reversedLines) {
    await pool.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
       VALUES ($1, $2, $3, $4)`,
      [line.journal_entry_id, line.account_id, line.debit, line.credit]
    );
  }

  // 3. Mark original as reversed
  await pool.query(
    `UPDATE journal_entries SET reversed_entry_id = $1 WHERE id = $2`,
    [reversalEntry.id, originalEntry.id]
  );
}

// COGS Journal Posting
async function postCOGSJournal(bill) {
  let totalCOGS = 0;

  bill.bill_items.forEach((item) => {
    totalCOGS += item.quantity * item.products.cost_price;
  });

  if (totalCOGS === 0) return null;

  const inventoryAccountId = bill.bill_items[0].products.inventory_account_id;
  const cogsAccountId = bill.bill_items[0].products.cogs_account_id;

  const { rows: entryRows } = await pool.query(
    `INSERT INTO journal_entries (entry_date, reference, description, source_type, source_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [new Date(), `BILL:${bill.id}:COGS`, "Cost of Goods Sold", "bill", bill.id]
  );
  const entry = entryRows[0];

  const lines = [
    {
      journal_entry_id: entry.id,
      account_id: cogsAccountId,
      debit: totalCOGS,
      credit: 0,
    },
    {
      journal_entry_id: entry.id,
      account_id: inventoryAccountId,
      debit: 0,
      credit: totalCOGS,
    },
  ];

  for (const line of lines) {
    await pool.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
       VALUES ($1, $2, $3, $4)`,
      [line.journal_entry_id, line.account_id, line.debit, line.credit]
    );
  }

  return entry.id;
}

// Revenue Account
async function getRevenueAccount() {
  const { rows } = await pool.query(
    `SELECT id FROM chart_of_accounts WHERE account_class = 'income' AND active = true LIMIT 1`
  );
  if (!rows[0]) throw new Error("Revenue account not found");
  return rows[0].id;
}

// Settlement Account based on payment method
async function getSettlementAccount(bill) {
  // For simplicity, using the first payment method
  const method = bill.payments[0]?.method || "cash";

  const { rows } = await pool.query(
    `SELECT id FROM chart_of_accounts WHERE code = $1 AND active = true LIMIT 1`,
    [method.toUpperCase()]
  );
  if (!rows[0]) throw new Error(`Settlement account not found for method: ${method}`);
  return rows[0].id;
}
