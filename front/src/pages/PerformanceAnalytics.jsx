import WeeklyPerformanceChart from "../components/owner/dashboard/WeeklyPerformanceChart";
import MonthlyPerformanceChart from "../components/owner/dashboard/MonthlyPerformanceChart";
import WeekendWeekdayComparison from "../components/owner/dashboard/WeekendWeekdayComparison";
import DayOfWeekChart from "../components/owner/dashboard/DayOfWeekChart";
import DailyCategoryStackedChart from "../components/owner/dashboard/DailyCategoryStackedChart";
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Sun,
  TrendingUp,
} from "lucide-react";

const PerformanceAnalytics = ({
  weeklyPerformance,
  monthlyPerformance,
  weekendWeekdayPerformance,
  dayOfWeekPerformance,
  dailyCategoryBreakdown,
  selectedMonth,
  selectedYear,
}) => {
  return (
    <div className="space-y-6 pb-6">
      {/* DAILY SALES TRENDS WITH CATEGORY BREAKDOWN */}
      <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-linear-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Daily Sales Trends
            </h2>
            <p className="text-xs text-gray-400">Category breakdown by day</p>
          </div>
        </div>
        <DailyCategoryStackedChart
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
