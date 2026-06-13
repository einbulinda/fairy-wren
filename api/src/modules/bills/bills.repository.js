const pool = require("../../config/db");

/* ---------- Bills ---------- */

exports.createBill = async (payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const insertSql = `
      INSERT INTO bills (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING id
    `;
    const { rows: inserted } = await client.query(insertSql, values);
    const billId = inserted[0].id;

    await client.query("COMMIT");

    // Fetch the newly created bill with nested data
    const selectSql = `
      SELECT
        b.id, b.customer_name, b.status, b.created_at, b.updated_at, b.created_by,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'round_number', r.round_number,
              'round_items', (
                SELECT COALESCE(json_agg(json_build_object(
                  'id', ri.id,
                  'quantity', ri.quantity,
                  'price', ri.price,
                  'product', json_build_object('id', p.id, 'name', p.name)
                )), '[]'::json)
                FROM round_items ri
                JOIN products p ON p.id = ri.product_id
                WHERE ri.round_id = r.id
              )
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) AS rounds
      FROM bills b
      LEFT JOIN rounds r ON r.bill_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `;
    const { rows } = await client.query(selectSql, [billId]);
    const bill = rows[0] || null;
    if (bill && !bill.rounds) bill.rounds = [];
    return { data: bill, error: null };
  } catch (error) {
    await client.query("ROLLBACK");
    return { data: null, error };
  } finally {
    client.release();
  }
};

exports.findBillById = async (id) => {
  try {
    const sql = `
      SELECT
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'round_number', r.round_number,
              'bill_id', r.bill_id,
              'created_at', r.created_at,
              'round_items', (
                SELECT COALESCE(json_agg(json_build_object(
                  'id', ri.id,
                  'quantity', ri.quantity,
                  'price', ri.price,
                  'round_id', ri.round_id,
                  'product_id', ri.product_id,
                  'is_return', ri.is_return,
                  'is_exchanged', ri.is_exchanged,
                  'inventory_posted', ri.inventory_posted,
                  'created_at', r.created_at,
                  'product', json_build_object(
                    'id', p.id, 'name', p.name,
                    'price', p.price, 'cost_price', p.cost_price
                  )
                )), '[]'::json)
                FROM round_items ri
                JOIN products p ON p.id = ri.product_id
                WHERE ri.round_id = r.id
              )
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) AS rounds
      FROM bills b
      LEFT JOIN rounds r ON r.bill_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `;
    const { rows } = await pool.query(sql, [id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.listBills = async (filters = {}) => {
  try {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(filters.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (filters.active === "true" || filters.active === true) {
      params.push(["open", "awaiting_confirmation"]);
      conditions.push(`b.status = ANY($${params.length}::text[])`);
    } else if (filters.status) {
      const statuses = filters.status.split(",").map((s) => s.trim());
      params.push(statuses);
      conditions.push(`b.status = ANY($${params.length}::text[])`);
    }

    if (filters.startDate) {
      params.push(filters.startDate);
      conditions.push(`b.created_at >= $${params.length}`);
    }

    if (filters.endDate) {
      params.push(filters.endDate + "T23:59:59");
      conditions.push(`b.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM bills b ${whereClause}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const count = parseInt(countRows[0].total, 10);

    // Data query
    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const sql = `
      SELECT
        b.id, b.customer_name, b.status, b.created_at, b.updated_at,
        json_build_object('id', cu.id, 'name', cu.name) AS created_by_user,
        json_build_object('id', uu.id, 'name', uu.name) AS updated_by_user,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', r.id,
            'round_number', r.round_number,
            'created_at', r.created_at,
            'round_items', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', ri.id,
                'quantity', ri.quantity,
                'price', ri.price,
                'is_return', ri.is_return,
                'is_exchanged', ri.is_exchanged,
                'inventory_posted', ri.inventory_posted,
                'product', json_build_object('id', p.id, 'name', p.name, 'cost_price', p.cost_price)
              )), '[]'::json)
              FROM round_items ri
              JOIN products p ON p.id = ri.product_id
              WHERE ri.round_id = r.id
            )
          )), '[]'::json)
          FROM rounds r WHERE r.bill_id = b.id
        ) AS rounds,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', pay.id,
            'amount', pay.amount,
            'payment_type', pay.payment_type,
            'status', pay.status,
            'is_paid', pay.is_paid,
            'created_at', pay.created_at
          )), '[]'::json)
          FROM payments pay WHERE pay.bill_id = b.id
        ) AS payments
      FROM bills b
      LEFT JOIN profiles cu ON cu.id = b.created_by
      LEFT JOIN profiles uu ON uu.id = b.updated_by
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const { rows: data } = await pool.query(sql, params);

    return {
      data,
      error: null,
      count,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    return { data: null, error, count: 0, pagination: {} };
  }
};

exports.updateBillStatus = async (id, status, userId) => {
  try {
    const sql = `
      UPDATE bills
      SET status = $1, updated_by = $2
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [status, userId, id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- Rounds ---------- */

exports.createRound = async (payload) => {
  try {
    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO rounds (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.insertRoundItems = async (items) => {
  try {
    if (!items || items.length === 0) return { data: [], error: null };

    const columns = Object.keys(items[0]);
    const placeholders = items
      .map(
        (_, rowIdx) =>
          `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(", ")})`,
      )
      .join(", ");
    const values = items.flatMap((item) => columns.map((col) => item[col]));

    const sql = `
      INSERT INTO round_items (${columns.join(", ")})
      VALUES ${placeholders}
    `;
    await pool.query(sql, values);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- Stats ---------- */

exports.listBillsByUser = async (userId, startDate, endDate) => {
  try {
    const sql = `
      SELECT
        b.id, b.status, b.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'round_items', (
                SELECT COALESCE(json_agg(json_build_object(
                  'quantity', ri.quantity,
                  'price', ri.price
                )), '[]'::json)
                FROM round_items ri
                WHERE ri.round_id = r.id
              )
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) AS rounds
      FROM bills b
      LEFT JOIN rounds r ON r.bill_id = b.id
      WHERE b.created_by = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `;
    const { rows } = await pool.query(sql, [userId, startDate, endDate]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.listBillsByDateRange = async (startDate, endDate) => {
  try {
    const sql = `
      SELECT
        b.id, b.status, b.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'round_items', (
                SELECT COALESCE(json_agg(json_build_object(
                  'quantity', ri.quantity,
                  'price', ri.price
                )), '[]'::json)
                FROM round_items ri
                WHERE ri.round_id = r.id
              )
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) AS rounds
      FROM bills b
      LEFT JOIN rounds r ON r.bill_id = b.id
      WHERE b.created_at >= $1
        AND b.created_at <= $2
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `;
    const { rows } = await pool.query(sql, [startDate, endDate]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/* ---------- Sale Posting RPCs ---------- */

exports.postRoundSale = async (roundId) => {
  try {
    const { rows } = await pool.query("SELECT * FROM post_round_sale($1)", [
      roundId,
    ]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.reverseBillSale = async (billId) => {
  try {
    const { rows } = await pool.query("SELECT * FROM reverse_bill_sale($1)", [
      billId,
    ]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findRoundItemById = async (roundItemId) => {
  try {
    const sql = `
      SELECT
        ri.id, ri.product_id, ri.quantity, ri.price,
        ri.inventory_posted, ri.is_exchanged,
        json_build_object(
          'id', r.id,
          'bill_id', r.bill_id,
          'created_at', r.created_at
        ) AS round
      FROM round_items ri
      JOIN rounds r ON r.id = ri.round_id
      WHERE ri.id = $1
    `;
    const { rows } = await pool.query(sql, [roundItemId]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.reverseRoundItem = async (roundItemId, returnedQuantity) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reverse_round_item($1, $2)",
      [roundItemId, returnedQuantity],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getNextRoundNumber = async (billId) => {
  try {
    const sql = `
      SELECT round_number
      FROM rounds
      WHERE bill_id = $1
      ORDER BY round_number DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [billId]);
    return rows.length ? rows[0].round_number + 1 : 1;
  } catch (error) {
    return 1;
  }
};
