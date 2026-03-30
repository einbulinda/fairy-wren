const feedbackService = require("./feedback.service");

exports.list = async (req, res, next) => {
  try {
    const result = await feedbackService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const data = await feedbackService.markRead(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.archive = async (req, res, next) => {
  try {
    const data = await feedbackService.archive(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
