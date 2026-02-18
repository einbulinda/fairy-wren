import { useState, useMemo } from "react";
import { usePerformanceComparisons } from "@/hooks/usePerformanceComparisons";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DailyCategoryStackedChart from "@/components/dashboard/DailyCategoryStackedChart";
import WeekendWeekdayComparison from "@/components/dashboard/WeekendWeekdayComparison";
import DayOfWeekChart from "@/components/dashboard/DayOfWeekChart";
import WeeklyPerformanceChart from "@/components/dashboard/WeeklyPerformanceChart";
import MonthlyPerformanceChart from "@/components/dashboard/MonthlyPerformanceChart";
import toast from "react-hot-toast";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Sun,
  TrendingUp,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const PerformanceAnalyticsPage = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const dateRange = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(firstDay), endDate: fmt(lastDay) };
  }, [selectedMonth, selectedYear]);

  const { data, isLoading, error } = usePerformanceComparisons(dateRange);

  if (error) toast.error(error.message || "Failed to load performance data");
  if (isLoading) return <LoadingSpinner message="Loading Performance Data..." />;

  const metrics = data || {};

  return (
    <div className="space-y-6 pb-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-surface-400 text-sm">
            Detailed performance breakdowns & comparisons
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-800/50 border border-surface-700 rounded-lg p-3">
          <Calendar size={18} className="text-primary-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily Sales Trend */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-500/20 border border-primary-500/30">
            <TrendingUp className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Daily Sales Trend</h2>
            <p className="text-xs text-surface-400">
              {MONTHS[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>
        <DailyCategoryStackedChart
          data={metrics.dailyCategoryBreakdown}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>

      {/* Weekend vs Weekday + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <Sun className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Weekend vs Weekday</h2>
          </div>
          <WeekendWeekdayComparison data={metrics.weekendWeekdayPerformance} />
        </div>

        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <CalendarDays className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Day of Week Performance</h2>
          </div>
          <DayOfWeekChart data={metrics.dayOfWeekPerformance} />
        </div>
      </div>

      {/* Weekly + Monthly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
              <BarChart3 className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Weekly Performance</h2>
          </div>
          <WeeklyPerformanceChart data={metrics.weeklyPerformance} />
        </div>

        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Monthly Performance</h2>
          </div>
          <MonthlyPerformanceChart data={metrics.monthlyPerformance} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalyticsPage;