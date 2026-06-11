const pool = require("../../config/db");

exports.findActiveUserByFingerprint = async (fingerprint) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, pin_hash, role, active FROM profiles WHERE pin_fingerprint = $1 AND active = true",
      [fingerprint]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
