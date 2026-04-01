const repo = require("./feedback.repository");

exports.submit = async ({ name, email, message, rating, type }) => {
  if (!name || !name.trim()) throw new Error("FEEDBACK_NAME_REQUIRED");
  if (!message || !message.trim()) throw new Error("FEEDBACK_MESSAGE_REQUIRED");
  if (rating && (rating < 1 || rating > 5)) throw new Error("FEEDBACK_RATING_INVALID");

  const resolvedType = type === "complaint" ? "complaint" : "feedback";

  const { data, error } = await repo.create({
    name: name.trim(),
    email: email ? email.trim() : null,
    message: message.trim(),
    rating: rating || null,
    type: resolvedType,
    status: "new",
  });
  if (error) throw new Error("FAILED_TO_SAVE_FEEDBACK");

  // Broadcast real-time notification to ERP users
  const broadcast = global.broadcast;
  if (broadcast) {
    broadcast("feedback:new", {
      id: data.id,
      name: data.name,
      type: data.type,
      rating: data.rating,
      preview: data.message.substring(0, 80),
      created_at: data.created_at,
    });
  }

  return data;
};

exports.list = async (filters) => {
  const { data, error, count } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_FEEDBACK");
  return { feedback: data, total: count };
};

exports.markRead = async (id) => {
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("FEEDBACK_NOT_FOUND");

  const { data, error } = await repo.updateStatus(id, "read");
  if (error) throw new Error("FAILED_TO_UPDATE_FEEDBACK");
  return data;
};

exports.archive = async (id) => {
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("FEEDBACK_NOT_FOUND");

  const { data, error } = await repo.updateStatus(id, "archived");
  if (error) throw new Error("FAILED_TO_UPDATE_FEEDBACK");
  return data;
};
