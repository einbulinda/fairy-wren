import { useCallback, useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { INACTIVITY_TIMEOUT } from "@/api/constants";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { ERP_ALLOWED_ROLES } from "@/utils/constants";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = TokenService.getUser();
    const token = TokenService.getToken();

    if (storedUser && token && !TokenService.isExpired()) {
      if (ERP_ALLOWED_ROLES.includes(storedUser.role)) {
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

    if (!ERP_ALLOWED_ROLES.includes(loggedInUser.role)) {
      throw { error: "Access denied. ERP is restricted to Directors only." };
    }

    TokenService.save({
      token,
      expiry: Date.now() + INACTIVITY_TIMEOUT,
      user: loggedInUser,
    });

    setUser(loggedInUser);
    return loggedInUser;
  };

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
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};