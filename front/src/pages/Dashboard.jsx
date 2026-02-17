import { useState, useMemo } from "react";
import KPICard from "../components/owner/dashboard/KPICard";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useReports } from "@/hooks/useReports";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import SalesTrendChart from "../components/owner/dashboard/SalesTrendChart";
import PaymentTypeBreakdown from "../components/owner/dashboard/PaymentTypeBreakdown";
import CategorySalesTable from "../components/owner/dashboard/CategorySalesTable";
import OutstandingBillsTable from "../components/owner/dashboard/OutstandingBillsTable";
import PerformanceAnalytics from "./PerformanceAnalytics";
import {
  TrendingUp,
  DollarSign,
  FileText,
  ShoppingBag,
  Calendar,
  BarChart3,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();

  /** Tab state */
  const [activeTab, setActiveTab] = useState("dashboard");

  /** Month/Year state - default to current month */
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  /** Calculate date range from selected month/year */
  const dateRange = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

    const formatDate = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(lastDay),
    };
  }, [selectedMonth, selectedYear]);

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


  // Generate month and year options
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Format selected period for display
  const formatSelectedPeriod = () => {
    return `${months[selectedMonth]} ${selectedYear}`;
  };

  // Tab configuration
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "performance", label: "Performance Analytics", icon: TrendingUp },
  ];

  // Security gate
  if (user?.role !== "owner" && user?.role !== "system developer") {
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
      {/* HEADER WITH TABS AND MONTH SELECTOR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {tabs.find((t) => t.id === activeTab)?.label || "Dashboard"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === "dashboard"
                ? "Financial & operational overview"
                : "Performance analytics and trends"}
            </p>
          </div>

          {/* MONTH/YEAR SELECTOR */}
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-purple-500/20 rounded-lg p-3">
            <Calendar size={18} className="text-purple-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="text-gray-400 text-sm hidden sm:block">
              ({formatSelectedPeriod()})
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 border-b border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200
                  border-b-2 -mb-[2px]
                  ${
                    isActive
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }
                `}
              >
                <Icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === "dashboard" && (
        <>
          {/* KPI ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Gross Revenue"
              value={totalRevenue}
              icon={<DollarSign className="w-6 h-6" />}
              color="green"
              highlight
              isCurrency
            />
            <KPICard
              title="Average Bill Value"
              value={averageBillValue}
              icon={<TrendingUp className="w-6 h-6" />}
              color="blue"
              isCurrency
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
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    Payment Methods
                  </h2>
                </div>
                <p className="text-xs text-gray-400 ml-11">
                  {formatSelectedPeriod()}
                </p>
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
        </>
      )}

      {/* PERFORMANCE ANALYTICS TAB CONTENT */}
      {activeTab === "performance" && <PerformanceAnalytics />}
    </div>
  );
};

export default Dashboard;
