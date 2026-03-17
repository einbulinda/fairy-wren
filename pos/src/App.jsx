import "./App.css";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./pages/LoginScreen";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/shared/ErrorBoundary";

const AppContent = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return <MainLayout />;
};

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1F2937",
            color: "#fff",
            border: "1px solid #FF6B9D",
          },
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
    </ErrorBoundary>
  );
}

export default App;
