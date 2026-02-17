import { useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on refresh

  useEffect(() => {
    const storedUser = TokenService.getUser();
    const token = TokenService.getToken();

    if (storedUser && token && !TokenService.isExpired()) {
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

    TokenService.save({
      token,
      expiry: Date.now() + SESSION_DURATION,
      user,
    });

    setUser(user);
    return user;
  };

  // Logout Handler
  const logout = () => {
    TokenService.clear();
    setUser(null);
    window.location.replace("/");
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
