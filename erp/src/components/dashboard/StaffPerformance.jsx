import { useMemo } from "react";
import { Users, Trophy, TrendingUp, DollarSign, Receipt, Star, AlertCircle, Target } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value);

const StaffPerformance = ({ data }) => {
  const staffMetrics = useMemo(() => {
    if (!data || !data.staffPerformance) return null;

    const staffData = data.staffPerformance;
    const totalStaff = staffData.length;
    
    // Calculate rankings
    const rankedByRevenue = [...staffData].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));
    const rankedByBills = [...staffData].sort((a, b) => Number(b.total_bills) - Number(a.total_bills));
    const rankedByAvgBill = [...staffData]
      .filter((s) => Number(s.total_bills) > 0)
      .sort((a, b) => (Number(b.total_revenue) / Number(b.total_bills)) - (Number(a.total_revenue) / Number(a.total_bills)));

    // Team totals
    const teamRevenue = staffData.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
    const teamBills = staffData.reduce((sum, s) => sum + Number(s.total_bills || 0), 0);
    const avgTeamRevenue = totalStaff > 0 ? teamRevenue / totalStaff : 0;
    const avgTeamBills = totalStaff > 0 ? teamBills / totalStaff : 0;

    // Add performance metrics to each staff member
    const enrichedStaff = staffData.map((staff) => {
      const revenue = Number(staff.total_revenue || 0);
      const bills = Number(staff.total_bills || 0);
      const avgBill = bills > 0 ? revenue / bills : 0;
      const targetRevenue = Number(staff.target_revenue || avgTeamRevenue * 1.1); // Default 110% of team avg
      const targetAchievement = targetRevenue > 0 ? (revenue / targetRevenue) * 100 : 0;
      
      // Compare to team average
      const revenueVsAvg = avgTeamRevenue > 0 ? ((revenue - avgTeamRevenue) / avgTeamRevenue) * 100 : 0;
      
      return {
        ...staff,
        revenue,
        bills,
        avgBill,
        targetRevenue,
        targetAchievement,
        revenueVsAvg,
      };
    });

    // Top performers
    const topPerformer = enrichedStaff.length > 0 
      ? enrichedStaff.reduce((max, s) => s.targetAchievement > max.targetAchievement ? s : max, enrichedStaff[0])
      : null;

    // Underperformers (below 70% of target)
    const underperformers = enrichedStaff
      .filter((s) => s.targetAchievement < 70 && s.bills > 0)
      .sort((a, b) => a.targetAchievement - b.targetAchievement)
      .slice(0, 3);

    // Most improved (if previous period data available)
    const withGrowth = enrichedStaff
      .filter((s) => s.previous_revenue !== undefined)
      .map((s) => ({
        ...s,
        growth: s.previous_revenue > 0 ? ((s.revenue - s.previous_revenue) / s.previous_revenue) * 100 : 0,
      }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 3);

    return {
      totalStaff,
      teamRevenue,
      teamBills,
      avgTeamRevenue,
      avgTeamBills,
      topRevenue: rankedByRevenue[0] || null,
      topBills: rankedByBills[0] || null,
      topAvgBill: rankedByAvgBill[0] || null,
      topPerformer,
      underperformers,
      mostImproved: withGrowth,
      enrichedStaff: enrichedStaff.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }, [data]);

  if (!staffMetrics) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-400">
        <p>No staff performance data available</p>
      </div>
    );
  }

  // Decision support recommendations
  const recommendations = [];
  if (staffMetrics.underperformers.length > 0) {
    recommendations.push({
      type: "warning",
      message: `${staffMetrics.underperformers.length} staff members below 70% target. Consider additional training or coaching.`,
      action: "Review Performance",
    });
  }
  if (staffMetrics.avgTeamRevenue < (data?.targetRevenuePerStaff || 0)) {
    recommendations.push({
      type: "info",
      message: "Team average below target. Review sales strategies or incentivize top performers.",
      action: "Set Targets",
    });
  }
  if (staffMetrics.totalStaff > 0 && staffMetrics.enrichedStaff[0]?.targetAchievement > 150) {
    recommendations.push({
      type: "success",
      message: `${staffMetrics.enrichedStaff[0].user_name} exceeding 150% target. Consider them for trainer/team lead role.`,
      action: "View Details",
    });
  }

  const getAchievementColor = (pct) => {
    if (pct >= 100) return "text-emerald-400";
    if (pct >= 80) return "text-blue-400";
    if (pct >= 60) return "text-orange-400";
    return "text-red-400";
  };

  const getAchievementBg = (pct) => {
    if (pct >= 100) return "bg-emerald-500/15";
    if (pct >= 80) return "bg-blue-500/15";
    if (pct >= 60) return "bg-orange-500/15";
    return "bg-red-500/15";
  };

  return (
    <div className="space-y-4">
      {/* Team Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{staffMetrics.totalStaff}</p>
          <p className="text-[10px] text-surface-500">Active Staff</p>
        </div>
        <div className="bg-surface-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(staffMetrics.teamRevenue)}</p>
          <p className="text-[10px] text-surface-500">Team Revenue</p>
        </div>
        <div className="bg-surface-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-primary-400">{staffMetrics.teamBills}</p>
          <p className="text-[10px] text-surface-500">Total Bills</p>
        </div>
      </div>

      {/* Top Performers */}
      {(staffMetrics.topRevenue || staffMetrics.topBills) && (
        <div className="grid grid-cols-2 gap-3">
          {staffMetrics.topRevenue && (
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400 uppercase">Top Revenue</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{staffMetrics.topRevenue.user_name}</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(staffMetrics.topRevenue.total_revenue)}</p>
            </div>
          )}
          {staffMetrics.topBills && (
            <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={14} className="text-primary-400" />
                <span className="text-[10px] font-medium text-primary-400 uppercase">Most Bills</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{staffMetrics.topBills.user_name}</p>
              <p className="text-lg font-bold text-primary-400">{staffMetrics.topBills.total_bills} bills</p>
            </div>
          )}
        </div>
      )}

      {/* Team Average */}
      <div className="flex items-center justify-between bg-surface-800/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-surface-400" />
          <span className="text-xs text-surface-400">Team Average</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-surface-500">Revenue/Staff</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(staffMetrics.avgTeamRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-surface-500">Bills/Staff</p>
            <p className="text-sm font-semibold text-white">{staffMetrics.avgTeamBills.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      {staffMetrics.enrichedStaff.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Performance Leaderboard</p>
          {staffMetrics.enrichedStaff.map((staff, index) => (
            <div key={index} className="flex items-center gap-3 p-2.5 bg-surface-800/30 rounded-lg">
              {/* Rank */}
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-800 text-xs font-bold text-surface-400">
                {index + 1}
              </div>

              {/* Staff Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{staff.user_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-surface-500">{staff.bills} bills</span>
                  <span className="text-[10px] text-surface-500">•</span>
                  <span className="text-[10px] text-surface-500">Avg: {formatCurrency(staff.avgBill)}</span>
                </div>
              </div>

              {/* Revenue & Target */}
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{formatCurrency(staff.revenue)}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        staff.targetAchievement >= 100 ? "bg-emerald-400" : "bg-primary-400"
                      }`}
                      style={{ width: `${Math.min(staff.targetAchievement, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${getAchievementColor(staff.targetAchievement)}`}>
                    {staff.targetAchievement.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Most Improved */}
      {staffMetrics.mostImproved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Most Improved</p>
          {staffMetrics.mostImproved.map((staff, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-xs text-surface-300">{staff.user_name}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">+{staff.growth.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Underperformers Alert */}
      {staffMetrics.underperformers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Needs Attention</p>
          {staffMetrics.underperformers.map((staff, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle size={12} className="text-red-400" />
                <span className="text-xs text-surface-300">{staff.user_name}</span>
              </div>
              <span className="text-xs font-semibold text-red-400">{staff.targetAchievement.toFixed(0)}% of target</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Recommendations</p>
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                rec.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : rec.type === "warning"
                    ? "bg-orange-500/10 border border-orange-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
              }`}
            >
              {rec.type === "success" ? (
                <Star size={14} className="shrink-0 mt-0.5 text-emerald-400" />
              ) : rec.type === "warning" ? (
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-orange-400" />
              ) : (
                <Target size={14} className="shrink-0 mt-0.5 text-blue-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-surface-300">{rec.message}</p>
                {rec.action && (
                  <button className="mt-1.5 text-[10px] px-2 py-1 bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 transition-colors">
                    {rec.action}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffPerformance;
