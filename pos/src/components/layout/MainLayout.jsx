import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@/utils/constants";
import {
  User,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  FileText,
  ClipboardCheck,
  DollarSign,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";

// View components
import POSScreen from "@/pages/POSScreen";
import ExpenseManagement from "../owner/ExpenseManagement";
import UserManagement from "../../pages/UserManagement";
import StockTakeEntry from "../../pages/StockTakeEntry";
import { useBills } from "@/hooks/useBills";

const getStorageKey = (role) => `fw_lastSeen_${role}`;

const MainLayout = () => {
  const { user, logout } = useAuth();

  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { bills: openBills } = useBills({ active: true });

  // Check if user has sidebar (Manager and Owner only)
  const hasSidebar = useMemo(() => {
    return [USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(user.role);
  }, [user.role]);

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

      case USER_ROLES.OWNER:
      case USER_ROLES.ADMIN:
        return [
          { id: "expenses", label: "Expenses", icon: DollarSign },
          { id: "users", label: "Users", icon: Users },
          { id: "pos", label: "POS", icon: ShoppingCart },
        ];

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
      [USER_ROLES.OWNER]: "expenses",
      [USER_ROLES.ADMIN]: "expenses",
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
      case "expenses":
        return <ExpenseManagement />;
      case "users":
        return <UserManagement />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const handleNavClick = (tabId) => {
    setCurrentView(tabId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Layout without sidebar (Waitress/Bartender)
  if (!hasSidebar) {
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
  }

  // Layout with sidebar (Manager/Owner)
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b-2 border-yellow-400 p-4 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <img src={fwLogo} alt="Fairy Wren" className="h-10 w-auto" />
          </div>
          <div className="flex items-center space-x-2">
            {openBillsCount > 0 &&
              (user.role === USER_ROLES.WAITRESS ||
                user.role === USER_ROLES.BARTENDER) && (
                <div className="bg-yellow-500 text-gray-900 px-2 py-1 rounded-full text-xs font-bold">
                  {openBillsCount}
                </div>
              )}

            {pendingConfirmCount > 0 && user.role === USER_ROLES.BARTENDER && (
              <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                {pendingConfirmCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-gray-800/95 backdrop-blur-sm border-r-2 border-yellow-400
          transition-transform duration-300 ease-in-out z-40
          flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative lg:w-62 w-62
        `}
      >
        {/* Logo and Brand */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <img src={fwLogo} alt="Fairy Wren" className="h-16 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-yellow-400 tracking-wide">
                FAIRY WREN
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                Point of Sale
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-lg">
            <User size={16} className="text-yellow-400" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-400 uppercase">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                  font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/30"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-yellow-400"
                  }
                `}
              >
                <Icon size={20} />
                <span className="text-sm">{tab.label}</span>
                {tab.id === "bills" && openBillsCount > 0 && (
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-gray-900 text-yellow-400"
                        : "bg-yellow-400 text-gray-900"
                    }`}
                  >
                    {openBillsCount}
                  </span>
                )}
                {tab.id === "confirm" && pendingConfirmCount > 0 && (
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold animate-pulse ${
                      isActive
                        ? "bg-gray-900 text-red-400"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {pendingConfirmCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/95 sticky bottom-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-all font-medium"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="h-screen overflow-y-auto flex-1">
        {/* Desktop Header */}
        <div className="hidden lg:block bg-gray-800/95 backdrop-blur-sm border-b-2 border-yellow-400 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-yellow-400">
                  {navigationTabs.find((t) => t.id === currentView)?.label ||
                    "Dashboard"}
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                {openBillsCount > 0 &&
                  (user.role === USER_ROLES.WAITRESS ||
                    user.role === USER_ROLES.BARTENDER) && (
                    <div className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      {openBillsCount} Open Bills
                    </div>
                  )}

                {pendingConfirmCount > 0 &&
                  user.role === USER_ROLES.BARTENDER && (
                    <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg">
                      {pendingConfirmCount} Pending Confirmation
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 pt-20 lg:pt-4 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
