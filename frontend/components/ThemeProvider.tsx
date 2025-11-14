"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "auto";

// Puedes ajustar los horarios en los que el modo automático cambia entre claro y oscuro.
// Modifica las constantes de hora y minuto según tus necesidades.
const AUTO_THEME_DAY_START_HOUR = 7; // 7:00 am
const AUTO_THEME_DAY_START_MINUTE = 0;
const AUTO_THEME_NIGHT_START_HOUR = 19; // 7:00 pm
const AUTO_THEME_NIGHT_START_MINUTE = 0;

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveAutoTheme(now: Date): "light" | "dark" {
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const dayStartMinutes =
    AUTO_THEME_DAY_START_HOUR * 60 + AUTO_THEME_DAY_START_MINUTE;
  const nightStartMinutes =
    AUTO_THEME_NIGHT_START_HOUR * 60 + AUTO_THEME_NIGHT_START_MINUTE;

  if (dayStartMinutes === nightStartMinutes) {
    return "dark";
  }

  if (dayStartMinutes < nightStartMinutes) {
    const isDaytime =
      minutesSinceMidnight >= dayStartMinutes &&
      minutesSinceMidnight < nightStartMinutes;
    return isDaytime ? "light" : "dark";
  }

  const isNighttime =
    minutesSinceMidnight >= nightStartMinutes &&
    minutesSinceMidnight < dayStartMinutes;
  return isNighttime ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference, now: Date): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return resolveAutoTheme(now);
}

interface ThemeProviderProps {
  initialPreference?: ThemePreference | null;
  children: ReactNode;
}

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(
    initialPreference ?? "auto"
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    resolveTheme(initialPreference ?? "auto", new Date())
  );

  const applyTheme = useCallback(
    (preferenceValue: ThemePreference) => {
      const now = new Date();
      const theme = resolveTheme(preferenceValue, now);
      setResolvedTheme(theme);

      const root = document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      root.setAttribute("data-theme-preference", preferenceValue);
      root.setAttribute("data-theme-resolved", theme);
      root.style.colorScheme = theme;
    },
    []
  );

  useEffect(() => {
    applyTheme(preference);

    if (preference !== "auto") {
      return;
    }

    const interval = window.setInterval(() => {
      applyTheme("auto");
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [applyTheme, preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (nextPreference: ThemePreference) => {
        setPreference(nextPreference);
        applyTheme(nextPreference);
      },
    }),
    [applyTheme, preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }

  return context;
}
