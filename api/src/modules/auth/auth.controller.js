const service = require("./auth.service");
const { respond } = require("../../utils/common");
exports.login = async (req, res, next) => {
  try {
    const context = {
      correlationId: req.correlationId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      app: req.body.app,
    };

    const { token, user, lastSessionEndedAt } = await service.login(
      req.body,
      context,
    );

    respond(res, 200, {
      success: true,
      user,
      token,
      lastSessionEndedAt,
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

exports.updateProfile = async (req, res, next) => {
  try {
    const context = { correlationId: req.correlationId };
    const data = await service.updateProfile(req.user.id, req.body, context);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const context = { correlationId: req.correlationId };
    await service.endSession(req.user.id, req.body.reason || "logout", context);
    respond(res, 200, { success: true });
  } catch (err) {
    next(err);
  }
};

exports.changePin = async (req, res, next) => {
  try {
    const context = { correlationId: req.correlationId };
    const data = await service.changePin(req.user.id, req.body, context);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
