const getSupabase = require("../../config/supabase");

exports.findAll = async ({ status, upcoming, limit = 50, offset = 0 } = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("events")
    .select("*, profiles(name)", { count: "exact" })
    .order("event_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  if (upcoming === "true") {
    query = query.gte("event_date", new Date().toISOString().split("T")[0]);
    query = query.order("event_date", { ascending: true });
  } else if (upcoming === "false") {
    query = query.lt("event_date", new Date().toISOString().split("T")[0]);
  }

  return query;
};

exports.findPublished = async () => {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const [upcoming, past] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,description,event_date,start_time,end_time,dj_act,image_url,ticket_url",
      )
      .eq("status", "published")
      .gte("event_date", today)
      .order("event_date", { ascending: true }),
    supabase
      .from("events")
      .select(
        "id,title,description,event_date,start_time,end_time,dj_act,image_url,ticket_url",
      )
      .eq("status", "published")
      .lt("event_date", today)
      .order("event_date", { ascending: false })
      .limit(12),
  ]);

  return { upcoming, past };
};

exports.findById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("events")
    .select("*, profiles(name)")
    .eq("id", id)
    .single();
};

exports.create = async (payload) => {
  const supabase = getSupabase();
  return supabase.from("events").insert(payload).select().single();
};

exports.update = async (id, payload) => {
  const supabase = getSupabase();
  return supabase.from("events").update(payload).eq("id", id).select().single();
};

exports.remove = async (id) => {
  const supabase = getSupabase();
  return supabase.from("events").delete().eq("id", id);
};
