import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  User,
  LogOut,
  ShoppingCart,
  FileText,
  ClipboardCheck,
  Receipt,
  Settings,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";
import ConfirmModal from "@/components/shared/ConfirmModal";

// View components
import POSScreen from "@/pages/POSScreen";
import StockTakeEntry from "../../pages/StockTakeEntry";
import ZReportView from "@/pages/ZReportView";
import { useBills } from "@/hooks/useBills";
import { useMyBillStats } from "@/hooks/useMyBillStats";
import { formatCurrency } from "@/utils/common";

const getStorageKey = (role) => `fw_lastSeen_${role}`;

const UI_VERSION_KEY = "pos_ui_version";

const MainLayout = () => {
  const { user, logout, uiVersion, switchUiVersion } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showSwitchUiConfirm, setShowSwitchUiConfirm] = useState(false);

  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const { bills: openBills } = useBills({ active: true });
  const { stats, period, setPeriod } = useMyBillStats();

  /**
   * Navigation tabs are memoized to avoid recreating arrays
   * and to keep consistency across effects and render.
   */
  const navigationTabs = useMemo(() => {
    const perms = user.permissions || [];
    const tabs = [];
    if (perms.includes("pos_access"))
      tabs.push({ id: "pos", label: "POS", icon: ShoppingCart });
    if (perms.includes("stock_take"))
      tabs.push({
        id: "stock-take",
        label: "Stock Take",
        icon: ClipboardCheck,
      });
    if (perms.includes("pos_access"))
      tabs.push({ id: "z-report", label: "Z-Report", icon: Receipt });
    return tabs;
  }, [user.permissions]);

  /**
   * View initialization logic simplified and made deterministic.
   * Priority:
   *   1. Saved view (if allowed)
   *   2. Role default
   */
  useEffect(() => {
    const allowedViews = navigationTabs.map((t) => t.id);
    const savedView = localStorage.getItem(getStorageKey(user.role));

    if (savedView && allowedViews.includes(savedView)) {
      setCurrentView(savedView);
    } else {
      setCurrentView(allowedViews[0] || "pos");
    }
  }, [user.role, navigationTabs]);

  /**
   * Save current view using role-scoped key
   */
  useEffect(() => {
    if (currentView) {
      localStorage.setItem(getStorageKey(user.role), currentView);
    }
  }, [currentView, user.role]);

  /**
   * fetchCounts now performs a SINGLE API call
   * and derives all counts from it.
   */
  const fetchCounts = useCallback(async () => {
    try {
      const perms = user.permissions || [];
      if (!perms.includes("pos_access")) return;

      setOpenBillsCount(openBills.length);

      if (perms.includes("approve_payments")) {
        setPendingConfirmCount(
          openBills.filter((bill) => bill.status === "awaiting_confirmation")
            .length,
        );
      }
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  }, [user.permissions, openBills]);

  /**
   * Cleanup now works correctly.
   */
  useEffect(() => {
    fetchCounts();

    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  /**
   * POSScreen always receives onBillUpdate consistently
   */
  const renderView = () => {
    switch (currentView) {
      case "pos":
        return <POSScreen onBillUpdate={fetchCounts} />;
      case "stock-take":
        return <StockTakeEntry />;
      case "z-report":
        return <ZReportView />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header with branding and user info */}
      <header className="bg-gray-800/95 backdrop-blur-sm border-b-2 border-yellow-400 sticky top-0 z-50">
        <div className="px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <img
                src={fwLogo}
                alt="Fairy Wren"
                className="h-10 w-auto lg:h-12"
              />
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-yellow-400 tracking-wide">
                  FAIRY WREN
                </h1>
                <p className="text-xs text-gray-400 uppercase tracking-widest hidden sm:block">
                  Point of Sale
                </p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Stats Cards with Period Selector */}
              {stats && (
                <div className="hidden md:flex items-center gap-1.5">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-gray-800/50 text-xs text-white-300 border border-gray-600/50 rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400/50 cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                    <p className="text-[10px] text-gray-400 uppercase leading-none">
                      My Bills
                    </p>
                    <p className="text-sm font-bold text-white">
                      {stats.totalBills}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                    <p className="text-[10px] text-green-400 uppercase leading-none">
                      Closed
                    </p>
                    <p className="text-sm font-bold text-green-400">
                      {formatCurrency(stats.closedValue)}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                    <p className="text-[10px] text-yellow-400 uppercase leading-none">
                      Open
                    </p>
                    <p className="text-sm font-bold text-yellow-400">
                      {formatCurrency(stats.openValue)}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 px-2.5 py-1.5 rounded-lg text-center">
                    <p className="text-[10px] text-red-400 uppercase leading-none">
                      Voided
                    </p>
                    <p className="text-sm font-bold text-red-400">
                      {stats.voidedCount}
                    </p>
                  </div>
                </div>
              )}

              {/* Open Bills Badge
              {openBillsCount > 0 && (
                <div className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg hidden sm:flex md:hidden items-center gap-1">
                  <FileText size={14} />
                  {openBillsCount}
                </div>
              )} */}

              {/* Pending Confirmation Badge */}
              {/* {pendingConfirmCount > 0 &&
                user.permissions?.includes("approve_payments") && (
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg hidden sm:flex items-center gap-1">
                    <ClipboardCheck size={14} />
                    {pendingConfirmCount}
                  </div>
                )} */}

              {/* User Info */}
              <div className="hidden lg:flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <User size={16} className="text-yellow-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 uppercase">{user.role}</p>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all font-medium text-sm"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-purple-400" />}
                <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
              </button>

              {/* Switch to Beta UI */}
              <button
                onClick={() => setShowSwitchUiConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg transition-all font-medium text-sm"
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Beta</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all font-medium text-sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* UI Switch Confirmation Modal */}
      {showSwitchUiConfirm && (
        <ConfirmModal
          title="Switch to Beta UI?"
          message="Try the new nightclub-optimized interface with improved mobile experience."
          confirmLabel="Switch to Beta"
          cancelLabel="Stay on Classic"
          variant="primary"
          onConfirm={() => {
            switchUiVersion("beta");
            setShowSwitchUiConfirm(false);
            toast.success("Switched to Beta UI");
          }}
          onCancel={() => setShowSwitchUiConfirm(false)}
        />
      )}

      {/* Navigation tabs — shown when user has multiple views */}
      {navigationTabs.length > 1 && (
        <div className="bg-gray-800/80 border-b border-gray-700 px-4 lg:px-6">
          <div className="flex gap-1">
            {navigationTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  currentView === id
                    ? "border-yellow-400 text-yellow-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Full Width */}
      <main className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default MainLayout;
