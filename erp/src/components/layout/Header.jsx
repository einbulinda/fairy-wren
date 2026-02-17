import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Menu, Search, Bell, ChevronDown, LogOut, User } from "lucide-react";

const Header = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
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

        {/* Right: search, notifications, user */}
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

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800">
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

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
                  onClick={() => setUserMenuOpen(false)}
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