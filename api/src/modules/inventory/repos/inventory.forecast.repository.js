const pool = require("../../../config/db");

exports.getReorderForecast = async (lookbackDays = 14) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM get_reorder_forecast($1)`,
      [lookbackDays],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
