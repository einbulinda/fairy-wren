const periodsService = require("./periods.service");
const auditRepo = require("../audit/audit.repository");

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await periodsService.list(req.query);
    if (error) throw new Error("FAILED_TO_FETCH_PERIODS");
    res.json({ periods: data });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await periodsService.getById(req.params.id);
    if (error || !data) throw new Error("PERIOD_NOT_FOUND");
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getCurrentStatus = async (req, res, next) => {
  try {
    const status = await periodsService.getCurrentStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};

exports.close = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { notes } = req.body;

    const result = await periodsService.closePeriod(
      parseInt(year),
      parseInt(month),
      req.user.id,
      notes
    );

    await auditRepo.log({
      entity: "accounting_periods",
      entity_id: result.period_id,
      action: "PERIOD_CLOSED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { year, month, net_income: result.net_income },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.reopen = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 10) {
      return res.status(400).json({
        error: "REOPEN_REASON_REQUIRED",
        message: "Reason must be at least 10 characters",
      });
    }

    const result = await periodsService.reopenPeriod(
      parseInt(year),
      parseInt(month),
      req.user.id,
      reason
    );

    await auditRepo.log({
      entity: "accounting_periods",
      entity_id: result.period_id,
      action: "PERIOD_REOPENED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { year, month, reason },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const { year } = req.body;
    const result = await periodsService.generatePeriods(year);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.validateDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const result = await periodsService.validatePostingDate(date);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const result = await periodsService.getPeriodStats(
      parseInt(year),
      parseInt(month)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};
