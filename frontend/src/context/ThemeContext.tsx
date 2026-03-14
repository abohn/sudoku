import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "warm";

const STORAGE_KEY = "ctc_theme";
const THEMES: Theme[] = ["light", "dark", "warm"];

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.classList.remove(...THEMES);
  if (t !== "light") html.classList.add(t);
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "light", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored && THEMES.includes(stored) ? stored : "light";
  });

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  // Apply on initial mount (before React hydration)
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
