const pool = require("../../config/db");

exports.create = async ({ user_id, ip_address, user_agent, app }) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO login_sessions (user_id, ip_address, user_agent, app)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, ip_address, user_agent, app]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.endActiveSessions = async (userId, reason) => {
  try {
    const { rows } = await pool.query(
      `UPDATE login_sessions
       SET ended_at = NOW(), end_reason = $1
       WHERE user_id = $2 AND ended_at IS NULL
       RETURNING *`,
      [reason, userId]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getLastEndedSession = async (userId) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ended_at, end_reason
       FROM login_sessions
       WHERE user_id = $1 AND ended_at IS NOT NULL
       ORDER BY ended_at DESC
       LIMIT 1`,
      [userId]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
