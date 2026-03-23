import { useCallback, useEffect, useState } from "react";
import AuthContext from "@/context/AuthContext";
import { loginWithPin, logoutSession } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { INACTIVITY_TIMEOUT } from "@/api/constants";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import BillDisciplineModal from "@/components/shared/BillDisciplineModal";

const hasPosAccess = (u) =>
  u.permissions?.includes("pos_access") || u.permissions?.includes("stock_take");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const UI_VERSION_KEY = "pos_ui_version";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDisciplineReminder, setShowDisciplineReminder] = useState(false);
  const [uiVersion, setUiVersion] = useState("classic");

  // Restore session on refresh
  useEffect(() => {
    const storedUser = TokenService.getUser();
    const token = TokenService.getToken();
    const savedUiVersion = localStorage.getItem(UI_VERSION_KEY) || "classic";
    
    setUiVersion(savedUiVersion);

    if (storedUser && token && !TokenService.isExpired() && hasPosAccess(storedUser)) {
      setUser(storedUser);
    } else {
      if (token && TokenService.isExpired()) {
        TokenService.clear();
      }
    }
    setLoading(false);
  }, []);

  // Listen for UI version changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === UI_VERSION_KEY) {
        setUiVersion(e.newValue || "classic");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Login Handler
  const login = async (pin) => {
    const {
      data: { user, token, lastSessionEndedAt },
    } = await loginWithPin(pin);

    if (!hasPosAccess(user)) {
      throw new Error("Access denied. Your role does not have POS access.");
    }

    TokenService.save({
      token,
      expiry: Date.now() + INACTIVITY_TIMEOUT,
      user,
    });

    setUser(user);

    // Show discipline reminder if last session ended more than 6 hours ago
    if (lastSessionEndedAt) {
      const gap = Date.now() - new Date(lastSessionEndedAt).getTime();
      if (gap > SIX_HOURS_MS) {
        setShowDisciplineReminder(true);
      }
    }

    return user;
  };

  // Logout Handler
  const logout = useCallback(async () => {
    await logoutSession("logout");
    TokenService.clear();
    setUser(null);
    window.location.replace("/");
  }, []);

  useInactivityTimeout(logout);

  const switchUiVersion = useCallback((version) => {
    setUiVersion(version);
    localStorage.setItem(UI_VERSION_KEY, version);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        uiVersion,
        switchUiVersion,
      }}
    >
      {!loading && children}
      {showDisciplineReminder && (
        <BillDisciplineModal onClose={() => setShowDisciplineReminder(false)} />
      )}
    </AuthContext.Provider>
  );
};
