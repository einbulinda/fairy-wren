const service = require("./journals.service");
const { respond, buildContext } = require("../../utils/common");

exports.listJournals = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getJournal = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.journalId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createJournal = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.voidJournal = async (req, res, next) => {
  try {
    const data = await service.void(req.params.journalId, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
