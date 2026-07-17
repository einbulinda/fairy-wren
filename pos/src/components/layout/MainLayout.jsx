import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  User,
  LogOut,
  ShoppingCart,
  ClipboardCheck,
  Receipt,
  Sparkles,
  Sun,
  Moon,
  BarChart3,
  PackageSearch,
  Menu,
  X,
  Users,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";
import ConfirmModal from "@/components/shared/ConfirmModal";

import POSScreen from "@/pages/POSScreen";
import StockTakeEntry from "../../pages/StockTakeEntry";
import ZReportView from "@/pages/ZReportView";
import WeeklySalesView from "@/pages/WeeklySalesView";
import StockTakeReportsView from "@/pages/StockTakeReportsView";
import ReceiveStockScreen from "@/pages/ReceiveStockScreen";
import { useBills } from "@/hooks/useBills";
import { useMyBillStats } from "@/hooks/useMyBillStats";
import { formatCurrency } from "@/utils/common";

const getStorageKey = (role) => `fw_lastSeen_${role}`;

const MainLayout = () => {
  const { user, logout, switchUiVersion } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSwitchUiConfirm, setShowSwitchUiConfirm] = useState(false);
  const [currentView, setCurrentView] = useState("pos");
  const [posSubView, setPosSubView] = useState("sale");
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);

  const { bills: openBills } = useBills({ active: true });
  const { stats, period, setPeriod } = useMyBillStats();

  // Mobile sidebar nav — flat, no POS parent group
  const sidebarNav = useMemo(() => {
    const perms = user.permissions || [];
    const items = [];
    if (perms.includes("pos_access")) {
      items.push({ id: "sale", label: "Sale", icon: ShoppingCart, view: "pos", subView: "sale" });
      items.push({ id: "customer-bills", label: "Customer Bills", icon: Users, view: "pos", subView: "customer-bills" });
      if (perms.includes("approve_payments"))
        items.push({ id: "confirm-payments", label: "Confirm Payments", icon: ClipboardCheck, view: "pos", subView: "confirm-payments" });
    }
    if (perms.includes("stock_take"))
      items.push({ id: "stock-take", label: "Stock Take", icon: ClipboardCheck, view: "stock-take" });
    if (perms.includes("z_report"))
      items.push({ id: "z-report", label: "Z Report", icon: Receipt, view: "z-report" });
    if (perms.includes("weekly_sales"))
      items.push({ id: "weekly-sales", label: "Weekly Sales", icon: BarChart3, view: "weekly-sales" });
    if (perms.includes("stocktake_reports"))
      items.push({ id: "stocktake-reports", label: "Stock Reports", icon: PackageSearch, view: "stocktake-reports" });
    if (perms.includes("receive_goods"))
      items.push({ id: "receive-stock", label: "Receive Stock", icon: Truck, view: "receive-stock" });
    return items;
  }, [user.permissions]);

  // Desktop top-tab nav (flat — Customer Bills is a top-level tab)
  const desktopTabs = useMemo(() => {
    const perms = user.permissions || [];
    const tabs = [];
    if (perms.includes("pos_access")) {
      tabs.push({ id: "sale", label: "Sale", icon: ShoppingCart, view: "pos", subView: "sale" });
      tabs.push({ id: "customer-bills", label: "Customer Bills", icon: Users, view: "pos", subView: "customer-bills" });
      if (perms.includes("approve_payments")) {
        tabs.push({ id: "confirm-payments", label: "Confirm Payments", icon: ClipboardCheck, view: "pos", subView: "confirm-payments" });
      }
    }
    if (perms.includes("stock_take"))
      tabs.push({ id: "stock-take", label: "Stock Take", icon: ClipboardCheck, view: "stock-take" });
    if (perms.includes("z_report"))
      tabs.push({ id: "z-report", label: "Z Report", icon: Receipt, view: "z-report" });
    if (perms.includes("weekly_sales"))
      tabs.push({ id: "weekly-sales", label: "Weekly Sales", icon: BarChart3, view: "weekly-sales" });
    if (perms.includes("stocktake_reports"))
      tabs.push({ id: "stocktake-reports", label: "Stock Reports", icon: PackageSearch, view: "stocktake-reports" });
    if (perms.includes("receive_goods"))
      tabs.push({ id: "receive-stock", label: "Receive Stock", icon: Truck, view: "receive-stock" });
    return tabs;
  }, [user.permissions]);

  const isTabActive = (tab) =>
    tab.subView
      ? currentView === tab.view && posSubView === tab.subView
      : currentView === tab.id;

  const onDesktopTabClick = (tab) => {
    setCurrentView(tab.view);
    if (tab.subView) setPosSubView(tab.subView);
  };

  // Restore view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(user.role));
    const allowed = ["pos", "stock-take", "z-report", "weekly-sales", "stocktake-reports", "receive-stock"];
    if (saved && allowed.includes(saved)) {
      setCurrentView(saved);
    } else {
      const perms = user.permissions || [];
      if (perms.includes("pos_access")) setCurrentView("pos");
      else if (perms.includes("stock_take")) setCurrentView("stock-take");
      else if (perms.includes("z_report")) setCurrentView("z-report");
    }
  }, [user.role, user.permissions]);

  useEffect(() => {
    if (currentView) localStorage.setItem(getStorageKey(user.role), currentView);
  }, [currentView, user.role]);

  // Derive pending count from bills
  const fetchCounts = useCallback(() => {
    const perms = user.permissions || [];
    if (!perms.includes("pos_access")) return;
    if (perms.includes("approve_payments")) {
      setPendingConfirmCount(
        openBills.filter((b) => b.status === "awaiting_confirmation").length,
      );
    }
  }, [user.permissions, openBills]);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, 30000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  // Navigate to a view (+ optional POS sub-view), close mobile sidebar
  const navigate = useCallback((view, subView = null) => {
    setCurrentView(view);
    if (subView) setPosSubView(subView);
    setSidebarOpen(false);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const renderView = () => {
    switch (currentView) {
      case "pos":
        return <POSScreen subView={posSubView} onSwitchToSale={() => setPosSubView("sale")} />;
      case "stock-take":
        return <StockTakeEntry />;
      case "z-report":
        return <ZReportView />;
      case "weekly-sales":
        return <WeeklySalesView />;
      case "stocktake-reports":
        return <StockTakeReportsView />;
      case "receive-stock":
        return <ReceiveStockScreen />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 bg-gray-800/95 backdrop-blur-sm border-b-2 border-yellow-400 z-50">
        <div className="px-3 lg:px-4 py-3">
          <div className="flex items-center gap-3">

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img src={fwLogo} alt="Fairy Wren" className="h-9 w-auto lg:h-10" />
              <div className="hidden sm:block">
                <p className="text-base lg:text-lg font-bold text-yellow-400 tracking-wide leading-none">
                  FAIRY WREN
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Point of Sale
                </p>
              </div>
            </div>

            {/* Stats (desktop) */}
            {stats && (
              <div className="hidden md:flex items-center gap-1.5 ml-3">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-gray-800/50 text-xs text-white border border-gray-600/50 rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400/50 cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase leading-none">My Bills</p>
                  <p className="text-sm font-bold text-white">{stats.totalBills}</p>
                </div>
                <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                  <p className="text-[10px] text-green-400 uppercase leading-none">Closed</p>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(stats.closedValue)}</p>
                </div>
                <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                  <p className="text-[10px] text-yellow-400 uppercase leading-none">Open</p>
                  <p className="text-sm font-bold text-yellow-400">{formatCurrency(stats.openValue)}</p>
                </div>
                <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                  <p className="text-[10px] text-red-400 uppercase leading-none">Voided</p>
                  <p className="text-sm font-bold text-red-400">{stats.voidedCount}</p>
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark"
                  ? <Sun size={18} className="text-yellow-400" />
                  : <Moon size={18} className="text-purple-400" />
                }
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Desktop top nav (lg+) ── */}
      <nav className="hidden lg:flex shrink-0 bg-gray-900/60 backdrop-blur-md border-b border-purple-500/20 px-4 overflow-x-auto">
        {desktopTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onDesktopTabClick(tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative ${
              isTabActive(tab)
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === "confirm-payments" && pendingConfirmCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                {pendingConfirmCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Body: sidebar (mobile) + main ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar — mobile only ── */}
        <aside
          className={`
            lg:hidden
            absolute inset-y-0 left-0 z-40
            flex flex-col shrink-0
            bg-gray-900 border-r border-gray-700/50
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-60 translate-x-0 shadow-2xl" : "w-60 -translate-x-full"}
          `}
        >
          {/* Sidebar brand */}
          <div className="shrink-0 px-4 py-3 border-b border-gray-700/50 flex items-center gap-2.5">
            <img src={fwLogo} alt="Fairy Wren" className="h-8 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-yellow-400 text-sm leading-none">FAIRY WREN</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Point of Sale</p>
            </div>
          </div>

          {/* Nav items — flat */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {sidebarNav.map((item) => {
              const isActive = isTabActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.view, item.subView ?? null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "confirm-payments" && pendingConfirmCount > 0 && (
                    <span className="bg-orange-500 text-white text-[11px] font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                      {pendingConfirmCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer: user + beta switch */}
          <div className="shrink-0 border-t border-gray-700/50 p-3 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 rounded-lg">
              <User size={15} className="text-yellow-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">{user.role}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSwitchUiConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-linear-to-r from-pink-500/20 to-purple-600/20 hover:from-pink-500/30 hover:to-purple-600/30 border border-pink-500/30 rounded-lg text-xs font-medium text-pink-300 transition-colors"
            >
              <Sparkles size={14} />
              Switch to Beta UI
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {currentView === "pos"
            ? renderView()
            : (
              <div className="h-full overflow-auto p-4 lg:p-6">
                <div className="max-w-screen-2xl mx-auto">
                  {renderView()}
                </div>
              </div>
            )
          }
        </main>
      </div>

      {/* UI Switch Confirmation Modal */}
      {showSwitchUiConfirm && (
        <ConfirmModal
          title="Switch to Beta UI?"
          message="Try the new nightclub-optimized interface with improved mobile experience."
          confirmLabel="Switch to Beta"
          cancelLabel="Stay on Classic"
          variant="danger"
          onConfirm={() => {
            switchUiVersion("beta");
            setShowSwitchUiConfirm(false);
            toast.success("Switched to Beta UI");
          }}
          onCancel={() => setShowSwitchUiConfirm(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
