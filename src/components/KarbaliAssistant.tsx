import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessageCircle, X, Send, Bot, ChevronRight } from "lucide-react";
import { detectIntent, getProactiveGreeting, type AssistantContext } from "@/lib/assistant-nlp";

type Msg = { role: "user" | "bot"; text: string; suggestions?: string[]; navigateTo?: string; goalOptions?: string[] };

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
  const { user, walletActivated, categoryStatus, advertiserType, businessVerified, isLoading } = useAuth();
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
    const t = setTimeout(async () => {
      const greet = getProactiveGreeting(ctx);
      const { data: ac } = await supabase
        .from("advertiser_categories")
        .select("categories:category_id(name, goal_options)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      const goals: string[] = ((ac as any)?.categories?.goal_options as string[]) || [];
      const catName: string = (ac as any)?.categories?.name || "";
      const intro = goals.length
        ? `${greet.text} What are you looking to get for your ${catName || "business"}?`
        : greet.text;
      setMessages([{ role: "bot", text: intro, suggestions: goals.length ? undefined : greet.suggestions, goalOptions: goals.length ? goals : undefined }]);
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
      if (isLoading) {
        setMessages((m) => [...m, { role: "bot", text: "One second. I am still loading your advertiser profile." }]);
        setTyping(false);
        return;
      }
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
                <Bot className="h-4 w-4" />
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
                  {m.role === "bot" && m.goalOptions && m.goalOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-0.5">
                      {m.goalOptions.map((g) => (
                        <button
                          key={g}
                          onClick={() => reply(`I want to get ${g.toLowerCase()}`)}
                          className="group flex items-center justify-between gap-2 rounded-lg border border-emerald-600/30 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-emerald-950/10 px-3 py-2 text-left text-[12.5px] font-medium text-emerald-900 dark:text-emerald-100 hover:border-emerald-600 hover:shadow-sm transition-all"
                        >
                          <span>{g}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
