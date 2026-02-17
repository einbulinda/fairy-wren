const TOKEN_KEY = "token";
const EXPIRY_KEY = "token_expiry";
const USER_KEY = "fw_user";

export const TokenService = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getExpiry() {
    return Number(localStorage.getItem(EXPIRY_KEY));
  },

  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  save({ token, expiry, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, expiry.toString());
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  isExpired() {
    const expiry = this.getExpiry();

    // If expiry is missing, do NOT auto-expire on refresh
    if (!expiry || Number.isNaN(expiry)) {
      return false;
    }
    return Date.now() > expiry;
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
