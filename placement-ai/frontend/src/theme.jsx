import { createContext, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "placement-ai.theme";

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    // localStorage can throw in a locked-down environment (private mode,
    // disabled storage) - fall back to the brand default rather than crash.
    return "dark";
  }
}

// Dark is the deliberate brand default (see the design brief this app was
// built against) - light is an opt-in, not something we auto-derive from
// prefers-color-scheme, so a first-time visitor always sees the intended
// ink/indigo look.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Non-fatal - the toggle still works for the rest of this session.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
