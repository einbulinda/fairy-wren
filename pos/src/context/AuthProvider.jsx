import { useCallback, useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { INACTIVITY_TIMEOUT } from "@/api/constants";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { USER_ROLES } from "@/utils/constants";

const ALLOWED_POS_ROLES = [USER_ROLES.WAITRESS, USER_ROLES.BARTENDER, USER_ROLES.MANAGER];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on refresh

  useEffect(() => {
    const storedUser = TokenService.getUser();
    const token = TokenService.getToken();

    if (storedUser && token && !TokenService.isExpired() && ALLOWED_POS_ROLES.includes(storedUser.role)) {
      setUser(storedUser);
    } else {
      // Only clear if token exists AND is expired
      if (token && TokenService.isExpired()) {
        TokenService.clear();
      }
    }
    setLoading(false);
  }, []);

  // Login Handler
  const login = async (pin) => {
    const {
      data: { user, token },
    } = await loginWithPin(pin);

    if (!ALLOWED_POS_ROLES.includes(user.role)) {
      throw new Error("Access denied. Only waitress, bartender, and manager roles can access the POS.");
    }

    TokenService.save({
      token,
      expiry: Date.now() + INACTIVITY_TIMEOUT,
      user,
    });

    setUser(user);
    return user;
  };

  // Logout Handler
  const logout = useCallback(() => {
    TokenService.clear();
    setUser(null);
    window.location.replace("/");
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
