import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import {
  BarChart3,
  Receipt,
  Package,
  Truck,
  MoreHorizontal,
} from "lucide-react";

const routeTitles = {
  "/": "Dashboard",
  "/inventory": "Inventory",
  "/products": "Products",
  "/purchasing": "Purchasing",
  "/accounting": "Accounting",
  "/expenses": "Expenses",
  "/payroll": "Payroll",
  "/reports": "Financial Reports",
  "/web": "Web Management",
  "/users": "User Management",
  "/profile": "My Profile",
};

const bottomNavItems = [
  { to: "/", icon: BarChart3, label: "Home", end: true },
  { to: "/sales", icon: Receipt, label: "Sales" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/purchasing", icon: Truck, label: "Purchasing" },
];

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const location = useLocation();

  const title =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith("/purchasing/") ? "Supplier Detail" :
     location.pathname.startsWith("/products/")   ? "Product Detail"  :
     location.pathname.startsWith("/bank-reconciliation/") ? "Bank Reconciliation" : "Fairy Wren ERP");

  return (
    <div className="h-screen bg-surface-950 text-white flex overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        minimized={sidebarMinimized}
        onToggleMinimized={() => setSidebarMinimized((m) => !m)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-900/95 backdrop-blur-sm border-t border-surface-700">
          <div className="flex items-center justify-around h-14">
            {bottomNavItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-surface-400 active:text-surface-200 transition-colors"
            >
              <MoreHorizontal size={20} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AppShell;