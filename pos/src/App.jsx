import "./App.css";
import { useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useAppStore } from "./store/app.store";
import LoginScreen from "./pages/LoginScreen";
import MainLayout from "./components/layout/MainLayout";
import BetaMainLayout from "./beta/layout/BetaMainLayout";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeProvider";

const AuthenticatedContent = ({ uiVersion }) => {
  // Get the trigger function from the store
  const triggerBillsReload = useAppStore((state) => state.triggerBillsReload);

  // Callback for bill changes - trigger reload via store
  const handleBillsChange = useCallback(() => {
    console.log("[App] Bills changed, triggering reload...");
    triggerBillsReload();
  }, [triggerBillsReload]);

  // Callback for inventory changes
  const handleInventoryChange = useCallback(() => {
    console.log("[App] Inventory changed");
  }, []);

  // Enable real-time sync with callbacks
  const { isConnected } = useRealtimeSync({
    onBillsChange: handleBillsChange,
    onInventoryChange: handleInventoryChange,
  });

  console.log("[App] Real-time sync status:", isConnected ? "connected" : "disconnected");

  // Render appropriate UI version based on user selection
  return uiVersion === "beta" ? <BetaMainLayout /> : <MainLayout />;
};

const AppContent = () => {
  const { user, uiVersion } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  // Only render authenticated content (with hooks) when logged in
  return <AuthenticatedContent uiVersion={uiVersion} />;
};

const ThemedContent = () => {
  const { theme } = useTheme();
  
  // Update toast theme based on current theme
  const toastStyle = theme === "light" 
    ? {
        background: "#ffffff",
        color: "#1F2937",
        border: "1px solid #e5e7eb",
      }
    : {
        background: "#1F2937",
        color: "#fff",
        border: "1px solid #FF6B9D",
      };
  
  return (
    <div className={`theme-${theme}`}>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: toastStyle,
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
