import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import FinancialReportsPage from "@/pages/FinancialReportsPage";
import AccountingHubPage from "@/pages/AccountingHubPage";
import ExpensesPage from "@/pages/ExpensesPage";
import SupplierDetailPage from "@/pages/SupplierDetailPage";
import InventoryPage from "@/pages/InventoryPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import PayrollPage from "@/pages/PayrollPage";
import ReceiptDetailPage from "@/pages/ReceiptDetailPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import BankReconciliationDetailPage from "@/pages/BankReconciliationDetailPage";
import ChequeWritingPage from "@/pages/ChequeWritingPage";
import SalesPage from "@/pages/SalesPage";
import ProfilePage from "@/pages/ProfilePage";
import PurchasingPage from "@/pages/PurchasingPage";
import WebHubPage from "@/pages/WebHubPage";
import HelpDeskPage from "@/pages/HelpDeskPage";
import AuditTrailPage from "@/pages/AuditTrailPage";
import CRMPage from "@/pages/CRMPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Inner component that has access to auth and real-time sync
const AuthenticatedRoutes = () => {
  const { user } = useAuth();
  
  // Enable real-time sync for authenticated users
  const { isConnected } = useRealtimeSync();

  console.log("[ERP] Real-time sync status:", isConnected ? "connected" : "disconnected");

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory/*" element={<InventoryPage />} />
        <Route path="inventory/receipts/:id" element={<ReceiptDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="purchasing" element={<PurchasingPage />} />
        <Route path="purchasing/:id" element={<SupplierDetailPage />} />
        <Route path="accounting" element={<AccountingHubPage />} />
        <Route path="bank-reconciliation/:id" element={<BankReconciliationDetailPage />} />
        <Route path="cheques" element={<ChequeWritingPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="reports" element={<FinancialReportsPage />} />
        <Route path="web" element={<WebHubPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpDeskPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="crm" element={<CRMPage />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--color-surface-800)",
                color: "var(--color-white, #fff)",
                border: "1px solid var(--color-surface-700)",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
