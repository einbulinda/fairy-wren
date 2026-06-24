const repo = require("./audit.repository");

exports.listLogs = async (req, res, next) => {
  try {
    const result = await repo.listLogs(req.query);
    res.set("Cache-Control", "private, max-age=10");
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getDistinctEntities = async (req, res, next) => {
  try {
    const entities = await repo.getDistinctEntities();
    res.status(200).json({ success: true, data: entities });
  } catch (err) {
    next(err);
  }
};
