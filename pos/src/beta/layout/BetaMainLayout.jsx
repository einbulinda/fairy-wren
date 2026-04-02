import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Home,
  Package,
  FileText,
  User,
  LogOut,
  Users,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import logo from "/fairy-logo-only.png";
import BetaPOSScreen from "@/beta/pages/BetaPOSScreen";
import BetaStockTakeScreen from "@/beta/pages/BetaStockTakeScreen";
import BetaZReportScreen from "@/beta/pages/BetaZReportScreen";
import ConfirmModal from "@/components/shared/ConfirmModal";
import toast from "react-hot-toast";

const BetaMainLayout = () => {
  const { user, logout, uiVersion, switchUiVersion } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("pos");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSwitchUiConfirm, setShowSwitchUiConfirm] = useState(false);

  const hasPosAccess = user?.permissions?.includes("pos_access");
  const hasStockAccess = user?.permissions?.includes("stock_take");
  const hasZReportAccess = user?.permissions?.includes("z_report");

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + number to switch tabs
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "3") {
        e.preventDefault();
        const tabs = ["pos", "stock", "zreport"].filter((tab) => {
          if (tab === "pos") return hasPosAccess;
          if (tab === "stock") return hasStockAccess;
          if (tab === "zreport") return hasZReportAccess;
          return true;
        });
        const index = parseInt(e.key) - 1;
        if (tabs[index]) setActiveTab(tabs[index]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPosAccess, hasStockAccess]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  }, [logout]);

  const handleSwitchUi = useCallback(() => {
    const newVersion = uiVersion === "beta" ? "classic" : "beta";
    switchUiVersion(newVersion);
    setShowSwitchUiConfirm(false);
    toast.success(`Switched to ${newVersion} UI`);
  }, [uiVersion, switchUiVersion]);

  const renderContent = () => {
    switch (activeTab) {
      case "pos":
        return hasPosAccess ? (
          <BetaPOSScreen />
        ) : (
          <AccessDenied message="POS access required" />
        );
      case "stock":
        return hasStockAccess ? (
          <BetaStockTakeScreen />
        ) : (
          <AccessDenied message="Stock take access required" />
        );
      case "zreport":
        return hasZReportAccess ? (
          <BetaZReportScreen />
        ) : (
          <AccessDenied message="Z-Report access required" />
        );
      default:
        return <BetaPOSScreen />;
    }
  };

  // Tab configuration
  const tabs = [
    { id: "pos", label: "POS", icon: Home, enabled: hasPosAccess },
    { id: "stock", label: "Stock", icon: Package, enabled: hasStockAccess },
    { id: "zreport", label: "Report", icon: FileText, enabled: hasZReportAccess },
  ].filter((t) => t.enabled);

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/30 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={logo}
              alt="Fairy Wren"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Fairy Wren</h1>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-bold uppercase tracking-wider rounded">
                Beta
              </span>
              <span className="text-xs text-gray-400">
                {user?.full_name || user?.name || "User"}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500/20 to-purple-600/20 text-pink-400 border border-pink-500/30"
                  : "text-gray-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className="text-xs text-gray-600 ml-1">
                Ctrl+{index + 1}
              </span>
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-purple-400" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {/* Switch UI Button */}
          <button
            onClick={() => setShowSwitchUiConfirm(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
          >
            <Settings size={14} />
            <span>Classic UI</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{renderContent()}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden h-16 bg-slate-900/90 backdrop-blur-md border-t border-slate-700/30 grid grid-cols-4 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === tab.id
                ? "text-pink-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <tab.icon size={20} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}

        {/* More/Mobile Menu Button */}
        <button
          onClick={() => setShowSwitchUiConfirm(true)}
          className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 transition-all"
        >
          <Settings size={20} />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <ConfirmModal
          title="Logout?"
          message="Are you sure you want to log out?"
          confirmLabel="Logout"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {/* Switch UI Confirmation */}
      {showSwitchUiConfirm && (
        <ConfirmModal
          title="Switch UI?"
          message={`Switch to ${
            uiVersion === "beta" ? "Classic" : "Beta"
          } interface?`}
          confirmLabel="Switch"
          cancelLabel="Cancel"
          variant="primary"
          onConfirm={handleSwitchUi}
          onCancel={() => setShowSwitchUiConfirm(false)}
        />
      )}
    </div>
  );
};

// Access Denied Component
const AccessDenied = ({ message }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
      <Users size={32} className="text-gray-500" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
    <p className="text-gray-400">{message}</p>
  </div>
);

export default BetaMainLayout;
