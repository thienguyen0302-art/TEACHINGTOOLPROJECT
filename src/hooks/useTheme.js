export function getInitialTheme() {
  return "light";
}

export function applyTheme() {
  const root = document.documentElement;
  root.removeAttribute("data-theme");
  try {
    window.localStorage.removeItem("peanut_theme");
  } catch {
    // ignore
  }
}

export function useTheme() {
  return { theme: "light", isDark: false, toggleTheme: () => {}, setTheme: () => {} };
}

