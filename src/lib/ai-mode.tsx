import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "karbali_ai_mode";
const REDIRECT_KEY = "karbali_ai_mode_redirected";

type Ctx = { aiMode: boolean; setAiMode: (v: boolean) => void; toggle: () => void };
const AiModeContext = createContext<Ctx>({ aiMode: false, setAiMode: () => {}, toggle: () => {} });

export const useAiMode = () => useContext(AiModeContext);

// Default AI Mode OFF. Advertisers opt in via the dashboard pop-up or the toggle.
function initialAiMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function AiModeProvider({ children }: { children: ReactNode }) {
  const [aiMode, setMode] = useState<boolean>(initialAiMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, aiMode ? "1" : "0");
  }, [aiMode]);

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
