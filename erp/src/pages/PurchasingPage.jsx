import { useSearchParams } from "react-router";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "suppliers";

  return (
    <div className="space-y-4">
      {/* Tab bar — desktop only; mobile uses contextual bottom nav */}
      <div className="hidden md:block border-b border-surface-700 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "suppliers" && <SupplierListPage />}
      {activeTab === "pending-invoices" && <PendingInvoicesPage />}
      {activeTab === "receive" && (
        <ReceiveTab onSuccess={() => setSearchParams({ tab: "suppliers" })} />
      )}
      {activeTab === "reorder-forecast" && <ReorderForecastTab />}
    </div>
  );
};

export default PurchasingPage;
