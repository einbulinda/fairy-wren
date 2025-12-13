import "./App.css";
// import fairyLogo from "../public/fairy-wren-logo-removebg.png";
import { useAuth } from "./hooks/useAuth";
import LoginScreen from "./components/auth/LoginScreen";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "react-hot-toast";

const AppContent = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return <MainLayout />;
};

function App() {
  return (
    <>
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
    </>
  );
}

{
  /* <div>
        <a href="/" target="_blank">
          <img src={fairyLogo} className="logo" alt="Fairy Wren logo" />
        </a>
      </div>
      <h1>Fairy Wren Ltd</h1>
      <div className="card">
        <p>Coming soon ...</p>
      </div> */
}

export default App;
