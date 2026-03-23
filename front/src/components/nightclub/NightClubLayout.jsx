import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { USER_ROLES } from "../../utils/constants";
import {
  User,
  LogOut,
  Moon,
  Sun,
  Zap,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { fetchOpenBills } from "../../services/bills.service";
import toast from "react-hot-toast";
import fwLogo from "/fairy-logo-only.png";

// Night Club Views
import NightClubPOS from "../../pages/nightclub/NightClubPOS";

const NightClubLayout = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState("pos");
  const [openBillsCount, setOpenBillsCount] = useState(0);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [stats, setStats] = useState({ sales: 0, orders: 0 });
  const [showStats, setShowStats] = useState(false);

  const isBartender = user?.role === USER_ROLES.BARTENDER;
  const isWaitress = user?.role === USER_ROLES.WAITRESS;
  const isManagerOrOwner = [USER_ROLES.MANAGER, USER_ROLES.OWNER].includes(user?.role);

  // Navigation items based on role
  const navItems = useMemo(() => {
    const items = [
      { id: "pos", label: "Quick POS", icon: Zap, color: "pink" },
    ];

    if (isBartender || isManagerOrOwner) {
      items.push({
        id: "confirm",
        label: "Confirm",
        icon: CheckCircle,
        color: "green",
        badge: pendingConfirmCount,
      });
    }

    items.push({
      id: "bills",
      label: "Active Bills",
      icon: ClipboardList,
      color: "blue",
      badge: openBillsCount,
    });

    if (isManagerOrOwner) {
      items.push({
        id: "stats",
        label: "Live Stats",
        icon: TrendingUp,
        color: "purple",
      });
    }

    return items;
  }, [isBartender, isManagerOrOwner, openBillsCount, pendingConfirmCount, isWaitress]);

  // Fetch counts
  const fetchCounts = useCallback(async () => {
    try {
      const openBills = await fetchOpenBills();
      setOpenBillsCount(openBills.length);

      if (isBartender) {
        setPendingConfirmCount(
          openBills.filter((bill) => bill.status === "awaiting_confirmation").length
        );
      }

      // Calculate quick stats
      const totalSales = openBills.reduce((sum, bill) => {
        const billTotal = bill.rounds?.reduce((roundSum, round) => {
          return roundSum + (round.round_items?.reduce((itemSum, item) => {
            return itemSum + (item.price * item.quantity);
          }, 0) || 0);
        }, 0) || 0;
        return sum + billTotal;
      }, 0);

      setStats({
        sales: totalSales,
        orders: openBills.length,
      });
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  }, [isBartender]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // Faster refresh for nightclub
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const handleLogout = () => {
    logout();
    toast.success("See you next shift! 🌙");
  };

  const handleSwitchUI = () => {
    localStorage.removeItem("fw_ui_mode");
    window.location.reload();
  };

  const renderView = () => {
    switch (currentView) {
      case "pos":
        return <NightClubPOS onUpdate={fetchCounts} />;
      case "bills":
        return (
          <div className="p-4">
            <h2 className="text-2xl font-bold text-white mb-4">Active Bills</h2>
            <p className="text-gray-400">Active bills view coming soon...</p>
          </div>
        );
      case "confirm":
        return (
          <div className="p-4">
            <h2 className="text-2xl font-bold text-white mb-4">Confirm Payments</h2>
            <p className="text-gray-400">Payment confirmation view coming soon...</p>
          </div>
        );
      case "stats":
        return (
          <div className="p-4">
            <h2 className="text-2xl font-bold text-white mb-4">Live Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/20">
                <p className="text-purple-400 text-sm">Active Sales</p>
                <p className="text-2xl font-bold text-white">KSh {stats.sales.toFixed(2)}</p>
              </div>
              <div className="bg-pink-900/30 p-4 rounded-xl border border-pink-500/20">
                <p className="text-pink-400 text-sm">Open Orders</p>
                <p className="text-2xl font-bold text-white">{stats.orders}</p>
              </div>
            </div>
          </div>
        );
      default:
        return <NightClubPOS onUpdate={fetchCounts} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-900/95 border-b border-purple-500/20 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={fwLogo} alt="Logo" className="h-8 w-auto" />
          <span className="font-bold text-yellow-400">NIGHT MODE</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingConfirmCount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              {pendingConfirmCount}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-2 bg-red-600/80 rounded-lg"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-gray-900/95 border-r border-purple-500/20">
        {/* Logo */}
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <img src={fwLogo} alt="Logo" className="h-10 w-auto" />
            <div className="hidden lg:block">
              <h1 className="font-bold text-yellow-400 text-sm tracking-wider">NIGHT MODE</h1>
              <p className="text-xs text-gray-500">High Speed POS</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="hidden lg:block">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500 uppercase">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const colorClasses = {
              pink: "from-pink-500 to-rose-500",
              blue: "from-blue-500 to-cyan-500",
              green: "from-green-500 to-emerald-500",
              purple: "from-purple-500 to-violet-500",
            };

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? `bg-gradient-to-r ${colorClasses[item.color]} text-white shadow-lg`
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon size={22} />
                  {item.badge > 0 && (
                    <span className={`absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
                      isActive ? "bg-white text-gray-900" : "bg-red-500 text-white"
                    }`}>
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block font-medium">{item.label}</span>
                {isActive && <ChevronRight size={16} className="hidden lg:block ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 space-y-1 border-t border-purple-500/20">
          <button
            onClick={handleSwitchUI}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-yellow-400 transition-all"
          >
            <Sun size={22} />
            <span className="hidden lg:block font-medium">Switch to Classic</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
          >
            <LogOut size={22} />
            <span className="hidden lg:block font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Stats Bar - Desktop */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 bg-gray-900/50 border-b border-purple-500/20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-pink-400" size={18} />
              <span className="text-gray-400 text-sm">Live Sales:</span>
              <span className="text-white font-bold">KSh {stats.sales.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="text-blue-400" size={18} />
              <span className="text-gray-400 text-sm">Open Bills:</span>
              <span className="text-white font-bold">{openBillsCount}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
            <p className="text-sm text-purple-400 font-mono">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderView()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-purple-500/20 safe-area-pb z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
                  isActive
                    ? "text-pink-400 bg-pink-500/10"
                    : "text-gray-500"
                }`}
              >
                <div className="relative">
                  <Icon size={22} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default NightClubLayout;
