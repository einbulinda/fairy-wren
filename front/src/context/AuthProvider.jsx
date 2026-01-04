import { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import { loginWithPin } from "../services/auth.service";

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("fw_user");
    const token = localStorage.getItem("token");
    const expiry = localStorage.getItem("token_expiry");

    queueMicrotask(() => {
      if (storedUser && token && expiry) {
        if (Date.now() < Number(expiry)) {
          setUser(JSON.parse(storedUser));
        } else {
          // Token expired → clean up
          localStorage.removeItem("fw_user");
          localStorage.removeItem("token");
          localStorage.removeItem("token_expiry");
        }
      }
      setLoading(false);
    }, []);
  }, []);

  // Login Handler
  const login = async (pin) => {
    const { user, token } = await loginWithPin(pin);

    const expiryTime = Date.now() + SESSION_DURATION;
    setUser(user);

    localStorage.setItem("fw_user", JSON.stringify(user));
    localStorage.setItem("token", token);
    localStorage.setItem("token_expiry", expiryTime.toString());

    return user;
  };

  // Logout Handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem("fw_user");
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
