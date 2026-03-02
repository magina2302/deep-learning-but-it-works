import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeId = "default" | "light" | "aurora" | "ember" | "royal" | "cosmic";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  colors: string[];
  isDark: boolean;
}

export const themes: ThemeOption[] = [
  { id: "default", name: "Midnight Blue", colors: ["#0f1629", "#FF7541", "#B352D7"], isDark: true },
  { id: "light", name: "Daylight", colors: ["#f5f3ff", "#FF7541", "#6129CC"], isDark: false },
  { id: "aurora", name: "Aurora", colors: ["#0a0f1e", "#DE6AE4", "#38bdf8"], isDark: true },
  { id: "ember", name: "Ember", colors: ["#1a0e0a", "#FF7541", "#ef4444"], isDark: true },
  { id: "royal", name: "Royal", colors: ["#f8f5ff", "#6129CC", "#B352D7"], isDark: false },
  { id: "cosmic", name: "Cosmic", colors: ["#0c0520", "#B352D7", "#DE6AE4"], isDark: true },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  isDark: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getClassForTheme(themeId: ThemeId): string {
  switch (themeId) {
    case "default": return "";
    case "light": return "theme-light";
    case "aurora": return "theme-aurora";
    case "ember": return "theme-ember";
    case "royal": return "theme-royal";
    case "cosmic": return "theme-cosmic";
    default: return "";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem("tutor-theme");
    return (saved as ThemeId) || "default";
  });

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("tutor-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-aurora", "theme-ember", "theme-royal", "theme-cosmic");
    const cls = getClassForTheme(theme);
    if (cls) root.classList.add(cls);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: currentTheme.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
