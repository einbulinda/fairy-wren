import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import PerformanceAnalyticsPage from "@/pages/PerformanceAnalyticsPage";
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
        <Route path="inventory" element={<PlaceholderPage />} />
        <Route path="products" element={<PlaceholderPage />} />
        <Route path="suppliers" element={<PlaceholderPage />} />
        <Route path="accounts" element={<PlaceholderPage />} />
        <Route path="ledger" element={<PlaceholderPage />} />
        <Route path="journals" element={<PlaceholderPage />} />
        <Route path="cheques" element={<PlaceholderPage />} />
        <Route path="expenses" element={<PlaceholderPage />} />
        <Route path="payroll" element={<PlaceholderPage />} />
        <Route path="reports" element={<PerformanceAnalyticsPage />} />
        <Route path="users" element={<PlaceholderPage />} />
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