"use client";

import { useEffect, useState, useContext } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";

/**
 * Safely get the current theme, with fallback to DOM attribute
 * Use this in components that might render outside ThemeProvider or need a fallback
 */
export function useThemeSafe() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Try to get context directly (won't throw if provider missing)
  const context = useContext(ThemeContext);
  const hasContext = context !== undefined;

  useEffect(() => {
    setMounted(true);
    
    // If we have context, use it and sync with DOM
    if (hasContext && context) {
      setTheme(context.theme);
      
      // Also sync DOM (in case context updates)
      if (typeof window !== "undefined") {
        const root = document.documentElement;
        root.setAttribute("data-theme", context.theme);
        if (context.theme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
      return;
    }

    // Fallback: check DOM attribute directly
    const checkTheme = () => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      const domTheme = root.getAttribute("data-theme");
      setTheme(domTheme === "light" ? "light" : "dark");
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [hasContext, context?.theme]);

  // Toggle function - use context if available, otherwise toggle DOM directly
  const toggleTheme = () => {
    if (hasContext && context?.toggleTheme) {
      context.toggleTheme();
    } else {
      // Fallback: toggle via DOM
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      const currentTheme = root.getAttribute("data-theme");
      const newTheme = currentTheme === "light" ? "dark" : "light";
      root.setAttribute("data-theme", newTheme);
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      // Store in localStorage
      localStorage.setItem("crowdstack-theme", newTheme);
      setTheme(newTheme);
    }
  };

  // Return dark as default until mounted (prevents hydration mismatch)
  if (!mounted) {
    return { theme: "dark", toggleTheme: () => {} };
  }
  
  return { theme: hasContext && context ? context.theme : theme, toggleTheme };
}
