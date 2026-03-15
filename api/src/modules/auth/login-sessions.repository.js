const getSupabase = require("../../config/supabase");

exports.create = async ({ user_id, ip_address, user_agent, app }) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("login_sessions")
    .insert({ user_id, ip_address, user_agent, app })
    .select()
    .single();

  return { data, error };
};

exports.endActiveSessions = async (userId, reason) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("login_sessions")
    .update({ ended_at: new Date().toISOString(), end_reason: reason })
    .eq("user_id", userId)
    .is("ended_at", null);

  return { data, error };
};

exports.getLastEndedSession = async (userId) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("login_sessions")
    .select("id, ended_at, end_reason")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .single();

  return { data, error };
};
