import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { USER_ROLES } from "../../utils/constants";
import {
  User,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  CheckCircle,
  FileText,
  ClipboardCheck,
  Package,
  BarChart3,
  DollarSign,
  Users,
  Grid,
  FolderTree,
  Landmark,
  Truck,
} from "lucide-react";
import { fetchOpenBills } from "../../services/bills.service";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";

// View components
import POSScreen from "../pos/POSScreen";
import ConfirmPayments from "../bartender/ConfirmPayments";
import BillsView from "../shared/BillsView";
import ApprovalsRequest from "../manager/ApprovalRequests";
import InventoryManagement from "../manager/InventoryManagement";
import SalesReports from "../owner/SalesReports";
import ExpenseManagement from "../owner/ExpenseManagement";
import UserManagement from "../owner/UserManagement";
import ProductManagement from "../owner/ProductManagement";
import CategoriesManagement from "../owner/CategoriesManagement";
import AccountsManagement from "../owner/AccountsManagement";
import SupplierManagement from "../owner/SupplierManagement";

const getStorageKey = (role) => `fw_lastSeen_${role}`;

const MainLayout = () => {
  const { user, logout } = useAuth();

  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * CHANGE: 01/01/2026
   * Navigation tabs are memoized to avoid recreating arrays
   * and to keep consistency across effects and render.
   */

  const navigationTabs = useMemo(() => {
    switch (user.role) {
      case USER_ROLES.WAITRESS:
        return [
          { id: "pos", label: "POS", icon: ShoppingCart },
          { id: "bills", label: "All Bills", icon: FileText },
        ];

      case USER_ROLES.BARTENDER:
        return [
          { id: "pos", label: "POS", icon: ShoppingCart },
          { id: "confirm", label: "Confirm Payments", icon: CheckCircle },
          { id: "bills", label: "All Bills", icon: FileText },
        ];

      case USER_ROLES.MANAGER:
        return [
          { id: "inventory", label: "Inventory", icon: Package },
          { id: "approvals", label: "Approvals", icon: ClipboardCheck },
          { id: "bills", label: "All Bills", icon: FileText },
        ];

      case USER_ROLES.OWNER:
        return [
          { id: "reports", label: "Dashboard", icon: BarChart3 },
          { id: "products", label: "Products", icon: Grid },
          { id: "expenses", label: "Expenses", icon: DollarSign },
          { id: "categories", label: "Categories", icon: FolderTree },
          { id: "users", label: "Users", icon: Users },
          { id: "pos", label: "POS", icon: ShoppingCart },
          { id: "bills", label: "All Bills", icon: FileText },
          { id: "inventory", label: "Inventory", icon: Package },
          { id: "accounts", label: "Chart of Accounts", icon: Landmark },
          { id: "suppliers", label: "Suppliers", icon: Truck },
        ];

      default:
        return [];
    }
  }, [user.role]);

  /**
   * CHANGE: 01/01/2026
   * View initialization logic simplified and made deterministic.
   * Priority:
   *   1. Saved view (if allowed)
   *   2. Role default
   */

  useEffect(() => {
    const roleDefaults = {
      [USER_ROLES.WAITRESS]: "pos",
      [USER_ROLES.BARTENDER]: "pos",
      [USER_ROLES.MANAGER]: "inventory",
      [USER_ROLES.OWNER]: "reports",
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
   * CHANGE:01/01/2026
   * Save current view using role-scoped key
   */

  useEffect(() => {
    if (currentView) {
      localStorage.setItem(getStorageKey(user.role), currentView);
    }
  }, [currentView, user.role]);

  /**
   * CHANGE:
   * fetchCounts now performs a SINGLE API call
   * and derives all counts from it.
   */

  const fetchCounts = useCallback(async () => {
    try {
      if (![USER_ROLES.WAITRESS, USER_ROLES.BARTENDER].includes(user.role)) {
        return;
      }

      const openBills = await fetchOpenBills();
      setOpenBillsCount(openBills.length);

      // Fetch pending confirmation count for bartender
      if (user.role === USER_ROLES.BARTENDER) {
        setPendingConfirmCount(
          openBills.filter((bill) => bill.status === "awaiting_confirmation")
            .length
        );
      }
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  }, [user.role]);

  /**
   * CHANGE:
   * Removed queueMicrotask.
   * Cleanup now works correctly.
   */
  useEffect(() => {
    fetchCounts();

    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  /**
   * CHANGE:
   * POSScreen always receives onBillUpdate consistently
   */
  const renderView = () => {
    switch (currentView) {
      case "pos":
        return <POSScreen onBillUpdate={fetchCounts} />;
      case "confirm":
        return <ConfirmPayments />;
      case "bills":
        return <BillsView />;
      case "approvals":
        return <ApprovalsRequest />;
      case "inventory":
        return <InventoryManagement />;
      case "reports":
        return <SalesReports />;
      case "expenses":
        return <ExpenseManagement />;
      case "users":
        return <UserManagement />;
      case "products":
        return <ProductManagement />;
      case "categories":
        return <CategoriesManagement />;
      case "accounts":
        return <AccountsManagement />;
      case "suppliers":
        return <SupplierManagement />;
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
          lg:translate-x-0 lg:relative lg:w-72 w-72
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

      {/* START: Main Content */}
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
      {/* END: Main Content */}
    </div>
  );
};

export default MainLayout;
