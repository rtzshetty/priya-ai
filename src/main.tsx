import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

// Polyfill globalThis.process.env for production builds where Vite doesn't inject it,
// because @google/genai references globalThis.process.env which throws a TypeError in the browser.
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (typeof globalThis.process.env === 'undefined') {
  (globalThis as any).process.env = {};
}

import App from "./App.tsx";
import "./index.css";

// Register Service Worker
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

