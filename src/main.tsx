import * as Tooltip from "@radix-ui/react-tooltip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { App } from "./App";
import { ThemedToaster } from "./components/layout/ThemedToaster";
import "./index.css";

// VITE_ROUTER=memory is used for the embedded (artifact) build, where the URL cannot carry paths.
function Router({ children }: { children: ReactNode }) {
  if (import.meta.env.VITE_ROUTER === "memory") return <MemoryRouter>{children}</MemoryRouter>;
  return <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>{children}</BrowserRouter>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <Tooltip.Provider>
        <App />
        <ThemedToaster />
      </Tooltip.Provider>
    </Router>
  </StrictMode>,
);
