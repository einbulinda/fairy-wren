const pool = require("../../config/db");

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
