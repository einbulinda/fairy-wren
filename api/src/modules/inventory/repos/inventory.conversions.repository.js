const pool = require("../../../config/db");

exports.executeConversion = async ({
  sourceProductId,
  targetProductId,
  sourceQty,
  targetQty,
  notes,
  userId,
}) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM execute_product_conversion($1, $2, $3, $4, $5, $6)`,
      [
        sourceProductId,
        targetProductId,
        sourceQty,
        targetQty,
        notes || null,
        userId || null,
      ],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getConversionHistory = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT
        pc.*,
        json_build_object('id', src.id, 'name', src.name, 'unit', src.unit, 'volume_ml', src.volume_ml) AS source,
        json_build_object('id', tgt.id, 'name', tgt.name, 'unit', tgt.unit, 'volume_ml', tgt.volume_ml) AS target,
        json_build_object('name', cr.name) AS creator
       FROM product_conversions pc
       LEFT JOIN products src ON src.id = pc.source_product_id
       LEFT JOIN products tgt ON tgt.id = pc.target_product_id
       LEFT JOIN profiles cr ON cr.id = pc.created_by
       ORDER BY pc.created_at DESC
       LIMIT 50`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getConvertibleProducts = async (allowedCategoryIds = []) => {
  try {
    const params = [];
    let categoryFilter = "";

    if (allowedCategoryIds.length > 0) {
      params.push(allowedCategoryIds);
      categoryFilter = `AND p.category_id = ANY($${params.length})`;
    }

    const { rows } = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.unit,
        p.volume_ml,
        p.cost_price,
        p.current_stock,
        p.category_id,
        json_build_object('name', c.name) AS categories
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = true
         AND p.track_inventory = true
         AND p.volume_ml IS NOT NULL
         AND p.volume_ml > 0
         ${categoryFilter}
       ORDER BY p.name`,
      params,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
