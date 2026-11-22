import * as Tooltip from "@radix-ui/react-tooltip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemedToaster } from "./components/layout/ThemedToaster";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Tooltip.Provider>
        <App />
        <ThemedToaster />
      </Tooltip.Provider>
    </BrowserRouter>
  </StrictMode>,
);
