const service = require("./system-logs.service");
const { respond } = require("../../utils/common");

exports.getEntries = async (req, res, next) => {
  try {
    respond(res, 200, await service.getEntries(req.query));
  } catch (err) {
    next(err);
  }
};

exports.listFiles = async (_req, res, next) => {
  try {
    respond(res, 200, await service.listFiles());
  } catch (err) {
    next(err);
  }
};

exports.downloadFile = async (req, res, next) => {
  try {
    const full = await service.resolveFile(req.params.name);
    res.download(full, req.params.name, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    next(err);
  }
};
