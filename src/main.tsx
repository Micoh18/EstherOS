import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import { App } from "@/app/App";
import { captureUnhandledErrors } from "@/shared/lib/log";

captureUnhandledErrors();

// data-theme is already set by the inline script in index.html, before this module runs.
createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
