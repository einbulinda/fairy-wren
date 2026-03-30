const repo = require("./events.repository");
const getSupabase = require("../../config/supabase");
const path = require("path");

const BUCKET = "event-posters";

exports.uploadPoster = async (eventId, file) => {
  const supabase = getSupabase();
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const filePath = `${eventId}${ext}`;

  // Upsert so re-uploading replaces the previous poster
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) throw new Error("FAILED_TO_UPLOAD_POSTER");

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  // Persist the URL on the event record
  const { data, error } = await repo.update(eventId, { image_url: publicUrl });
  if (error) throw new Error("FAILED_TO_SAVE_POSTER_URL");

  return { image_url: publicUrl, event: data };
};

exports.list = async (filters) => {
  const { data, error, count } = await repo.findAll(filters);
  if (error) {
    throw new Error("FAILED_TO_FETCH_EVENTS");
  }
  return { events: data, total: count };
};

exports.getPublished = async () => {
  const { upcoming, past } = await repo.findPublished();
  if (upcoming.error) throw new Error("FAILED_TO_FETCH_EVENTS");
  return {
    upcoming: upcoming.data || [],
    past: past.data || [],
  };
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("EVENT_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  const {
    title,
    description,
    event_date,
    start_time,
    end_time,
    dj_act,
    image_url,
    ticket_url,
    status,
  } = payload;
  if (!title) throw new Error("EVENT_TITLE_REQUIRED");
  if (!event_date) throw new Error("EVENT_DATE_REQUIRED");

  const { data, error } = await repo.create({
    title,
    description,
    event_date,
    start_time: start_time || null,
    end_time: end_time || null,
    dj_act: dj_act || null,
    image_url: image_url || null,
    ticket_url: ticket_url || null,
    status: status || "draft",
    created_by: context.userId,
  });
  if (error) {
    throw new Error("FAILED_TO_CREATE_EVENT");
  }
  return data;
};

exports.update = async (id, payload, context) => {
  await exports.getById(id);
  const allowed = [
    "title",
    "description",
    "event_date",
    "start_time",
    "end_time",
    "dj_act",
    "image_url",
    "ticket_url",
    "status",
  ];
  const updates = Object.fromEntries(
    Object.entries(payload).filter(([k]) => allowed.includes(k)),
  );
  const { data, error } = await repo.update(id, updates);
  if (error) throw new Error("FAILED_TO_UPDATE_EVENT");
  return data;
};

exports.remove = async (id) => {
  await exports.getById(id);
  const { error } = await repo.remove(id);
  if (error) throw new Error("FAILED_TO_DELETE_EVENT");
};
