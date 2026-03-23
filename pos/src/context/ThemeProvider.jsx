import { useCallback, useEffect, useState } from "react";
import ThemeContext from "./ThemeContext";

const THEME_KEY = "pos_theme_preference";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  // Restore theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
    } else {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setThemeValue = useCallback((newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setTheme(newTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        isLight: theme === "light",
        toggleTheme,
        setTheme: setThemeValue,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
