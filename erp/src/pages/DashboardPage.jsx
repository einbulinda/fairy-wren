import { useState, useMemo } from "react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAuth } from "@/hooks/useAuth";
import { Link, useSearchParams } from "react-router";
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
  Settings,
  RefreshCw,
  Info,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TABS = [
  { id: "executive",   label: "Executive",   short: "Overview", icon: LayoutDashboard },
  { id: "financial",   label: "Financial",   short: "Finance",  icon: DollarSign },
  { id: "operations",  label: "Operations",  short: "Ops",      icon: Zap },
  { id: "collections", label: "Collections", short: "Bills",    icon: FileText },
];

const DashboardPage = () => {
  useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "executive";
  const [modalType, setModalType] = useState(null);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [collectionsStart, setCollectionsStart] = useState(() =>
    isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [collectionsEnd, setCollectionsEnd] = useState(() => isoDate(today));

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

  // Collections tab — date-filtered outstanding bills (must be before early returns)
  const collectionsFiltered = useMemo(() => {
    const start = new Date(collectionsStart + "T00:00:00");
    const end = new Date(collectionsEnd + "T23:59:59");
    return (data?.outstandingBills || []).filter((b) => {
      const d = new Date(b.created_at);
      return d >= start && d <= end;
    });
  }, [data?.outstandingBills, collectionsStart, collectionsEnd]);

  const collectionsStats = useMemo(() => {
    const now = new Date();
    const net = (b) => Number(b.bill_total) - Number(b.paid_amount || 0);
    const critical = collectionsFiltered.filter(
      (b) => Math.ceil((now - new Date(b.created_at)) / (1000 * 60 * 60 * 24)) > 30,
    );
    const overdue = collectionsFiltered.filter((b) => {
      const days = Math.ceil((now - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
      return days > 7 && days <= 30;
    });
    return {
      totalOutstanding: collectionsFiltered.reduce((s, b) => s + net(b), 0),
      criticalAmount: critical.reduce((s, b) => s + net(b), 0),
      criticalCount: critical.length,
      overdueAmount: overdue.reduce((s, b) => s + net(b), 0),
      count: collectionsFiltered.length,
    };
  }, [collectionsFiltered]);

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
  const targetGrossMargin = metrics.targetGrossMargin || metrics.grossMarginTarget || 35;
  const cashPosition = (metrics.cashPosition || 0) + (metrics.bankBalance || 0);
  const outstandingAmount = metrics.outstandingBills?.reduce(
    (sum, b) => sum + (Number(b.bill_total) - Number(b.paid_amount || 0)), 0
  ) || 0;
  
  // Inventory alerts count
  const stockItems = metrics.stockItems || [];
  const outOfStock = stockItems.filter((s) => s.current_stock <= 0).length;
  const lowStock = stockItems.filter((s) => s.current_stock > 0 && s.reorder_level > 0 && s.current_stock <= s.reorder_level).length;
  
  // Dead / slow stock from movement analysis
  const movementData = metrics.movementAnalysis || [];
  const deadStockCount = movementData.filter(
    (m) => (m.movement_category === "NON_MOVING" || m.movement_category === "SLOW") && m.current_stock > 0,
  ).length;

  // Critical bills (used by executive tab)
  const criticalBills = (metrics.outstandingBills || []).filter((b) => {
    const days = Math.ceil((new Date() - new Date(b.created_at)) / (1000 * 60 * 60 * 24));
    return days > 30;
  }).length;

  // Target metadata
  const targetsAutoGenerated = metrics.targetsAutoGenerated;
  const targetsUnsaved = metrics.targetsUnsaved;

  // Quick action handlers
  const openModal = (type) => setModalType(type);
  const closeModal = () => setModalType(null);

  // ===== EXECUTIVE TAB =====
  const renderExecutiveTab = () => (
    <div className="space-y-4">
      {/* Auto-Generated Target Warning */}
      {(targetsAutoGenerated || targetsUnsaved) && (
        <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <Info size={18} className="text-orange-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-400 font-medium">
              Targets Auto-Generated
            </p>
            <p className="text-xs text-surface-400 mt-1">
              Current targets are calculated as <span className="text-orange-400">Previous Month + 10%</span>. 
              Configure custom targets for more accurate tracking.
            </p>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs rounded-lg transition-colors"
          >
            <Settings size={12} />
            Configure
          </Link>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              {targetsAutoGenerated && (
                <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded" title="Auto-calculated">
                  Auto
                </span>
              )}
              <Link
                to="/settings"
                className="p-1 text-surface-500 hover:text-primary-400 transition-colors"
                title="Edit targets"
              >
                <Settings size={14} />
              </Link>
            </div>
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
          <div className="flex items-center gap-2">
            <p className={`text-xs ${grossMargin >= targetGrossMargin ? "text-emerald-400" : "text-orange-400"}`}>
              {grossMargin.toFixed(1)}% margin
            </p>
            <span className="text-[10px] text-surface-500">/ {targetGrossMargin}% tgt</span>
          </div>
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

      {/* Alert Cards — always 4, 2×2 on mobile */}
      <div>
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Alerts</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Out of Stock */}
          <button
            onClick={() => openModal("emergency-reorder")}
            className={`text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${
              outOfStock > 0
                ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                : "bg-surface-800/30 border-surface-700/50 hover:bg-surface-700/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-1.5 rounded-lg ${outOfStock > 0 ? "bg-red-500/20" : "bg-surface-700/50"}`}>
                <ShoppingCart size={13} className={outOfStock > 0 ? "text-red-400" : "text-surface-500"} />
              </div>
              <ArrowUpRight size={13} className={`${outOfStock > 0 ? "text-red-400" : "text-surface-600"} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1.5 ${outOfStock > 0 ? "text-red-400" : "text-white"}`}>
              {outOfStock}
            </p>
            <p className="text-xs font-semibold text-white leading-tight">Out of Stock</p>
            <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">
              {outOfStock > 0 ? "Needs immediate reorder" : "All items stocked"}
            </p>
            {outOfStock > 0 && (
              <span className="inline-flex items-center mt-2.5 text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium">
                Critical
              </span>
            )}
          </button>

          {/* Low Stock */}
          <button
            onClick={() => openModal("emergency-reorder")}
            className={`text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${
              lowStock > 5
                ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15"
                : lowStock > 0
                  ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                  : "bg-surface-800/30 border-surface-700/50 hover:bg-surface-700/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-1.5 rounded-lg ${lowStock > 0 ? "bg-orange-500/20" : "bg-surface-700/50"}`}>
                <Package size={13} className={lowStock > 0 ? "text-orange-400" : "text-surface-500"} />
              </div>
              <ArrowUpRight size={13} className={`${lowStock > 0 ? "text-orange-400" : "text-surface-600"} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1.5 ${lowStock > 0 ? "text-orange-400" : "text-white"}`}>
              {lowStock}
            </p>
            <p className="text-xs font-semibold text-white leading-tight">Low Stock</p>
            <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">
              {lowStock > 0 ? "Near reorder level" : "Stock levels healthy"}
            </p>
            {lowStock > 5 && (
              <span className="inline-flex items-center mt-2.5 text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-medium">
                Warning
              </span>
            )}
            {lowStock > 0 && lowStock <= 5 && (
              <span className="inline-flex items-center mt-2.5 text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                Watch
              </span>
            )}
          </button>

          {/* Critical Bills */}
          <button
            onClick={() => openModal("collections")}
            className={`text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${
              criticalBills > 0
                ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                : "bg-surface-800/30 border-surface-700/50 hover:bg-surface-700/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-1.5 rounded-lg ${criticalBills > 0 ? "bg-red-500/20" : "bg-surface-700/50"}`}>
                <DollarSign size={13} className={criticalBills > 0 ? "text-red-400" : "text-surface-500"} />
              </div>
              <ArrowUpRight size={13} className={`${criticalBills > 0 ? "text-red-400" : "text-surface-600"} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1.5 ${criticalBills > 0 ? "text-red-400" : "text-white"}`}>
              {criticalBills}
            </p>
            <p className="text-xs font-semibold text-white leading-tight">Overdue Bills</p>
            <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">
              {criticalBills > 0 ? "30+ days outstanding" : "All bills current"}
            </p>
            {criticalBills > 0 && (
              <span className="inline-flex items-center mt-2.5 text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium">
                Critical
              </span>
            )}
          </button>

          {/* Dead / Slow Stock */}
          <button
            onClick={() => openModal("dead-stock")}
            className={`text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${
              deadStockCount > 0
                ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15"
                : "bg-surface-800/30 border-surface-700/50 hover:bg-surface-700/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-1.5 rounded-lg ${deadStockCount > 0 ? "bg-orange-500/20" : "bg-surface-700/50"}`}>
                <AlertTriangle size={13} className={deadStockCount > 0 ? "text-orange-400" : "text-surface-500"} />
              </div>
              <ArrowUpRight size={13} className={`${deadStockCount > 0 ? "text-orange-400" : "text-surface-600"} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums leading-none mb-1.5 ${deadStockCount > 0 ? "text-orange-400" : "text-emerald-400"}`}>
              {deadStockCount}
            </p>
            <p className="text-xs font-semibold text-white leading-tight">Dead Stock</p>
            <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">
              {deadStockCount > 0 ? "Slow / non-moving" : "All stock moving"}
            </p>
            {deadStockCount > 0 && (
              <span className="inline-flex items-center mt-2.5 text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-medium">
                Review
              </span>
            )}
          </button>

        </div>
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
      {/* Target Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-surface-800/50 border border-surface-700 rounded-lg">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Target size={16} className="text-primary-400 shrink-0" />
          <span className="text-surface-400">Targets:</span>
          <span className="text-white font-medium">Revenue {formatCurrency(targetRevenue)}</span>
          <span className="text-surface-500 hidden sm:inline">|</span>
          <span className="text-white font-medium">Margin {targetGrossMargin}%</span>
        </div>
        <Link
          to="/settings"
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-colors"
        >
          <Settings size={12} />
          Edit Targets
        </Link>
      </div>

      {/* Profitability Deep Dive */}
      <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-violet-400" />
          Profitability Analysis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-surface-800/50 rounded-lg p-3 flex sm:block items-center justify-between">
            <p className="text-xs text-surface-500 sm:mb-1">Revenue</p>
            <p className="text-base sm:text-lg font-bold text-white">{formatCurrency(revenue)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3 flex sm:block items-center justify-between">
            <p className="text-xs text-surface-500 sm:mb-1">COGS</p>
            <p className="text-base sm:text-lg font-bold text-orange-400">{formatCurrency(cogs)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3 flex sm:block items-center justify-between">
            <p className="text-xs text-surface-500 sm:mb-1">Gross Profit</p>
            <p className="text-base sm:text-lg font-bold text-emerald-400">{formatCurrency(grossProfit)}</p>
          </div>
        </div>
        
        {/* Margin Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-surface-400">Gross Margin</span>
            <span className={grossMargin >= targetGrossMargin ? "text-emerald-400" : "text-orange-400"}>
              {grossMargin.toFixed(1)}% / {targetGrossMargin}% target
            </span>
          </div>
          <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${grossMargin >= targetGrossMargin ? "bg-emerald-400" : grossMargin >= targetGrossMargin * 0.8 ? "bg-orange-400" : "bg-red-400"}`}
              style={{ width: `${Math.min((grossMargin / targetGrossMargin) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Recommendations */}
        {grossMargin < targetGrossMargin && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-400 flex items-center gap-2">
              <AlertTriangle size={14} />
              Margin below target ({(targetGrossMargin - grossMargin).toFixed(1)}% gap). 
              <Link to="/settings" className="underline hover:text-orange-300">Review pricing</Link> or cut costs.
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
              Critical cash position. <button onClick={() => openModal("collections")} className="underline hover:text-red-300">Accelerate collections</button> or secure funding.
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            {stockItems.length > 0 ? ((stockItems.filter(s => s.reorder_level > 0 && s.current_stock > s.reorder_level * 2).length / stockItems.length) * 100).toFixed(0) : 0}%
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
      {/* Date range picker */}
      <div className="p-3 bg-surface-800/50 border border-surface-700 rounded-xl space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={collectionsStart}
              onChange={(e) => setCollectionsStart(e.target.value)}
              className="w-full px-2.5 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={collectionsEnd}
              onChange={(e) => setCollectionsEnd(e.target.value)}
              className="w-full px-2.5 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <p className="text-xs text-surface-500 sm:self-center">
          {collectionsStats.count} bill{collectionsStats.count !== 1 ? "s" : ""} in range
        </p>
      </div>

      {/* Collections Summary — always 3-col, compact amounts */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Total Outstanding */}
        <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] text-surface-500 mb-1.5 truncate">
            <span className="sm:hidden">Outstanding</span>
            <span className="hidden sm:inline">Total Outstanding</span>
          </p>
          <p className="text-sm sm:text-xl font-bold text-white tabular-nums">
            {fmtKes(collectionsStats.totalOutstanding)}
          </p>
          <p className="text-[10px] text-surface-500 mt-1">
            {collectionsStats.count} bill{collectionsStats.count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Critical */}
        <div className={`rounded-xl p-3 sm:p-4 border ${
          collectionsStats.criticalAmount > 0
            ? "bg-red-500/10 border-red-500/30"
            : "bg-surface-800/30 border-surface-700/50"
        }`}>
          <p className="text-[10px] text-surface-500 mb-1.5 truncate">
            <span className="sm:hidden">Critical</span>
            <span className="hidden sm:inline">Critical (&gt;30 days)</span>
          </p>
          <p className={`text-sm sm:text-xl font-bold tabular-nums ${
            collectionsStats.criticalAmount > 0 ? "text-red-400" : "text-white"
          }`}>
            {fmtKes(collectionsStats.criticalAmount)}
          </p>
          <p className="text-[10px] text-surface-500 mt-1">
            {collectionsStats.criticalCount} bill{collectionsStats.criticalCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Overdue */}
        <div className={`rounded-xl p-3 sm:p-4 border ${
          collectionsStats.overdueAmount > 0
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-surface-800/30 border-surface-700/50"
        }`}>
          <p className="text-[10px] text-surface-500 mb-1.5 truncate">
            <span className="sm:hidden">Overdue</span>
            <span className="hidden sm:inline">Overdue (7–30 days)</span>
          </p>
          <p className={`text-sm sm:text-xl font-bold tabular-nums ${
            collectionsStats.overdueAmount > 0 ? "text-orange-400" : "text-white"
          }`}>
            {fmtKes(collectionsStats.overdueAmount)}
          </p>
          <p className="text-[10px] text-surface-500 mt-1 sm:hidden">7–30 days</p>
        </div>
      </div>

      {/* Action Button */}
      {collectionsStats.criticalCount > 0 && (
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
        <h3 className="text-sm font-semibold text-white mb-3">Outstanding Bills</h3>
        <OutstandingBillsTable data={collectionsFiltered} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Business Dashboard</h1>
            <p className="text-surface-400 text-xs sm:text-sm">High-impact decisions at a glance</p>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
            title="Configure Targets"
          >
            <Settings size={15} />
            <span className="hidden sm:inline text-sm">Configure Targets</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 bg-surface-800/50 border border-surface-700 rounded-lg p-1 self-start">
          <Calendar size={15} className="text-primary-400 ml-1.5 shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-1.5 py-1 rounded bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-1.5 py-1 rounded bg-surface-800 border border-surface-600 text-white text-sm focus:outline-none focus:border-primary-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation — desktop only; mobile uses contextual bottom nav */}
      <div className="hidden md:flex items-stretch gap-1 bg-surface-800/50 border border-surface-700 rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const alertCount = tab.id === "executive"
            ? (outOfStock > 0 ? 1 : 0) + (criticalBills > 0 ? 1 : 0) + (lowStock > 5 ? 1 : 0)
            : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-surface-400 hover:text-white hover:bg-surface-700/50"
              }`}
            >
              <Icon size={15} />
              <span className="text-sm">{tab.label}</span>
              {alertCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none ${isActive ? "bg-white/20 text-white" : "bg-red-500/30 text-red-300"}`}>
                  {alertCount}
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

const fmtKes = (v) => {
  if (!v) return "KES 0";
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}k`;
  return `KES ${Math.round(v)}`;
};

export default DashboardPage;
