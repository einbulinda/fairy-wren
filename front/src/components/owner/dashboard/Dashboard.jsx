import { useState } from "react";
import KPICard from "./KPICard";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { useReports } from "../../../hooks/useReports";
import LoadingSpinner from "../../shared/LoadingSpinner";
import SalesTrendChart from "./SalesTrendChart";
import PaymentTypeBreakdown from "./PaymentTypeBreakdown";
import CategorySalesTable from "./CategorySalesTable";
import OutstandingBillsTable from "./OutstandingBillsTable";
import {
  TrendingUp,
  DollarSign,
  FileText,
  ShoppingBag,
  Calendar,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();

  /** Date range state */
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  const {
    totalRevenue,
    dailyRevenue,
    paymentTypes,
    averageBillValue,
    outstandingBills,
    categorySales,
    isLoading,
    error,
  } = useReports(dateRange);

  // Security gate
  if (user?.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-linear-to-br from-red-900/30 to-red-900/10 backdrop-blur-md border border-red-500/20 rounded-xl p-6 shadow-lg">
          <p className="text-red-400 font-semibold text-lg">Access denied.</p>
          <p className="text-gray-400 text-sm mt-2">
            Owner access required to view this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner message="Loading Reports..." />;

  if (error) {
    toast.error(error);
  }

  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Owner Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Financial & operational overview
          </p>
        </div>

        {/* DATE FILTER */}
        <div className="flex flex-col sm:flex-row gap-3 bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-purple-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="
                px-3 py-2 rounded-lg
                bg-gray-800/50 backdrop-blur-sm
                border border-purple-500/30
                text-white text-sm
                focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                transition-all duration-200
              "
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="
                px-3 py-2 rounded-lg
                bg-gray-800/50 backdrop-blur-sm
                border border-purple-500/30
                text-white text-sm
                focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                transition-all duration-200
              "
            />
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Gross Revenue"
          value={totalRevenue}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
          highlight
        />
        <KPICard
          title="Average Bill Value"
          value={averageBillValue}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="Outstanding Bills"
          value={outstandingBills.length}
          icon={<FileText className="w-6 h-6" />}
          color="orange"
        />
        <KPICard
          title="Categories Selling"
          value={categorySales.length}
          icon={<ShoppingBag className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* SALES TREND */}
      <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Sales Trend</h2>
        </div>
        <SalesTrendChart data={dailyRevenue} />
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* PAYMENTS SPLIT */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Payment Methods
            </h2>
          </div>
          <PaymentTypeBreakdown data={paymentTypes} />
        </div>

        {/* CATEGORY PERFORMANCE */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30">
              <ShoppingBag className="w-5 h-5 text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Category Performance
            </h2>
          </div>
          <CategorySalesTable data={categorySales} />
        </div>
      </div>

      {/* OUTSTANDING BILLS */}
      <div className="bg-gray-900/20 backdrop-blur-sm border border-purple-500/10 rounded-xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Outstanding Bills
          </h2>
        </div>
        <OutstandingBillsTable data={outstandingBills} />
      </div>
    </div>
  );
};

export default Dashboard;
