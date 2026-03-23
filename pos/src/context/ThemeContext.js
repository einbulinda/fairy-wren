import { createContext } from "react";

const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export default ThemeContext;
