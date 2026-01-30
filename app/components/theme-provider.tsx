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

// Read initial theme from DOM (set by blocking script in root.tsx)
// This ensures React state matches what's already rendered, avoiding hydration mismatch
function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return defaultTheme;
  // Check what the blocking script set on the DOM
  const root = document.documentElement;
  for (const themeId of Object.keys(themes)) {
    if (root.classList.contains(`theme-${themeId}`)) {
      return themeId as ThemeId;
    }
  }
  return defaultTheme;
}

function getInitialColorMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  // Check what the blocking script set on the DOM
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from DOM (blocking script already set the classes)
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);
  const [colorMode, setColorModeState] = useState<ColorMode>(getInitialColorMode);

  // Sync theme changes to DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove(...Object.keys(themes).map((t) => `theme-${t}`));

    // Add current theme class
    root.classList.add(`theme-${theme}`);

    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Sync color mode changes to DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;

    // Toggle dark class
    if (colorMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Store preference
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

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
