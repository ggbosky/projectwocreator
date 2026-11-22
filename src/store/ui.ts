import { create } from "zustand";

type Theme = "dark" | "light";

function readTheme(): Theme {
  try {
    return localStorage.getItem("pw-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  commandOpen: boolean;
  toggleTheme: () => void;
  setSidebar: (open: boolean) => void;
  setCommand: (open: boolean) => void;
}

export const useUi = create<UiState>((set, get) => ({
  theme: readTheme(),
  sidebarOpen: false,
  commandOpen: false,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("pw-theme", next);
    } catch {
      /* storage unavailable */
    }
    set({ theme: next });
  },
  setSidebar: (open) => set({ sidebarOpen: open }),
  setCommand: (open) => set({ commandOpen: open }),
}));
