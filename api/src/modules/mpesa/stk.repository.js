const pool = require("../../config/db");

const COLUMNS = `
  r.id, r.bill_id, r.requested_by, r.phone, r.amount, r.account_ref,
  r.merchant_request_id, r.checkout_request_id, r.status, r.result_code,
  r.result_desc, r.mpesa_receipt, r.paid_amount, r.paid_at, r.paid_via,
  r.mpesa_transaction_id, r.problem, r.created_at, r.updated_at,
  b.customer_name AS bill_name, p.name AS requested_by_name`;

const FROM = `
  FROM mpesa_stk_requests r
  LEFT JOIN bills b    ON b.id = r.bill_id
  LEFT JOIN profiles p ON p.id = r.requested_by`;

exports.getRequest = async (id) => {
  const { rows } = await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE r.id = $1`, [id]);
  return rows[0] || null;
};

exports.getByTokenHash = async (hash) => {
  const { rows } = await pool.query(
    `SELECT id, phone, amount, status, merchant_request_id
     FROM mpesa_stk_requests WHERE callback_token_hash = $1`,
    [hash],
  );
  return rows[0] || null;
};

exports.listForBill = async (billId, limit = 10) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM} WHERE r.bill_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
    [billId, limit],
  );
  return rows;
};

/** Seconds since the last prompt for this bill, and whether one is in flight. */
exports.getBillPromptState = async (billId) => {
  const { rows } = await pool.query(
    `SELECT EXTRACT(EPOCH FROM now() - MAX(created_at))::int AS seconds_since_last,
            BOOL_OR(status IN ('pending', 'waiting'))      AS active
     FROM mpesa_stk_requests WHERE bill_id = $1`,
    [billId],
  );
  return rows[0];
};

/**
 * Create the prompt row. Its account reference is the bill's invoice number
 * (printed on the receipt), so it shows on the customer's M-Pesa SMS.
 * @returns {Promise<{ id:string, account_ref:string }>}
 */
exports.createRequest = async ({ billId, userId, phone, amount, tokenHash }) => {
  const { rows } = await pool.query(
    `INSERT INTO mpesa_stk_requests (bill_id, requested_by, phone, amount, account_ref, callback_token_hash)
     SELECT $1, $2, $3, $4, b.invoice_number, $5 FROM bills b WHERE b.id = $1
     RETURNING id, account_ref`,
    [billId, userId, phone, amount, tokenHash],
  );
  return rows[0];
};

exports.markSent = async (id, { merchantRequestId, checkoutRequestId, statusMessage, request, response }) => {
  await pool.query(
    `UPDATE mpesa_stk_requests
     SET status = CASE WHEN status = 'pending' THEN 'waiting' ELSE status END,
         merchant_request_id = COALESCE(merchant_request_id, $2),
         checkout_request_id = COALESCE(checkout_request_id, $3),
         result_desc = COALESCE(result_desc, $4),
         raw_request = $5::jsonb, raw_response = $6::jsonb, updated_at = now()
     WHERE id = $1`,
    [id, merchantRequestId, checkoutRequestId, statusMessage,
     JSON.stringify(request ?? null), JSON.stringify(response ?? null)],
  );
};

/** KCB answered "no" (or could not be reached): the prompt was not sent. */
exports.markRequestFailed = async (id, { desc, request, response }) => {
  await pool.query(
    `UPDATE mpesa_stk_requests
     SET status = 'request_failed', result_desc = $2,
         raw_request = $3::jsonb, raw_response = $4::jsonb, updated_at = now()
     WHERE id = $1 AND status = 'pending'`,
    [id, desc, JSON.stringify(request ?? null), JSON.stringify(response ?? null)],
  );
};

/** We don't know whether KCB sent the prompt (timeout): wait for a callback. */
exports.markUnconfirmed = async (id, desc) => {
  await pool.query(
    `UPDATE mpesa_stk_requests
     SET status = CASE WHEN status = 'pending' THEN 'waiting' ELSE status END,
         result_desc = COALESCE(result_desc, $2), updated_at = now()
     WHERE id = $1`,
    [id, desc],
  );
};

exports.applyCallback = async (p) => {
  const { rows } = await pool.query(
    `SELECT apply_mpesa_stk_callback($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) AS result`,
    [p.requestId, p.merchantRequestId, p.checkoutRequestId, p.resultCode, p.resultDesc,
     p.receipt, p.amount, p.phone, p.paidAt, JSON.stringify(p.raw)],
  );
  return rows[0].result;
};

exports.linkIpn = async (txnId) => {
  const { rows } = await pool.query("SELECT link_mpesa_ipn_to_stk($1) AS result", [txnId]);
  return rows[0].result;
};

exports.expireStale = async (afterSeconds) => {
  const { rows } = await pool.query(
    "SELECT expire_mpesa_stk_requests(make_interval(secs => $1)) AS count",
    [afterSeconds],
  );
  return rows[0].count;
};
