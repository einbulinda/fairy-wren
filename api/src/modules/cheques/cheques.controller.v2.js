const chequesService = require("./cheques.service");
const logger = require("../../utils/logger");

exports.list = async (req, res, next) => {
  try {
    const data = await chequesService.list(req.query);
    res.json({ cheques: data });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await chequesService.getDetailed(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await chequesService.create(req.body, {
      userId: req.user.id,
      correlationId: req.correlationId,
    });
    
    // Return with cache-busting header
    res.setHeader('X-Cache-Invalidated', 'true');
    res.setHeader('X-Affected-Accounts', 
      `${data.bank_account_id},${data.debit_account_id}`);
    
    res.status(201).json(data);
  } catch (err) {
    logger.error("Cheque creation failed", { error: err.message, body: req.body });
    next(err);
  }
};

exports.clear = async (req, res, next) => {
  try {
    const data = await chequesService.clear(req.params.id, {
      userId: req.user.id,
      correlationId: req.correlationId,
    });
    
    res.setHeader('X-Cache-Invalidated', 'true');
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.void = async (req, res, next) => {
  try {
    const data = await chequesService.void(req.params.id, {
      userId: req.user.id,
      correlationId: req.correlationId,
    });
    
    res.setHeader('X-Cache-Invalidated', 'true');
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.validateAccounts = async (req, res, next) => {
  try {
    const { bank_account_id, debit_account_id } = req.body;
    
    if (!bank_account_id || !debit_account_id) {
      return res.status(400).json({ 
        error: "BANK_AND_DEBIT_ACCOUNT_REQUIRED" 
      });
    }
    
    const validation = await chequesService.validateAccounts(
      bank_account_id, 
      debit_account_id
    );
    
    res.json(validation);
  } catch (err) {
    next(err);
  }
};

exports.getLinkageReport = async (req, res, next) => {
  try {
    const { data, error } = await chequesService.getLinkageReport(req.query);
    
    if (error) throw new Error("FAILED_TO_FETCH_LINKAGE_REPORT");
    
    // Calculate summary stats
    const summary = {
      total: data?.length || 0,
      with_journal: data?.filter(d => d.has_journal).length || 0,
      without_journal: data?.filter(d => !d.has_journal).length || 0,
      voided_with_reversal: data?.filter(d => d.status === 'voided' && d.has_reversal).length || 0,
      total_amount: data?.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0) || 0
    };
    
    res.json({ 
      cheques: data,
      summary,
      filters: req.query
    });
  } catch (err) {
    next(err);
  }
};

// Real-time subscription endpoint
exports.subscribe = (req, res) => {
  // SSE endpoint for real-time cheque updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Listen for financial data changes
  const listener = (data) => {
    if (data.type === 'cheque') {
      sendUpdate({
        event: 'cheque_updated',
        timestamp: new Date().toISOString(),
        data
      });
    }
  };
  
  // Register listener (would need actual implementation)
  // global.eventEmitter.on('financial:data:changed', listener);
  
  // Cleanup on disconnect
  req.on('close', () => {
    // global.eventEmitter.off('financial:data:changed', listener);
  });
  
  // Send initial connection message
  sendUpdate({ event: 'connected', timestamp: new Date().toISOString() });
};
