import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { detectIntent, getProactiveGreeting, type AssistantContext } from "@/lib/assistant-nlp";

type Msg = { role: "user" | "bot"; text: string; suggestions?: string[]; navigateTo?: string };

const PAGE_LABELS: Record<string, string> = {
  "/wallet": "Wallet",
  "/dashboard": "Overview",
  "/ads": "Campaigns",
  "/campaigns/create": "New campaign",
  "/campaigns/create/performance": "Performance campaign",
  "/campaigns/create/engagement": "Engagement campaign",
  "/campaigns/create/commerce": "Commerce campaign",
  "/websites": "Websites",
  "/docs": "Docs",
  "/category": "Category",
  "/verification": "Verification",
};

const STORAGE_KEY = "karbali_assistant_greeted";

export default function KarbaliAssistant() {
  const { user, walletActivated, categoryStatus, advertiserType, businessVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx: AssistantContext = {
    walletActivated,
    categoryStatus,
    advertiserType,
    businessVerified,
    pathname: location.pathname,
    userName: user?.email ?? undefined,
  };

  // Auto-open once per session after login
  useEffect(() => {
    if (!user) return;
    const greeted = sessionStorage.getItem(STORAGE_KEY);
    if (greeted) return;
    const t = setTimeout(() => {
      const greet = getProactiveGreeting(ctx);
      setMessages([{ role: "bot", text: greet.text, suggestions: greet.suggestions }]);
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  if (!user) return null;

  const reply = (text: string) => {
    const userText = text.trim();
    if (!userText) return;
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const r = detectIntent(userText, ctx);
      setMessages((m) => [...m, { role: "bot", text: r.text, suggestions: r.suggestions, navigateTo: r.navigateTo }]);
      setTyping(false);
      if (r.navigateTo && r.autoNavigate && r.navigateTo !== location.pathname) {
        setTimeout(() => navigate(r.navigateTo!), 600);
      }
    }, 450 + Math.random() * 300);
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            if (messages.length === 0) {
              const greet = getProactiveGreeting(ctx);
              setMessages([{ role: "bot", text: greet.text, suggestions: greet.suggestions }]);
            }
          }}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all hover:scale-105"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] h-[min(520px,calc(100vh-2rem))] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-emerald-600 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold">Karbali Assistant</p>
                <p className="text-[10px] opacity-80">Here to help you navigate</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] space-y-1.5">
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] leading-snug ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-sm"
                        : "bg-background border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.role === "bot" && m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => reply(s)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.navigateTo && (
                    <button
                      onClick={() => navigate(m.navigateTo!)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      Open {PAGE_LABELS[m.navigateTo] || m.navigateTo}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-background border border-border">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              reply(input);
            }}
            className="border-t border-border p-2 flex gap-2 bg-background"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Karbali Assistant anything..."
              className="flex-1 px-3 py-2 text-[13px] rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
