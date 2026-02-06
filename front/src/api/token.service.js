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

  isExpired() {
    const expiry = this.getExpiry();
    return !expiry || Date.now() > expiry;
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
