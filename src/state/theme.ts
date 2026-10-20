import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const KEY = "aerorank.theme.v1";

function load(): Theme {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return "dark";
}

let theme: Theme = load();
const listeners = new Set<() => void>();

function apply(t: Theme) {
  const el = document.documentElement;
  el.classList.toggle("light", t === "light");
  el.style.colorScheme = t;
  el.dataset.theme = t;
  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#eef2f7" : "#050913");
  } catch {
    /* ignore */
  }
}

// apply immediately on module load
try {
  apply(theme);
} catch {
  /* SSR safety */
}

function commit(next: Theme) {
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  apply(next);
  listeners.forEach((l) => l());
}

export const themeStore = {
  get: () => theme,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  set(next: Theme) {
    if (next !== theme) commit(next);
  },
  toggle() {
    commit(theme === "dark" ? "light" : "dark");
  },
};

export function useTheme(): Theme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.get);
}
