const service = require("./pos.bootstrap.service");
const { respond } = require("../../utils/common");

exports.bootstrap = async (req, res, next) => {
  try {
    const data = await service.getBootstrapData();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
