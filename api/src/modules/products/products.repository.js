const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filters.active !== undefined) {
      values.push(filters.active);
      conditions.push(`active = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM products ${where} ORDER BY name`,
      values,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, json_build_object('id', c.id, 'name', c.name) AS categories
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
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
      `INSERT INTO products (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
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
      `UPDATE products SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.archive = async (id) => {
  try {
    const { rows } = await pool.query(
      `UPDATE products SET active = false WHERE id = $1 RETURNING *`,
      [id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findPurchaseHistory = async (productId, { from, to } = {}) => {
  try {
    const hasDateFilter = from || to;
    const joinType = hasDateFilter ? "INNER JOIN" : "LEFT JOIN";

    const conditions = ["iri.product_id = $1"];
    const values = [productId];

    if (from) {
      values.push(from);
      conditions.push(`ir.purchase_date >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      conditions.push(`ir.purchase_date <= $${values.length}`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows: items } = await pool.query(
      `SELECT
         iri.id, iri.quantity, iri.unit_cost, iri.line_total, iri.created_at,
         ir.id              AS ir_id,
         ir.invoice_number  AS ir_invoice_number,
         ir.purchase_date   AS ir_purchase_date,
         ir.status          AS ir_status,
         ir.paid_at         AS ir_paid_at,
         ir.supplier_id     AS ir_supplier_id
       FROM inventory_receipt_items iri
       ${joinType} inventory_receipts ir ON ir.id = iri.receipt_id
       ${where}
       ORDER BY iri.created_at DESC`,
      values,
    );

    if (!items.length) return { data: [], error: null };

    const supplierIds = [
      ...new Set(items.map((i) => i.ir_supplier_id).filter(Boolean)),
    ];

    let supplierMap = {};
    if (supplierIds.length) {
      const { rows: suppliers } = await pool.query(
        `SELECT id, name FROM suppliers WHERE id = ANY($1::uuid[])`,
        [supplierIds],
      );
      supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));
    }

    const data = items.map((item) => {
      const receipt = item.ir_id
        ? {
            id: item.ir_id,
            invoice_number: item.ir_invoice_number,
            purchase_date: item.ir_purchase_date,
            status: item.ir_status,
            paid_at: item.ir_paid_at,
            supplier_id: item.ir_supplier_id,
            suppliers: supplierMap[item.ir_supplier_id] || null,
          }
        : null;

      return {
        id: item.id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.line_total,
        created_at: item.created_at,
        inventory_receipts: receipt,
      };
    });

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findSalesHistory = async (productId, { from, to } = {}) => {
  try {
    const hasDateFilter = from || to;
    const joinType = hasDateFilter ? "INNER JOIN" : "LEFT JOIN";

    const conditions = ["ri.product_id = $1"];
    const values = [productId];

    if (from) {
      values.push(from);
      conditions.push(`r.created_at >= $${values.length}`);
    }
    if (to) {
      values.push(`${to}T23:59:59`);
      conditions.push(`r.created_at <= $${values.length}`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT
         ri.id, ri.quantity, ri.price,
         r.id           AS round_id,
         r.round_number AS round_number,
         r.bill_id      AS bill_id,
         r.created_at   AS sale_date
       FROM round_items ri
       ${joinType} rounds r ON r.id = ri.round_id
       ${where}
       ORDER BY r.created_at DESC`,
      values,
    );

    const data = rows.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      round_id: item.round_id,
      round_number: item.round_number,
      bill_id: item.bill_id,
      sale_date: item.sale_date,
    }));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
