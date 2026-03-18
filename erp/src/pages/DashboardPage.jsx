import { useState, useMemo } from "react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DecisionSupportPanel from "@/components/dashboard/DecisionSupportPanel";
import QuickActionModal from "@/components/dashboard/QuickActionModal";
import SalesTrendChart from "@/components/dashboard/SalesTrendChart";
import OutstandingBillsTable from "@/components/dashboard/OutstandingBillsTable";
import TopSellingProducts from "@/components/dashboard/TopSellingProducts";
import CategorySalesTable from "@/components/dashboard/CategorySalesTable";

import toast from "react-hot-toast";
import {
  DollarSign,
  FileText,
  Calendar,
  Package,
  Receipt,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Target,
  Lightbulb,
  LayoutDashboard,
  BarChart3,
  Users,
  Zap,
  ArrowUpRight,
  ShoppingCart,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TABS = [
  { id: "executive", label: "Executive", icon: LayoutDashboard },
  { id: "financial", label: "Financial", icon: DollarSign },
  { id: "operations", label: "Operations", icon: Zap },
  { id: "collections", label: "Collections", icon: FileText },
];

const DashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("executive");
  const [modalType, setModalType] = useState(null);
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

  // Core calculations
  const revenue = metrics.totalRevenue || 0;
  const targetRevenue = metrics.targetRevenue || revenue * 1.1;
  const targetAchievement = targetRevenue > 0 ? (revenue / targetRevenue) * 100 : 0;
  const cogs = metrics.cogs || 0;
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const cashPosition = (metrics.cashPosition || 0) + (metrics.bankBalance || 0);
  const outstandingAmount = metrics.outstandingBills?.reduce(
    (sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0
  ) || 0;
  
  // Inventory alerts count
  const stockItems = metrics.stockItems || [];
  const outOfStock = stockItems.filter((s) => s.current_stock <= 0).length;
  const lowStock = stockItems.filter((s) => s.current_stock > 0 && s.current_stock <= (s.reorder_point || 10)).length;
  
  // Critical bills
  const criticalBills = (metrics.outstandingBills || []).filter((b) => {
    const days = Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
    return days > 30;
  }).length;

  // Quick action handlers
  const openModal = (type) => setModalType(type);
  const closeModal = () => setModalType(null);

  // ===== EXECUTIVE TAB =====
  const renderExecutiveTab = () => (
    <div className="space-y-4">
      {/* Critical Alerts - Always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-primary-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Action Required</h2>
          </div>
          <DecisionSupportPanel data={metrics} />
        </div>

        {/* Target Progress */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-primary-400" />
              <h2 className="text-sm font-semibold text-white">Monthly Target</h2>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              targetAchievement >= 100 ? "bg-emerald-500/20 text-emerald-400" :
              targetAchievement >= 70 ? "bg-orange-500/20 text-orange-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {targetAchievement.toFixed(0)}%
            </span>
          </div>
          
          {/* Circular Progress */}
          <div className="flex items-center justify-center py-2">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-surface-800" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent"
                  strokeDasharray={301.59}
                  strokeDashoffset={301.59 - (301.59 * Math.min(targetAchievement, 100)) / 100}
                  className={targetAchievement >= 100 ? "text-emerald-400" : targetAchievement >= 70 ? "text-primary-400" : "text-orange-400"}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{targetAchievement.toFixed(0)}%</span>
                <span className="text-[10px] text-surface-500">of target</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Target</span>
              <span className="text-white">KES {(targetRevenue/1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Achieved</span>
              <span className="text-emerald-400">KES {(revenue/1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Remaining</span>
              <span className={targetAchievement >= 100 ? "text-emerald-400" : "text-orange-400"}>
                KES {(Math.max(0, targetRevenue - revenue)/1000).toFixed(0)}k
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Row - Only the essentials */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-surface-500 text-xs">Revenue</span>
            <DollarSign size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white">KES {(revenue/1000).toFixed(1)}k</p>
          {metrics.revenueGrowth !== undefined && (
            <p className={`text-xs ${metrics.revenueGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(metrics.revenueGrowth)}%
            </p>
          )}
        </div>

        {/* Gross Profit */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-surface-500 text-xs">Gross Profit</span>
            <TrendingUp size={14} className="text-violet-400" />
          </div>
          <p className="text-xl font-bold text-white">KES {(grossProfit/1000).toFixed(1)}k</p>
          <p className={`text-xs ${grossMargin >= 30 ? "text-emerald-400" : "text-orange-400"}`}>
            {grossMargin.toFixed(1)}% margin
          </p>
        </div>

        {/* Cash Position */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-surface-500 text-xs">Cash</span>
            <Wallet size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white">KES {(cashPosition/1000).toFixed(1)}k</p>
          <p className="text-xs text-surface-500">
            {metrics.daysOfCash || Math.floor(cashPosition / (metrics.monthlyExpenses || 1) * 30)} days
          </p>
        </div>

        {/* Outstanding */}
        <div className={`rounded-xl p-4 border ${outstandingAmount > 100000 ? "bg-red-500/10 border-red-500/30" : "bg-surface-800/30 border-surface-700/50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-surface-500 text-xs">Outstanding</span>
            <FileText size={14} className={outstandingAmount > 100000 ? "text-red-400" : "text-orange-400"} />
          </div>
          <p className={`text-xl font-bold ${outstandingAmount > 100000 ? "text-red-400" : "text-white"}`}>
            KES {(outstandingAmount/1000).toFixed(1)}k
          </p>
          <p className="text-xs text-surface-500">{metrics.outstandingBills?.length || 0} bills</p>
        </div>
      </div>

      {/* Quick Action Buttons - High Impact Only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {outOfStock > 0 && (
          <button 
            onClick={() => openModal("emergency-reorder")}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition-colors group"
          >
            <ShoppingCart size={16} className="text-red-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-red-400">Emergency Reorder</p>
              <p className="text-[10px] text-surface-500">{outOfStock} out of stock</p>
            </div>
            <ArrowUpRight size={14} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>
        )}
        
        {lowStock > 0 && (
          <button 
            onClick={() => openModal("emergency-reorder")}
            className="flex items-center justify-center gap-2 p-3 bg-orange-500/20 border border-orange-500/40 rounded-xl hover:bg-orange-500/30 transition-colors group"
          >
            <Package size={16} className="text-orange-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-orange-400">Low Stock Alert</p>
              <p className="text-[10px] text-surface-500">{lowStock} items low</p>
            </div>
            <ArrowUpRight size={14} className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>
        )}

        {criticalBills > 0 && (
          <button 
            onClick={() => openModal("collections")}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition-colors group"
          >
            <DollarSign size={16} className="text-red-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-red-400">Critical Collections</p>
              <p className="text-[10px] text-surface-500">{criticalBills} overdue 30+ days</p>
            </div>
            <ArrowUpRight size={14} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>
        )}

        {/* Dead Stock - Always show if inventory exists */}
        <button 
          onClick={() => openModal("dead-stock")}
          className="flex items-center justify-center gap-2 p-3 bg-surface-800/50 border border-surface-700 rounded-xl hover:bg-surface-700/50 transition-colors group"
        >
          <Package size={16} className="text-orange-400" />
          <div className="text-left">
            <p className="text-xs font-semibold text-white">Dead Stock</p>
            <p className="text-[10px] text-surface-500">View clearance list</p>
          </div>
          <ArrowUpRight size={14} className="text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        </button>
      </div>

      {/* Sales Trend - Mini Version */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sales Trend</h3>
        <SalesTrendChart
          data={metrics.dailyRevenue || []}
          monthlyData={metrics.weeklyPerformance || []}
          revenueGrowth={metrics.revenueGrowth}
        />
      </div>
    </div>
  );

  // ===== FINANCIAL TAB =====
  const renderFinancialTab = () => (
    <div className="space-y-4">
      {/* Profitability Deep Dive */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-violet-400" />
          Profitability Analysis
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Revenue</p>
            <p className="text-lg font-bold text-white">{formatCurrency(revenue)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">COGS</p>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(cogs)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Gross Profit</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(grossProfit)}</p>
          </div>
        </div>
        
        {/* Margin Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-surface-400">Gross Margin</span>
            <span className={grossMargin >= 30 ? "text-emerald-400" : "text-orange-400"}>
              {grossMargin.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${grossMargin >= 30 ? "bg-emerald-400" : grossMargin >= 20 ? "bg-orange-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(grossMargin, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-surface-500 mt-1">
            <span>0%</span>
            <span>Target: 35%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Recommendations */}
        {grossMargin < 25 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} />
              Margin below 25%. Immediate action required: Review pricing or cut costs.
            </p>
          </div>
        )}
      </div>

      {/* Cash Flow */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-blue-400" />
          Cash Position & Projections
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Cash in Hand</p>
            <p className="text-lg font-bold text-white">{formatCurrency(metrics.cashPosition || 0)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Bank Balance</p>
            <p className="text-lg font-bold text-white">{formatCurrency(metrics.bankBalance || 0)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Total Liquid</p>
            <p className="text-lg font-bold text-blue-400">{formatCurrency(cashPosition)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-xs text-surface-500 mb-1">Days Runway</p>
            <p className="text-lg font-bold text-white">{Math.floor(cashPosition / (metrics.monthlyExpenses || 1) * 30)} days</p>
          </div>
        </div>

        {/* Cash Alert */}
        {cashPosition < 100000 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} />
              Critical cash position. Accelerate collections or secure short-term funding.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ===== OPERATIONS TAB =====
  const renderOperationsTab = () => (
    <div className="space-y-4">
      {/* Stock Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{stockItems.length}</p>
          <p className="text-[10px] text-surface-500">Total Products</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${outOfStock > 0 ? "bg-red-500/10 border-red-500/30" : "bg-surface-800/30 border-surface-700/50"}`}>
          <p className={`text-2xl font-bold ${outOfStock > 0 ? "text-red-400" : "text-white"}`}>{outOfStock}</p>
          <p className="text-[10px] text-surface-500">Out of Stock</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${lowStock > 5 ? "bg-orange-500/10 border-orange-500/30" : "bg-surface-800/30 border-surface-700/50"}`}>
          <p className={`text-2xl font-bold ${lowStock > 5 ? "text-orange-400" : "text-white"}`}>{lowStock}</p>
          <p className="text-[10px] text-surface-500">Low Stock</p>
        </div>
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {stockItems.length > 0 ? ((stockItems.filter(s => s.current_stock > (s.reorder_point || 10) * 2).length / stockItems.length) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-[10px] text-surface-500">Well Stocked</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Package size={16} className="text-violet-400" />
          Top Selling Products
        </h3>
        <TopSellingProducts data={metrics.topSellingProducts || []} />
      </div>

      {/* Category Performance */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-violet-400" />
          Category Performance
        </h3>
        <CategorySalesTable data={metrics.categorySales || []} />
      </div>
    </div>
  );

  // ===== COLLECTIONS TAB =====
  const renderCollectionsTab = () => (
    <div className="space-y-4">
      {/* Collections Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Total Outstanding</p>
          <p className="text-xl font-bold text-white">{formatCurrency(outstandingAmount)}</p>
          <p className="text-[10px] text-surface-500 mt-1">{metrics.outstandingBills?.length || 0} bills</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Critical (&gt;30 days)</p>
          <p className="text-xl font-bold text-red-400">
            {formatCurrency(
              (metrics.outstandingBills || [])
                .filter(b => Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24)) > 30)
                .reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0)
            )}
          </p>
          <p className="text-[10px] text-surface-500 mt-1">{criticalBills} bills</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <p className="text-xs text-surface-500 mb-1">Overdue (7-30 days)</p>
          <p className="text-xl font-bold text-orange-400">
            {formatCurrency(
              (metrics.outstandingBills || [])
                .filter(b => {
                  const days = Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
                  return days > 7 && days <= 30;
                })
                .reduce((sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0)
            )}
          </p>
        </div>
      </div>

      {/* Action Button */}
      {criticalBills > 0 && (
        <button 
          onClick={() => openModal("collections")}
          className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition-colors"
        >
          <DollarSign size={16} className="text-red-400" />
          <span className="text-sm font-semibold text-red-400">View Critical Collections</span>
          <ArrowUpRight size={16} className="text-red-400" />
        </button>
      )}

      {/* Outstanding Bills Table */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">All Outstanding Bills</h3>
        <OutstandingBillsTable data={metrics.outstandingBills || []} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Business Dashboard</h1>
          <p className="text-surface-400 text-sm">High-impact decisions at a glance</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-800/50 border border-surface-700 rounded-lg p-2">
          <Calendar size={16} className="text-primary-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-surface-800/50 border border-surface-700 rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-surface-400 hover:text-white hover:bg-surface-700/50"
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.id === "executive" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full">
                  {(outOfStock > 0 ? 1 : 0) + (criticalBills > 0 ? 1 : 0) + (lowStock > 5 ? 1 : 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "executive" && renderExecutiveTab()}
        {activeTab === "financial" && renderFinancialTab()}
        {activeTab === "operations" && renderOperationsTab()}
        {activeTab === "collections" && renderCollectionsTab()}
      </div>

      {/* Quick Action Modal */}
      <QuickActionModal
        type={modalType}
        data={metrics}
        isOpen={!!modalType}
        onClose={closeModal}
      />
    </div>
  );
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(value || 0);

export default DashboardPage;
