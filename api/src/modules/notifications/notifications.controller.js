const service = require("./notifications.service");

exports.getViewedIds = async (req, res, next) => {
  try {
    const ids = await service.getViewedIds(req.user.id);
    res.json({ viewedIds: ids });
  } catch (err) {
    next(err);
  }
};

exports.markViewed = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true });
    }
    await service.markViewed(req.user.id, items);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
