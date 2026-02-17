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
  supabase.from("audit_logs").insert({
    entity,
    entity_id,
    action,
    performed_by,
    correlation_id,
    metadata,
  });
};
