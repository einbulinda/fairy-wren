import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { USER_ROLES } from "../../utils/constants";
import { User, LogOut } from "lucide-react";
import { fetchOpenBills } from "../../services/bills.service";
import toast from "react-hot-toast";

// Import all view components
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

const STORAGE_KEY = "fw_lastSeen";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      const savedView = localStorage.getItem(STORAGE_KEY);

      if (savedView) {
        const allowedTabs = getNavigationTabs().map((tab) => tab.id);
        if (allowedTabs.includes(savedView)) {
          setCurrentView(savedView);
        } else {
          setDefaultView();
        }
      } else {
        setDefaultView();
      }
      if (user.role === USER_ROLES.BARTENDER) {
        setCurrentView("pos");
      } else if (user.role === USER_ROLES.MANAGER) {
        setCurrentView("inventory");
      } else if (user.role === USER_ROLES.OWNER) {
        setCurrentView("reports");
      }
    });
  }, [user.role]);

  // Save view whenever it changes
  useEffect(() => {
    if (currentView) {
      localStorage.setItem(STORAGE_KEY, currentView);
    }
  }, [currentView]);

  const fetchCounts = async () => {
    try {
      // Fetch Open Bills for Waitress and Bartender
      if ([USER_ROLES.WAITRESS, USER_ROLES.BARTENDER].includes(user.role)) {
        const openBills = await fetchOpenBills();
        setOpenBillsCount(openBills.length);
      }

      // Fetch pending confirmation count for bartender
      if (user.role === USER_ROLES.BARTENDER) {
        const openBills = await fetchOpenBills();
        const awaitingConfirmation = openBills.filter(
          (bill) => bill.status === "awaiting_confirmation"
        );
        setPendingConfirmCount(awaitingConfirmation.length);
      }
    } catch (error) {
      console.error("Failed to fetch counts:", error);
      // Don't show error toast as this runs in background
    }
  };

  // Fetch Counts on Mount and set up polling
  useEffect(() => {
    queueMicrotask(() => {
      fetchCounts();

      // Polls every 30 seconds for updates
      const interval = setInterval(() => {
        fetchCounts();
      }, 30000);

      return () => clearInterval(interval);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  // Fetch counts when view changes (to update immediately after actions)
  useEffect(() => {
    queueMicrotask(() => {
      fetchCounts();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const getNavigationTabs = () => {
    const tabs = [];

    switch (user.role) {
      case USER_ROLES.WAITRESS:
        tabs.push(
          { id: "pos", label: "POS" },
          { id: "bills", label: "All Bills" }
        );
        break;
      case USER_ROLES.BARTENDER:
        tabs.push(
          { id: "pos", label: "POS" },
          { id: "confirm", label: "Confirm Payments" },
          { id: "bills", label: "All Bills" }
        );
        break;
      case USER_ROLES.MANAGER:
        tabs.push(
          { id: "inventory", label: "Inventory" },
          { id: "approvals", label: "Approvals" },
          { id: "bills", label: "All Bills" }
        );
        break;
      case USER_ROLES.OWNER:
        tabs.push(
          { id: "reports", label: "Reports" },
          { id: "products", label: "Products" },
          { id: "expenses", label: "Expenses" },
          { id: "categories", label: "Categories" },
          { id: "users", label: "Users" },
          { id: "pos", label: "POS" },
          { id: "bills", label: "All Bills" },
          { id: "inventory", label: "Inventory" }
        );
        break;

      default:
        break;
    }
    return tabs;
  };

  const renderView = () => {
    switch (currentView) {
      case "pos":
        return <POSScreen />;
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
      default:
        return <POSScreen onBillUpdate={fetchCounts} />;
    }
  };

  const setDefaultView = () => {
    switch (user.role) {
      case USER_ROLES.WAITRESS:
      case USER_ROLES.BARTENDER:
        setCurrentView("pos");
        break;
      case USER_ROLES.MANAGER:
        setCurrentView("inventory");
        break;
      case USER_ROLES.OWNER:
        setCurrentView("reports");
        break;
      default:
        setCurrentView("pos");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/*START: Header*/}
      <div className="bg-gray-800 border-b-2 border-pink-500 p-4">
        <div className="flex-items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
            FAIRY WREN POS
          </h1>
          <div className="flex items-center space-x-4">
            {openBillsCount > 0 &&
              (user.role === USER_ROLES.WAITRESS ||
                user.role === USER_ROLES.BARTENDER) && (
                <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {openBillsCount} Open Bills
                </div>
              )}

            {pendingConfirmCount > 0 && user.role === USER_ROLES.BARTENDER && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                {pendingConfirmCount} Pending Confirmation
              </div>
            )}

            <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
              <User size={20} className="text-pink-500" />
              <span className="font-semibold">#{user.name}</span>
              <span className="text-xs text-gray-400">({user.role})</span>
            </div>

            <button
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
      {/* END: Header */}

      {/* START: Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-4">
        <div className="flex space-x-2 max-w-7xl mx-auto overflow-x-auto">
          {getNavigationTabs().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap ${
                currentView === tab.id
                  ? "border-b-2 border-pink-500 text-pink-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {/* END: Navigation */}

      {/* START: Main Content */}
      <div className="p-4 max-w-7xl mx-auto">{renderView()}</div>
      {/* END: Main Content */}
    </div>
  );
};

export default MainLayout;
