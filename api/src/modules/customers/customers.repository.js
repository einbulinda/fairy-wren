const pool = require("../../config/db");

// ── Accounts (confirmed customer records) ──────────────────────────────────

exports.listAccounts = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`c.name ILIKE $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `
    SELECT
      c.id, c.name, c.phone, c.email, c.notes, c.created_at,
      COUNT(b.id) FILTER (WHERE b.status <> 'void')::int               AS total_bills,
      COUNT(b.id) FILTER (WHERE b.status IN ('open','awaiting_confirmation'))::int AS open_bills,
      COALESCE(SUM(bt.total)      FILTER (WHERE b.status <> 'void'), 0) AS total_billed,
      COALESCE(SUM(bt.amount_paid) FILTER (WHERE b.status <> 'void'), 0) AS total_paid,
      COALESCE(SUM(bt.balance_due) FILTER (WHERE b.status <> 'void'), 0) AS balance_due,
      MAX(b.created_at) FILTER (WHERE b.status <> 'void')              AS last_visit
    FROM customers c
    LEFT JOIN bills b ON b.customer_id = c.id
    LEFT JOIN bill_totals bt ON bt.bill_id = b.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY balance_due DESC, last_visit DESC NULLS LAST
    `,
    params
  );
  return rows;
};

exports.findAccountById = async (id) => {
  const { rows } = await pool.query(
    `SELECT c.*,
       COUNT(b.id) FILTER (WHERE b.status <> 'void')::int             AS total_bills,
       COALESCE(SUM(bt.total)       FILTER (WHERE b.status <> 'void'), 0) AS total_billed,
       COALESCE(SUM(bt.amount_paid) FILTER (WHERE b.status <> 'void'), 0) AS total_paid,
       COALESCE(SUM(bt.balance_due) FILTER (WHERE b.status <> 'void'), 0) AS balance_due
     FROM customers c
     LEFT JOIN bills b ON b.customer_id = c.id
     LEFT JOIN bill_totals bt ON bt.bill_id = b.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
};

exports.createAccount = async ({ name, phone, email, notes }) => {
  const { rows } = await pool.query(
    `INSERT INTO customers (name, phone, email, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, phone || null, email || null, notes || null]
  );
  return rows[0];
};

exports.updateAccount = async (id, { name, phone, email, notes }) => {
  const { rows } = await pool.query(
    `UPDATE customers
     SET name = COALESCE($2, name),
         phone = $3,
         email = $4,
         notes = $5,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, name || null, phone ?? null, email ?? null, notes ?? null]
  );
  return rows[0] || null;
};

exports.deleteAccount = async (id) => {
  // Unlink bills before deletion
  await pool.query(`UPDATE bills SET customer_id = NULL WHERE customer_id = $1`, [id]);
  await pool.query(`DELETE FROM customers WHERE id = $1`, [id]);
};

// ── Bills for a confirmed account ─────────────────────────────────────────

exports.getAccountBills = async (customerId, filters = {}) => {
  const params = [customerId];
  const conditions = ["b.customer_id = $1", "b.status <> 'void'"];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`b.status = $${params.length}`);
  }

  const { rows } = await pool.query(
    `
    SELECT
      b.id, b.customer_name, b.status, b.created_at,
      json_build_object('id', p.id, 'name', p.name) AS created_by_user,
      bt.total AS total_amount, bt.amount_paid AS total_paid, bt.balance_due,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', r.id, 'round_number', r.round_number,
          'round_items', (
            SELECT COALESCE(json_agg(json_build_object(
              'id', ri.id, 'quantity', ri.quantity, 'price', ri.price,
              'is_return', ri.is_return,
              'product', json_build_object('id', pr.id, 'name', pr.name)
            )), '[]'::json)
            FROM round_items ri JOIN products pr ON pr.id = ri.product_id WHERE ri.round_id = r.id
          )
        )), '[]'::json)
        FROM rounds r WHERE r.bill_id = b.id
      ) AS rounds,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', pay.id, 'amount', pay.amount,
          'payment_type', pay.payment_type, 'created_at', pay.created_at
        )), '[]'::json)
        FROM payments pay WHERE pay.bill_id = b.id
      ) AS payments
    FROM bills b
    JOIN profiles p ON p.id = b.created_by
    JOIN bill_totals bt ON bt.bill_id = b.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY b.created_at DESC
    `,
    params
  );
  return rows;
};

// ── Discovery: unlinked names ──────────────────────────────────────────────

exports.listUnlinkedNames = async (filters = {}) => {
  const conditions = [
    "b.customer_name IS NOT NULL",
    "b.customer_name <> ''",
    "b.status IN ('open', 'awaiting_confirmation')",
    "b.customer_id IS NULL",
  ];
  const params = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`b.customer_name ILIKE $${params.length}`);
  }

  const { rows } = await pool.query(
    `
    SELECT
      b.customer_name                                       AS name,
      COUNT(b.id)::int                                      AS bill_count,
      COALESCE(SUM(bt.total), 0)                            AS total_billed,
      COALESCE(SUM(bt.balance_due), 0)                      AS balance_due,
      MIN(b.created_at)                                     AS first_visit,
      MAX(b.created_at)                                     AS last_visit
    FROM bills b
    JOIN bill_totals bt ON bt.bill_id = b.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY b.customer_name
    HAVING COUNT(b.id) >= 1
    ORDER BY COUNT(b.id) DESC, balance_due DESC
    `,
    params
  );
  return rows;
};

// ── Linking bills to an account ────────────────────────────────────────────

exports.linkNameToAccount = async (customerId, customerName) => {
  const { rowCount } = await pool.query(
    `UPDATE bills
     SET customer_id = $1
     WHERE customer_name = $2
       AND customer_id IS NULL
       AND status <> 'void'`,
    [customerId, customerName]
  );
  return rowCount;
};

exports.unlinkBill = async (billId) => {
  await pool.query(`UPDATE bills SET customer_id = NULL WHERE id = $1`, [billId]);
};

exports.listUnlinkedBillsForName = async (name) => {
  const { rows } = await pool.query(
    `
    SELECT
      b.id, b.customer_name, b.status, b.created_at,
      json_build_object('id', p.id, 'name', p.name) AS created_by_user,
      bt.total AS total_amount, bt.balance_due,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', r.id, 'round_number', r.round_number,
          'round_items', (
            SELECT COALESCE(json_agg(json_build_object(
              'id', ri.id, 'quantity', ri.quantity, 'price', ri.price,
              'product', json_build_object('id', pr.id, 'name', pr.name)
            )), '[]'::json)
            FROM round_items ri JOIN products pr ON pr.id = ri.product_id WHERE ri.round_id = r.id
          )
        )), '[]'::json)
        FROM rounds r WHERE r.bill_id = b.id
      ) AS rounds
    FROM bills b
    JOIN profiles p ON p.id = b.created_by
    JOIN bill_totals bt ON bt.bill_id = b.id
    WHERE b.customer_name = $1
      AND b.status IN ('open', 'awaiting_confirmation')
      AND b.customer_id IS NULL
    ORDER BY b.created_at DESC
    `,
    [name]
  );
  return rows;
};

exports.linkBillsByIds = async (customerId, billIds) => {
  if (!billIds || billIds.length === 0) return 0;
  const { rowCount } = await pool.query(
    `UPDATE bills
     SET customer_id = $1
     WHERE id = ANY($2::uuid[])
       AND customer_id IS NULL`,
    [customerId, billIds]
  );
  return rowCount;
};
