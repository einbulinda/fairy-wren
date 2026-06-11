const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const values = [];

    if (filters.active !== undefined) {
      values.push(filters.active);
      conditions.push(`active = $${values.length}`);
    }

    if (filters.account_class) {
      values.push(filters.account_class);
      conditions.push(`account_class = $${values.length}`);
    }

    if (filters.is_control_account !== undefined) {
      values.push(filters.is_control_account);
      conditions.push(`is_control_account = $${values.length}`);
    }

    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        conditions.push(`parent_id IS NULL`);
      } else {
        values.push(filters.parent_id);
        conditions.push(`parent_id = $${values.length}`);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM chart_of_accounts ${where} ORDER BY code ASC`,
      values,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE id = $1`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findByCode = async (code) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE code = $1`,
      [code],
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
      `INSERT INTO chart_of_accounts (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      Object.values(payload),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.update = async (id, payload) => {
  try {
    const entries = Object.entries({ ...payload, updated_at: new Date().toISOString() });
    const set = entries.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `UPDATE chart_of_accounts SET ${set} WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateStatus = async (id, active) => {
  try {
    const { rows } = await pool.query(
      `UPDATE chart_of_accounts SET active = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [active, new Date().toISOString(), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.delete = async (id) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM chart_of_accounts WHERE id = $1 RETURNING *`,
      [id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getChildren = async (parentId) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE parent_id = $1 ORDER BY code ASC`,
      [parentId],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getNextChildCode = async (parentId, parentCode) => {
  try {
    const { rows: children } = await pool.query(
      `SELECT code FROM chart_of_accounts WHERE parent_id = $1 ORDER BY code DESC LIMIT 1`,
      [parentId],
    );

    if (!children || children.length === 0) {
      return `${parentCode}01`;
    }

    const lastCode = children[0].code;
    const suffix = parseInt(lastCode.replace(parentCode, ""), 10) || 0;
    return `${parentCode}${String(suffix + 1).padStart(2, "0")}`;
  } catch {
    return `${parentCode}01`;
  }
};

exports.getAccountLedger = async (accountId, startDate, endDate) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rpc_account_ledger($1, $2, $3)`,
      [accountId, startDate, endDate],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
