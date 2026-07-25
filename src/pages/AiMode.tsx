import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import { useAiMode } from "@/lib/ai-mode";
import { useTheme } from "@/lib/theme";
import {
  CAMPAIGN_TYPE_LABELS,
  campaignTypeMismatchReply,
  detectIntent,
  getAllowedCampaignType,
  getProactiveGreeting,
  isCampaignTypeAllowed,
  acknowledgeGoal,
  initialState,
  type AssistantContext,
  type ConversationState,
} from "@/lib/assistant-nlp";
import { saveAiCampaignPrefill, type AiCampaignPrefill, type AiCampaignType } from "@/lib/ai-campaign-prefill";
import Logo from "@/components/Logo";
import KarbaliPersonaIcon from "@/components/KarbaliPersonaIcon";
import { getSubtypeGoalOptions, subtypeLabel } from "@/lib/advertiser-subtypes";
import { Send, Paperclip, X, ArrowUpRight, Sun, Moon, LogOut, ToggleRight, FileText, ChevronRight } from "lucide-react";


type Attachment = { id: string; name: string; type: string; size: number; dataUrl?: string };
type Msg = {
  role: "user" | "bot";
  text: string;
  suggestions?: string[];
  navigateTo?: string;
  attachments?: Attachment[];
  goalOptions?: string[];
  quickActions?: { label: string; to?: string; prompt?: string }[];
};

type CampaignFlow = {
  type: AiCampaignType | null;
  data: Partial<AiCampaignPrefill>;
  step: string;
};

const AI_AUTOSTART_KEY = "karbali_ai_autostart";

const CAMPAIGN_VALUE_STEPS = new Set([
  "type",
  "name",
  "milestones",
  "targetUsers",
  "appLink",
  "integration",
  "mediaType",
  "events",
  "mediaLink",
  "transcription",
  "engagementTargets",
  "sales",
  "commerceIntegration",
]);

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

const CAMPAIGN_ROUTES: Record<AiCampaignType, string> = {
  performance: "/campaigns/create/performance",
  engagement: "/campaigns/create/engagement",
  commerce: "/campaigns/create/commerce",
};

function norm(value: string) {
  return value.toLowerCase().trim();
}

function pickCampaignType(text: string): AiCampaignType | null {
  const t = norm(text);
  if (/commerce|shop|store|sale|product|woocommerce/.test(t)) return "commerce";
  if (/engagement|music|song|video|viewer|subscriber|youtube|listener/.test(t)) return "engagement";
  if (/performance|cpa|cpc|lead|signup|download|conversion|app/.test(t)) return "performance";
  return null;
}

function pickIntegration(text: string): "custom" | "wordpress" {
  return /word\s*press|woo/.test(norm(text)) ? "wordpress" : "custom";
}

function extractNumber(text: string, fallback: string) {
  const matched = text.replace(/,/g, "").match(/\d+/);
  return matched ? matched[0] : fallback;
}

function parseMilestones(text: string) {
  const t = norm(text);
  const milestones: string[] = [];
  if (/download|install/.test(t)) milestones.push("download");
  if (/signup|sign up|lead|register|registration/.test(t)) milestones.push("signup");
  if (/purchase|sale|subscription|subscribe|pay/.test(t)) milestones.push("purchase");
  return milestones.length ? milestones : ["signup"];
}

function isStartOnly(text: string) {
  return /^(start|start setup|setup|set up|continue|ok|okay|yes|go ahead|proceed)$/i.test(text.trim());
}

function platformForContext(ctx: AssistantContext): "website" | "mobile_app" | undefined {
  return ctx.advertiserSubtype === "app" ? "mobile_app" : ctx.advertiserType === "performance" ? "website" : undefined;
}

function seedDataFromConversation(type: AiCampaignType | null, state: ConversationState, ctx: AssistantContext): Partial<AiCampaignPrefill> {
  const data: Partial<AiCampaignPrefill> = { ...(type ? { type } : {}), createdAt: Date.now() };
  if (type === "engagement") {
    if (state.goalDomain === "music") {
      data.mediaType = "music";
      data.eventTypes = ["viewer"];
    }
    if (state.goalDomain === "video" || state.goalDomain === "views" || state.goalDomain === "social" || state.goalDomain === "brand") {
      data.mediaType = "video";
      data.eventTypes = state.goalDomain === "social" ? ["subscriber"] : ["viewer"];
    }
  }
  if (type === "performance") {
    data.platformType = platformForContext(ctx);
    if (state.goalDomain === "installs") data.milestones = ["download"];
    if (state.goalDomain === "signups" || state.goalDomain === "leads") data.milestones = ["signup"];
    if (state.goalDomain === "subscriptions") data.milestones = ["signup", "purchase"];
  }
  if (type === "commerce") {
    data.milestones = ["purchase"];
  }
  return data;
}

function createInitialCampaignFlow(type: AiCampaignType | null, state: ConversationState, ctx: AssistantContext): CampaignFlow {
  return { type, data: seedDataFromConversation(type, state, ctx), step: type ? "name" : "type" };
}

function isCampaignKnowledgeQuestion(text: string) {
  const t = norm(text);
  const hasQuestionCue = /\?|\b(what|explain|tell|about|meaning|mean|difference|why|how|did not|didn t|i asked|i said)\b/.test(t);
  const hasPlatformTopic = /\b(karbali|billing|wallet|tracking|attribution|fraud|cpa|cpc|cost|minimum|fee|profile|account|platform|system|advertiser type)\b/.test(t);
  return hasQuestionCue && hasPlatformTopic;
}

function currentCampaignQuestion(flow: CampaignFlow): Msg {
  const prompts: Record<string, Msg> = {
    type: { role: "bot", text: "Which campaign type should I set up?", suggestions: ["Performance campaign", "Engagement campaign", "Commerce campaign"] },
    name: { role: "bot", text: `What should we call this ${flow.type ? CAMPAIGN_TYPE_LABELS[flow.type] : "campaign"}?` },
    milestones: { role: "bot", text: "Which result should Karbali bill on?", suggestions: ["App installs", "Signups", "Installs and signups", "Subscriptions"] },
    targetUsers: { role: "bot", text: "How many users should we target? Minimum is 100." },
    appLink: { role: "bot", text: "Paste your Play Store, App Store, or TestFlight link." },
    integration: { role: "bot", text: "Is your site WordPress or custom code?", suggestions: ["WordPress", "Custom code"] },
    mediaType: { role: "bot", text: "Is this for music or video?", suggestions: ["Music", "Video"] },
    events: { role: "bot", text: "Which video event should we track?", suggestions: ["Viewers", "Subscribers", "Both"] },
    mediaLink: { role: "bot", text: flow.data.mediaType === "music" ? "Paste up to 3 music links." : "Paste the video link." },
    transcription: { role: "bot", text: flow.data.mediaType === "music" ? "Paste the song lyrics." : "Paste the video script." },
    engagementTargets: { role: "bot", text: flow.data.mediaType === "music" ? "How many verified listeners should Karbali target? Minimum is 200." : "How many verified interactions should Karbali target? Minimum is 200." },
    sales: { role: "bot", text: "How many sales should we target? Minimum is 100." },
    commerceIntegration: { role: "bot", text: "Is your store WordPress/WooCommerce or custom code?", suggestions: ["WooCommerce", "Custom code"] },
  };
  return prompts[flow.step] || { role: "bot", text: "Tell me the next campaign detail." };
}

function nextCampaignPrompt(flow: CampaignFlow, text: string, ctx: AssistantContext): { flow: CampaignFlow | null; reply: Msg } {
  const input = text.trim();
  let next: CampaignFlow = { ...flow, data: { ...flow.data } };

  if (!next.type) {
    const type = pickCampaignType(input) || getAllowedCampaignType(ctx);
    if (!type) return { flow: next, reply: { role: "bot", text: "Which one should we create?", suggestions: ["Performance campaign", "Engagement campaign", "Commerce campaign"] } };
    if (!isCampaignTypeAllowed(type, ctx)) {
      const blocked = campaignTypeMismatchReply(type, ctx);
      return { flow: null, reply: { role: "bot", text: blocked.text, suggestions: blocked.suggestions, navigateTo: blocked.navigateTo } };
    }
    next = { type, data: { type, createdAt: Date.now() }, step: "name" };
    return { flow: next, reply: { role: "bot", text: `Nice. What should we call this ${type} campaign?` } };
  }

  if (next.step === "name") {
    if (isStartOnly(input) || /^(create|campaign|ad)$/i.test(input)) {
      return { flow: next, reply: { role: "bot", text: "Give me the campaign name. Example: July Music Push or App Signup Drive." } };
    }
    next.data.campaignName = input;
    if (next.type === "performance") next.step = next.data.milestones?.length ? "targetUsers" : "milestones";
    if (next.type === "engagement") next.step = next.data.mediaType ? (next.data.mediaType === "video" ? "events" : "mediaLink") : "mediaType";
    if (next.type === "commerce") next.step = "sales";
  } else if (next.step === "milestones") {
    next.data.milestones = parseMilestones(input);
    next.step = "targetUsers";
  } else if (next.step === "targetUsers") {
    next.data.targetUsers = extractNumber(input, "100");
    next.step = next.data.platformType === "mobile_app" && next.data.milestones?.includes("download") ? "appLink" : "integration";
  } else if (next.step === "appLink") {
    next.data.appLink = input;
    next.data.integrationType = "custom";
    const prefill = { ...next.data, type: next.type, createdAt: Date.now() } as AiCampaignPrefill;
    saveAiCampaignPrefill(prefill);
    return { flow: null, reply: { role: "bot", text: "I prepared the app campaign details. Open review to generate the tracking key, verify events, and submit.", navigateTo: CAMPAIGN_ROUTES[next.type!] } };
  } else if (next.step === "integration") {
    next.data.integrationType = pickIntegration(input);
    const prefill = { ...next.data, type: next.type, createdAt: Date.now() } as AiCampaignPrefill;
    saveAiCampaignPrefill(prefill);
    return { flow: null, reply: { role: "bot", text: "I prepared the campaign details. Open review to generate the tracking key, verify the outcome event, and submit.", navigateTo: CAMPAIGN_ROUTES[next.type] } };
  } else if (next.step === "mediaType") {
    next.data.mediaType = /music|song|audio|artist/.test(norm(input)) ? "music" : "video";
    next.step = next.data.mediaType === "video" ? "events" : "mediaLink";
  } else if (next.step === "events") {
    const t = norm(input);
    const eventTypes = [];
    if (/view|watch|quiz/.test(t)) eventTypes.push("viewer");
    if (/subscrib|follow/.test(t)) eventTypes.push("subscriber");
    next.data.eventTypes = eventTypes.length ? eventTypes : ["viewer"];
    next.step = "mediaLink";
  } else if (next.step === "mediaLink") {
    if (next.data.mediaType === "music") next.data.musicLinks = input.split(/\s+/).filter(Boolean).slice(0, 3);
    else next.data.mediaLink = input;
    const needsTranscription = next.data.mediaType === "music" || next.data.eventTypes?.includes("viewer");
    next.step = needsTranscription ? "transcription" : "engagementTargets";
  } else if (next.step === "transcription") {
    next.data.transcription = input;
    next.data.transcriptionConfirmed = true;
    next.step = "engagementTargets";
  } else if (next.step === "engagementTargets") {
    if (next.data.mediaType === "music" || next.data.eventTypes?.includes("viewer")) next.data.targetViewers = extractNumber(input, "200");
    if (next.data.eventTypes?.includes("subscriber")) next.data.targetSubscribers = extractNumber(input, "200");
    const prefill = { ...next.data, type: "engagement", createdAt: Date.now() } as AiCampaignPrefill;
    saveAiCampaignPrefill(prefill);
    return { flow: null, reply: { role: "bot", text: "I prepared your engagement campaign. Open review to check cost and submit for approval.", navigateTo: CAMPAIGN_ROUTES.engagement } };
  } else if (next.step === "sales") {
    next.data.targetSales = extractNumber(input, "100");
    next.step = "commerceIntegration";
  } else if (next.step === "commerceIntegration") {
    next.data.integrationType = pickIntegration(input);
    const prefill = { ...next.data, type: "commerce", createdAt: Date.now() } as AiCampaignPrefill;
    saveAiCampaignPrefill(prefill);
    return { flow: null, reply: { role: "bot", text: "I prepared your commerce campaign. Open review to generate sales tracking and submit.", navigateTo: CAMPAIGN_ROUTES.commerce } };
  }

  return { flow: next, reply: currentCampaignQuestion(next) };
}

export default function AiMode() {
  const { user, signOut, walletActivated, categoryStatus, advertiserType, advertiserSubtype, businessVerified, isLoading } = useAuth();
  const { setAiMode } = useAiMode();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [typing, setTyping] = useState(false);
  const [campaignFlow, setCampaignFlow] = useState<CampaignFlow | null>(null);
  const [convoState, setConvoState] = useState<ConversationState>(initialState());
  const convoStateRef = useRef<ConversationState>(convoState);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const ctx: AssistantContext = {
    walletActivated,
    categoryStatus,
    advertiserType,
    advertiserSubtype,
    businessVerified,
    pathname: location.pathname,
    userName: user?.email ?? undefined,
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const greet = getProactiveGreeting(ctx);
      // Fetch subcategory-driven goal options for this advertiser.
      const { data: ac } = await supabase
        .from("advertiser_categories")
        .select("advertiser_subtype, categories:category_id(name, goal_options)")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      const subtype = (ac as any)?.advertiser_subtype || advertiserSubtype;
      const subtypeGoals = getSubtypeGoalOptions(subtype);
      const goals: string[] = subtypeGoals.length ? subtypeGoals : (((ac as any)?.categories?.goal_options as string[]) || []);
      const catName: string = subtype ? subtypeLabel(subtype) : ((ac as any)?.categories?.name || "");

      // Check for live ad packages targeting this advertiser's subtype
      let hasPackages = false;
      if (advertiserType !== "offline" && subtype) {
        const { data: pkgs } = await supabase
          .from("ad_packages")
          .select("id, advertiser_subtypes")
          .eq("is_active", true)
          .contains("advertiser_subtypes", [subtype])
          .limit(1);
        hasPackages = !!(pkgs && pkgs.length > 0);
      }

      const packageLine = hasPackages
        ? `\n\n🎁 Good news — we have a discounted ad package ready for ${catName || "your account"}. Tap "View ad packages" below to grab it.`
        : "";
      const intro = goals.length
        ? `${greet.text}${packageLine}\n\nWhat are you looking to get for your ${catName || "business"}? Pick one to get started.`
        : `${greet.text}${packageLine}`;

      const actions: { label: string; to?: string; prompt?: string }[] = [];
      if (advertiserType !== "offline") {
        if (hasPackages) actions.push({ label: "View ad packages", to: "/packages" });
        actions.push({ label: "Create a campaign with AI", prompt: "Create a campaign" });
      } else {
        actions.push({ label: "Submit a Letter of Intent", to: "/offline/loi" });
      }

      let startingMessages: Msg[] = [{
        role: "bot",
        text: intro,
        suggestions: goals.length ? undefined : greet.suggestions,
        goalOptions: goals.length ? goals : undefined,
        quickActions: actions,
      }];

      const autostartRaw = localStorage.getItem(AI_AUTOSTART_KEY);
      if (autostartRaw) {
        localStorage.removeItem(AI_AUTOSTART_KEY);
        try {
          const autostart = JSON.parse(autostartRaw) as { text?: string; campaignType?: AiCampaignType | null; stateUpdates?: Partial<ConversationState> };
          const nextState = { ...convoStateRef.current, ...autostart.stateUpdates, lastIntent: "start_campaign" };
          const type = autostart.campaignType || nextState.campaignType || getAllowedCampaignType(ctx);
          const flow = createInitialCampaignFlow(type || null, nextState, ctx);
          convoStateRef.current = nextState;
          setConvoState(nextState);
          setCampaignFlow(flow);
          startingMessages = [
            ...startingMessages,
            { role: "user", text: autostart.text || "Create a campaign" },
            currentCampaignQuestion(flow),
          ];
        } catch {
          localStorage.removeItem(AI_AUTOSTART_KEY);
        }
      }

      setMessages(startingMessages);
      setTimeout(() => taRef.current?.focus(), 100);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    convoStateRef.current = convoState;
  }, [convoState]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link to="/login" className="text-sm text-primary underline">Sign in to use AI mode</Link>
      </div>
    );
  }

  const callAI = async (userText: string): Promise<string> => {
    // Build compact conversation history for the model
    const history = messages
      .filter((m) => m.text && (m.role === "user" || m.role === "bot"))
      .slice(-12)
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
    const contextInfo = [
      `Advertiser email: ${user?.email ?? "unknown"}`,
      `Advertiser type: ${advertiserType ?? "not set"}`,
      `Subcategory: ${advertiserSubtype ? subtypeLabel(advertiserSubtype) : "not set"}`,
      `Wallet activated: ${walletActivated ? "yes" : "no"}`,
      `Business verified: ${businessVerified ? "yes" : "no"}`,
      `Current page: ${location.pathname}`,
      convoStateRef.current.goalDomain ? `Chosen goal: ${convoStateRef.current.goalDomain}` : "",
    ].filter(Boolean).join("\n");

    const { data, error } = await supabase.functions.invoke("karbali-ai-chat", {
      body: { messages: [...history, { role: "user", content: userText }], contextInfo },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as any)?.reply || "I didn't catch that. Could you rephrase?";
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text && pending.length === 0) return;

    const userMsg: Msg = {
      role: "user",
      text: text || (pending.length ? `Sent ${pending.length} file${pending.length > 1 ? "s" : ""}.` : ""),
      attachments: pending.length ? pending : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending([]);
    setTyping(true);

    try {
      if (isLoading) {
        setMessages((m) => [...m, { role: "bot", text: "One second — still loading your advertiser profile." }]);
        return;
      }

      // Campaign creation flow — deterministic steps (no AI call, faster).
      if (campaignFlow) {
        let nextFlow = campaignFlow;
        let reply: Msg & { autoNavigate?: boolean };
        if (campaignFlow.type && !isCampaignTypeAllowed(campaignFlow.type, ctx)) {
          const blocked = campaignTypeMismatchReply(campaignFlow.type, ctx);
          nextFlow = null;
          reply = { role: "bot", text: blocked.text, suggestions: blocked.suggestions, navigateTo: blocked.navigateTo };
        } else if (/^(cancel|stop|exit|start over)$/i.test(text)) {
          nextFlow = null;
          reply = { role: "bot", text: "No problem. Campaign setup stopped.", suggestions: ["Create a campaign", "What is Karbali?", "Open wallet"] };
        } else {
          const result = nextCampaignPrompt(campaignFlow, text, ctx);
          nextFlow = result.flow;
          reply = result.reply;
        }
        setCampaignFlow(nextFlow);
        setMessages((m) => [...m, { role: "bot", text: reply.text, suggestions: reply.suggestions, navigateTo: reply.navigateTo }]);
        if (reply.navigateTo && reply.autoNavigate) {
          setTimeout(() => navigate(reply.navigateTo!), 900);
        }
        return;
      }

      // Explicit "start a campaign" shortcut — flip into deterministic flow.
      if (/\b(create|start|make|build|launch|set\s?up|new)\b.*\bcampaign\b/i.test(text) || /^create a campaign$/i.test(text)) {
        const type = pickCampaignType(text) || getAllowedCampaignType(ctx);
        const flow = createInitialCampaignFlow(type || null, convoStateRef.current, ctx);
        setCampaignFlow(flow);
        setMessages((m) => [...m, currentCampaignQuestion(flow)]);
        return;
      }

      // Track chosen goal so future prompts have context.
      const goalMatch = text.match(/^i\s+want(?:\s+to\s+get)?\s+(.+)$/i);
      if (goalMatch) {
        const ack = acknowledgeGoal(goalMatch[1], ctx);
        if (ack.stateUpdates) {
          const nextState = { ...convoStateRef.current, ...ack.stateUpdates, turnCount: convoStateRef.current.turnCount + 1 };
          convoStateRef.current = nextState;
          setConvoState(nextState);
        }
      }

      // Everything else → real AI.
      const reply = await callAI(text);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
    } catch (err: any) {
      const msg = err?.message?.includes("OPENAI_API_KEY") || err?.message?.includes("GEMINI_API_KEY")
        ? "AI key is missing. An admin needs to set it in Admin Settings → AI Provider."
        : err?.message || "The assistant had trouble reaching the AI. Please try again.";
      setMessages((m) => [...m, { role: "bot", text: msg }]);
    } finally {
      setTyping(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };


  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 5);
    list.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setPending((p) => [
            ...p,
            { id: Math.random().toString(36).slice(2), name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setPending((p) => [
          ...p,
          { id: Math.random().toString(36).slice(2), name: file.name, type: file.type, size: file.size },
        ]);
      }
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const exitAiMode = () => {
    setAiMode(false);
    navigate("/dashboard");
  };

  const initial = (user.email || "?")[0].toUpperCase();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 lg:px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Logo size={14} />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold flex items-center gap-1.5">
              Karbali Assistant
              <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider">
                <KarbaliPersonaIcon className="h-2.5 w-2.5" /> AI Mode
              </span>
            </p>
            <p className="text-[10.5px] text-muted-foreground">Chat to run your workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={exitAiMode}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-medium hover:bg-accent transition-colors"
            title="Switch to normal dashboard"
          >
            <ToggleRight className="h-3.5 w-3.5" /> Normal mode
          </button>
          <button onClick={signOut} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 lg:px-6 py-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ring-2 ${
                m.role === "user"
                  ? "bg-foreground text-background ring-transparent"
                  : "bg-primary text-primary-foreground ring-primary"
              }`}>
                {m.role === "user" ? initial : <KarbaliPersonaIcon className="h-4 w-4" />}
              </div>
              <div className={`flex-1 space-y-2 ${m.role === "user" ? "items-end flex flex-col" : ""}`}>
                {m.text && (
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}>
                    {m.role === "bot" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-strong:text-foreground">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>

                )}

                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-w-[85%]">
                    {m.attachments.map((a) => (
                      <div key={a.id} className="rounded-lg border border-border bg-background p-1.5 flex items-center gap-2 max-w-[200px]">
                        {a.dataUrl ? (
                          <img src={a.dataUrl} alt={a.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-[11px] leading-tight min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {m.role === "bot" && m.navigateTo && (
                  <button
                    onClick={() => navigate(m.navigateTo!)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-[12px] font-medium hover:bg-primary transition-colors"
                  >
                    Open {PAGE_LABELS[m.navigateTo] || m.navigateTo} <ArrowUpRight className="h-3 w-3" />
                  </button>
                )}

                {m.role === "bot" && m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-[11.5px] px-2.5 py-1 rounded-full border border-border text-foreground bg-card hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {m.role === "bot" && m.goalOptions && m.goalOptions.length > 0 && (
                  <div className="max-w-[95%] w-full mt-3">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-3 uppercase tracking-[0.14em]">Pick a goal to start</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {m.goalOptions.map((g, i) => (
                        <button
                          key={g}
                          onClick={() => sendMessage(`I want to get ${g.toLowerCase()}`)}
                          className="group relative flex items-center gap-3 rounded-lg bg-card border border-border px-3.5 py-3 text-left hover:border-primary hover:bg-accent transition-colors"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-[13px] font-bold">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="flex-1 text-[13.5px] font-medium text-foreground">{g}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {m.role === "bot" && m.quickActions && m.quickActions.length > 0 && (
                  <div className="max-w-[95%] w-full mt-3 flex flex-wrap gap-2">
                    {m.quickActions.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => (a.prompt ? sendMessage(a.prompt) : a.to && navigate(a.to))}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-[12.5px] font-medium hover:bg-primary/90 transition-colors"
                      >
                        {a.label}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-primary">
                <KarbaliPersonaIcon className="h-4 w-4" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl bg-card border border-border rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-2xl px-4 lg:px-6 py-3">
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pending.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-muted p-1.5 flex items-center gap-2 max-w-[200px]">
                  {a.dataUrl ? (
                    <img src={a.dataUrl} alt={a.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-background flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-[11px] truncate max-w-[100px]">{a.name}</span>
                  <button
                    onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}
                    className="rounded-md p-0.5 text-muted-foreground hover:bg-background"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary transition-colors"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label="Attach file"
              title="Attach image or document"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={1}
              placeholder="Ask Karbali Assistant anything... (Shift+Enter for new line)"
              className="flex-1 resize-none bg-transparent px-2 py-2 text-[14px] focus:outline-none placeholder:text-muted-foreground max-h-32"
              style={{ minHeight: "36px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() && pending.length === 0}
              className="rounded-lg bg-primary text-primary-foreground p-2 hover:bg-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-[10.5px] text-muted-foreground text-center mt-1.5 sm:hidden">
            <button onClick={exitAiMode} className="underline">Switch to normal mode</button>
          </p>
        </div>
      </div>
    </div>
  );
}
