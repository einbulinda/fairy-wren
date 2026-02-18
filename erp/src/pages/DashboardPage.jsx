import { useState, useMemo } from "react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import WeeklyInsightsCard from "@/components/dashboard/WeeklyInsightsCard";
import CategoryDoughnutCard from "@/components/dashboard/CategoryDoughnutCard";
import SalesTrendChart from "@/components/dashboard/SalesTrendChart";
import PaymentTypeBreakdown from "@/components/dashboard/PaymentTypeBreakdown";
import CategorySalesTable from "@/components/dashboard/CategorySalesTable";
import OutstandingBillsTable from "@/components/dashboard/OutstandingBillsTable";
import TopSellingProducts from "@/components/dashboard/TopSellingProducts";
import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import BillStatusCard from "@/components/dashboard/BillStatusCard";
import toast from "react-hot-toast";
import {
  DollarSign,
  FileText,
  ShoppingBag,
  Calendar,
  BarChart3,
  Package,
  Receipt,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DashboardPage = () => {
  const { user } = useAuth();
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
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(firstDay), endDate: fmt(lastDay) };
  }, [selectedMonth, selectedYear]);

  const { data, isLoading, error } = useDashboardMetrics(dateRange);

  if (error) toast.error(error.message || "Failed to load dashboard");
  if (isLoading) return <LoadingSpinner message="Loading Dashboard..." />;

  const metrics = data || {};

  const outstandingAmount = metrics.outstandingBills?.reduce(
    (sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)),
    0
  ) || 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-surface-400 text-sm">
            Financial & operational overview
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-800/50 border border-surface-700 rounded-lg p-3">
          <Calendar size={18} className="text-primary-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>{month}</option>
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

      {/* ── Row 1: Paces-style hero cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Welcome */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-5">
          <WelcomeCard userName={user?.name} />
        </div>

        {/* Revenue */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-white text-3xl font-bold mb-2">KES {(metrics.totalRevenue || 0).toLocaleString()}</p>
          {metrics.revenueGrowth !== undefined && (
            <p className={`text-xs font-medium ${metrics.revenueGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(metrics.revenueGrowth)}%
              <span className="text-surface-500 ml-1">Since last month</span>
            </p>
          )}
        </div>

        {/* Store Performance — Category Doughnut */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Category Sales</span>
          </div>
          <CategoryDoughnutCard data={metrics.categorySales || []} />
        </div>

        {/* Weekly Performance Insights */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-wider">Weekly Insights</span>
          </div>
          <WeeklyInsightsCard data={metrics.dayOfWeekPerformance || []} />
        </div>
      </div>

      {/* ── Row 2: Orders (combined) + Bill Status + Outstanding ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Orders — combined Bills + Avg Bill + Top Product */}
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-5 transition-transform duration-200 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-wider">Orders</span>
            <div className="p-2 rounded-lg bg-primary-500/15 text-primary-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-white text-3xl font-bold">{(metrics.totalBills || 0).toLocaleString()}</p>
          {metrics.billsGrowth !== undefined && (
            <p className={`text-xs font-medium mt-1 ${metrics.billsGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.billsGrowth >= 0 ? "↑" : "↓"} {Math.abs(metrics.billsGrowth)}%
              <span className="text-surface-500 ml-1">Since last month</span>
            </p>
          )}
          <div className="mt-4 pt-3 border-t border-primary-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-surface-400 text-xs">Avg Bill Value</span>
              <span className="text-white text-sm font-semibold">KES {(metrics.averageBillValue || 0).toLocaleString()}</span>
            </div>
            {metrics.topSellingProducts?.[0] && (
              <div className="flex items-center justify-between">
                <span className="text-surface-400 text-xs">Most Ordered</span>
                <span className="text-primary-400 text-sm font-semibold truncate ml-2">{metrics.topSellingProducts[0].product_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bill Status Breakdown */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5 transition-transform duration-200 hover:scale-[1.02]">
          <BillStatusCard data={metrics.billStatusSummary || []} />
        </div>

        {/* Outstanding Amount */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 transition-transform duration-200 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Outstanding</span>
            <div className="p-2 rounded-lg bg-red-500/15 text-red-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-white text-3xl font-bold mb-2">KES {outstandingAmount.toLocaleString()}</p>
          <p className="text-surface-500 text-xs">{metrics.outstandingBills?.length || 0} bills unpaid</p>
        </div>
      </div>

      {/* ── Row 3: Sales Summary + Weekly Performance + Top Products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Summary */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Sales Summary</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-surface-700/50">
              <span className="text-surface-400 text-sm">Gross Revenue</span>
              <span className="text-emerald-400 font-semibold">KES {(metrics.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-700/50">
              <span className="text-surface-400 text-sm">Outstanding Amount</span>
              <span className="text-orange-400 font-semibold">KES {outstandingAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-700/50">
              <span className="text-surface-400 text-sm">Outstanding Bills</span>
              <span className="text-orange-400 font-semibold">{metrics.outstandingBills?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-surface-400 text-sm">Avg Bill Value</span>
              <span className="text-white font-semibold">KES {(metrics.averageBillValue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Weekly Performance */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary-500/20 border border-primary-500/30">
              <BarChart3 className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Weekly Performance</h2>
          </div>
          <WeeklySummaryCard data={metrics.weeklyPerformance || []} />
        </div>

        {/* Top Selling Products */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Top Selling Products</h2>
          </div>
          <TopSellingProducts data={metrics.topSellingProducts || []} />
        </div>
      </div>

      {/* Sales Report */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
        <SalesTrendChart
          data={metrics.dailyRevenue || []}
          monthlyData={metrics.weeklyPerformance || []}
          revenueGrowth={metrics.revenueGrowth}
        />
      </div>

      {/* Two Column: Payments + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Payment Methods</h2>
            </div>
            <p className="text-xs text-surface-400 ml-11">{MONTHS[selectedMonth]} {selectedYear}</p>
          </div>
          <PaymentTypeBreakdown data={metrics.paymentTypes || []} />
        </div>

        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
              <ShoppingBag className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Category Performance</h2>
          </div>
          <CategorySalesTable data={metrics.categorySales || []} />
        </div>
      </div>

      {/* Outstanding Bills */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Outstanding Bills</h2>
        </div>
        <OutstandingBillsTable data={metrics.outstandingBills || []} />
      </div>
    </div>
  );
};

export default DashboardPage;
