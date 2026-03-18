import { useMemo } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, AlertTriangle, TrendingUp, Calendar, Clock } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const CashFlowWidget = ({ data }) => {
  const cashFlow = useMemo(() => {
    if (!data) return null;

    const currentCash = Number(data.cashPosition || 0);
    const bankBalance = Number(data.bankBalance || 0);
    const totalLiquid = currentCash + bankBalance;

    // Expected inflows from outstanding bills (aging weighted)
    const outstandingBills = data.outstandingBills || [];
    const expectedIn7Days = outstandingBills
      .filter((b) => b.days_outstanding <= 7)
      .reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0);
    const expectedIn30Days = outstandingBills
      .filter((b) => b.days_outstanding <= 30)
      .reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0);

    // Expected outflows (upcoming payables)
    const pendingPayables = Number(data.pendingPayables || 0);
    const upcomingExpenses = Number(data.upcomingExpenses || 0);
    const expectedOut7Days = pendingPayables * 0.3 + upcomingExpenses; // Assume 30% of payables due within 7 days
    const expectedOut30Days = pendingPayables + upcomingExpenses;

    // Projections
    const projected7Days = totalLiquid + expectedIn7Days - expectedOut7Days;
    const projected30Days = totalLiquid + expectedIn30Days - expectedOut30Days;

    // Monthly burn rate (from expenses)
    const monthlyExpenses = Number(data.monthlyExpenses || 0);
    const monthlyRevenue = Number(data.totalRevenue || 0);
    const netCashFlow = monthlyRevenue - monthlyExpenses;
    const runwayMonths = monthlyExpenses > 0 ? totalLiquid / monthlyExpenses : 0;

    // Days of cash on hand
    const dailyBurn = monthlyExpenses / 30;
    const daysOfCash = dailyBurn > 0 ? Math.floor(totalLiquid / dailyBurn) : 999;

    return {
      currentCash,
      bankBalance,
      totalLiquid,
      expectedIn7Days,
      expectedIn30Days,
      expectedOut7Days,
      expectedOut30Days,
      projected7Days,
      projected30Days,
      monthlyExpenses,
      netCashFlow,
      runwayMonths,
      daysOfCash,
      pendingPayables,
    };
  }, [data]);

  if (!cashFlow) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-400">
        <p>No cash flow data available</p>
      </div>
    );
  }

  // Decision support alerts
  const alerts = [];
  if (cashFlow.daysOfCash < 14) {
    alerts.push({
      type: "critical",
      message: `Critical: Only ${cashFlow.daysOfCash} days of cash remaining. Accelerate collections immediately.`,
    });
  } else if (cashFlow.daysOfCash < 30) {
    alerts.push({
      type: "warning",
      message: `Warning: ${cashFlow.daysOfCash} days of cash. Monitor closely and prepare contingency funding.`,
    });
  }
  if (cashFlow.projected7Days < 0) {
    alerts.push({
      type: "critical",
      message: "Negative cash flow projected within 7 days. Delay non-essential payments or secure short-term funding.",
    });
  }
  if (cashFlow.netCashFlow < 0) {
    alerts.push({
      type: "warning",
      message: `Monthly cash burn of ${formatCurrency(Math.abs(cashFlow.netCashFlow))}. Review expenses to improve cash flow.`,
    });
  }

  const getHealthStatus = (days) => {
    if (days >= 60) return { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-500/15" };
    if (days >= 30) return { label: "Adequate", color: "text-blue-400", bg: "bg-blue-500/15" };
    if (days >= 14) return { label: "Low", color: "text-orange-400", bg: "bg-orange-500/15" };
    return { label: "Critical", color: "text-red-400", bg: "bg-red-500/15" };
  };

  const health = getHealthStatus(cashFlow.daysOfCash);

  return (
    <div className="space-y-4">
      {/* Current Cash Position */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-400 mb-1">Total Liquid Cash</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(cashFlow.totalLiquid)}</p>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-surface-400">
              Cash: <span className="text-surface-300">{formatCurrency(cashFlow.currentCash)}</span>
            </span>
            <span className="text-surface-400">
              Bank: <span className="text-surface-300">{formatCurrency(cashFlow.bankBalance)}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${health.bg}`}>
            <Wallet size={14} className={health.color} />
            <span className={`text-sm font-medium ${health.color}`}>{health.label}</span>
          </div>
          <p className="text-xs text-surface-500 mt-1">{cashFlow.daysOfCash} days runway</p>
        </div>
      </div>

      {/* Cash Flow Projection */}
      <div className="bg-surface-800/30 rounded-lg p-3">
        <p className="text-xs font-medium text-surface-400 mb-3">Cash Flow Projection</p>
        
        {/* Inflows */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={12} className="text-emerald-400" />
              <span className="text-surface-400">Expected Inflows</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-4">
            <div className="bg-surface-800/50 rounded p-2">
              <p className="text-xs text-surface-500">7 Days</p>
              <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(cashFlow.expectedIn7Days)}</p>
            </div>
            <div className="bg-surface-800/50 rounded p-2">
              <p className="text-xs text-surface-500">30 Days</p>
              <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(cashFlow.expectedIn30Days)}</p>
            </div>
          </div>
        </div>

        {/* Outflows */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={12} className="text-red-400" />
              <span className="text-surface-400">Expected Outflows</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-4">
            <div className="bg-surface-800/50 rounded p-2">
              <p className="text-xs text-surface-500">7 Days</p>
              <p className="text-sm font-semibold text-red-400">-{formatCurrency(cashFlow.expectedOut7Days)}</p>
            </div>
            <div className="bg-surface-800/50 rounded p-2">
              <p className="text-xs text-surface-500">30 Days</p>
              <p className="text-sm font-semibold text-red-400">-{formatCurrency(cashFlow.expectedOut30Days)}</p>
            </div>
          </div>
        </div>

        {/* Projected Balance */}
        <div className="border-t border-surface-700 pt-3">
          <p className="text-xs text-surface-400 mb-2">Projected Balance</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded p-2 ${cashFlow.projected7Days >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <p className="text-xs text-surface-500">In 7 Days</p>
              <p className={`text-sm font-bold ${cashFlow.projected7Days >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(cashFlow.projected7Days)}
              </p>
            </div>
            <div className={`rounded p-2 ${cashFlow.projected30Days >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <p className="text-xs text-surface-500">In 30 Days</p>
              <p className={`text-sm font-bold ${cashFlow.projected30Days >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(cashFlow.projected30Days)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow */}
      <div className="flex items-center justify-between bg-surface-800/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-surface-400" />
          <span className="text-xs text-surface-400">Monthly Cash Flow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-500">
            Expenses: <span className="text-surface-300">{formatCurrency(cashFlow.monthlyExpenses)}</span>
          </span>
          <div className={`flex items-center gap-1 text-xs ${cashFlow.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {cashFlow.netCashFlow >= 0 ? <TrendingUp size={12} /> : <AlertTriangle size={12} />}
            <span>{cashFlow.netCashFlow >= 0 ? "+" : ""}{formatCurrency(cashFlow.netCashFlow)}</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                alert.type === "critical"
                  ? "bg-red-500/15 border border-red-500/30"
                  : "bg-orange-500/15 border border-orange-500/30"
              }`}
            >
              <AlertTriangle
                size={14}
                className={`shrink-0 mt-0.5 ${alert.type === "critical" ? "text-red-400" : "text-orange-400"}`}
              />
              <span className="text-surface-300">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending Payables Quick View */}
      {cashFlow.pendingPayables > 0 && (
        <div className="flex items-center justify-between text-xs bg-surface-800/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-orange-400" />
            <span className="text-surface-400">Pending Payables</span>
          </div>
          <span className="font-semibold text-orange-400">{formatCurrency(cashFlow.pendingPayables)}</span>
        </div>
      )}
    </div>
  );
};

export default CashFlowWidget;
