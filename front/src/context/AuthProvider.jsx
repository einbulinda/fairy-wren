import { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import { loginWithPin } from "../services/auth.service";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("fw_user");

    // Defer all state updates to avoid React StrictMode warnings
    queueMicrotask(() => {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    });
  }, []);

  // Login Handler
  const login = async (pin) => {
    const { user, token, expiresIn } = await loginWithPin(pin);
    setUser(user);

    const expiryTime = Date.now() + expiresIn * 1000;

    sessionStorage.setItem("token", token);
    sessionStorage.setItem("token_expiry", expiryTime);
    sessionStorage.setItem("fw_user", JSON.stringify(user));

    return user;
  };

  // Logout Handler
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("fw_user");
    sessionStorage.removeItem("token_expiry");
  };

  const getAuthToken = () => {
    const token = sessionStorage.getItem("token");
    const expiry = sessionStorage.getItem("token_expiry");

    if (!token || !expiry) return null;

    if (Date.now() > Number(expiry)) {
      logout();
      return null;
    }

    return token;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        getAuthToken,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
