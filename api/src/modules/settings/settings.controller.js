const service = require("./settings.service");
const { respond } = require("../../utils/common");

exports.getSettings = async (req, res, next) => {
  try {
    const data = await service.getSettings();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const data = await service.updateSettings(req.body);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
