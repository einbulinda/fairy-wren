import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import FinancialReportsPage from "@/pages/FinancialReportsPage";
import BalanceSheetPage from "@/pages/BalanceSheetPage";
import ChartOfAccountsPage from "@/pages/ChartOfAccountsPage";
import LedgerPage from "@/pages/LedgerPage";
import JournalEntryPage from "@/pages/JournalEntryPage";
import ChequeWritingPage from "@/pages/ChequeWritingPage";
import ExpensesPage from "@/pages/ExpensesPage";
import SupplierListPage from "@/pages/SupplierListPage";
import SupplierDetailPage from "@/pages/SupplierDetailPage";
import InventoryPage from "@/pages/InventoryPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import PayrollPage from "@/pages/PayrollPage";
import ReceiptDetailPage from "@/pages/ReceiptDetailPage";
import UsersPage from "@/pages/UsersPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const AppRoutes = () => {
  const { user } = useAuth();

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
        <Route path="suppliers" element={<SupplierListPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="accounts" element={<ChartOfAccountsPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="journals" element={<JournalEntryPage />} />
        <Route path="cheques" element={<ChequeWritingPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="reports" element={<FinancialReportsPage />} />
        <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="approvals" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1e293b",
                color: "#fff",
                border: "1px solid #334155",
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