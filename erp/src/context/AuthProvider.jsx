import { useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { ERP_ALLOWED_ROLES } from "@/utils/constants";

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours for ERP

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
      throw { error: "Access denied. ERP is restricted to owner accounts." };
    }

    TokenService.save({
      token,
      expiry: Date.now() + SESSION_DURATION,
      user: loggedInUser,
    });

    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    TokenService.clear();
    setUser(null);
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