import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Sun,
  Moon,
  Eye,
  ClipboardCheck,
} from "lucide-react";

const Header = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pendingApprovals, count } = usePendingApprovals();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-[64px] bg-surface-900/95 backdrop-blur-sm border-b border-surface-700 sticky top-0 z-20">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>

        {/* Right: search, theme, notifications, user */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center bg-surface-800 rounded-lg px-3 py-1.5 border border-surface-700">
            <Search size={16} className="text-surface-400 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none w-48"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <Bell size={19} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-danger text-[10px] font-bold text-[#fff] rounded-full px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="fixed left-1/2 -translate-x-1/2 top-17.5 w-[calc(100vw-2rem)] max-w-80 md:absolute md:left-auto md:translate-x-0 md:right-0 md:top-auto md:mt-1 md:w-80 bg-surface-800 rounded-xl shadow-lg border border-surface-700 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                  <h4 className="text-sm font-semibold text-white">
                    Pending Approvals
                  </h4>
                  {count > 0 && (
                    <span className="text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full font-medium">
                      {count}
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {pendingApprovals.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <ClipboardCheck
                        size={28}
                        className="mx-auto mb-2 text-surface-600"
                      />
                      <p className="text-sm text-surface-400">
                        No pending approvals
                      </p>
                    </div>
                  ) : (
                    pendingApprovals.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate(`/inventory/reports/${item.id}`, {
                            state: { from: "approvals" },
                          });
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-surface-700/50 transition-colors border-b border-surface-700/50 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {item.stock_take_name || "Stock Take"}
                            </p>
                            <p className="text-xs text-surface-400 mt-0.5">
                              {item.profiles?.name || "Unknown"} &middot;{" "}
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                              item.approval_status === "under_review"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {item.approval_status?.replace("_", " ") || "pending"}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-surface-700">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate("/inventory/approvals");
                    }}
                    className="w-full px-4 py-2.5 text-sm text-primary-400 hover:bg-surface-700/50 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <Eye size={14} />
                    View All Approvals
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-300">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-surface-200 leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-surface-400 capitalize">
                  {user.role}
                </p>
              </div>
              <ChevronDown size={14} className="text-surface-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface-800 rounded-lg shadow-lg border border-surface-700 py-1 z-50">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate("/profile"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <div className="border-t border-surface-700 my-1" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;