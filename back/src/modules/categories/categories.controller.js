const service = require("./categories.service");
const { respond, buildContext } = require("../../utils/common");

exports.listCategories = async (req, res, next) => {
  try {
    const data = await service.list();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await service.update(
      req.params.id,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.archiveCategory = async (req, res, next) => {
  try {
    await service.archive(req.params.id, req.query.active, buildContext(req));
    respond(res, 204, { success: true });
  } catch (err) {
    next(err);
  }
};
