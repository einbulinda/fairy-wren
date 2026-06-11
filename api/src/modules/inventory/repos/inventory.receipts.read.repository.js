const pool = require("../../../config/db");

/* ---------- READ RECEIPTS ---------- */
exports.listReceipts = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.*,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        (
          SELECT json_agg(
            json_build_object(
              'id', iri.id,
              'product_id', iri.product_id,
              'quantity', iri.quantity,
              'unit_cost', iri.unit_cost,
              'line_total', iri.line_total,
              'product', json_build_object('id', p.id, 'name', p.name)
            )
          )
          FROM inventory_receipt_items iri
          LEFT JOIN products p ON p.id = iri.product_id
          WHERE iri.receipt_id = ir.id
        ) AS items
       FROM inventory_receipts ir
       LEFT JOIN suppliers s ON s.id = ir.supplier_id
       ORDER BY ir.created_at DESC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getReceiptById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        ir.*,
        json_build_object('id', s.id, 'name', s.name) AS supplier,
        (
          SELECT json_agg(
            json_build_object(
              'id', iri.id,
              'product_id', iri.product_id,
              'quantity', iri.quantity,
              'unit_cost', iri.unit_cost,
              'line_total', iri.line_total,
              'product', json_build_object('id', p.id, 'name', p.name)
            )
          )
          FROM inventory_receipt_items iri
          LEFT JOIN products p ON p.id = iri.product_id
          WHERE iri.receipt_id = ir.id
        ) AS items
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
