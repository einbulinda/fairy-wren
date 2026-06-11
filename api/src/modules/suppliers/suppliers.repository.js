const pool = require("../../config/db");

exports.findAll = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM suppliers ORDER BY name DESC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM suppliers WHERE id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.create = async (payload) => {
  try {
    const cols = Object.keys(payload);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO suppliers (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      Object.values(payload),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.update = async (id, payload) => {
  try {
    const entries = Object.entries(payload);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE suppliers SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.archive = async (id, active) => {
  try {
    const entries = Object.entries(active);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE suppliers SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findPurchases = async (supplierId) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, invoice_number, purchase_date, total_amount, amount_paid, status, paid_at, notes
       FROM inventory_receipts
       WHERE supplier_id = $1
       ORDER BY purchase_date DESC`,
      [supplierId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findPayments = async (supplierId) => {
  try {
    const { rows } = await pool.query(
      `SELECT sp.*,
              json_build_object('name', coa.name, 'code', coa.code) AS chart_of_accounts
       FROM supplier_payments sp
       LEFT JOIN chart_of_accounts coa ON coa.id = sp.account_id
       WHERE sp.supplier_id = $1
       ORDER BY sp.payment_date DESC`,
      [supplierId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.createPayment = async (payload) => {
  try {
    const cols = Object.keys(payload);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO supplier_payments (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      Object.values(payload),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.deletePaymentByJournalId = async (journalEntryId) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM supplier_payments WHERE journal_entry_id = $1 RETURNING *`,
      [journalEntryId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findPendingInvoices = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT ir.id, ir.invoice_number, ir.purchase_date, ir.total_amount, ir.amount_paid,
              ir.status, ir.paid_at, ir.notes, ir.supplier_id,
              json_build_object('id', s.id, 'name', s.name) AS suppliers
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       WHERE ir.paid_at IS NULL
         AND ir.status != $1
       ORDER BY ir.purchase_date ASC`,
      ["cancelled"],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findUnpaidInvoices = async (supplierId) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, invoice_number, purchase_date, total_amount, amount_paid
       FROM inventory_receipts
       WHERE supplier_id = $1
         AND paid_at IS NULL
         AND status != $2
       ORDER BY purchase_date ASC`,
      [supplierId, "cancelled"],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.createPaymentAllocations = async (allocations) => {
  try {
    if (!allocations || !allocations.length) return { data: [], error: null };
    const cols = Object.keys(allocations[0]);
    const placeholders = allocations
      .map(
        (_, rowIdx) =>
          `(${cols.map((_, colIdx) => `$${rowIdx * cols.length + colIdx + 1}`).join(", ")})`,
      )
      .join(", ");
    const values = allocations.flatMap((row) => cols.map((col) => row[col]));
    const { rows } = await pool.query(
      `INSERT INTO supplier_payment_allocations (${cols.join(", ")}) VALUES ${placeholders} RETURNING *`,
      values,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateInvoiceAmountPaid = async (invoiceId, amountPaid, totalAmount) => {
  try {
    const update = { amount_paid: amountPaid };
    if (amountPaid >= totalAmount) {
      update.paid_at = new Date().toISOString();
    }
    const entries = Object.entries(update);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE inventory_receipts SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), invoiceId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findAllBalances = async () => {
  try {
    const [{ rows: purchases }, { rows: payments }] = await Promise.all([
      pool.query(`SELECT supplier_id, total_amount FROM inventory_receipts`),
      pool.query(`SELECT supplier_id, amount FROM supplier_payments`),
    ]);

    const map = {};
    for (const p of purchases) {
      if (!map[p.supplier_id])
        map[p.supplier_id] = { total_purchased: 0, total_paid: 0 };
      map[p.supplier_id].total_purchased += Number(p.total_amount || 0);
    }
    for (const p of payments) {
      if (!map[p.supplier_id])
        map[p.supplier_id] = { total_purchased: 0, total_paid: 0 };
      map[p.supplier_id].total_paid += Number(p.amount || 0);
    }

    const data = Object.entries(map).map(
      ([supplier_id, { total_purchased, total_paid }]) => ({
        supplier_id,
        total_purchased,
        total_paid,
        balance_due: total_purchased - total_paid,
      }),
    );
    return data;
  } catch (error) {
    return [];
  }
};

exports.findInvoiceById = async (invoiceId) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total_amount, amount_paid FROM inventory_receipts WHERE id = $1`,
      [invoiceId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findStatement = async (supplierId, startDate, endDate) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rpc_supplier_statement($1, $2, $3)`,
      [supplierId, startDate || null, endDate || null],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
