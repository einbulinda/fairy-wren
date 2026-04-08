import { NavLink } from "react-router";
import {
  BarChart3,
  Package,
  Grid,
  Truck,
  Landmark,
  DollarSign,
  Users,
  ChevronDown,
  X,
  LineChart,
  Settings,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
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
      { to: "/inventory", icon: Package, label: "Inventory" },
      { to: "/sales", icon: Receipt, label: "Sales" },
      { to: "/products", icon: Grid, label: "Products" },
      { to: "/purchasing", icon: Truck, label: "Purchasing" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/accounting", icon: Landmark, label: "Accounting" },
      { to: "/expenses", icon: DollarSign, label: "Expenses" },
      { to: "/payroll", icon: Users, label: "Payroll" },
      { to: "/reports", icon: LineChart, label: "Financial Reports" },
    ],
  },
  {
    label: "Web",
    items: [
      { to: "/web", icon: Globe, label: "Web Management" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", icon: Users, label: "User Management" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];


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
                  {section.items.map((item) => (
                    <NavItem
                      key={item.to}
                      item={item}
                      onClose={onClose}
                      minimized={minimized}
                    />
                  ))}
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
