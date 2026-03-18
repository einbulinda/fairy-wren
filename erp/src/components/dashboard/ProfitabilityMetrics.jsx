import { useMemo } from "react";
import { TrendingUp, TrendingDown, Package, DollarSign, Percent, AlertCircle } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const ProfitabilityMetrics = ({ data }) => {
  const metrics = useMemo(() => {
    if (!data) return null;

    const revenue = Number(data.totalRevenue || 0);
    const cogs = Number(data.cogs || 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const targetMargin = data.targetMargin || 35; // Default target 35%
    const marginVariance = grossMargin - targetMargin;

    // Previous period comparison
    const prevRevenue = Number(data.previousRevenue || 0);
    const prevCogs = Number(data.previousCogs || 0);
    const prevGrossProfit = prevRevenue - prevCogs;
    const prevGrossMargin = prevRevenue > 0 ? (prevGrossProfit / prevRevenue) * 100 : 0;

    const marginChange = grossMargin - prevGrossMargin;
    const profitGrowth = prevGrossProfit > 0 ? ((grossProfit - prevGrossProfit) / prevGrossProfit) * 100 : 0;

    // Industry benchmark (retail/hospitality typical range)
    const industryAvg = 30;
    const vsIndustry = grossMargin - industryAvg;

    return {
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      targetMargin,
      marginVariance,
      marginChange,
      profitGrowth,
      vsIndustry,
      cogsRatio: revenue > 0 ? (cogs / revenue) * 100 : 0,
    };
  }, [data]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-400">
        <p>No profitability data available</p>
      </div>
    );
  }

  const getMarginHealth = (margin) => {
    if (margin >= 40) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/15" };
    if (margin >= 30) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/15" };
    if (margin >= 20) return { label: "Fair", color: "text-orange-400", bg: "bg-orange-500/15" };
    return { label: "Poor", color: "text-red-400", bg: "bg-red-500/15" };
  };

  const health = getMarginHealth(metrics.grossMargin);

  // Decision support recommendations
  const recommendations = [];
  if (metrics.grossMargin < 25) {
    recommendations.push({
      type: "warning",
      message: "Gross margin below 25%. Consider: 1) Review pricing strategy, 2) Negotiate supplier discounts, 3) Reduce waste/spoilage",
      priority: "high",
    });
  }
  if (metrics.marginChange < -5) {
    recommendations.push({
      type: "alert",
      message: `Margin dropped ${Math.abs(metrics.marginChange).toFixed(1)}% vs last month. Investigate cost increases immediately.`,
      priority: "high",
    });
  }
  if (metrics.cogsRatio > 75) {
    recommendations.push({
      type: "warning",
      message: "COGS consuming >75% of revenue. Focus on high-margin products and operational efficiency.",
      priority: "medium",
    });
  }
  if (metrics.vsIndustry < 0) {
    recommendations.push({
      type: "info",
      message: "Margin below industry average (30%). Benchmark against competitors.",
      priority: "low",
    });
  }

  return (
    <div className="space-y-4">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Gross Profit */}
        <div className="bg-surface-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-emerald-500/15">
              <DollarSign size={14} className="text-emerald-400" />
            </div>
            <span className="text-xs text-surface-400">Gross Profit</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(metrics.grossProfit)}</p>
          <div className="flex items-center gap-1 mt-1">
            {metrics.profitGrowth >= 0 ? (
              <TrendingUp size={12} className="text-emerald-400" />
            ) : (
              <TrendingDown size={12} className="text-red-400" />
            )}
            <span className={`text-xs ${metrics.profitGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPercent(metrics.profitGrowth)} vs last month
            </span>
          </div>
        </div>

        {/* COGS */}
        <div className="bg-surface-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-orange-500/15">
              <Package size={14} className="text-orange-400" />
            </div>
            <span className="text-xs text-surface-400">COGS</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(metrics.cogs)}</p>
          <p className="text-xs text-surface-500 mt-1">{metrics.cogsRatio.toFixed(1)}% of revenue</p>
        </div>

        {/* Gross Margin % */}
        <div className="bg-surface-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-primary-500/15">
              <Percent size={14} className="text-primary-400" />
            </div>
            <span className="text-xs text-surface-400">Gross Margin</span>
          </div>
          <p className="text-xl font-bold text-white">{metrics.grossMargin.toFixed(1)}%</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${health.bg} ${health.color}`}>
              {health.label}
            </span>
          </div>
        </div>
      </div>

      {/* Margin vs Target Bar */}
      <div className="bg-surface-800/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-surface-400">Margin Performance</span>
          <span className="text-xs text-surface-500">
            Target: {metrics.targetMargin}% | Industry Avg: 30%
          </span>
        </div>
        <div className="relative h-4 bg-surface-800 rounded-full overflow-hidden">
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-surface-500 z-10"
            style={{ left: `${(metrics.targetMargin / 60) * 100}%` }}
          />
          {/* Actual margin */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              metrics.grossMargin >= metrics.targetMargin
                ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                : metrics.grossMargin >= 25
                  ? "bg-gradient-to-r from-orange-600 to-orange-400"
                  : "bg-gradient-to-r from-red-600 to-red-400"
            }`}
            style={{ width: `${Math.min((metrics.grossMargin / 60) * 100, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-surface-400">vs Target:</span>
            <span className={metrics.marginVariance >= 0 ? "text-emerald-400" : "text-red-400"}>
              {metrics.marginVariance >= 0 ? "+" : ""}{metrics.marginVariance.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-surface-400">vs Industry:</span>
            <span className={metrics.vsIndustry >= 0 ? "text-emerald-400" : "text-orange-400"}>
              {metrics.vsIndustry >= 0 ? "+" : ""}{metrics.vsIndustry.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Decision Support Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Recommendations</p>
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                rec.priority === "high"
                  ? "bg-red-500/10 border border-red-500/20"
                  : rec.priority === "medium"
                    ? "bg-orange-500/10 border border-orange-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
              }`}
            >
              <AlertCircle
                size={14}
                className={`shrink-0 mt-0.5 ${
                  rec.priority === "high" ? "text-red-400" : rec.priority === "medium" ? "text-orange-400" : "text-blue-400"
                }`}
              />
              <span className="text-surface-300">{rec.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfitabilityMetrics;
