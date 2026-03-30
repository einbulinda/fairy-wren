import { NavLink, useLocation } from "react-router";
import {
  BarChart3,
  Package,
  Grid,
  Truck,
  Landmark,
  BookOpen,
  FileCheck,
  PenLine,
  DollarSign,
  Users,
  ClipboardCheck,
  ChevronDown,
  X,
  LineChart,
  BarChart2,
  FileText,
  Settings,
  Receipt,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  Globe,
  CalendarDays,
  MessageSquare,
  Images,
} from "lucide-react";
import fwLogo from "/fairy-logo-only.png";
import { useState } from "react";

const navSections = [
  {
    label: "Main",
    items: [
      { to: "/", icon: BarChart3, label: "Dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        to: "/inventory",
        icon: Package,
        label: "Inventory",
        children: [
          { to: "/inventory", end: true, icon: Package, label: "Stock Levels" },
          { to: "/inventory/conversions", icon: Repeat, label: "Conversions" },
          { to: "/inventory/reports", icon: BarChart2, label: "Reports" },
          { to: "/inventory/approvals", icon: ClipboardCheck, label: "Approvals" },
        ],
      },
      { to: "/sales", icon: Receipt, label: "Sales" },
      { to: "/products", icon: Grid, label: "Products" },
      {
        to: "/suppliers",
        icon: Truck,
        label: "Suppliers",
        children: [
          { to: "/suppliers", end: true, icon: Truck, label: "All Suppliers" },
          { to: "/suppliers/pending-invoices", icon: Clock, label: "Pending Invoices" },
          { to: "/inventory/receive", icon: Package, label: "Receive Goods" },
        ],
      },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/accounts", icon: Landmark, label: "Chart of Accounts" },
      { to: "/ledger", icon: BookOpen, label: "General Ledger" },
      { to: "/journals", icon: PenLine, label: "Journal Entries" },
      { to: "/cheques", icon: FileCheck, label: "Cheques" },
      { to: "/bank-reconciliation", icon: Landmark, label: "Bank Reconciliation" },
      { to: "/expenses", icon: DollarSign, label: "Expenses" },
    ],
  },
  {
    label: "Payroll",
    items: [
      { to: "/payroll", icon: Users, label: "Payroll" },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        to: "/reports",
        icon: LineChart,
        label: "Financial Reports",
        children: [
          { to: "/reports", end: true, icon: LineChart, label: "Overview" },
          { to: "/reports/balance-sheet", icon: FileText, label: "Balance Sheet" },
        ],
      },
    ],
  },
  {
    label: "Web Management",
    items: [
      {
        to: "/web",
        icon: Globe,
        label: "Web Management",
        children: [
          { to: "/web/events", icon: CalendarDays, label: "Events" },
          { to: "/web/gallery", icon: Images, label: "Gallery" },
          { to: "/web/feedback", icon: MessageSquare, label: "Customer Feedback" },
        ],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", icon: Users, label: "User Management" },
      { to: "/approvals", icon: ClipboardCheck, label: "Approvals" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

// Nav item with expandable children (e.g. Inventory sub-pages)
const NavParent = ({ item, onClose, minimized }) => {
  const { pathname } = useLocation();
  const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
  const [open, setOpen] = useState(isActive);

  // Minimized: just show icon, link to parent route
  if (minimized) {
    return (
      <NavLink
        to={item.to}
        onClick={onClose}
        title={item.label}
        className={`flex items-center justify-center p-2 rounded-md transition-colors ${
          isActive
            ? "bg-primary-600/20 text-primary-400"
            : "text-surface-300 hover:bg-surface-800 hover:text-white"
        }`}
      >
        <item.icon size={17} strokeWidth={1.8} />
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-[13px] transition-colors ${
          isActive
            ? "bg-primary-600/20 text-primary-400 font-medium"
            : "text-surface-300 hover:bg-surface-800 hover:text-white"
        }`}
      >
        <item.icon size={17} strokeWidth={1.8} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 border-l border-surface-700 pl-3 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                  isActive
                    ? "text-primary-400 font-medium"
                    : "text-surface-400 hover:text-white hover:bg-surface-800"
                }`
              }
            >
              <child.icon size={14} strokeWidth={1.8} />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const NavItem = ({ item, onClose, minimized }) => {
  if (minimized) {
    return (
      <NavLink
        to={item.to}
        end={item.to === "/"}
        onClick={onClose}
        title={item.label}
        className={({ isActive }) =>
          `flex items-center justify-center p-2 rounded-md transition-colors ${
            isActive
              ? "bg-primary-600/20 text-primary-400"
              : "text-surface-300 hover:bg-surface-800 hover:text-white"
          }`
        }
      >
        <item.icon size={17} strokeWidth={1.8} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${
          isActive
            ? "bg-primary-600/20 text-primary-400 font-medium"
            : "text-surface-300 hover:bg-surface-800 hover:text-white"
        }`
      }
    >
      <item.icon size={17} strokeWidth={1.8} />
      <span>{item.label}</span>
    </NavLink>
  );
};

const Sidebar = ({ open, onClose, minimized, onToggleMinimized }) => {
  const [collapsed, setCollapsed] = useState({});

  const toggleSection = (label) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen bg-surface-900 border-r border-surface-700
          transition-all duration-300 ease-in-out z-40
          flex flex-col
          ${minimized ? "lg:w-16" : "lg:w-65"} w-65
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-surface-700 shrink-0 ${minimized ? "lg:justify-center lg:px-2" : "justify-between"} px-5`}>
          <div className={`flex items-center ${minimized ? "lg:justify-center" : "gap-2.5"}`}>
            <img src={fwLogo} alt="Fairy Wren" className="h-9 w-auto shrink-0" />
            <div className={minimized ? "lg:hidden" : ""}>
              <h1 className="text-[15px] font-bold text-white tracking-wide leading-tight">
                Fairy Wren
              </h1>
              <p className="text-[11px] text-surface-400 font-medium">ERP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-surface-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${minimized ? "lg:px-2" : "px-4"}`}>
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              {/* Section header: divider when minimized, label when expanded */}
              {minimized ? (
                <div className="hidden lg:block border-b border-surface-700/50 mx-1 mb-2" />
              ) : (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-2 mb-1 text-[11px] font-semibold text-surface-400 uppercase tracking-wider hover:text-surface-300"
                >
                  {section.label}
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${collapsed[section.label] ? "-rotate-90" : ""}`}
                  />
                </button>
              )}

              {(minimized || !collapsed[section.label]) && (
                <div className="space-y-0.5">
                  {section.items.map((item) =>
                    item.children ? (
                      <NavParent
                        key={item.to}
                        item={item}
                        onClose={onClose}
                        minimized={minimized}
                      />
                    ) : (
                      <NavItem
                        key={item.to}
                        item={item}
                        onClose={onClose}
                        minimized={minimized}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className={`hidden lg:flex items-center border-t border-surface-700 shrink-0 ${minimized ? "justify-center p-2" : "px-4 py-3"}`}>
          <button
            onClick={onToggleMinimized}
            className={`flex items-center gap-2 p-2 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors ${minimized ? "" : "w-full"}`}
            title={minimized ? "Expand sidebar" : "Collapse sidebar"}
          >
            {minimized ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!minimized && <span className="text-[12px]">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
