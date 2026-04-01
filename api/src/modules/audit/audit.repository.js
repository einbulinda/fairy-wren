const getSupabase = require("../../config/supabase");

exports.log = async ({
  entity,
  entity_id,
  action,
  performed_by,
  correlation_id,
  metadata,
}) => {
  const supabase = getSupabase();
  const { error } = await supabase.from("audit_logs").insert({
    entity,
    entity_id: entity_id ? String(entity_id) : null,
    action,
    performed_by: performed_by || null,
    correlation_id: correlation_id || null,
    metadata: metadata || null,
  });

  if (error) {
    console.error("[audit] Failed to write audit log:", error.message, {
      entity,
      entity_id,
      action,
    });
  }
};
