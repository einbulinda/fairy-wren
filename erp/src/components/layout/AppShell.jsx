import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";

const routeTitles = {
  "/": "Dashboard",
  "/inventory": "Inventory Management",
  "/products": "Products",
  "/suppliers": "Suppliers",
  "/accounts": "Chart of Accounts",
  "/ledger": "General Ledger",
  "/journals": "Journal Entries",
  "/cheques": "Cheques",
  "/expenses": "Expenses",
  "/payroll": "Payroll",
  "/reports": "Financial Reports",
  "/users": "User Management",
  "/approvals": "Approvals",
};

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = routeTitles[location.pathname] || "Fairy Wren ERP";

  return (
    <div className="min-h-screen bg-surface-950 text-white flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;