const pool = require("../../../config/db");

/*----------- RECEIVE INVENTORY ----------*/
exports.receiveInventory = async (payload, userId) => {
  const {
    supplier_id,
    invoice_number,
    purchase_date,
    total_amount,
    line_items,
  } = payload;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM receive_inventory($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        supplier_id,
        invoice_number,
        purchase_date,
        total_amount,
        userId,
        JSON.stringify(line_items),
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
        json_build_object('id', s.id, 'name', s.name) AS supplier
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       WHERE ir.id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
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
