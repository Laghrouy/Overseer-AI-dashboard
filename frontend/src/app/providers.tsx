"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      toggleTheme: () => {},
    };
  }
  return ctx;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("overseer-theme");
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("overseer-theme", theme);
    }
  }, [theme]);

  const toggleTheme = useMemo(() => () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeContext.Provider>
  );
}
