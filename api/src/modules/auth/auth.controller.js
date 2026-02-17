const service = require("./auth.service");
const { respond } = require("../../utils/common");
exports.login = async (req, res, next) => {
  try {
    const context = {
      correlationId: req.correlationId,
    };

    const { token, user } = await service.login(req.body, context);

    respond(res, 200, {
      success: true,
      user,
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const data = await service.me(req.user);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
