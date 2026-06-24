const pool = require("../../config/db");

exports.listLogs = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.entity) {
    params.push(filters.entity);
    conditions.push(`al.entity = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (filters.performed_by) {
    params.push(filters.performed_by);
    conditions.push(`al.performed_by = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    conditions.push(`al.created_at >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate + "T23:59:59");
    conditions.push(`al.created_at <= $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const n = params.length;
    conditions.push(`(al.entity ILIKE $${n} OR al.action ILIKE $${n} OR al.entity_id ILIKE $${n} OR p.name ILIKE $${n})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(filters.limit) || 50));
  const offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.performed_by
    ${whereClause}
  `;
  const { rows: countRows } = await pool.query(countSql, params);
  const total = parseInt(countRows[0].total, 10);

  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT
      al.id, al.entity, al.entity_id, al.action, al.correlation_id,
      al.metadata, al.created_at,
      json_build_object('id', p.id, 'name', p.name, 'role', p.role) AS performed_by_user
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.performed_by
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

exports.getDistinctEntities = async () => {
  const { rows } = await pool.query(
    "SELECT DISTINCT entity FROM audit_logs ORDER BY entity"
  );
  return rows.map((r) => r.entity);
};

exports.log = async ({
  entity,
  entity_id,
  action,
  performed_by,
  correlation_id,
  metadata,
}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (entity, entity_id, action, performed_by, correlation_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entity,
        entity_id ? String(entity_id) : null,
        action,
        performed_by || null,
        correlation_id || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error.message, {
      entity,
      entity_id,
      action,
    });
  }
};
