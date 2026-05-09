import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const ROOT_ID = "root";
let rootElement = document.getElementById(ROOT_ID);

if (!rootElement) {
  rootElement = document.createElement("div");
  rootElement.id = ROOT_ID;
  document.body.appendChild(rootElement);
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  if (import.meta.env.DEV) {
    console.error("React mount failed:", error);
  }
  rootElement.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#b8a888;color:#2c1e0f;font-family:Inter,sans-serif;padding:24px;text-align:center;">Unable to start app.</div>';
}
