import { useCallback, useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { INACTIVITY_TIMEOUT } from "@/api/constants";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
const hasErpAccess = (u) => u.permissions?.includes("erp_access");

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = TokenService.getUser();
    const token = TokenService.getToken();

    if (storedUser && token && !TokenService.isExpired()) {
      if (hasErpAccess(storedUser)) {
        setUser(storedUser);
      } else {
        TokenService.clear();
      }
    } else if (token && TokenService.isExpired()) {
      TokenService.clear();
    }
    setLoading(false);
  }, []);

  const login = async (pin) => {
    const {
      data: { user: loggedInUser, token },
    } = await loginWithPin(pin);

    if (!hasErpAccess(loggedInUser)) {
      throw { error: "Access denied. Your role does not have ERP access." };
    }

    TokenService.save({
      token,
      expiry: Date.now() + INACTIVITY_TIMEOUT,
      user: loggedInUser,
    });

    setUser(loggedInUser);
    return loggedInUser;
  };

  const refreshUser = useCallback(() => {
    const stored = TokenService.getUser();
    if (stored) setUser(stored);
  }, []);

  const logout = useCallback(() => {
    TokenService.clear();
    setUser(null);
  }, []);

  useInactivityTimeout(logout);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};