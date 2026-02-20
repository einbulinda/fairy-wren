import { useLocation, useNavigate } from "react-router";
import { useStockItems } from "@/hooks/useInventory";
import StockTab from "@/components/inventory/StockTab";
import ReceiveTab from "@/components/inventory/ReceiveTab";
import ReportsTab from "@/components/inventory/ReportsTab";
import ReportDetailView from "@/components/inventory/ReportDetailView";
import ApprovalsTab from "@/components/inventory/ApprovalsTab";

const InventoryPage = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: stockItems = [], isLoading, refetch } = useStockItems();

  // /inventory/reports/:id
  const detailMatch = pathname.match(/\/inventory\/reports\/(.+)$/);
  if (detailMatch) return <ReportDetailView id={detailMatch[1]} />;

  if (pathname.endsWith("/receive"))
    return <ReceiveTab onSuccess={() => navigate("/inventory")} />;
  if (pathname.endsWith("/reports")) return <ReportsTab />;
  if (pathname.endsWith("/approvals")) return <ApprovalsTab />;

  return (
    <StockTab items={stockItems} isLoading={isLoading} onRefresh={refetch} />
  );
};

export default InventoryPage;
