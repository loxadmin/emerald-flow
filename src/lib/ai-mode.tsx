import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "karbali_ai_mode";

type Ctx = { aiMode: boolean; setAiMode: (v: boolean) => void; toggle: () => void };
const AiModeContext = createContext<Ctx>({ aiMode: false, setAiMode: () => {}, toggle: () => {} });

export const useAiMode = () => useContext(AiModeContext);

export function AiModeProvider({ children }: { children: ReactNode }) {
  const [aiMode, setMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

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
