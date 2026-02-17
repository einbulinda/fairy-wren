import { useState, useMemo } from "react";
import WeeklyPerformanceChart from "../components/owner/dashboard/WeeklyPerformanceChart";
import MonthlyPerformanceChart from "../components/owner/dashboard/MonthlyPerformanceChart";
import WeekendWeekdayComparison from "../components/owner/dashboard/WeekendWeekdayComparison";
import DayOfWeekChart from "../components/owner/dashboard/DayOfWeekChart";
import DailySalesTrendChart from "../components/owner/dashboard/DailyCategoryStackedChart";
import { usePerformanceComparisons } from "../hooks/usePerformanceComparisons";
import LoadingSpinner from "../components/shared/LoadingSpinner";
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

const PerformanceAnalytics = () => {
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

  const {
    weeklyPerformance,
    monthlyPerformance,
    weekendWeekdayPerformance,
    dayOfWeekPerformance,
    dailyCategoryBreakdown,
    isLoading,
    error,
  } = usePerformanceComparisons(dateRange);

  if (error) toast.error(error);
  if (isLoading) return <LoadingSpinner message="Loading Performance Data..." />;

  return (
    <div className="space-y-6 pb-6">
      {/* Month / Year Selector */}
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-purple-400" />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* DAILY SALES TRENDS */}
      <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-linear-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Daily Sales Trend</h2>
            <p className="text-xs text-gray-400">
              {MONTHS[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>
        <DailySalesTrendChart
          data={dailyCategoryBreakdown}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>

      {/* WEEKEND VS WEEKDAY + DAY OF WEEK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* WEEKEND VS WEEKDAY */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <Sun className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Weekend vs Weekday
            </h2>
          </div>
          <WeekendWeekdayComparison data={weekendWeekdayPerformance} />
        </div>

        {/* DAY OF WEEK PERFORMANCE */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <CalendarDays className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Day of Week Performance
            </h2>
          </div>
          <DayOfWeekChart data={dayOfWeekPerformance} />
        </div>
      </div>

      {/* WEEKLY + MONTHLY PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* WEEKLY PERFORMANCE */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Weekly Performance
            </h2>
          </div>
          <WeeklyPerformanceChart data={weeklyPerformance} />
        </div>

        {/* MONTHLY PERFORMANCE */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30">
              <Calendar className="w-5 h-5 text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Monthly Performance
            </h2>
          </div>
          <MonthlyPerformanceChart data={monthlyPerformance} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
