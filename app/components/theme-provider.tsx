import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type ThemeId, defaultTheme, themes } from "~/lib/themes";

type ColorMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "valet-theme";
const COLOR_MODE_STORAGE_KEY = "valet-color-mode";

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return defaultTheme;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && stored in themes) {
    return stored as ThemeId;
  }
  return defaultTheme;
}

function getStoredColorMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  // Default to system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme);
  const [colorMode, setColorModeState] = useState<ColorMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setColorModeState(getStoredColorMode());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove(...Object.keys(themes).map((t) => `theme-${t}`));

    // Add current theme class
    root.classList.add(`theme-${theme}`);

    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Toggle dark class
    if (colorMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Store preference
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode, mounted]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
