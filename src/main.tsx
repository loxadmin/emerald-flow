import { createRoot } from "react-dom/client";
import { HelmetProvider } from "@/components/Seo";
import App from "./App.tsx";
import "./index.css";
import { initSecurity } from "./lib/security";

// Initialize security measures
initSecurity();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
