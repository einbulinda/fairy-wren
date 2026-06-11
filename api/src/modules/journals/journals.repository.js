const pool = require("../../config/db");

exports.findAll = async (filters = {}) => {
  try {
    const conditions = [];
    const params = [];

    if (filters.source_type) {
      params.push(filters.source_type);
      conditions.push(`je.source_type = $${params.length}`);
    }

    if (filters.from) {
      params.push(filters.from);
      conditions.push(`je.entry_date >= $${params.length}`);
    }

    if (filters.to) {
      params.push(filters.to);
      conditions.push(`je.entry_date <= $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        je.id, je.entry_date, je.reference, je.description,
        je.source_type, je.source_id, je.reversed_entry_id, je.created_at,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', jl.id,
              'account_id', jl.account_id,
              'debit', jl.debit,
              'credit', jl.credit,
              'chart_of_accounts', json_build_object(
                'code', coa.code,
                'name', coa.name
              )
            ) ORDER BY jl.id)
            FROM journal_lines jl
            LEFT JOIN chart_of_accounts coa ON coa.id = jl.account_id
            WHERE jl.journal_entry_id = je.id
          ),
          '[]'::json
        ) AS journal_lines
      FROM journal_entries je
      ${whereClause}
      ORDER BY je.entry_date DESC, je.created_at DESC
    `;

    const { rows } = await pool.query(sql, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findById = async (id) => {
  try {
    const sql = `
      SELECT
        je.id, je.entry_date, je.reference, je.description,
        je.source_type, je.source_id, je.reversed_entry_id, je.created_at,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', jl.id,
              'account_id', jl.account_id,
              'debit', jl.debit,
              'credit', jl.credit,
              'description', jl.description,
              'chart_of_accounts', json_build_object(
                'code', coa.code,
                'name', coa.name,
                'account_class', coa.account_class
              )
            ) ORDER BY jl.id)
            FROM journal_lines jl
            LEFT JOIN chart_of_accounts coa ON coa.id = jl.account_id
            WHERE jl.journal_entry_id = je.id
          ),
          '[]'::json
        ) AS journal_lines
      FROM journal_entries je
      WHERE je.id = $1
    `;
    const { rows } = await pool.query(sql, [id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.createEntry = async (entry) => {
  try {
    const columns = Object.keys(entry);
    const values = Object.values(entry);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO journal_entries (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.createLines = async (lines) => {
  try {
    if (!lines || lines.length === 0) return { data: [], error: null };

    const columns = Object.keys(lines[0]);
    const placeholders = lines
      .map((_, rowIdx) =>
        `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(", ")})`
      )
      .join(", ");
    const values = lines.flatMap((line) => columns.map((col) => line[col]));

    const sql = `
      INSERT INTO journal_lines (${columns.join(", ")})
      VALUES ${placeholders}
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.updateReversedEntryId = async (originalId, reversalId) => {
  try {
    const sql = `
      UPDATE journal_entries
      SET reversed_entry_id = $1
      WHERE id = $2
    `;
    await pool.query(sql, [reversalId, originalId]);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.findBySourceId = async (sourceType, sourceId) => {
  try {
    const sql = `
      SELECT
        je.id,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', jl.id,
              'account_id', jl.account_id,
              'debit', jl.debit,
              'credit', jl.credit
            ) ORDER BY jl.id)
            FROM journal_lines jl
            WHERE jl.journal_entry_id = je.id
          ),
          '[]'::json
        ) AS journal_lines
      FROM journal_entries je
      WHERE je.source_type = $1
        AND je.source_id = $2
    `;
    const { rows } = await pool.query(sql, [sourceType, sourceId]);
    return rows[0] || null;
  } catch (error) {
    return null;
  }
};
