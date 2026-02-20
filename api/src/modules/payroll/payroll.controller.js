const service = require("./payroll.service");
const { respond, buildContext } = require("../../utils/common");

exports.listEmployees = async (req, res, next) => {
  try {
    const data = await service.listEmployees();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.upsertSalaryStructure = async (req, res, next) => {
  try {
    const data = await service.upsertSalaryStructure(
      req.params.profileId,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.listRuns = async (req, res, next) => {
  try {
    const data = await service.listRuns();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.processRun = async (req, res, next) => {
  try {
    const data = await service.processPayrollRun(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getRunDetail = async (req, res, next) => {
  try {
    const data = await service.getRunDetail(req.params.runId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.markRunPaid = async (req, res, next) => {
  try {
    const data = await service.markRunPaid(req.params.runId, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
