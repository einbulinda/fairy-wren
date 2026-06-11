const pool = require("../../config/db");

exports.findAll = async ({ status, upcoming, limit = 50, offset = 0 } = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`e.status = $${values.length}`);
    }

    const today = new Date().toISOString().split("T")[0];

    if (upcoming === "true") {
      values.push(today);
      conditions.push(`e.event_date >= $${values.length}`);
    } else if (upcoming === "false") {
      values.push(today);
      conditions.push(`e.event_date < $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Order: upcoming sorts ascending, all others sort descending
    const orderDir = upcoming === "true" ? "ASC" : "DESC";

    values.push(limit);
    const limitParam = `$${values.length}`;
    values.push(offset);
    const offsetParam = `$${values.length}`;

    const { rows } = await pool.query(
      `SELECT e.*, json_build_object('name', p.name) AS profiles,
              COUNT(*) OVER() AS total_count
       FROM events e
       LEFT JOIN profiles p ON p.id = e.created_by
       ${where}
       ORDER BY e.event_date ${orderDir}
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return {
      data: rows,
      count: parseInt(rows[0]?.total_count ?? 0),
      error: null,
    };
  } catch (error) {
    return { data: null, count: 0, error };
  }
};

exports.findPublished = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [{ rows: upcomingRows }, { rows: pastRows }] = await Promise.all([
      pool.query(
        `SELECT id, title, description, event_date, start_time, end_time, dj_act, image_url, ticket_url
         FROM events
         WHERE status = $1 AND event_date >= $2
         ORDER BY event_date ASC`,
        ["published", today],
      ),
      pool.query(
        `SELECT id, title, description, event_date, start_time, end_time, dj_act, image_url, ticket_url
         FROM events
         WHERE status = $1 AND event_date < $2
         ORDER BY event_date DESC
         LIMIT 12`,
        ["published", today],
      ),
    ]);

    return {
      upcoming: { data: upcomingRows, error: null },
      past: { data: pastRows, error: null },
    };
  } catch (error) {
    return {
      upcoming: { data: null, error },
      past: { data: null, error },
    };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, json_build_object('name', p.name) AS profiles
       FROM events e
       LEFT JOIN profiles p ON p.id = e.created_by
       WHERE e.id = $1`,
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
      `INSERT INTO events (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
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
      `UPDATE events SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.remove = async (id) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM events WHERE id = $1 RETURNING *`,
      [id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
