import { useMemo } from "react";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  TrendingDown, 
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Target,
  ArrowRight,
  Bell,
  X
} from "lucide-react";
import { useState } from "react";

const DecisionSupportPanel = ({ data }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const insights = useMemo(() => {
    if (!data) return [];

    const alerts = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // === REVENUE ANALYSIS ===
    const revenue = Number(data.totalRevenue || 0);
    const prevRevenue = Number(data.previousRevenue || 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const targetRevenue = Number(data.targetRevenue || prevRevenue * 1.1);
    const targetAchievement = targetRevenue > 0 ? (revenue / targetRevenue) * 100 : 0;

    // Sales trend anomaly detection
    const dailyRevenue = data.dailyRevenue || [];
    if (dailyRevenue.length >= 7) {
      const recentDays = dailyRevenue.slice(-7);
      const avgRecent = recentDays.reduce((sum, d) => sum + Number(d.total_revenue || 0), 0) / 7;
      const prevWeek = dailyRevenue.slice(-14, -7);
      if (prevWeek.length === 7) {
        const avgPrev = prevWeek.reduce((sum, d) => sum + Number(d.total_revenue || 0), 0) / 7;
        const weekChange = avgPrev > 0 ? ((avgRecent - avgPrev) / avgPrev) * 100 : 0;
        
        if (weekChange < -20) {
          alerts.push({
            id: "sales-drop",
            category: "sales",
            severity: "critical",
            icon: TrendingDown,
            title: "Sales Decline Alert",
            message: `Sales dropped ${Math.abs(weekChange).toFixed(1)}% compared to last week. Immediate action recommended.`,
            actions: ["Review Pricing", "Check Competition", "Launch Promotion"],
            metric: `${weekChange.toFixed(1)}%`,
          });
        } else if (weekChange > 30) {
          alerts.push({
            id: "sales-spike",
            category: "sales",
            severity: "success",
            icon: TrendingUp,
            title: "Sales Surge Detected",
            message: `Sales up ${weekChange.toFixed(1)}% vs last week. Ensure adequate stock levels.`,
            actions: ["Check Inventory", "Analyze Trend"],
            metric: `+${weekChange.toFixed(1)}%`,
          });
        }
      }
    }

    // Target tracking
    if (targetAchievement < 70 && new Date().getDate() > 20) {
      alerts.push({
        id: "target-risk",
        category: "sales",
        severity: "warning",
        icon: Target,
        title: "Monthly Target At Risk",
        message: `Only ${targetAchievement.toFixed(0)}% of revenue target achieved with ${30 - new Date().getDate()} days remaining. Need ${formatCurrency(targetRevenue - revenue)} more.`,
        actions: ["Push Marketing", "Staff Incentives", "Extend Hours"],
        metric: `${targetAchievement.toFixed(0)}%`,
      });
    }

    // === PROFITABILITY ANALYSIS ===
    const cogs = Number(data.cogs || 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const prevMargin = data.previousMargin || 30;
    const marginChange = grossMargin - prevMargin;

    if (grossMargin < 20) {
      alerts.push({
        id: "low-margin",
        category: "profitability",
        severity: "critical",
        icon: DollarSign,
        title: "Critical Margin Alert",
        message: `Gross margin at ${grossMargin.toFixed(1)}% is dangerously low. Business sustainability at risk.`,
        actions: ["Review Pricing", "Cut Costs", "Focus High-Margin Products"],
        metric: `${grossMargin.toFixed(1)}%`,
      });
    } else if (marginChange < -5) {
      alerts.push({
        id: "margin-decline",
        category: "profitability",
        severity: "warning",
        icon: TrendingDown,
        title: "Margin Erosion",
        message: `Gross margin dropped ${Math.abs(marginChange).toFixed(1)}% vs previous period. Review cost structure urgently.`,
        actions: ["Audit COGS", "Renegotiate Suppliers"],
        metric: `${marginChange.toFixed(1)}%`,
      });
    }

    // === CASH FLOW ANALYSIS ===
    const cashPosition = Number(data.cashPosition || 0) + Number(data.bankBalance || 0);
    const monthlyExpenses = Number(data.monthlyExpenses || cogs * 0.3);
    const daysOfCash = monthlyExpenses > 0 ? Math.floor((cashPosition / monthlyExpenses) * 30) : 999;
    const outstandingAmount = (data.outstandingBills || []).reduce(
      (sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0
    );

    if (daysOfCash < 14) {
      alerts.push({
        id: "cash-critical",
        category: "cashflow",
        severity: "critical",
        icon: AlertTriangle,
        title: "Critical Cash Position",
        message: `Only ${daysOfCash} days of cash remaining. ${formatCurrency(outstandingAmount)} outstanding - accelerate collections immediately.`,
        actions: ["Call Debtors", "Delay Payments", "Emergency Credit"],
        metric: `${daysOfCash} days`,
      });
    } else if (daysOfCash < 30) {
      alerts.push({
        id: "cash-warning",
        category: "cashflow",
        severity: "warning",
        icon: AlertCircle,
        title: "Low Cash Reserve",
        message: `${daysOfCash} days of runway. Monitor closely and prepare contingency funding.`,
        actions: ["Accelerate Collections", "Reduce Spending"],
        metric: `${daysOfCash} days`,
      });
    }

    // Outstanding bills aging
    const oldBills = (data.outstandingBills || []).filter((b) => {
      const days = Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
      return days > 30;
    });
    const oldAmount = oldBills.reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0);
    
    if (oldAmount > 50000) {
      alerts.push({
        id: "aging-receivables",
        category: "cashflow",
        severity: "warning",
        icon: DollarSign,
        title: "Aging Receivables",
        message: `${formatCurrency(oldAmount)} in bills overdue 30+ days. Risk of bad debt increasing.`,
        actions: ["Escalate Collections", "Offer Payment Plans", "Consider Write-offs"],
        metric: formatCurrency(oldAmount),
      });
    }

    // === INVENTORY ANALYSIS ===
    const stockItems = data.stockItems || [];
    const outOfStock = stockItems.filter((s) => s.current_stock <= 0).length;
    const lowStock = stockItems.filter((s) => s.current_stock > 0 && s.current_stock <= (s.reorder_point || 10)).length;

    if (outOfStock > 0) {
      alerts.push({
        id: "stockout",
        category: "inventory",
        severity: "critical",
        icon: Package,
        title: "Stockout Alert",
        message: `${outOfStock} products out of stock. Immediate revenue loss - reorder now.`,
        actions: ["Emergency Reorder", "Check Alternatives"],
        metric: `${outOfStock} items`,
      });
    }
    if (lowStock > 5) {
      alerts.push({
        id: "low-stock",
        category: "inventory",
        severity: "warning",
        icon: Package,
        title: "Multiple Low Stock Items",
        message: `${lowStock} products below reorder point. Create consolidated purchase order.`,
        actions: ["Create PO", "Review Lead Times"],
        metric: `${lowStock} items`,
      });
    }

    // Dead stock detection
    const topSellingIds = (data.topSellingProducts || []).map((p) => p.product_id);
    const potentialDeadStock = stockItems
      .filter((s) => s.current_stock > 20 && !topSellingIds.includes(s.product_id))
      .slice(0, 3);
    const deadStockValue = potentialDeadStock.reduce((sum, s) => sum + s.current_stock * (s.average_cost || 0), 0);
    
    if (deadStockValue > 10000) {
      alerts.push({
        id: "dead-stock",
        category: "inventory",
        severity: "info",
        icon: Package,
        title: "Dead Stock Risk",
        message: `${formatCurrency(deadStockValue)} tied in slow-moving inventory. Consider clearance sale.`,
        actions: ["Run Promotion", "Bundle Products"],
        metric: formatCurrency(deadStockValue),
      });
    }

    // === STAFF PERFORMANCE ===
    const staffPerf = data.staffPerformance || [];
    const lowPerformers = staffPerf.filter((s) => {
      const target = Number(s.target_revenue || 50000);
      const actual = Number(s.total_revenue || 0);
      return actual < target * 0.6 && Number(s.total_bills) > 0;
    });

    if (lowPerformers.length > 1) {
      alerts.push({
        id: "staff-performance",
        category: "staff",
        severity: "warning",
        icon: Users,
        title: "Staff Performance Gap",
        message: `${lowPerformers.length} staff members significantly below target. Training or reassignment needed.`,
        actions: ["Schedule Training", "Review Targets", "One-on-Ones"],
        metric: `${lowPerformers.length} staff`,
      });
    }

    // === SEASONAL/TRENDING INSIGHTS ===
    const dayOfWeekData = data.dayOfWeekPerformance || [];
    if (dayOfWeekData.length === 7) {
      const sorted = [...dayOfWeekData].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));
      const bestDay = sorted[0];
      const worstDay = sorted[sorted.length - 1];
      const ratio = Number(worstDay.total_revenue) > 0 
        ? Number(bestDay.total_revenue) / Number(worstDay.total_revenue) 
        : 1;
      
      if (ratio > 3) {
        alerts.push({
          id: "day-imbalance",
          category: "insights",
          severity: "info",
          icon: Info,
          title: "Sales Day Imbalance",
          message: `${bestDay.day_name} generates ${ratio.toFixed(1)}x more revenue than ${worstDay.day_name}. Consider promotions on slow days.`,
          actions: ["Tuesday Special", "Weekday Happy Hour"],
          metric: `${ratio.toFixed(1)}x`,
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [data]);

  const handleDismiss = (id) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  };

  const visibleInsights = insights.filter((i) => !dismissedAlerts.has(i.id));

  if (visibleInsights.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-surface-800/30 border border-surface-700 rounded-xl">
        <div className="text-center">
          <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-surface-400">All systems operating normally</p>
          <p className="text-xs text-surface-500 mt-1">No action items at this time</p>
        </div>
      </div>
    );
  }

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
        return {
          border: "border-red-500/30",
          bg: "bg-red-500/10",
          icon: "text-red-400",
          badge: "bg-red-500/20 text-red-400",
        };
      case "warning":
        return {
          border: "border-orange-500/30",
          bg: "bg-orange-500/10",
          icon: "text-orange-400",
          badge: "bg-orange-500/20 text-orange-400",
        };
      case "success":
        return {
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          icon: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-400",
        };
      default:
        return {
          border: "border-blue-500/30",
          bg: "bg-blue-500/10",
          icon: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-400",
        };
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      sales: "Sales",
      profitability: "Profitability",
      cashflow: "Cash Flow",
      inventory: "Inventory",
      staff: "Staff",
      insights: "Insights",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary-400" />
          <span className="text-sm font-medium text-white">Action Items</span>
          <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
            {visibleInsights.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {insights.some((i) => i.severity === "critical") && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              {insights.filter((i) => i.severity === "critical").length} Critical
            </span>
          )}
          {insights.some((i) => i.severity === "warning") && (
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2 h-2 bg-orange-400 rounded-full" />
              {insights.filter((i) => i.severity === "warning").length} Warning
            </span>
          )}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {visibleInsights.map((insight) => {
          const styles = getSeverityStyles(insight.severity);
          const Icon = insight.icon;

          return (
            <div
              key={insight.id}
              className={`relative p-3 rounded-lg border ${styles.border} ${styles.bg} transition-all hover:brightness-110`}
            >
              <button
                onClick={() => handleDismiss(insight.id)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
              >
                <X size={12} />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className={`p-2 rounded-lg bg-surface-800/50 ${styles.icon}`}>
                  <Icon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-surface-500 uppercase">
                      {getCategoryLabel(insight.category)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${styles.badge}`}>
                      {insight.metric}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-1">{insight.title}</h4>
                  <p className="text-xs text-surface-300 leading-relaxed">{insight.message}</p>

                  {/* Action Buttons */}
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {insight.actions.map((action, index) => (
                        <button
                          key={index}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-600 hover:border-surface-500 rounded-md text-surface-300 hover:text-white transition-all"
                        >
                          {action}
                          <ArrowRight size={10} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionSupportPanel;
