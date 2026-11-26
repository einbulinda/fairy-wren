const pool = require("../../config/db");

const TXN_COLUMNS = `
  t.id, t.transaction_id, t.amount, t.allocated_amount, t.status,
  t.msisdn, t.first_name, t.middle_name, t.last_name, t.bill_reference,
  t.transaction_type, t.transaction_at, t.received_at,
  t.deposit_label, t.deposit_marked_at, t.receipt_journal_id,
  t.source, t.stk_request_id, t.duplicate_of, t.possible_duplicate_of`;

/**
 * WHERE fragment for free-text search: M-Pesa code, payer name (any part or
 * full name), customer reference, deposit label, or mobile number. `phone` is
 * the number normalised to KCB's 2547… form so "0712…", "712…" and "+254712…"
 * all match. Pushes its own params.
 */
function searchClause(q, phone, params) {
  params.push(`%${q}%`);
  const n = params.length;
  const parts = [
    `t.transaction_id ILIKE $${n}`,
    `concat_ws(' ', t.first_name, t.middle_name, t.last_name) ILIKE $${n}`,
    `t.msisdn ILIKE $${n}`,
    `t.bill_reference ILIKE $${n}`,
    `t.deposit_label ILIKE $${n}`,
  ];
  if (phone) {
    params.push(`%${phone}%`);
    parts.push(`t.msisdn LIKE $${params.length}`);
  }
  return `(${parts.join(" OR ")})`;
}

/**
 * @param {{ statuses: string[], from?: string, to?: string, q?: string, phone?: string, limit: number }} f
 */
exports.listTransactions = async ({ statuses, from, to, q, phone, limit }) => {
  const params = [statuses];
  // Possible duplicates of an STK payment wait for a manager (ERP), so a
  // cashier can't credit the same money twice.
  const where = ["t.status = ANY($1)", "t.possible_duplicate_of IS NULL"];

  if (from) {
    params.push(from);
    where.push(`t.transaction_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`t.transaction_at < $${params.length}::date + 1`);
  }
  if (q) where.push(searchClause(q, phone, params));
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT ${TXN_COLUMNS}
     FROM mpesa_transactions t
     WHERE ${where.join(" AND ")}
     ORDER BY t.transaction_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
};

exports.getTransaction = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${TXN_COLUMNS} FROM mpesa_transactions t WHERE t.id = $1`,
    [id],
  );
  return rows[0] || null;
};

exports.listAllocations = async (txnId) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.allocation_type, a.bill_id, b.customer_name, b.invoice_number, a.amount,
            a.tip_recipient_id, tr.name AS tip_recipient_name,
            a.allocated_at, ab.name AS allocated_by_name,
            a.reversed_at, rb.name AS reversed_by_name, a.reversal_reason
     FROM mpesa_allocations a
     LEFT JOIN bills b     ON b.id = a.bill_id
     LEFT JOIN profiles tr ON tr.id = a.tip_recipient_id
     LEFT JOIN profiles ab ON ab.id = a.allocated_by
     LEFT JOIN profiles rb ON rb.id = a.reversed_by
     WHERE a.mpesa_transaction_id = $1
     ORDER BY a.allocated_at`,
    [txnId],
  );
  return rows;
};

/** Bills that can still take a payment, with authoritative totals. */
exports.listPayableBills = async () => {
  const { rows } = await pool.query(
    `SELECT b.id, b.customer_name, b.invoice_number, b.status, b.created_at, b.updated_at,
            u.name AS created_by_name,
            bt.total, bt.amount_paid, bt.pending_amount, bt.payable_amount
     FROM bills b
     LEFT JOIN profiles u ON u.id = b.created_by
     CROSS JOIN LATERAL (SELECT * FROM bill_totals WHERE bill_id = b.id) bt
     WHERE b.status IN ('open', 'awaiting_confirmation')
       AND bt.payable_amount > 0
     ORDER BY b.updated_at DESC
     LIMIT 300`,
  );
  return rows;
};

exports.getPayableBill = async (billId) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.customer_name, b.invoice_number, b.status, b.updated_at, bt.payable_amount
     FROM bills b
     CROSS JOIN LATERAL (SELECT * FROM bill_totals WHERE bill_id = b.id) bt
     WHERE b.id = $1`,
    [billId],
  );
  return rows[0] || null;
};

exports.allocate = async ({ txnId, lines, userId, depositLabel }) => {
  const { rows } = await pool.query(
    "SELECT allocate_mpesa_transaction($1, $2::jsonb, $3, $4) AS result",
    [txnId, JSON.stringify(lines), userId, depositLabel ?? null],
  );
  return rows[0].result;
};

exports.reverseAllocation = async ({ allocationId, userId, reason }) => {
  const { rows } = await pool.query(
    "SELECT reverse_mpesa_allocation($1, $2, $3) AS result",
    [allocationId, userId, reason],
  );
  return rows[0].result;
};

/** Roles a tip can be given to. Keep in sync with allocate_mpesa_transaction (SQL). */
const TIP_ROLES = ["supervisor", "bartender", "manager", "waitress"];

/** Active staff a tip can be given to (no PIN data). */
exports.listStaff = async () => {
  const { rows } = await pool.query(
    `SELECT id, name, role
     FROM profiles
     WHERE COALESCE(active, true)
       AND role = ANY($1)
     ORDER BY name`,
    [TIP_ROLES],
  );
  return rows;
};

exports.billHasActiveAllocations = async (billId) => {
  const { rows } = await pool.query(
    `SELECT 1 FROM mpesa_allocations
     WHERE bill_id = $1 AND allocation_type = 'bill' AND reversed_at IS NULL
     LIMIT 1`,
    [billId],
  );
  return rows.length > 0;
};

/* ======================================================
   ERP (back office)
   ====================================================== */

const EAT_DATE = "(t.transaction_at AT TIME ZONE 'Africa/Nairobi')::date";

/**
 * Register: notifications in a date range (EAT calendar days) with what each
 * was matched to. Active (non-reversed) allocations only in the aggregates.
 */
exports.listRegister = async ({ from, to, statuses, q, phone, limit }) => {
  const params = [from, to];
  const where = [`${EAT_DATE} BETWEEN $1::date AND $2::date`];
  if (statuses) {
    params.push(statuses);
    where.push(`t.status = ANY($${params.length})`);
  } else {
    where.push(`t.status <> 'linked'`); // IPN copies of STK payments: not money
  }
  if (q) where.push(searchClause(q, phone, params));
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT ${TXN_COLUMNS},
            (t.receipt_journal_id IS NOT NULL) AS journaled,
            COALESCE(a.bills_amount, 0) AS bills_amount,
            COALESCE(a.tips_amount, 0)  AS tips_amount,
            a.bill_names, a.tip_names, a.matched_by
     FROM mpesa_transactions t
     LEFT JOIN LATERAL (
        SELECT SUM(al.amount) FILTER (WHERE al.allocation_type = 'bill') AS bills_amount,
               SUM(al.amount) FILTER (WHERE al.allocation_type = 'tip')  AS tips_amount,
               string_agg(DISTINCT b.customer_name || ' (' || b.invoice_number || ')', ', ') AS bill_names,
               string_agg(DISTINCT tr.name, ', ')         AS tip_names,
               string_agg(DISTINCT COALESCE(ab.name, 'Automatic'), ', ') AS matched_by
        FROM mpesa_allocations al
        LEFT JOIN bills b     ON b.id = al.bill_id AND al.allocation_type = 'bill'
        LEFT JOIN profiles tr ON tr.id = al.tip_recipient_id
        LEFT JOIN profiles ab ON ab.id = al.allocated_by
        WHERE al.mpesa_transaction_id = t.id AND al.reversed_at IS NULL
     ) a ON true
     WHERE ${where.join(" AND ")}
     ORDER BY t.transaction_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
};

/** Current open items: unmatched money and deposits (whatever is still left on notifications). */
exports.getOpenItems = async () => {
  const { rows } = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE deposit_label IS NULL)                         AS unmatched_count,
        COALESCE(SUM(amount - allocated_amount) FILTER (WHERE deposit_label IS NULL), 0)     AS unmatched_amount,
        COUNT(*) FILTER (WHERE deposit_label IS NOT NULL)                     AS deposit_count,
        COALESCE(SUM(amount - allocated_amount) FILTER (WHERE deposit_label IS NOT NULL), 0) AS deposit_amount,
        COUNT(*) FILTER (WHERE receipt_journal_id IS NULL)                    AS unjournaled_count,
        COALESCE(SUM(amount - allocated_amount) FILTER (WHERE receipt_journal_id IS NULL), 0) AS unjournaled_amount,
        MIN(transaction_at)                                                   AS oldest_at
     FROM mpesa_transactions
     WHERE status IN ('unallocated', 'partially_allocated')`,
  );
  return rows[0];
};

/** Ledger balances (credit − debit) of the clearing and tips accounts. */
exports.getLiabilityBalances = async () => {
  const { rows } = await pool.query(
    `SELECT a.code, COALESCE(SUM(jl.credit - jl.debit), 0) AS balance
     FROM chart_of_accounts a
     LEFT JOIN journal_lines jl ON jl.account_id = a.id
     WHERE a.code IN ('2200', '2300')
     GROUP BY a.code`,
  );
  return Object.fromEntries(rows.map((r) => [r.code, Number(r.balance)]));
};

/** Per staff member: tips accrued, paid out, still owed. Anyone with any tip activity. */
exports.listTipBalances = async () => {
  const { rows } = await pool.query(
    `WITH accrued AS (
        SELECT tip_recipient_id AS id, SUM(amount) AS amount, COUNT(*) AS tips, MAX(allocated_at) AS last_tip_at
        FROM mpesa_allocations
        WHERE allocation_type = 'tip' AND reversed_at IS NULL AND tip_recipient_id IS NOT NULL
        GROUP BY tip_recipient_id
     ), paid AS (
        SELECT recipient_id AS id, SUM(amount) AS amount, MAX(paid_at) AS last_paid_at
        FROM mpesa_tip_payouts
        GROUP BY recipient_id
     )
     SELECT p.id, p.name, p.role, p.active,
            COALESCE(ac.amount, 0) AS accrued,
            COALESCE(ac.tips, 0)   AS tip_count,
            COALESCE(pd.amount, 0) AS paid,
            COALESCE(ac.amount, 0) - COALESCE(pd.amount, 0) AS outstanding,
            ac.last_tip_at, pd.last_paid_at
     FROM profiles p
     JOIN (SELECT id FROM accrued UNION SELECT id FROM paid) ids ON ids.id = p.id
     LEFT JOIN accrued ac ON ac.id = p.id
     LEFT JOIN paid pd    ON pd.id = p.id
     ORDER BY outstanding DESC, p.name`,
  );
  return rows;
};

/** Leaf, active cash/bank accounts tips can be paid from. */
exports.listPayoutAccounts = async () => {
  const { rows } = await pool.query(
    `SELECT a.id, a.code, a.name
     FROM chart_of_accounts a
     WHERE a.account_class = 'bank'
       AND COALESCE(a.active, true)
       AND NOT EXISTS (SELECT 1 FROM chart_of_accounts ch WHERE ch.parent_id = a.id)
     ORDER BY a.code`,
  );
  return rows;
};

exports.listPayouts = async ({ recipientId, limit }) => {
  const params = [limit];
  let where = "";
  if (recipientId) {
    params.push(recipientId);
    where = `WHERE po.recipient_id = $2`;
  }
  const { rows } = await pool.query(
    `SELECT po.id, po.recipient_id, r.name AS recipient_name, po.amount,
            a.code AS account_code, a.name AS account_name,
            po.notes, po.paid_at, pb.name AS paid_by_name
     FROM mpesa_tip_payouts po
     JOIN profiles r           ON r.id = po.recipient_id
     JOIN chart_of_accounts a  ON a.id = po.paid_from_account
     LEFT JOIN profiles pb     ON pb.id = po.paid_by
     ${where}
     ORDER BY po.paid_at DESC
     LIMIT $1`,
    params,
  );
  return rows;
};

exports.payTips = async ({ recipientId, amount, accountId, userId, notes }) => {
  const { rows } = await pool.query(
    "SELECT pay_mpesa_tips($1, $2, $3, $4, $5) AS result",
    [recipientId, amount, accountId, userId, notes ?? null],
  );
  return rows[0].result;
};

/**
 * Z-report section for one EAT calendar day.
 * - received: notifications that arrived that day and what became of them (current state)
 * - payments: confirmed M-Pesa payments on that day's bills, IPN-backed vs typed manually
 * - openNow: everything still unmatched / on deposit right now (any day)
 */
exports.getDaySummary = async (date) => {
  const [received, payments, openNow] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(t.amount), 0) AS amount,
              COALESCE(SUM(t.amount - t.allocated_amount) FILTER (WHERE t.deposit_label IS NULL), 0) AS unmatched,
              COUNT(*) FILTER (WHERE t.status <> 'allocated' AND t.deposit_label IS NULL) AS unmatched_count,
              COALESCE(SUM(t.amount - t.allocated_amount) FILTER (WHERE t.deposit_label IS NOT NULL), 0) AS deposits,
              COALESCE((SELECT SUM(al.amount) FROM mpesa_allocations al
                        JOIN mpesa_transactions t2 ON t2.id = al.mpesa_transaction_id
                        WHERE al.allocation_type = 'tip' AND al.reversed_at IS NULL
                          AND (t2.transaction_at AT TIME ZONE 'Africa/Nairobi')::date = $1::date), 0) AS tips
       FROM mpesa_transactions t
       WHERE ${EAT_DATE} = $1::date
         AND t.status <> 'linked'`,
      [date],
    ),
    pool.query(
      `SELECT COALESCE(SUM(p.amount) FILTER (WHERE ipn.payment_id IS NOT NULL), 0) AS ipn_amount,
              COUNT(*) FILTER (WHERE ipn.payment_id IS NOT NULL)                   AS ipn_count,
              COALESCE(SUM(p.amount) FILTER (WHERE ipn.payment_id IS NULL), 0)     AS manual_amount,
              COUNT(*) FILTER (WHERE ipn.payment_id IS NULL)                       AS manual_count
       FROM payments p
       JOIN bills b ON b.id = p.bill_id
       LEFT JOIN (SELECT DISTINCT payment_id FROM mpesa_allocations
                  WHERE payment_id IS NOT NULL AND reversed_at IS NULL) ipn ON ipn.payment_id = p.id
       WHERE b.created_at::date = $1::date
         AND p.payment_type = 'mpesa'
         AND p.status = 'confirmed'`,
      [date],
    ),
    exports.getOpenItems(),
  ]);
  return { received: received.rows[0], payments: payments.rows[0], openNow };
};
