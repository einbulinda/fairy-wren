import { useLocation, useNavigate } from "react-router";
import { Package, PackagePlus, BarChart2, CheckSquare, RefreshCw } from "lucide-react";
import { useStockItems } from "@/hooks/useInventory";
import StockTab from "@/components/inventory/StockTab";
import ReceiveTab from "@/components/inventory/ReceiveTab";
import ReportsTab from "@/components/inventory/ReportsTab";
import ReportDetailView from "@/components/inventory/ReportDetailView";
import ApprovalsTab from "@/components/inventory/ApprovalsTab";
import ConversionTab from "@/components/inventory/ConversionTab";

const TABS = [
  { path: "/inventory", label: "Stock", icon: Package, exact: true },
  { path: "/inventory/receive", label: "Receive", icon: PackagePlus },
  { path: "/inventory/reports", label: "Reports", icon: BarChart2 },
  { path: "/inventory/approvals", label: "Approvals", icon: CheckSquare },
  { path: "/inventory/conversions", label: "Conversions", icon: RefreshCw },
];

const InventoryPage = () => {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const { data: stockItems = [], isLoading, refetch } = useStockItems();

  // Detail views — no tab bar
  const detailMatch = pathname.match(/\/inventory\/reports\/(.+)$/);
  if (detailMatch) return <ReportDetailView id={detailMatch[1]} />;

  const getActiveTab = () => {
    if (pathname === "/inventory") return "/inventory";
    return TABS.slice(1).find((t) => pathname.startsWith(t.path))?.path ?? "/inventory";
  };

  const activeTab = getActiveTab();

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === path
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
      {activeTab === "/inventory" && (
        <StockTab items={stockItems} isLoading={isLoading} onRefresh={refetch} />
      )}
      {activeTab === "/inventory/receive" && (
        <ReceiveTab
          onSuccess={() => navigate("/inventory")}
          initialLines={state?.initialLines}
        />
      )}
      {activeTab === "/inventory/reports" && <ReportsTab />}
      {activeTab === "/inventory/approvals" && <ApprovalsTab />}
      {activeTab === "/inventory/conversions" && <ConversionTab />}
    </div>
  );
};

export default InventoryPage;
