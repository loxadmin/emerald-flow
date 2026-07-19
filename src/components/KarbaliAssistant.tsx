import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { getProactiveGreeting, acknowledgeGoal, initialState, type AssistantContext, type ConversationState } from "@/lib/assistant-nlp";
import KarbaliPersonaIcon from "@/components/KarbaliPersonaIcon";
import { getSubtypeGoalOptions, subtypeLabel } from "@/lib/advertiser-subtypes";

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
const AI_AUTOSTART_KEY = "karbali_ai_autostart";

export default function KarbaliAssistant() {
  const { user, walletActivated, categoryStatus, advertiserType, advertiserSubtype, businessVerified, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [convoState, setConvoState] = useState<ConversationState>(initialState());
  const convoStateRef = useRef<ConversationState>(convoState);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx: AssistantContext = {
    walletActivated,
    categoryStatus,
    advertiserType,
    advertiserSubtype,
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
        .select("advertiser_subtype, categories:category_id(name, goal_options)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      const subtype = (ac as any)?.advertiser_subtype || advertiserSubtype;
      const subtypeGoals = getSubtypeGoalOptions(subtype);
      const goals: string[] = subtypeGoals.length ? subtypeGoals : (((ac as any)?.categories?.goal_options as string[]) || []);
      const catName: string = subtype ? subtypeLabel(subtype) : ((ac as any)?.categories?.name || "");
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

  useEffect(() => {
    convoStateRef.current = convoState;
  }, [convoState]);

  if (!user) return null;

  const reply = async (text: string) => {
    const userText = text.trim();
    if (!userText) return;
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setTyping(true);
    try {
      if (isLoading) {
        setMessages((m) => [...m, { role: "bot", text: "One second — still loading your profile." }]);
        return;
      }
      // Track goal
      const goalMatch = userText.match(/^i\s+want(?:\s+to\s+get)?\s+(.+)$/i);
      if (goalMatch) {
        const ack = acknowledgeGoal(goalMatch[1], ctx);
        if (ack.stateUpdates) {
          convoStateRef.current = { ...convoStateRef.current, ...ack.stateUpdates };
          setConvoState(convoStateRef.current);
        }
      }
      // "Create campaign" → hand off to AI Mode
      if (/\b(create|start|make|launch|new)\b.*\bcampaign\b/i.test(userText)) {
        try { localStorage.setItem(AI_AUTOSTART_KEY, JSON.stringify({ text: userText })); } catch { /* ignore */ }
        setMessages((m) => [...m, { role: "bot", text: "Opening AI Mode so I can walk you through it." }]);
        setTimeout(() => navigate("/ai"), 500);
        return;
      }

      const history = messages.filter((m) => m.text).slice(-10).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));
      const contextInfo = [
        `Advertiser type: ${advertiserType ?? "not set"}`,
        `Subcategory: ${advertiserSubtype ? subtypeLabel(advertiserSubtype) : "not set"}`,
        `Wallet activated: ${walletActivated ? "yes" : "no"}`,
        `Current page: ${location.pathname}`,
        convoStateRef.current.goalDomain ? `Chosen goal: ${convoStateRef.current.goalDomain}` : "",
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("karbali-ai-chat", {
        body: { messages: [...history, { role: "user", content: userText }], contextInfo },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((m) => [...m, { role: "bot", text: (data as any)?.reply || "Try that again?" }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "bot", text: err?.message || "Couldn't reach the AI. Try again." }]);
    } finally {
      setTyping(false);
    }
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
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary transition-all hover:scale-105"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] h-[min(520px,calc(100vh-2rem))] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <KarbaliPersonaIcon className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold">Karbali Assistant</p>
                <p className="text-[10px]">Here to help you navigate</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 hover:bg-primary">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] space-y-1.5">
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] leading-snug ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
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
                          className="text-[11px] px-2.5 py-1 rounded-full border border-border text-foreground bg-card hover:bg-accent transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.goalOptions && m.goalOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-0.5">Pick a goal</p>
                      {m.goalOptions.map((g, i) => (
                        <button
                          key={g}
                          onClick={() => reply(`I want to get ${g.toLowerCase()}`)}
                          className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left hover:border-primary hover:bg-accent transition-colors"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-bold">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="flex-1 text-[12.5px] font-medium text-foreground">{g}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.navigateTo && (
                    <button
                      onClick={() => navigate(m.navigateTo!)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary transition-colors"
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
              className="flex-1 px-3 py-2 text-[13px] rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary disabled:bg-muted disabled:text-muted-foreground"
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
