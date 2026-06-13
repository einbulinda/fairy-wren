const repo = require("./notifications.repository");

exports.markViewed = async (userId, items) => {
  const { error } = await repo.markViewed(userId, items);
  if (error) throw new Error("FAILED_TO_MARK_VIEWED");
};

exports.getViewedIds = async (userId) => {
  const { data, error } = await repo.getViewedIds(userId);
  if (error) throw new Error("FAILED_TO_FETCH_VIEWED_IDS");
  return data;
};
