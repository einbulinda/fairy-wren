import { useLocation, useNavigate } from "react-router";
import { Package, PackagePlus, BarChart2, CheckSquare, RefreshCw, TrendingUp } from "lucide-react";
import { useStockItems } from "@/hooks/useInventory";
import StockTab from "@/components/inventory/StockTab";
import ReceiveTab from "@/components/inventory/ReceiveTab";
import ReportsTab from "@/components/inventory/ReportsTab";
import ReportDetailView from "@/components/inventory/ReportDetailView";
import ApprovalsTab from "@/components/inventory/ApprovalsTab";
import ConversionTab from "@/components/inventory/ConversionTab";
import AdjustmentInsightsTab from "@/components/inventory/AdjustmentInsightsTab";

const TABS = [
  { path: "/inventory", label: "Stock", short: "Stock", icon: Package, exact: true },
  { path: "/inventory/receive", label: "Receive", short: "Receive", icon: PackagePlus },
  { path: "/inventory/reports", label: "Reports", short: "Reports", icon: BarChart2 },
  { path: "/inventory/approvals", label: "Approvals", short: "Approve", icon: CheckSquare },
  { path: "/inventory/conversions", label: "Conversions", short: "Convert", icon: RefreshCw },
  { path: "/inventory/insights", label: "Adj. Insights", short: "Insights", icon: TrendingUp },
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
        <nav className="flex gap-0.5 overflow-x-auto">
          {TABS.map(({ path, label, short, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === path
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
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
      {activeTab === "/inventory/insights" && <AdjustmentInsightsTab />}
    </div>
  );
};

export default InventoryPage;
