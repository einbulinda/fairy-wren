const eventsService = require("./events.service");

exports.list = async (req, res, next) => {
  try {
    const result = await eventsService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await eventsService.getById(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await eventsService.create(req.body, { userId: req.user.id });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await eventsService.update(req.params.id, req.body, { userId: req.user.id });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await eventsService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.uploadPoster = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "NO_FILE_PROVIDED" });
    const data = await eventsService.uploadPoster(req.params.id, req.file);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
