import { useState } from "react";
import { Truck, Clock, Package } from "lucide-react";
import SupplierListPage from "./SupplierListPage";
import PendingInvoicesPage from "./PendingInvoicesPage";
import ReceiveTab from "@/components/inventory/ReceiveTab";

const TABS = [
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "pending-invoices", label: "Pending Invoices", icon: Clock },
  { key: "receive", label: "Receive Goods", icon: Package },
];

const PurchasingPage = () => {
  const [activeTab, setActiveTab] = useState("suppliers");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
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
        <ReceiveTab onSuccess={() => setActiveTab("suppliers")} />
      )}
    </div>
  );
};

export default PurchasingPage;
