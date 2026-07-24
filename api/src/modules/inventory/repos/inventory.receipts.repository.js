const pool = require("../../../config/db");

/*----------- RECEIVE INVENTORY ----------*/
exports.receiveInventory = async (payload, userId, approvalStatus = "approved") => {
  const {
    supplier_id,
    invoice_number,
    purchase_date,
    total_amount,
    line_items,
  } = payload;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM receive_inventory($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        supplier_id,
        invoice_number,
        purchase_date,
        total_amount,
        userId,
        JSON.stringify(line_items),
        approvalStatus,
      ],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    console.error("receive_inventory RPC error:", error);
    throw new Error("FAILED_TO_RECEIVE_INVENTORY");
  }
};

/* ---------- RECEIPT DETAIL (READ) ---------- */
exports.getReceiptById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.id,
        ir.invoice_number,
        ir.purchase_date,
        ir.total_amount,
        ir.status,
        ir.approval_status,
        ir.approved_by,
        ir.approved_at,
        ir.rejection_reason,
        ir.paid_at,
        ir.notes,
        ir.created_at,
        ir.supplier_id,
        (
          SELECT json_agg(
            json_build_object(
              'id', iri.id,
              'product_id', iri.product_id,
              'quantity', iri.quantity,
              'unit_cost', iri.unit_cost,
              'line_total', iri.line_total,
              'products', json_build_object('id', p.id, 'name', p.name, 'unit', p.unit)
            )
          )
          FROM inventory_receipt_items iri
          LEFT JOIN products p ON p.id = iri.product_id
          WHERE iri.receipt_id = ir.id
        ) AS inventory_receipt_items,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        json_build_object('id', u.id, 'name', u.name) AS created_by_user
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       LEFT JOIN profiles u ON u.id = ir.created_by
       WHERE ir.id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- LIST ALL RECEIPTS ---------- */
exports.getAllReceipts = async ({ limit = 50, offset = 0 } = {}) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.id,
        ir.invoice_number,
        ir.purchase_date,
        ir.total_amount,
        ir.status,
        ir.approval_status,
        ir.paid_at,
        ir.created_at,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        json_build_object('id', u.id, 'name', u.name) AS submitted_by,
        (SELECT COUNT(*) FROM inventory_receipt_items WHERE receipt_id = ir.id) AS item_count
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       LEFT JOIN profiles u ON u.id = ir.created_by
       ORDER BY ir.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- LIST RECEIPTS SUBMITTED BY A USER ---------- */
exports.getReceiptsByUser = async (userId, { limit = 50, offset = 0 } = {}) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.id,
        ir.invoice_number,
        ir.purchase_date,
        ir.total_amount,
        ir.status,
        ir.approval_status,
        ir.rejection_reason,
        ir.paid_at,
        ir.created_at,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        (SELECT COUNT(*) FROM inventory_receipt_items WHERE receipt_id = ir.id) AS item_count
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       WHERE ir.created_by = $1
       ORDER BY ir.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- LIST PENDING RECEIPTS ---------- */
exports.getPendingReceipts = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.id,
        ir.invoice_number,
        ir.purchase_date,
        ir.total_amount,
        ir.approval_status,
        ir.created_at,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        json_build_object('id', u.id, 'name', u.name) AS submitted_by,
        (SELECT COUNT(*) FROM inventory_receipt_items WHERE receipt_id = ir.id) AS item_count
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       LEFT JOIN profiles u ON u.id = ir.created_by
       WHERE ir.approval_status = 'pending'
       ORDER BY ir.created_at DESC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- APPROVE RECEIPT ---------- */
exports.approveReceipt = async (id, approverId) => {
  try {
    await pool.query(
      `SELECT approve_inventory_receipt($1, $2)`,
      [id, approverId],
    );
    return { data: { id }, error: null };
  } catch (error) {
    if (error.message?.includes("RECEIPT_NOT_FOUND")) throw new Error("RECEIPT_NOT_FOUND");
    if (error.message?.includes("RECEIPT_NOT_PENDING")) throw new Error("RECEIPT_NOT_PENDING");
    throw error;
  }
};

/* ---------- REJECT RECEIPT ---------- */
exports.rejectReceipt = async (id, rejectorId, reason) => {
  try {
    await pool.query(
      `SELECT reject_inventory_receipt($1, $2, $3)`,
      [id, rejectorId, reason || null],
    );
    return { data: { id }, error: null };
  } catch (error) {
    if (error.message?.includes("RECEIPT_NOT_FOUND")) throw new Error("RECEIPT_NOT_FOUND");
    if (error.message?.includes("RECEIPT_NOT_PENDING")) throw new Error("RECEIPT_NOT_PENDING");
    throw error;
  }
};

/* ---------- CANCEL RECEIPT ---------- */
exports.cancelReceipt = async (id, userId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE inventory_receipts
       SET status = 'cancelled', updated_at = NOW(), updated_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, userId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- MARK RECEIPT PAID ---------- */
exports.markReceiptPaid = async (id) => {
  try {
    const { rows } = await pool.query(
      `UPDATE inventory_receipts
       SET paid_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
