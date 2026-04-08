import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecurity } from "./lib/security";

// Initialize security measures (Only in production/preview to avoid blocking development tools)
if (import.meta.env.PROD) {
  initSecurity();
}

createRoot(document.getElementById("root")!).render(<App />);
