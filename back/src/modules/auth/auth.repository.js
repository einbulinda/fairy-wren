const getSupabase = require("../../config/supabase");

exports.findActiveUserByFingerprint = async (fingerprint) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name, pin_hash, role, active")
    .eq("pin_fingerprint", fingerprint)
    .eq("active", true)
    .single();

  return { data, error };
};
