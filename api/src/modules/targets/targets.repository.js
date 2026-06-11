const pool = require("../../config/db");

// ==========================================
// BUSINESS TARGETS
// ==========================================

exports.getBusinessTarget = async (year, month) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM business_targets WHERE year = $1 AND month = $2`,
      [year, month],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getYearlyBusinessTargets = async (year) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM business_targets WHERE year = $1 ORDER BY month`,
      [year],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.upsertBusinessTarget = async (targetData) => {
  try {
    const cols = Object.keys(targetData);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSet = cols
      .filter((c) => c !== "year" && c !== "month")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");
    const { rows } = await pool.query(
      `INSERT INTO business_targets (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (year, month) DO UPDATE SET ${updateSet}
       RETURNING *`,
      Object.values(targetData),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateBusinessTarget = async (id, updates) => {
  try {
    const entries = Object.entries(updates);
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE business_targets SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// ==========================================
// USER/STAFF TARGETS
// ==========================================

exports.getUserTarget = async (userId, year, month) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM user_targets WHERE user_id = $1 AND year = $2 AND month = $3`,
      [userId, year, month],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getAllUserTargets = async (year, month) => {
  try {
    const { rows } = await pool.query(
      `SELECT ut.*,
              json_build_object('id', p.id, 'name', p.name, 'role', p.role) AS "user"
       FROM user_targets ut
       LEFT JOIN profiles p ON p.id = ut.user_id
       WHERE ut.year = $1 AND ut.month = $2`,
      [year, month],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.upsertUserTarget = async (targetData) => {
  try {
    const cols = Object.keys(targetData);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSet = cols
      .filter((c) => c !== "user_id" && c !== "year" && c !== "month")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");
    const { rows } = await pool.query(
      `INSERT INTO user_targets (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (user_id, year, month) DO UPDATE SET ${updateSet}
       RETURNING *`,
      Object.values(targetData),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// ==========================================
// CATEGORY TARGETS
// ==========================================

exports.getCategoryTargets = async (year, month) => {
  try {
    const { rows } = await pool.query(
      `SELECT ct.*,
              json_build_object('id', pc.id, 'name', pc.name) AS category
       FROM category_targets ct
       LEFT JOIN product_categories pc ON pc.id = ct.category_id
       WHERE ct.year = $1 AND ct.month = $2`,
      [year, month],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.upsertCategoryTarget = async (targetData) => {
  try {
    const cols = Object.keys(targetData);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSet = cols
      .filter((c) => c !== "category_id" && c !== "year" && c !== "month")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");
    const { rows } = await pool.query(
      `INSERT INTO category_targets (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (category_id, year, month) DO UPDATE SET ${updateSet}
       RETURNING *`,
      Object.values(targetData),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// ==========================================
// DASHBOARD HELPERS
// ==========================================

exports.getPreviousMonthRevenue = async (year, month) => {
  try {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const startDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const endDate = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

    const { rows } = await pool.query(
      `SELECT bill_total FROM bills
       WHERE status = $1
         AND business_date >= $2
         AND business_date <= $3`,
      ["completed", startDate, endDate],
    );

    return rows.reduce((sum, bill) => sum + (parseFloat(bill.bill_total) || 0), 0);
  } catch {
    return 0;
  }
};

exports.getDashboardMetricsWithTargets = async (startDate, endDate) => {
  const year = parseInt(startDate.split("-")[0]);
  const month = parseInt(startDate.split("-")[1]);

  const { data: targetData } = await exports.getBusinessTarget(year, month);

  let bills = [];
  try {
    const { rows } = await pool.query(
      `SELECT bill_total, status FROM bills
       WHERE business_date >= $1 AND business_date <= $2`,
      [startDate, endDate],
    );
    bills = rows;
  } catch {
    bills = [];
  }

  const completedBills = bills.filter((b) => b.status === "completed");
  const totalRevenue = completedBills.reduce(
    (sum, b) => sum + (parseFloat(b.bill_total) || 0),
    0,
  );

  let targetRevenue = targetData?.target_revenue;
  let isAutoGenerated = false;

  if (!targetRevenue) {
    const prevRevenue = await exports.getPreviousMonthRevenue(year, month);
    targetRevenue = Math.round(prevRevenue * 1.1);
    isAutoGenerated = true;
  }

  return {
    target: {
      ...targetData,
      target_revenue: targetRevenue,
      isAutoGenerated,
    },
    actuals: {
      totalRevenue,
      billCount: completedBills.length,
    },
  };
};
