import { useState } from "react";
import { Truck, Clock, Package, TrendingUp } from "lucide-react";
import SupplierListPage from "./SupplierListPage";
import PendingInvoicesPage from "./PendingInvoicesPage";
import ReceiveTab from "@/components/inventory/ReceiveTab";
import ReorderForecastTab from "@/components/inventory/ReorderForecastTab";

const TABS = [
  { key: "suppliers", label: "Suppliers", short: "Suppliers", icon: Truck },
  { key: "pending-invoices", label: "Pending Invoices", short: "Invoices", icon: Clock },
  { key: "receive", label: "Receive Goods", short: "Receive", icon: Package },
  { key: "reorder-forecast", label: "Reorder Forecast", short: "Reorder", icon: TrendingUp },
];

const PurchasingPage = () => {
  const [activeTab, setActiveTab] = useState("suppliers");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(({ key, label, short, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "suppliers" && <SupplierListPage />}
      {activeTab === "pending-invoices" && <PendingInvoicesPage />}
      {activeTab === "receive" && (
        <ReceiveTab onSuccess={() => setActiveTab("suppliers")} />
      )}
      {activeTab === "reorder-forecast" && <ReorderForecastTab />}
    </div>
  );
};

export default PurchasingPage;
