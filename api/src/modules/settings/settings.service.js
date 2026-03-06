const repo = require("./settings.repository");

exports.getSettings = async () => {
  const { data, error } = await repo.getAll();
  if (error) throw new Error("FAILED_TO_FETCH_SETTINGS");

  // Convert array of {key, value} to a flat object
  const settings = {};
  for (const row of data) {
    settings[row.key] = row.value;
  }
  return settings;
};

exports.updateSettings = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("INVALID_SETTINGS_DATA");
  }

  const entries = Object.entries(payload).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));

  if (entries.length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { error } = await repo.bulkUpsert(entries);
  if (error) throw new Error("FAILED_TO_UPDATE_SETTINGS");

  return exports.getSettings();
};
