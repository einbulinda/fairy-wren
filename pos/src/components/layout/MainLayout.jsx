import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@/utils/constants";
import {
  User,
  LogOut,
  ShoppingCart,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";

// View components
import POSScreen from "@/pages/POSScreen";
import StockTakeEntry from "../../pages/StockTakeEntry";
import { useBills } from "@/hooks/useBills";

const getStorageKey = (role) => `fw_lastSeen_${role}`;

const MainLayout = () => {
  const { user, logout } = useAuth();

  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const { bills: openBills } = useBills({ active: true });

  /**
   * Navigation tabs are memoized to avoid recreating arrays
   * and to keep consistency across effects and render.
   */
  const navigationTabs = useMemo(() => {
    switch (user.role) {
      case USER_ROLES.WAITRESS:
        return [{ id: "pos", label: "POS", icon: ShoppingCart }];

      case USER_ROLES.BARTENDER:
        return [{ id: "pos", label: "POS", icon: ShoppingCart }];

      case USER_ROLES.MANAGER:
        return [];

      default:
        return [];
    }
  }, [user.role]);

  /**
   * View initialization logic simplified and made deterministic.
   * Priority:
   *   1. Saved view (if allowed)
   *   2. Role default
   */
  useEffect(() => {
    const roleDefaults = {
      [USER_ROLES.WAITRESS]: "pos",
      [USER_ROLES.BARTENDER]: "pos",
      [USER_ROLES.MANAGER]: "stock-take",
    };

    const allowedViews = navigationTabs.map((t) => t.id);
    const savedView = localStorage.getItem(getStorageKey(user.role));

    if (savedView && allowedViews.includes(savedView)) {
      setCurrentView(savedView);
    } else {
      setCurrentView(roleDefaults[user.role] || "pos");
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
      if (![USER_ROLES.WAITRESS, USER_ROLES.BARTENDER].includes(user.role)) {
        return;
      }

      setOpenBillsCount(openBills.length);

      // Fetch pending confirmation count for bartender
      if (user.role === USER_ROLES.BARTENDER) {
        setPendingConfirmCount(
          openBills.filter((bill) => bill.status === "awaiting_confirmation")
            .length,
        );
      }
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  }, [user.role, openBills]);

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
            <div className="flex items-center gap-3">
              {/* Open Bills Badge */}
              {openBillsCount > 0 && (
                <div className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg hidden sm:flex items-center gap-1">
                  <FileText size={14} />
                  {openBillsCount}
                </div>
              )}

              {/* Pending Confirmation Badge - Bartender only */}
              {pendingConfirmCount > 0 &&
                user.role === USER_ROLES.BARTENDER && (
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg hidden sm:flex items-center gap-1">
                    <ClipboardCheck size={14} />
                    {pendingConfirmCount}
                  </div>
                )}

              {/* User Info */}
              <div className="hidden lg:flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
                <User size={16} className="text-yellow-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 uppercase">
                    {user.role}
                  </p>
                </div>
              </div>

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

      {/* Main Content - Full Width */}
      <main className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default MainLayout;
