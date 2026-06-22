import { useState } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import {
  BarChart3,
  Receipt,
  Package,
  Truck,
  MoreHorizontal,
  Home,
  LayoutDashboard,
  Zap,
  TrendingUp,
  FileText,
  DollarSign,
  Scale,
  PackagePlus,
  BarChart2,
  CheckSquare,
  FolderTree,
  Clock,
  List,
  CheckCircle2,
  Ban,
  Landmark,
  BookOpen,
  PenLine,
  FileCheck,
  ArrowLeftRight,
  Target,
  Building2,
  Users,
  Shield,
  Calendar,
  Briefcase,
} from "lucide-react";

const inventoryNavTabs = [
  { path: "/inventory",           short: "Stock",   icon: Package },
  { path: "/inventory/receive",   short: "Receive", icon: PackagePlus },
  { path: "/inventory/reports",   short: "Reports", icon: BarChart2 },
  { path: "/inventory/approvals", short: "Approve", icon: CheckSquare },
  { path: "/inventory/insights",  short: "Insights",icon: TrendingUp },
];

const productsNavTabs = [
  { key: "products",    short: "Products",    icon: Package },
  { key: "categories",  short: "Categories",  icon: FolderTree },
];

const purchasingNavTabs = [
  { key: "suppliers",        short: "Suppliers", icon: Truck },
  { key: "pending-invoices", short: "Invoices",  icon: Clock },
  { key: "receive",          short: "Receive",   icon: PackagePlus },
  { key: "reorder-forecast", short: "Reorder",   icon: TrendingUp },
];

const salesNavTabs = [
  { key: "all",       short: "All",     icon: List },
  { key: "open",      short: "Open",    icon: Clock },
  { key: "completed", short: "Closed",  icon: CheckCircle2 },
  { key: "void",      short: "Void",    icon: Ban },
  { key: "products",  short: "Products",icon: Package },
];

const accountingNavTabs = [
  { key: "chart-of-accounts",   short: "COA",     icon: Landmark },
  { key: "general-ledger",      short: "Ledger",  icon: BookOpen },
  { key: "journal-entries",     short: "Journals",icon: PenLine },
  { key: "cheques",             short: "Cheques", icon: FileCheck },
  { key: "bank-reconciliation", short: "Recon",   icon: ArrowLeftRight },
  { key: "periods",             short: "Periods", icon: Calendar },
];

const payrollNavTabs = [
  { key: "employees", short: "Employees", icon: Users },
  { key: "runs",      short: "Runs",      icon: Briefcase },
];

const usersNavTabs = [
  { key: "users",         short: "Users", icon: Users },
  { key: "staff-targets", short: "Staff", icon: Target },
  { key: "system-roles",  short: "Roles", icon: Shield },
];

const settingsNavTabs = [
  { key: "organisation",       short: "Org",       icon: Building2 },
  { key: "business-targets",   short: "Targets",   icon: BarChart3 },
  { key: "account-classes",    short: "Acct",      icon: BookOpen },
  { key: "inventory-policies", short: "Inventory", icon: Package },
];

const dashboardNavTabs = [
  { key: "executive",   short: "Overview", icon: LayoutDashboard },
  { key: "financial",   short: "Finance",  icon: DollarSign },
  { key: "operations",  short: "Ops",      icon: Zap },
  { key: "collections", short: "Bills",    icon: FileText },
];

const reportNavTabs = [
  { key: "income-statement", short: "Income", icon: TrendingUp },
  { key: "balance-sheet", short: "Balance", icon: FileText },
  { key: "trial-balance", short: "Trial", icon: BarChart3 },
  { key: "cash-flow", short: "Cash", icon: DollarSign },
  { key: "equity-changes", short: "Equity", icon: Scale },
];

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
  "/payroll": "Payroll",
  "/profile": "My Profile",
  "/help": "Help Desk",
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
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const { pathname } = location;

  const isDashboardPage  = pathname === "/";
  const activeDashboardTab = params.get("tab") || "executive";

  const isReportsPage   = pathname === "/reports";
  const activeReportTab = params.get("tab") || "income-statement";

  const isInventoryPage = pathname.startsWith("/inventory") &&
    !pathname.match(/^\/inventory\/reports\//) &&
    !pathname.match(/^\/inventory\/receipts\//);
  const activeInventoryTab = inventoryNavTabs
    .slice(1)
    .find((t) => pathname.startsWith(t.path))?.path ?? "/inventory";

  const isProductsPage    = pathname === "/products";
  const activeProductsTab = params.get("tab") || "products";

  const isPurchasingPage    = pathname === "/purchasing";
  const activePurchasingTab = params.get("tab") || "suppliers";

  const isSalesPage      = pathname === "/sales";
  const activeSalesStatus = params.get("status") || "all";

  const isAccountingPage    = pathname === "/accounting";
  const activeAccountingTab = params.get("tab") || "chart-of-accounts";

  const isUsersPage    = pathname === "/users";
  const activeUsersTab = params.get("tab") || "users";

  const isSettingsPage    = pathname === "/settings";
  const activeSettingsTab = params.get("tab") || "organisation";

  const isPayrollPage    = pathname === "/payroll";
  const activePayrollTab = params.get("tab") || "employees";

  const title =
    routeTitles[pathname] ||
    (pathname.startsWith("/purchasing/") ? "Supplier Detail" :
     pathname.startsWith("/products/")   ? "Product Detail"  :
     pathname.startsWith("/bank-reconciliation/") ? "Bank Reconciliation" : "Fairy Wren ERP");

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
          {isDashboardPage ? (
            /* Contextual nav for Dashboard */
            <div className="flex items-center h-14">
              {dashboardNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeDashboardTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isInventoryPage ? (
            /* Contextual nav for Inventory */
            <div className="flex items-center h-14">
              {inventoryNavTabs.map(({ path, short, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeInventoryTab === path
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
            </div>
          ) : isProductsPage ? (
            /* Contextual nav for Products */
            <div className="flex items-center h-14">
              <button
                onClick={() => navigate("/")}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <Home size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">Home</span>
              </button>
              {productsNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/products?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeProductsTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isPurchasingPage ? (
            /* Contextual nav for Purchasing */
            <div className="flex items-center h-14">
              {purchasingNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/purchasing?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activePurchasingTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isSalesPage ? (
            /* Contextual nav for Sales */
            <div className="flex items-center h-14">
              {salesNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/sales?status=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeSalesStatus === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
            </div>
          ) : isAccountingPage ? (
            /* Contextual nav for Accounting */
            <div className="flex items-center h-14">
              {accountingNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/accounting?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeAccountingTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
            </div>
          ) : isUsersPage ? (
            /* Contextual nav for User Management */
            <div className="flex items-center h-14">
              <button
                onClick={() => navigate("/")}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <Home size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">Home</span>
              </button>
              {usersNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/users?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeUsersTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isSettingsPage ? (
            /* Contextual nav for Settings */
            <div className="flex items-center h-14">
              {settingsNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/settings?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeSettingsTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isPayrollPage ? (
            /* Contextual nav for Payroll */
            <div className="flex items-center h-14">
              <button
                onClick={() => navigate("/")}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <Home size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">Home</span>
              </button>
              {payrollNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/payroll?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activePayrollTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
              >
                <MoreHorizontal size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">More</span>
              </button>
            </div>
          ) : isReportsPage ? (
            /* Contextual nav for Financial Reports */
            <div className="flex items-center h-14">
              {/* Home button */}
              <button
                onClick={() => navigate("/")}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-surface-400 active:text-surface-200 transition-colors"
                aria-label="Home"
              >
                <Home size={19} strokeWidth={1.8} />
                <span className="text-[9px] font-medium">Home</span>
              </button>

              {/* Report tabs */}
              {reportNavTabs.map(({ key, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(`/reports?tab=${key}`)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95 ${
                    activeReportTab === key
                      ? "text-primary-400"
                      : "text-surface-400 active:text-surface-200"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-medium">{short}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Main app nav */
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
          )}
        </nav>
      </div>
    </div>
  );
};

export default AppShell;