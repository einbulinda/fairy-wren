const service = require("./notifications.service");

const VALID_ENTITY_TYPES = new Set(["stock_take", "reservation", "feedback"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidItem = (item) =>
  item &&
  typeof item === "object" &&
  VALID_ENTITY_TYPES.has(item.entity_type) &&
  typeof item.entity_id === "string" &&
  UUID_RE.test(item.entity_id);

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

    const invalid = items.filter((i) => !isValidItem(i));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_NOTIFICATION_ITEMS", message: "Each item must have a valid entity_type and a UUID entity_id." },
      });
    }

    await service.markViewed(req.user.id, items);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
