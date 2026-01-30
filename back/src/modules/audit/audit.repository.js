const supabase = require("../../config/supabase");

exports.log = async ({
  entity,
  entity_id,
  action,
  performed_by,
  correlation_id,
  metadata,
}) => {
  supabase.from("audit_logs").insert({
    entity,
    entity_id,
    action,
    performed_by,
    correlation_id,
    metadata,
  });
};
