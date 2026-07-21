const pool = require("../../config/db");

/* ---------- BUSINESS PARTNERS ---------- */
exports.listPartners = async ({ search } = {}) => {
  const conditions = ["active = true"];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT id, name, contact_person, phone, notes, created_at
       FROM business_partners
      WHERE ${conditions.join(" AND ")}
      ORDER BY name`,
    params,
  );
  return rows;
};

exports.createPartner = async ({ name, contact_person, phone, notes }) => {
  const { rows } = await pool.query(
    `INSERT INTO business_partners (name, contact_person, phone, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, contact_person || null, phone || null, notes || null],
  );
  return rows[0];
};

/* ---------- CREATE EXCHANGE ---------- */
exports.createExchange = async (payload, userId, approvalStatus = "approved") => {
  const { partner_id, direction, exchange_date, notes, line_items, related_exchange_id } = payload;

  try {
    const { rows } = await pool.query(
      `SELECT create_product_exchange($1, $2, $3, $4, $5, $6::jsonb, $7, $8) AS id`,
      [
        partner_id,
        direction,
        exchange_date || null,
        notes || null,
        userId,
        JSON.stringify(line_items),
        related_exchange_id || null,
        approvalStatus,
      ],
    );
    return rows[0]?.id;
  } catch (error) {
    console.error("create_product_exchange RPC error:", error);
    throw new Error("FAILED_TO_CREATE_EXCHANGE");
  }
};

/* ---------- EXCHANGE DETAIL (READ) ---------- */
exports.getExchangeById = async (id) => {
  const { rows } = await pool.query(
    `SELECT
      pe.id,
      pe.direction,
      pe.exchange_date,
      pe.status,
      pe.approval_status,
      pe.approved_by,
      pe.approved_at,
      pe.rejection_reason,
      pe.related_exchange_id,
      pe.notes,
      pe.created_at,
      pe.partner_id,
      (
        SELECT json_agg(
          json_build_object(
            'id', pei.id,
            'product_id', pei.product_id,
            'quantity', pei.quantity,
            'products', json_build_object('id', p.id, 'name', p.name, 'unit', p.unit)
          )
        )
        FROM product_exchange_items pei
        LEFT JOIN products p ON p.id = pei.product_id
        WHERE pei.exchange_id = pe.id
      ) AS product_exchange_items,
      json_build_object('id', bp.id, 'name', bp.name) AS partner,
      json_build_object('id', u.id, 'name', u.name) AS created_by_user
     FROM product_exchanges pe
     LEFT JOIN business_partners bp ON bp.id = pe.partner_id
     LEFT JOIN profiles u ON u.id = pe.created_by
     WHERE pe.id = $1`,
    [id],
  );
  return rows[0] || null;
};

/* ---------- LIST ALL EXCHANGES ---------- */
exports.getAllExchanges = async ({
  limit = 50,
  offset = 0,
  partner_id,
  direction,
  approval_status,
  from,
  to,
} = {}) => {
  const conditions = [];
  const params = [];

  if (partner_id) {
    params.push(partner_id);
    conditions.push(`pe.partner_id = $${params.length}`);
  }
  if (direction) {
    params.push(direction);
    conditions.push(`pe.direction = $${params.length}`);
  }
  if (approval_status) {
    params.push(approval_status);
    conditions.push(`pe.approval_status = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`pe.exchange_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`pe.exchange_date <= $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(
    `SELECT
      pe.id,
      pe.direction,
      pe.exchange_date,
      pe.status,
      pe.approval_status,
      pe.created_at,
      json_build_object('id', bp.id, 'name', bp.name) AS partner,
      json_build_object('id', u.id, 'name', u.name) AS submitted_by,
      (SELECT COUNT(*) FROM product_exchange_items WHERE exchange_id = pe.id) AS item_count
     FROM product_exchanges pe
     LEFT JOIN business_partners bp ON bp.id = pe.partner_id
     LEFT JOIN profiles u ON u.id = pe.created_by
     ${whereClause}
     ORDER BY pe.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
};

/* ---------- LIST PENDING EXCHANGES ---------- */
exports.getPendingExchanges = async () => {
  const { rows } = await pool.query(
    `SELECT
      pe.id,
      pe.direction,
      pe.exchange_date,
      pe.approval_status,
      pe.created_at,
      json_build_object('id', bp.id, 'name', bp.name) AS partner,
      json_build_object('id', u.id, 'name', u.name) AS submitted_by,
      (SELECT COUNT(*) FROM product_exchange_items WHERE exchange_id = pe.id) AS item_count
     FROM product_exchanges pe
     LEFT JOIN business_partners bp ON bp.id = pe.partner_id
     LEFT JOIN profiles u ON u.id = pe.created_by
     WHERE pe.approval_status = 'pending'
     ORDER BY pe.created_at DESC`,
  );
  return rows;
};

/* ---------- APPROVE EXCHANGE ---------- */
exports.approveExchange = async (id, approverId) => {
  try {
    await pool.query(`SELECT approve_product_exchange($1, $2)`, [id, approverId]);
  } catch (error) {
    if (error.message?.includes("EXCHANGE_NOT_FOUND")) throw new Error("EXCHANGE_NOT_FOUND");
    if (error.message?.includes("EXCHANGE_NOT_PENDING")) throw new Error("EXCHANGE_NOT_PENDING");
    throw error;
  }
};

/* ---------- REJECT EXCHANGE ---------- */
exports.rejectExchange = async (id, rejectorId, reason) => {
  try {
    await pool.query(`SELECT reject_product_exchange($1, $2, $3)`, [id, rejectorId, reason || null]);
  } catch (error) {
    if (error.message?.includes("EXCHANGE_NOT_FOUND")) throw new Error("EXCHANGE_NOT_FOUND");
    if (error.message?.includes("EXCHANGE_NOT_PENDING")) throw new Error("EXCHANGE_NOT_PENDING");
    throw error;
  }
};
