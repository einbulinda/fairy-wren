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
    const data = await loginWithPin(pin);
    setUser(data.user);
    localStorage.setItem("fw_user", JSON.stringify(data.user));

    return data.user;
  };

  // Logout Handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem("fw_lastSeen");
    localStorage.removeItem("fw_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
