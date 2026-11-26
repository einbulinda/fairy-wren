const repo = require("./mpesa.repository");
const auditRepo = require("../audit/audit.repository");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_FILTERS = {
  open: ["unallocated", "partially_allocated"],
  unallocated: ["unallocated"],
  partially_allocated: ["partially_allocated"],
  allocated: ["allocated"],
  all: ["unallocated", "partially_allocated", "allocated"],
  // Till IPNs for money an STK callback already recorded (not money).
  linked: ["linked"],
};

/** Error codes raised by the SQL functions (RAISE EXCEPTION 'MPESA_…'). */
const SQL_ERROR_CODES = new Set([
  "MPESA_TRANSACTION_NOT_FOUND",
  "MPESA_INVALID_ALLOCATION",
  "MPESA_OVER_ALLOCATED",
  "MPESA_BILL_NOT_FOUND",
  "MPESA_BILL_NOT_PAYABLE",
  "MPESA_EXCEEDS_BILL_BALANCE",
  "MPESA_ALLOCATION_NOT_FOUND",
  "MPESA_ALLOCATION_ALREADY_REVERSED",
  "MPESA_REVERSAL_REASON_REQUIRED",
  "MPESA_TIP_RECIPIENT_NOT_FOUND",
  "MPESA_INVALID_PAYOUT",
  "MPESA_PAYOUT_EXCEEDS_TIPS",
  "MPESA_TIP_ALREADY_PAID_OUT",
]);

const fail = (code, detail) => {
  const err = new Error(code);
  if (detail) err.details = [detail];
  return err;
};

/** Turn a pg error raised by our SQL functions into a mapped domain error. */
const mapDbError = (err) =>
  SQL_ERROR_CODES.has(err.message) ? fail(err.message, err.detail) : err;

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Kenyan mobile as typed → KCB's stored form (2547XXXXXXXX), for search.
 * "0712 345 678" / "712345678" / "+254712345678" → "254712345678";
 * partial input like "0712" → "254712". null if it isn't a phone-like term.
 */
function normalizeMsisdn(input) {
  const raw = String(input || "").trim();
  if (!/^\+?[\d\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 3) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (/^[17]/.test(digits)) return `254${digits}`;
  return digits;
}

/** { q, phone } for the repository search (both undefined when no search). */
function searchTerms(q) {
  const text = typeof q === "string" ? q.trim().slice(0, 100) : "";
  if (!text) return {};
  return { q: text, phone: normalizeMsisdn(text) || undefined };
}

/* ======================================================
   PRESENTATION
   ====================================================== */

/** 254711000441 → 2547****441 (Kenya Data Protection Act: show only to managers). */
function maskMsisdn(msisdn) {
  if (!msisdn) return null;
  const s = String(msisdn);
  if (s.length <= 7) return "****";
  return `${s.slice(0, 4)}****${s.slice(-3)}`;
}

const canSeePhone = (context) =>
  ["owner", "admin"].includes(context?.role) ||
  (context?.permissions ?? []).includes("manage_mpesa");

function toDto(row, context) {
  const amount = Number(row.amount);
  const allocated = Number(row.allocated_amount);
  return {
    id: row.id,
    receipt: row.transaction_id,
    amount,
    allocatedAmount: allocated,
    remaining: round2(amount - allocated),
    status: row.status,
    payerName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" "),
    phone: canSeePhone(context) ? row.msisdn : maskMsisdn(row.msisdn),
    billReference: row.bill_reference,
    transactionType: row.transaction_type,
    transactionAt: row.transaction_at,
    receivedAt: row.received_at,
    depositLabel: row.deposit_label,
    depositMarkedAt: row.deposit_marked_at,
    source: row.source,
    stkRequestId: row.stk_request_id ?? null,
    duplicateOf: row.duplicate_of ?? null,
    possibleDuplicateOf: row.possible_duplicate_of ?? null,
  };
}

/* ======================================================
   MATCHING
   ====================================================== */

const tokens = (s) =>
  String(s || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

/**
 * How likely is it that this M-Pesa payment belongs to this bill?
 * Hints only — a person always confirms the match.
 *
 * @param {{ remaining:number, billReference?:string, depositLabel?:string, payerName?:string, transactionAt:Date|string }} txn
 * @param {{ customer_name:string, invoice_number?:string, payable_amount:number|string, updated_at:Date|string }} bill
 */
function scoreMatch(txn, bill) {
  const reasons = [];
  let score = 0;
  const payable = Number(bill.payable_amount);
  const billTokens = new Set(tokens(bill.customer_name));

  if (Math.abs(txn.remaining - payable) < 0.01) {
    score += 50;
    reasons.push("exact amount");
  } else if (txn.remaining > payable) {
    score += 5;
    reasons.push("covers balance");
  }

  const refTokens = [...tokens(txn.billReference), ...tokens(txn.depositLabel)];
  const invoice = String(bill.invoice_number || "").toLowerCase();
  // "8040662FWPD0Z" (no "#") is one token that ends with the invoice number
  if (invoice && refTokens.some((t) => t === invoice || (t.endsWith(invoice) && /^\d+$/.test(t.slice(0, -invoice.length))))) {
    score += 100; // typed our receipt's number: beats amount + name + time
    reasons.push("invoice number matches");
  } else if (refTokens.some((t) => billTokens.has(t))) {
    score += 40;
    reasons.push("reference matches bill");
  }

  if (tokens(txn.payerName).some((t) => billTokens.has(t))) {
    score += 20;
    reasons.push("payer name matches");
  }

  const hours =
    Math.abs(new Date(txn.transactionAt) - new Date(bill.updated_at)) / 36e5;
  if (hours <= 1) score += 10;
  else if (hours <= 3) score += 5;

  return { score, reasons };
}

/* ======================================================
   QUERIES
   ====================================================== */

/**
 * List notifications. With billId, each carries a match score for that bill
 * and the list is ordered best match first (used by the payment modal).
 */
exports.listTransactions = async (query = {}, context) => {
  const statuses = STATUS_FILTERS[query.status || "open"];
  if (!statuses) throw fail("MPESA_INVALID_FILTER", `unknown status ${query.status}`);

  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 100));
  const rows = await repo.listTransactions({
    statuses,
    from: query.from,
    to: query.to,
    ...searchTerms(query.q),
    limit,
  });
  const items = rows.map((r) => toDto(r, context));

  if (!query.billId) return items;
  if (!UUID_RE.test(query.billId)) throw fail("MPESA_BILL_NOT_FOUND");

  const bill = await repo.getPayableBill(query.billId);
  if (!bill) throw fail("MPESA_BILL_NOT_FOUND");

  return items
    .map((t) => ({ ...t, match: scoreMatch(t, bill) }))
    .sort(
      (a, b) =>
        b.match.score - a.match.score ||
        new Date(b.transactionAt) - new Date(a.transactionAt),
    );
};

exports.getTransaction = async (id, context) => {
  if (!UUID_RE.test(id)) throw fail("MPESA_TRANSACTION_NOT_FOUND");
  const row = await repo.getTransaction(id);
  if (!row) throw fail("MPESA_TRANSACTION_NOT_FOUND");

  const allocations = await repo.listAllocations(id);
  return {
    ...toDto(row, context),
    allocations: allocations.map((a) => ({
      id: a.id,
      type: a.allocation_type,
      billId: a.bill_id,
      customerName: a.customer_name,
      invoiceNumber: a.invoice_number,
      tipRecipientId: a.tip_recipient_id,
      tipRecipientName: a.tip_recipient_name,
      amount: Number(a.amount),
      allocatedAt: a.allocated_at,
      allocatedBy: a.allocated_by_name ?? "Automatic (invoice number)",
      reversedAt: a.reversed_at,
      reversedBy: a.reversed_by_name,
      reversalReason: a.reversal_reason,
    })),
  };
};

/** Payable bills ranked by how well they match this notification. */
exports.getSuggestions = async (id, context) => {
  if (!UUID_RE.test(id)) throw fail("MPESA_TRANSACTION_NOT_FOUND");
  const row = await repo.getTransaction(id);
  if (!row) throw fail("MPESA_TRANSACTION_NOT_FOUND");

  const txn = toDto(row, context);
  const bills = await repo.listPayableBills();

  return bills
    .map((b) => ({
      billId: b.id,
      customerName: b.customer_name,
      invoiceNumber: b.invoice_number,
      status: b.status,
      createdBy: b.created_by_name,
      total: Number(b.total),
      amountPaid: Number(b.amount_paid),
      pendingAmount: Number(b.pending_amount),
      payable: Number(b.payable_amount),
      updatedAt: b.updated_at,
      match: scoreMatch(txn, b),
    }))
    .sort(
      (a, b) =>
        b.match.score - a.match.score || new Date(b.updatedAt) - new Date(a.updatedAt),
    );
};

/** Staff a tip can be assigned to: [{ id, name, role }]. */
exports.listStaff = async () => repo.listStaff();

/* ======================================================
   COMMANDS
   ====================================================== */

/**
 * body: { lines: [{ type: "bill"|"tip", billId?, amount }], depositLabel? }
 */
exports.allocate = async (id, body = {}, context) => {
  if (!UUID_RE.test(id)) throw fail("MPESA_TRANSACTION_NOT_FOUND");

  const rawLines = body.lines ?? [];
  if (!Array.isArray(rawLines)) throw fail("MPESA_INVALID_ALLOCATION", "lines must be an array");

  const lines = rawLines.map((l, i) => {
    const type = l?.type;
    const amount = round2(l?.amount);
    if (!["bill", "tip"].includes(type)) {
      throw fail("MPESA_INVALID_ALLOCATION", `line ${i + 1}: type must be bill or tip`);
    }
    if (!(amount > 0)) {
      throw fail("MPESA_INVALID_ALLOCATION", `line ${i + 1}: amount must be positive`);
    }
    if (l.billId != null && !UUID_RE.test(l.billId)) {
      throw fail("MPESA_BILL_NOT_FOUND", `line ${i + 1}`);
    }
    if (type === "bill" && !l.billId) {
      throw fail("MPESA_INVALID_ALLOCATION", `line ${i + 1}: billId is required`);
    }
    if (type === "tip") {
      if (!l.recipientId) {
        throw fail("MPESA_INVALID_ALLOCATION", `line ${i + 1}: choose who the tip is for`);
      }
      if (!UUID_RE.test(l.recipientId)) throw fail("MPESA_TIP_RECIPIENT_NOT_FOUND", `line ${i + 1}`);
      return { type, bill_id: l.billId ?? null, recipient_id: l.recipientId, amount };
    }
    return { type, bill_id: l.billId ?? null, amount };
  });

  const billIds = lines.filter((l) => l.type === "bill").map((l) => l.bill_id);
  if (new Set(billIds).size !== billIds.length) {
    throw fail("MPESA_INVALID_ALLOCATION", "each bill may appear only once");
  }

  const depositLabel =
    typeof body.depositLabel === "string" && body.depositLabel.trim()
      ? body.depositLabel.trim().slice(0, 120)
      : null;

  if (!lines.length && !depositLabel) {
    throw fail("MPESA_INVALID_ALLOCATION", "nothing to allocate");
  }

  let result;
  try {
    result = await repo.allocate({ txnId: id, lines, userId: context.userId, depositLabel });
  } catch (err) {
    throw mapDbError(err);
  }

  await auditRepo.log({
    entity: "mpesa_transactions",
    entity_id: id,
    action: "MPESA_ALLOCATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { lines, depositLabel, receipt: result?.receipt },
  });

  return result;
};

exports.reverseAllocation = async (allocationId, body = {}, context) => {
  if (!UUID_RE.test(allocationId)) throw fail("MPESA_ALLOCATION_NOT_FOUND");
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) throw fail("MPESA_REVERSAL_REASON_REQUIRED");

  let result;
  try {
    result = await repo.reverseAllocation({ allocationId, userId: context.userId, reason });
  } catch (err) {
    throw mapDbError(err);
  }

  await auditRepo.log({
    entity: "mpesa_allocations",
    entity_id: allocationId,
    action: "MPESA_ALLOCATION_REVERSED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { reason, ...result },
  });

  return result;
};

/* ======================================================
   ERP (back office) — manage_mpesa
   ====================================================== */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayEAT = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());

const num = (v) => Number(v || 0);

/**
 * Register for a date range (EAT days, inclusive). Defaults to today.
 * Returns { items, totals } — totals cover the returned rows.
 */
exports.getRegister = async (query = {}, context) => {
  const from = query.from || todayEAT();
  const to = query.to || from;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    throw fail("MPESA_INVALID_FILTER", "from/to must be YYYY-MM-DD and from ≤ to");
  }
  const statuses = query.status ? STATUS_FILTERS[query.status] : null;
  if (query.status && !statuses) throw fail("MPESA_INVALID_FILTER", `unknown status ${query.status}`);

  const limit = Math.min(5000, Math.max(1, parseInt(query.limit, 10) || 2000));
  const rows = await repo.listRegister({ from, to, statuses, ...searchTerms(query.q), limit });

  const items = rows.map((r) => ({
    ...toDto(r, context),
    journaled: r.journaled,
    billsAmount: num(r.bills_amount),
    tipsAmount: num(r.tips_amount),
    billNames: r.bill_names,
    tipNames: r.tip_names,
    matchedBy: r.matched_by,
  }));

  const totals = items.reduce(
    (t, i) => {
      t.count += 1;
      t.received += i.amount;
      t.toBills += i.billsAmount;
      t.tips += i.tipsAmount;
      if (i.remaining > 0 && i.depositLabel) t.deposits += i.remaining;
      if (i.remaining > 0 && !i.depositLabel) t.unmatched += i.remaining;
      return t;
    },
    { count: 0, received: 0, toBills: 0, tips: 0, deposits: 0, unmatched: 0 },
  );
  Object.keys(totals).forEach((k) => (totals[k] = round2(totals[k])));

  return { from, to, items, totals, truncated: rows.length === limit };
};

/**
 * Balances at a glance:
 *  - 2300 breakdown (unmatched + deposits) vs the ledger, with the difference
 *    explained by notifications whose receipt journal failed to post
 *  - 2200 total vs tips owed per staff member
 */
exports.getSummary = async () => {
  const [open, gl, tips, payoutAccounts] = await Promise.all([
    repo.getOpenItems(),
    repo.getLiabilityBalances(),
    repo.listTipBalances(),
    repo.listPayoutAccounts(),
  ]);

  const unmatched = num(open.unmatched_amount);
  const deposits = num(open.deposit_amount);
  const unjournaled = num(open.unjournaled_amount);
  const clearingExpected = round2(unmatched + deposits - unjournaled);
  const tipsOwed = round2(tips.reduce((s, t) => s + num(t.outstanding), 0));

  return {
    clearing: {
      account: "2300",
      ledgerBalance: round2(gl["2300"] ?? 0),
      unmatched: { count: num(open.unmatched_count), amount: unmatched },
      deposits: { count: num(open.deposit_count), amount: deposits },
      unjournaled: { count: num(open.unjournaled_count), amount: unjournaled },
      difference: round2((gl["2300"] ?? 0) - clearingExpected),
      oldestOpenAt: open.oldest_at,
    },
    tips: {
      account: "2200",
      ledgerBalance: round2(gl["2200"] ?? 0),
      owed: tipsOwed,
      difference: round2((gl["2200"] ?? 0) - tipsOwed),
      staff: tips.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        active: t.active,
        accrued: num(t.accrued),
        tipCount: num(t.tip_count),
        paid: num(t.paid),
        outstanding: num(t.outstanding),
        lastTipAt: t.last_tip_at,
        lastPaidAt: t.last_paid_at,
      })),
    },
    payoutAccounts,
  };
};

exports.listPayouts = async (query = {}) => {
  if (query.recipientId && !UUID_RE.test(query.recipientId)) {
    throw fail("MPESA_TIP_RECIPIENT_NOT_FOUND");
  }
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 100));
  const rows = await repo.listPayouts({ recipientId: query.recipientId, limit });
  return rows.map((r) => ({
    id: r.id,
    recipientId: r.recipient_id,
    recipientName: r.recipient_name,
    amount: num(r.amount),
    accountCode: r.account_code,
    accountName: r.account_name,
    notes: r.notes,
    paidAt: r.paid_at,
    paidBy: r.paid_by_name,
  }));
};

/** body: { recipientId, amount, accountId, notes? } */
exports.payTips = async (body = {}, context) => {
  const { recipientId, accountId } = body;
  const amount = round2(body.amount);
  if (!UUID_RE.test(recipientId || "")) throw fail("MPESA_TIP_RECIPIENT_NOT_FOUND");
  if (!UUID_RE.test(accountId || "")) throw fail("MPESA_INVALID_PAYOUT", "choose the account to pay from");
  if (!(amount > 0)) throw fail("MPESA_INVALID_PAYOUT", "amount must be positive");
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 200) : null;

  let result;
  try {
    result = await repo.payTips({ recipientId, amount, accountId, userId: context.userId, notes });
  } catch (err) {
    throw mapDbError(err);
  }

  await auditRepo.log({
    entity: "mpesa_tip_payouts",
    entity_id: result.payout_id,
    action: "MPESA_TIPS_PAID",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { recipientId, amount, accountId, notes },
  });

  return result;
};

/** M-Pesa section of the Z-report for one day (YYYY-MM-DD). */
exports.getDaySummary = async (date) => {
  const { received, payments, openNow } = await repo.getDaySummary(date);
  return {
    received: {
      count: num(received.count),
      amount: num(received.amount),
      tips: num(received.tips),
      deposits: num(received.deposits),
      unmatched: num(received.unmatched),
      unmatchedCount: num(received.unmatched_count),
    },
    payments: {
      ipn: { count: num(payments.ipn_count), amount: num(payments.ipn_amount) },
      manual: { count: num(payments.manual_count), amount: num(payments.manual_amount) },
    },
    openNow: {
      unmatched: { count: num(openNow.unmatched_count), amount: num(openNow.unmatched_amount) },
      deposits: { count: num(openNow.deposit_count), amount: num(openNow.deposit_amount) },
    },
  };
};

exports._internal = { maskMsisdn, scoreMatch, toDto, normalizeMsisdn, searchTerms };
