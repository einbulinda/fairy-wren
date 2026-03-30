const bankReconciliationService = require("./bank-reconciliation.service");
const auditRepo = require("../audit/audit.repository");

exports.listStatements = async (req, res, next) => {
  try {
    const { accountId, status, year, month, limit = 50, offset = 0 } = req.query;
    const data = await bankReconciliationService.listStatements({
      accountId,
      status,
      year,
      month,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ statements: data });
  } catch (err) {
    next(err);
  }
};

exports.getStatement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await bankReconciliationService.getStatementWithLines(id);
    res.json({ statement: data });
  } catch (err) {
    next(err);
  }
};

exports.importStatement = async (req, res, next) => {
  try {
    const {
      bankAccountId,
      statementDate,
      startDate,
      endDate,
      openingBalance,
      closingBalance,
      lines,
      description,
    } = req.body;

    // Validate required fields
    if (!bankAccountId || !statementDate || !startDate || !endDate || 
        typeof openingBalance !== "number" || typeof closingBalance !== "number") {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "STATEMENT_LINES_REQUIRED" });
    }

    // Validate line totals match statement
    const lineTotal = lines.reduce((sum, l) => sum + (l.deposit || 0) - (l.withdrawal || 0), 0);
    const statementTotal = closingBalance - openingBalance;

    if (Math.abs(lineTotal - statementTotal) > 0.01) {
      return res.status(400).json({
        error: "STATEMENT_TOTAL_MISMATCH",
        expected: statementTotal,
        actual: lineTotal,
        difference: statementTotal - lineTotal,
      });
    }

    const result = await bankReconciliationService.importStatement({
      bankAccountId,
      statementDate,
      startDate,
      endDate,
      openingBalance,
      closingBalance,
      lines,
      description: description || `Statement ${startDate} to ${endDate}`,
      userId: req.user.id,
    });

    await auditRepo.log({
      entity: "bank_statements",
      entity_id: result.id,
      action: "STATEMENT_IMPORTED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { bank_account_id: bankAccountId, line_count: lines.length },
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.autoMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateTolerance = 2 } = req.body;

    const result = await bankReconciliationService.autoMatch(id, {
      dateTolerance: parseInt(dateTolerance),
    });

    await auditRepo.log({
      entity: "bank_statements",
      entity_id: id,
      action: "AUTO_MATCHED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { matched: result.matched, unmatched: result.unmatched },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.manualMatch = async (req, res, next) => {
  try {
    const { id, lineId } = req.params;
    const { journalEntryId, adjustmentAmount } = req.body;

    if (!journalEntryId) {
      return res.status(400).json({ error: "JOURNAL_ENTRY_ID_REQUIRED" });
    }

    const result = await bankReconciliationService.manualMatch(id, lineId, journalEntryId, adjustmentAmount);

    await auditRepo.log({
      entity: "bank_statement_lines",
      entity_id: lineId,
      action: "MANUALLY_MATCHED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { journal_entry_id: journalEntryId, adjustment: adjustmentAmount },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.unmatchLine = async (req, res, next) => {
  try {
    const { id, lineId } = req.params;

    const result = await bankReconciliationService.unmatchLine(id, lineId);

    await auditRepo.log({
      entity: "bank_statement_lines",
      entity_id: lineId,
      action: "UNMATCHED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getReconciliationReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await bankReconciliationService.getReconciliationReport(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.finalize = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjustments = [] } = req.body;

    const result = await bankReconciliationService.finalize(id, adjustments, {
      userId: req.user.id,
    });

    await auditRepo.log({
      entity: "bank_statements",
      entity_id: id,
      action: "RECONCILIATION_FINALIZED",
      performed_by: req.user.id,
      correlation_id: req.correlationId,
      metadata: { adjustments_posted: adjustments.length },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getSuggestedMatches = async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const data = await bankReconciliationService.getSuggestedMatches(lineId);
    res.json({ suggestions: data });
  } catch (err) {
    next(err);
  }
};

exports.getBankGlDetails = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    const data = await bankReconciliationService.getBankGlDetails(
      accountId,
      startDate,
      endDate
    );
    res.json({ entries: data });
  } catch (err) {
    next(err);
  }
};
