const supabase = require("../../config/supabase");

// Sales report
exports.salesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase.from("bills").select("*").eq("status", "completed");

    if (startDate && endDate) {
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalSales = data.reduce(
      (sum, bill) => sum + parseFloat(bill.total_amount),
      0
    );
    const billCount = data.length;

    res.json({
      totalSales,
      billCount,
      bills: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
