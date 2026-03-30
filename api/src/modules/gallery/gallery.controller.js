const galleryService = require("./gallery.service");

exports.list = async (req, res, next) => {
  try {
    const result = await galleryService.list();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.listPublic = async (req, res, next) => {
  try {
    const result = await galleryService.list({ activeOnly: true });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "NO_FILE_PROVIDED" });
    const data = await galleryService.upload(req.file, {
      caption: req.body.caption,
      context: { userId: req.user.id },
    });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await galleryService.update(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "ORDERED_IDS_REQUIRED" });
    await galleryService.reorder(orderedIds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await galleryService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
