import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiMode } from "@/lib/ai-mode";

const ASK_KEY = "karbali_ai_mode_prompt_shown";

/**
 * Small pop-up notification (not a chat box) asking the advertiser whether
 * they want to switch into AI mode. Shown once per browser session.
 */
export default function AiModePrompt() {
  const { aiMode, setAiMode } = useAiMode();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (aiMode) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ASK_KEY)) return;
    // The package reveal is the first login moment. Ask about AI only after it
    // has had enough time to be opened or dismissed.
    const t = setTimeout(() => setShow(true), 4500);
    return () => clearTimeout(t);
  }, [aiMode]);

  const dismiss = () => {
    sessionStorage.setItem(ASK_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,360px)] animate-fade-in">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Switch to AI mode?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Let Karbali AI set up campaigns, pick packages and read your metrics for you.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 font-semibold"
            onClick={() => {
              sessionStorage.setItem(ASK_KEY, "1");
              setAiMode(true);
              setShow(false);
              navigate("/ai");
            }}
          >
            Yes, switch
          </Button>
          <Button size="sm" variant="outline" className="flex-1 font-semibold" onClick={dismiss}>
            No, thanks
          </Button>
        </div>
      </div>
    </div>
  );
}
