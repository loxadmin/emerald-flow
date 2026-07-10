import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "karbali_ai_mode";
const REDIRECT_KEY = "karbali_ai_mode_redirected";

type Ctx = { aiMode: boolean; setAiMode: (v: boolean) => void; toggle: () => void };
const AiModeContext = createContext<Ctx>({ aiMode: true, setAiMode: () => {}, toggle: () => {} });

export const useAiMode = () => useContext(AiModeContext);

// Default AI Mode ON. Only false when the user explicitly turned it off.
function initialAiMode(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === null) {
    localStorage.setItem(STORAGE_KEY, "1");
    return true;
  }
  return v === "1";
}

const AI_HOME_ROUTES = new Set(["/dashboard"]);

export function AiModeProvider({ children }: { children: ReactNode }) {
  const [aiMode, setMode] = useState<boolean>(initialAiMode);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, aiMode ? "1" : "0");
  }, [aiMode]);

  // Bounce advertisers into AI mode once per session when they land on their home.
  useEffect(() => {
    if (!aiMode) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(REDIRECT_KEY)) return;
    if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/ai")) return;
    if (!AI_HOME_ROUTES.has(location.pathname)) return;
    sessionStorage.setItem(REDIRECT_KEY, "1");
    navigate("/ai", { replace: true });
  }, [aiMode, location.pathname, navigate]);

  const setAiMode = (v: boolean) => {
    setMode(v);
    if (!v && typeof window !== "undefined") sessionStorage.setItem(REDIRECT_KEY, "1");
  };
  const toggle = () => setMode((v) => !v);

  return (
    <AiModeContext.Provider value={{ aiMode, setAiMode, toggle }}>
      {children}
    </AiModeContext.Provider>
  );
}
