const getSupabase = require("../../config/supabase");
const logger = require("../../utils/logger");

exports.list = async (filters = {}) => {
  const supabase = getSupabase();
  let query = supabase
    .from("accounting_periods")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (filters.year) query = query.eq("year", filters.year);
  if (filters.status) query = query.eq("status", filters.status);

  return query;
};

exports.getById = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("accounting_periods")
    .select("*")
    .eq("id", id)
    .single();
};

exports.getCurrentStatus = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("rpc_get_period_status", {
    p_date: new Date().toISOString().split("T")[0],
  });

  if (error) throw new Error("FAILED_TO_GET_PERIOD_STATUS");
  return data;
};

exports.closePeriod = async (year, month, closedBy, notes = null) => {
  const supabase = getSupabase();

  logger.info("Closing accounting period", { year, month, closedBy });

  const { data, error } = await supabase.rpc("close_accounting_period", {
    p_year: year,
    p_month: month,
    p_closed_by: closedBy,
    p_notes: notes,
    p_create_closing_entry: true,
  });

  if (error) {
    logger.error("Failed to close period", { error: error.message });
    throw new Error(error.message || "FAILED_TO_CLOSE_PERIOD");
  }

  return data;
};

exports.reopenPeriod = async (year, month, reopenedBy, reason) => {
  const supabase = getSupabase();

  if (!reason || reason.length < 10) {
    throw new Error("REOPEN_REASON_REQUIRED_MIN_10_CHARS");
  }

  logger.info("Reopening accounting period", { year, month, reopenedBy });

  const { data, error } = await supabase.rpc("reopen_accounting_period", {
    p_year: year,
    p_month: month,
    p_reopened_by: reopenedBy,
    p_reason: reason,
  });

  if (error) {
    logger.error("Failed to reopen period", { error: error.message });
    throw new Error(error.message || "FAILED_TO_REOPEN_PERIOD");
  }

  return data;
};

exports.generatePeriods = async (year) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("generate_accounting_periods", {
    p_year: year,
  });

  if (error) throw new Error("FAILED_TO_GENERATE_PERIODS");

  return { year, periodsCreated: data };
};

exports.validatePostingDate = async (date) => {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("is_period_closed", {
    p_date: date,
  });

  if (error) throw new Error("FAILED_TO_VALIDATE_DATE");

  return {
    date,
    isClosed: data,
    canPost: !data,
  };
};

exports.getPeriodStats = async (year, month) => {
  const supabase = getSupabase();

  // Get period details
  const { data: period } = await supabase
    .from("accounting_periods")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .single();

  if (!period) throw new Error("PERIOD_NOT_FOUND");

  // Get transaction counts
  const { data: txnCounts } = await supabase
    .from("journal_entries")
    .select("source_type, count")
    .gte("entry_date", period.start_date)
    .lte("entry_date", period.end_date)
    .group("source_type");

  return {
    period,
    transactionCounts: txnCounts || [],
  };
};
