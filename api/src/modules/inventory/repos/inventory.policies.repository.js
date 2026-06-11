const pool = require("../../../config/db");

/* ---------- POLICIES ---------- */

exports.getAllPolicies = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        pip.*,
        json_build_object(
          'id', pr.id,
          'name', pr.name,
          'current_stock', pr.current_stock,
          'track_inventory', pr.track_inventory,
          'active', pr.active
        ) AS products,
        json_build_object('id', s.id, 'name', s.name) AS suppliers
       FROM product_inventory_policies pip
       LEFT JOIN products pr ON pr.id = pip.product_id
       LEFT JOIN suppliers s ON s.id = pip.primary_supplier_id
       ORDER BY pip.updated_at DESC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getPolicyByProductId = async (productId) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        pip.*,
        json_build_object(
          'id', pr.id,
          'name', pr.name,
          'current_stock', pr.current_stock,
          'track_inventory', pr.track_inventory
        ) AS products,
        json_build_object('id', s.id, 'name', s.name) AS suppliers
       FROM product_inventory_policies pip
       LEFT JOIN products pr ON pr.id = pip.product_id
       LEFT JOIN suppliers s ON s.id = pip.primary_supplier_id
       WHERE pip.product_id = $1`,
      [productId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.upsertManualOverride = async (productId, reorderLevel) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO product_inventory_policies (product_id, reorder_level, manual_override, source, updated_at)
       VALUES ($1, $2, true, 'manual', NOW())
       ON CONFLICT (product_id) DO UPDATE SET
         reorder_level = EXCLUDED.reorder_level,
         manual_override = true,
         source = 'manual',
         updated_at = NOW()
       RETURNING *`,
      [productId, reorderLevel],
    );
    const data = rows[0] || null;
    if (!data) return { data: null, error: new Error("Upsert returned no row") };

    await pool.query(
      `UPDATE products SET reorder_level = $1 WHERE id = $2`,
      [reorderLevel, productId],
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.resetOverride = async (productId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE product_inventory_policies
       SET manual_override = false, updated_at = NOW()
       WHERE product_id = $1
       RETURNING *`,
      [productId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- SETTINGS ---------- */

exports.getSettings = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM reorder_level_settings LIMIT 1`,
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateSettings = async (payload) => {
  try {
    // Get existing row id
    const { rows: existing } = await pool.query(
      `SELECT id FROM reorder_level_settings LIMIT 1`,
    );

    if (!existing[0]) {
      const keys = Object.keys(payload);
      const values = Object.values(payload);
      values.push(new Date().toISOString());
      const cols = [...keys, "updated_at"].join(", ");
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await pool.query(
        `INSERT INTO reorder_level_settings (${cols}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      return { data: rows[0] || null, error: null };
    }

    const keys = Object.keys(payload);
    const values = Object.values(payload);
    values.push(new Date().toISOString());
    values.push(existing[0].id);
    const setClauses = [...keys, "updated_at"]
      .map((k, i) => `${k} = $${i + 1}`)
      .join(", ");
    const { rows } = await pool.query(
      `UPDATE reorder_level_settings SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- REFRESH ---------- */

exports.refreshAll = async () => {
  try {
    const { rows } = await pool.query(`SELECT * FROM refresh_reorder_levels()`);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.refreshProduct = async (productId) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM refresh_reorder_levels($1::uuid[])`,
      [[productId]],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- MOVEMENT ANALYSIS ---------- */

exports.getMovementAnalysis = async (fastDays = 30, slowDays = 90) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM get_product_movement_analysis($1, $2)`,
      [fastDays, slowDays],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- ALERTS ---------- */

exports.getReorderAlerts = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.current_stock,
        p.reorder_level,
        p.cost_price,
        p.unit,
        json_build_object('name', c.name) AS categories
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.track_inventory = true
         AND p.active = true
         AND p.reorder_level > 0
         AND p.current_stock <= p.reorder_level
       ORDER BY p.current_stock ASC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
