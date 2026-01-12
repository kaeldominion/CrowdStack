"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "crowdstack-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Initialize theme from localStorage or default to dark
  // Force dark mode on landing page (logged out)
  useEffect(() => {
    const isLandingPage = pathname === '/' || pathname === '';
    
    if (isLandingPage) {
      // Force dark mode on landing page, ignore localStorage
      setThemeState("dark");
    } else {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      const initialTheme = stored === "light" || stored === "dark" ? stored : "dark";
      setThemeState(initialTheme);
    }
    setMounted(true);
  }, [pathname]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const isLandingPage = pathname === '/' || pathname === '';
    
    // Force dark mode on landing page
    const effectiveTheme = isLandingPage ? "dark" : theme;
    
    const root = document.documentElement;
    if (effectiveTheme === "light") {
      root.setAttribute("data-theme", "light");
      root.classList.remove("dark");
    } else {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
    }
    
    // Store in localStorage (but don't store landing page override)
    if (!isLandingPage) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, mounted, pathname]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Prevent flash of wrong theme by blocking render until mounted
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
