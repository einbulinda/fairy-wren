const supabase = require("../../config/supabase");
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
  } catch (error) {
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
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("bill_id", billId)
    .limit(1)
    .single();
}

/**
 * Load Bill + Items + Costs
 */
async function getBillWithItems(billId) {
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
            id,
      total_amount,
      payments (
        method,
        amount
      ),
      bill_items (
        quantity,
        price,
        products (
          cost_price,
          inventory_account_id,
          cogs_account_id
        )
      )
            `
    )
    .eq("id", billId)
    .single();

  if (error) {
    throw new Error(`Failed to load bill ${billId}: ${error.message}`);
  }
  return data;
}

// Reverse Bill Ledger Entries
exports.reverseBillLedger = async (billId, reason = "Bill voided") => {
  try {
    // 1. Find all journal entries for this bill
    const entries = await getBillJournalEntries(billId);

    if (entries.length === 0) {
      logger.warn("No journal entries found to reverse", { billId });
      return;
    }

    // 2. Prevent double reversal
    const alreadyReversed = entries.some((e) => e.reversed_entry_id);
    if (alreadyReversed) {
      logger.warn("Ledger already reversed for bill", { billId });
      return;
    }

    // 3. Reverse each journal entry
    for (const entry of entries) {
      await reverseJournalEntry(entry, reason);
    }

    logger.info("Ledger reversal completed", { billId });
  } catch (err) {
    logger.error("Ledger reversal failed", {
      billId,
      error: err.message,
    });
  }
};

// Revenue Journal Posting
async function postRevenueJournal(bill) {
  const revenueAccountId = await getRevenueAccount();
  const settlementAccountId = await getSettlementAccount(bill);

  // 1. Create journal entry
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: new Date(),
      reference: `BILL:${bill.id}`,
      description: "POS Sale",
      source_type: "bill",
      source_id: bill.id,
    })
    .select()
    .single();

  if (error) throw error;

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

  const { error: lineError } = await supabase
    .from("journal_lines")
    .insert(lines);

  if (lineError) throw lineError;

  return entry.id;
}

// Fetch Journal Entries for a Bill
async function getBillJournalEntries(billId) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      `
      id,
      reference,
      source_type,
      source_id,
      reversed_entry_id,
      journal_lines (
        account_id,
        debit,
        credit
      )
    `
    )
    .eq("source_type", "bill")
    .eq("source_id", billId);

  if (error) throw error;
  return data;
}

// Reverse Single Journal Entry
async function reverseJournalEntry(originalEntry, reason) {
  // 1. Create reversal header
  const { data: reversalEntry, error } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: new Date(),
      reference: `${originalEntry.reference}:REV`,
      description: reason,
      source_type: originalEntry.source_type,
      source_id: originalEntry.source_id,
      reversed_entry_id: originalEntry.id,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Reverse lines
  const reversedLines = originalEntry.journal_lines.map((line) => ({
    journal_entry_id: reversalEntry.id,
    account_id: line.account_id,
    debit: line.credit,
    credit: line.debit,
  }));

  const { error: lineError } = await supabase
    .from("journal_lines")
    .insert(reversedLines);

  if (lineError) throw lineError;

  // 3. Mark original as reversed
  await supabase
    .from("journal_entries")
    .update({ reversed_entry_id: reversalEntry.id })
    .eq("id", originalEntry.id);
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

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: new Date(),
      reference: `BILL:${bill.id}:COGS`,
      description: "Cost of Goods Sold",
      source_type: "bill",
      source_id: bill.id,
    })
    .select()
    .single();

  if (error) throw error;

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

  const { error: lineError } = await supabase
    .from("journal_lines")
    .insert(lines);

  if (lineError) throw lineError;

  return entry.id;
}

// Revenue Account
async function getRevenueAccount() {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("account_class", "income")
    .eq("active", true)
    .limit(1)
    .single();

  if (error) throw error;
  return data.id;
}

// Settlement Account based on payment method
async function getSettlementAccount(bill) {
  // For simplicity, using the first payment method
  const method = bill.payments[0]?.method || "cash";

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("code", method.toUpperCase())
    .eq("active", true)
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}
