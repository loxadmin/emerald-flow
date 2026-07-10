import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "karbali_ai_mode";

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

export function AiModeProvider({ children }: { children: ReactNode }) {
  const [aiMode, setMode] = useState<boolean>(initialAiMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, aiMode ? "1" : "0");
  }, [aiMode]);

  const setAiMode = (v: boolean) => setMode(v);
  const toggle = () => setMode((v) => !v);

  return (
    <AiModeContext.Provider value={{ aiMode, setAiMode, toggle }}>
      {children}
    </AiModeContext.Provider>
  );
}
