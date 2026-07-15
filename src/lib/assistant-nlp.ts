import type { AiCampaignType } from "@/lib/ai-campaign-prefill";

// Karbali in-house NLP. No external APIs.
// Adds real conversation state: the assistant remembers the last goal, topic,
// campaign type, and turn count, then threads that context into every reply.

export type AssistantContext = {
  walletActivated: boolean | null;
  categoryStatus: string | null;
  advertiserType: string | null;
  advertiserSubtype?: string | null;
  businessVerified?: boolean | null;
  pathname: string;
  userName?: string;
};

// Conversation memory. Passed into detectIntent and updated after each turn.
export type ConversationState = {
  goal: string | null;              // e.g. "music streams", "app installs"
  goalDomain: GoalDomain | null;    // classified domain of the goal
  topic: string | null;             // last topic discussed (tracking, billing, etc.)
  campaignType: AiCampaignType | null; // last inferred campaign type
  lastIntent: string | null;
  turnCount: number;
};

export const initialState = (): ConversationState => ({
  goal: null,
  goalDomain: null,
  topic: null,
  campaignType: null,
  lastIntent: null,
  turnCount: 0,
});

export type GoalDomain =
  | "music"
  | "video"
  | "views"
  | "quiz"
  | "social"
  | "brand"
  | "installs"
  | "signups"
  | "leads"
  | "subscriptions"
  | "sales"
  | "cart"
  | "repeat";

export type AssistantReply = {
  text: string;
  navigateTo?: string;
  action?: "start_campaign_flow";
  campaignType?: AiCampaignType | null;
  autoNavigate?: boolean;
  suggestions?: string[];
  goalOptions?: string[];
  // If set, calling code should merge into ConversationState.
  stateUpdates?: Partial<ConversationState>;
};

export const CAMPAIGN_TYPE_LABELS: Record<AiCampaignType, string> = {
  performance: "Performance Ads",
  engagement: "Engagement Ads",
  commerce: "Commerce Ads",
};

// ---------------------------------------------------------------------------
// Tokenization + normalization
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the","a","an","is","i","to","my","me","of","for","on","in","at","do","does",
  "can","you","please","and","or","with","this","that","be","am","are","it",
  "there","here","should","would","will","have","has","had","was","were","into",
  "from","by","if","so","as","but","then","also","too","not","no","yes","ok",
  "okay","just","really","very","now","get","got","gonna","want","wanna","need",
]);

const TYPO_FIXES: Record<string, string> = {
  camaign: "campaign", camaigns: "campaign", campain: "campaign", campains: "campaign",
  engagemnet: "engagement", engagmnt: "engagement", inteligent: "intelligent",
  straming: "stream", stremaing: "stream", stram: "stream", streamng: "stream",
  isnt: "is not", advertis: "advertise", advertiz: "advertise",
  ecommerce: "commerce", ecom: "commerce", shopify: "commerce",
  client: "customer", customers: "customer", costumer: "customer",
  streaming: "stream", streams: "stream", listens: "listen", listener: "listen",
  viewers: "viewer", views: "view", subscribers: "subscribe", subscriber: "subscribe",
  installs: "install", signups: "signup", downloads: "download",
};

function stem(word: string): string {
  return word.replace(/(ings|ing|ies|ied|es|ed|s)$/g, (m) => (m === "ies" || m === "ied" ? "y" : ""));
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => TYPO_FIXES[w] || TYPO_FIXES[stem(w)] || stem(w));
}

function hasAny(tokens: string[], group: string[]): boolean {
  const norm = group.map(stem);
  return tokens.some((t) => norm.includes(t));
}

function includesPhrase(input: string, phrases: string[]): boolean {
  const t = input.toLowerCase();
  return phrases.some((p) => t.includes(p));
}

// ---------------------------------------------------------------------------
// Goal classification (goal string -> domain -> campaign type)
// ---------------------------------------------------------------------------

const GOAL_DOMAIN_KEYWORDS: Record<GoalDomain, string[]> = {
  music: ["music", "song", "stream", "listen", "audio", "spotify", "audiomack", "artist"],
  video: ["video", "watch", "youtube", "reels", "tiktok", "shorts"],
  views: ["view", "impression", "reach", "traffic"],
  quiz: ["quiz", "answer", "poll", "survey"],
  social: ["social", "follow", "like", "share", "engagement"],
  brand: ["brand", "awareness", "visibility", "recognition"],
  installs: ["install", "download", "app"],
  signups: ["signup", "register", "account"],
  leads: ["lead", "prospect", "inquiry", "form"],
  subscriptions: ["subscription", "subscribe", "recurring", "plan"],
  sales: ["sale", "purchase", "buy", "checkout", "order", "revenue"],
  cart: ["cart", "abandonment", "conversion"],
  repeat: ["repeat", "returning", "loyalty", "retention"],
};

export function classifyGoal(goal: string): { domain: GoalDomain | null; campaignType: AiCampaignType | null } {
  const tokens = normalize(goal);
  for (const [domain, kws] of Object.entries(GOAL_DOMAIN_KEYWORDS)) {
    if (hasAny(tokens, kws)) {
      const d = domain as GoalDomain;
      const type =
        d === "sales" || d === "cart" || d === "repeat" ? "commerce" :
        d === "music" || d === "video" || d === "views" || d === "quiz" || d === "social" || d === "brand" ? "engagement" :
        "performance";
      return { domain: d, campaignType: type };
    }
  }
  return { domain: null, campaignType: null };
}

// Human-friendly noun for a goal domain when composing sentences.
function goalNoun(domain: GoalDomain | null, goal: string | null): string {
  if (!domain) return goal || "your goal";
  switch (domain) {
    case "music": return "music streams";
    case "video": return "video plays";
    case "views": return "ad views";
    case "quiz": return "quiz completions";
    case "social": return "social engagement";
    case "brand": return "brand awareness";
    case "installs": return "app installs";
    case "signups": return "signups";
    case "leads": return "leads";
    case "subscriptions": return "subscriptions";
    case "sales": return "sales";
    case "cart": return "cart conversions";
    case "repeat": return "repeat purchases";
  }
}

// ---------------------------------------------------------------------------
// Campaign type helpers
// ---------------------------------------------------------------------------

export function inferCampaignType(tokens: string[]): AiCampaignType | null {
  if (hasAny(tokens, ["commerce", "store", "shop", "sale", "purchase", "woocommerce", "product", "checkout", "cart"])) return "commerce";
  if (hasAny(tokens, ["engagement", "music", "video", "viewer", "view", "subscribe", "listen", "youtube", "stream", "quiz", "brand", "reach"])) return "engagement";
  if (hasAny(tokens, ["performance", "cpa", "cpc", "conversion", "signup", "download", "install", "lead", "app", "subscription"])) return "performance";
  return null;
}

export function getAllowedCampaignType(ctx: AssistantContext): AiCampaignType | null {
  const type = String(ctx.advertiserType || "").toLowerCase();
  if (type === "performance" || type === "engagement" || type === "commerce") return type;
  return null;
}

export function isCampaignTypeAllowed(type: AiCampaignType, ctx: AssistantContext): boolean {
  const allowedType = getAllowedCampaignType(ctx);
  return !allowedType || allowedType === type;
}

export function campaignTypeMismatchReply(type: AiCampaignType, ctx: AssistantContext): AssistantReply {
  const allowedType = getAllowedCampaignType(ctx);
  if (!allowedType || allowedType === type) {
    return { text: `I can build your ${CAMPAIGN_TYPE_LABELS[type]} campaign here.`, action: "start_campaign_flow", campaignType: type };
  }
  return {
    text: `Your account is set for ${CAMPAIGN_TYPE_LABELS[allowedType]}. I can only create that campaign type unless your advertiser profile is changed.`,
    suggestions: [`Create ${CAMPAIGN_TYPE_LABELS[allowedType]}`, "Change advertiser type", "Why can't I create this?"],
    navigateTo: "/category",
  };
}

// ---------------------------------------------------------------------------
// Goal-threaded knowledge composer
//
// Every knowledge answer is composed so it references the current goal when
// one is set. That way if the user picked "music streams" and asks "how does
// tracking work", the answer talks about tracking for music streams, not a
// generic paragraph.
// ---------------------------------------------------------------------------

type Topic =
  | "tracking" | "billing" | "wallet" | "minimum" | "fraud"
  | "cpa_vs_cpc" | "verify_website" | "verify_business"
  | "campaign_types" | "process" | "what_is_karbali";

function goalPrefix(state: ConversationState): string {
  if (!state.goal) return "";
  return `For ${goalNoun(state.goalDomain, state.goal)}, `;
}

function goalTailSuggestion(state: ConversationState, defaults: string[]): string[] {
  if (!state.goal) return defaults;
  const type = state.campaignType;
  if (type === "engagement") return ["Create engagement campaign", ...defaults].slice(0, 4);
  if (type === "commerce") return ["Create commerce campaign", ...defaults].slice(0, 4);
  if (type === "performance") return ["Create performance campaign", ...defaults].slice(0, 4);
  return defaults;
}

function answerTopic(topic: Topic, state: ConversationState, ctx: AssistantContext): AssistantReply {
  const prefix = goalPrefix(state);
  const goal = state.goal ? goalNoun(state.goalDomain, state.goal) : null;

  switch (topic) {
    case "what_is_karbali":
      return {
        text: goal
          ? `Karbali helps you buy real ${goal}, not empty impressions. Fund your wallet, launch the right campaign, and only pay when the ${goal} actually happen.`
          : "Karbali helps Nigerian advertisers buy real outcomes, not impressions. Fund your wallet, launch a campaign, and pay only for valid conversions, engagement, installs, or sales.",
        suggestions: goalTailSuggestion(state, ["Types of campaigns", "How does billing work?", "How is tracking done?"]),
        stateUpdates: { topic: "what_is_karbali" },
      };
    case "tracking":
      return {
        text: goal
          ? `${prefix}${trackingDetailForGoal(state)} You pay only when Karbali confirms a valid ${singularize(goal)}.`
          : "Karbali uses a deterministic tracking ID for attribution only, never for billing. Install the Karbali script or WordPress plugin, fire the conversion event, and we attribute the result to the right campaign. Charges happen only on the confirmed outcome.",
        suggestions: goalTailSuggestion(state, ["Open docs", "Verify my integration"]),
        navigateTo: "/docs",
        stateUpdates: { topic: "tracking" },
      };
    case "billing":
      return {
        text: goal
          ? `${prefix}Karbali holds the cost in escrow when you submit. As real ${goal} come in, funds release from your wallet. No results, no charge.`
          : "Karbali uses escrow. When you submit a campaign, cost is held from your wallet first and released only as valid results happen.",
        suggestions: goalTailSuggestion(state, ["Minimum funding", "Open wallet", "How is tracking done?"]),
        stateUpdates: { topic: "billing" },
      };
    case "wallet":
      return {
        text: ctx.walletActivated
          ? "Your wallet is already active. You can launch campaigns."
          : "Activate your wallet first. Minimum is $10 and you can top up via Paystack or Flutterwave.",
        navigateTo: "/wallet",
        autoNavigate: !ctx.walletActivated,
        stateUpdates: { topic: "wallet" },
      };
    case "minimum":
      return {
        text: state.campaignType === "commerce"
          ? "Commerce campaigns need at least $200 wallet balance before launch, plus a flat fee and commission on each sale."
          : "Wallet activation minimum is $10. Commerce campaigns need $200 balance. Partnership accounts need $50 fee + $200 minimum.",
        suggestions: ["Activate my wallet", "Fund wallet"],
        stateUpdates: { topic: "minimum" },
      };
    case "fraud":
      return {
        text: `${prefix}Karbali filters bots, duplicate events, and suspicious patterns before billing. You only pay for clean, verified outcomes, never for raw traffic.`,
        stateUpdates: { topic: "fraud" },
      };
    case "cpa_vs_cpc":
      return {
        text: "CPC (pay per click) is the old web model. Karbali does not use CPC , we bill CPA only, meaning you pay only when a real action happens (signup, install, sale, engagement). Clicks are free.",
        stateUpdates: { topic: "cpa_vs_cpc" },
      };
    case "verify_website":
      return {
        text: "Add your website, then verify via OTP or DNS. Once verified the domain locks, so confirm the exact URL before submitting.",
        navigateTo: "/websites",
        stateUpdates: { topic: "verify_website" },
      };
    case "verify_business":
      return {
        text: "Business verification confirms your brand and unlocks higher limits. Upload your documents and we review within 24–48 hours.",
        navigateTo: "/verification",
        stateUpdates: { topic: "verify_business" },
      };
    case "campaign_types":
      return {
        text: "Two ad types: Online and Offline. Online has Engagement (musicians, YouTubers, creators), Performance (apps, websites, fintech, game developers, sports and betting), and Commerce (e-commerce, vendors, realtors). Offline has Daily Essentials and Mainstream brands.",
        suggestions: ["What is Engagement?", "What is Performance?", "What is Commerce?"],
        stateUpdates: { topic: "campaign_types" },
      };
    case "process":
      return {
        text: goal
          ? `To buy ${goal}: activate wallet → add your website or app link → launch a ${state.campaignType || "matching"} campaign with ${goal} as the target → install tracking → submit for review.`
          : "Activate wallet → add/verify website → choose campaign type → set goals → install tracking → submit for review.",
        suggestions: goalTailSuggestion(state, ["Create a campaign", "Setup tracking", "Add website"]),
        stateUpdates: { topic: "process" },
      };
  }
}

function trackingDetailForGoal(state: ConversationState): string {
  switch (state.goalDomain) {
    case "music": return "Music is handled inside the engagement offerwall: you paste up to 3 song links and the lyrics, Karbali sends users to listen, then validates the session with listen-time plus a simple lyric/attention quiz. We do not claim Spotify or Apple Music server-side stream counts unless those platforms provide verified data.";
    case "video": return "Video is handled inside the engagement flow: you paste the video link and script, then Karbali validates watch-time and quiz/attention checks before counting a play.";
    case "quiz": return "We record completions only when the user answers the quiz correctly.";
    case "installs": return "The install SDK fires a conversion when the user opens the app for the first time.";
    case "signups": return "Our JS snippet or WordPress plugin fires a conversion when the signup form is submitted successfully.";
    case "sales":
    case "cart":
    case "repeat": return "Drop the JS snippet or WooCommerce plugin on your store, and we fire a conversion at checkout success. Commission is billed only then.";
    default: return "Install the Karbali script or WordPress plugin and fire the conversion event when the goal happens.";
  }
}

function singularize(word: string): string {
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// ---------------------------------------------------------------------------
// Free-text intent detection with scoring
// ---------------------------------------------------------------------------

type IntentRule = {
  id: string;
  topic?: Topic;
  // Weighted keyword groups. Every non-empty group must match at least once.
  keywords: string[][];
  // Phrases (raw substring) that force a match when present.
  phrases?: string[];
};

const INTENT_RULES: IntentRule[] = [
  { id: "what_is_karbali", topic: "what_is_karbali",
    keywords: [["karbali","platform","system","product"], ["what","explain","tell","describe","mean","about"]],
    phrases: ["what is karbali","tell me about karbali","explain karbali"] },
  { id: "campaign_types", topic: "campaign_types",
    keywords: [["type","kind","category","difference","option"], ["campaign","ad","advert"]],
    phrases: ["types of campaign","types of ads","which campaign"] },
  { id: "tracking", topic: "tracking",
    keywords: [["track","attribution","conversion","pixel","sdk"], []],
    phrases: ["how does tracking","how tracking works","attribution"] },
  { id: "billing", topic: "billing",
    keywords: [["billing","cost","charge","escrow","deduct","spend","fee"], []],
    phrases: ["how does billing","how am i charged","how do you charge"] },
  { id: "minimum", topic: "minimum",
    keywords: [["minimum","least","start","how much"], ["wallet","balance","fund","amount","money","need"]],
    phrases: ["how much do i need","minimum balance","minimum fund"] },
  { id: "fraud", topic: "fraud",
    keywords: [["fraud","fake","bot","invalid"], []],
    phrases: ["ad fraud","bot traffic"] },
  { id: "cpa_vs_cpc", topic: "cpa_vs_cpc",
    keywords: [["cpa","cpc","difference"], []],
    phrases: ["cpa vs cpc","cpc vs cpa"] },
  { id: "verify_website", topic: "verify_website",
    keywords: [["verify","add","connect"], ["website","domain","site","url"]],
    phrases: ["add my website","verify my domain","add website"] },
  { id: "verify_business", topic: "verify_business",
    keywords: [["verify","verification","approve","kyc"], ["business","brand","account","company"]],
    phrases: ["business verification","verify my business","kyc"] },
  { id: "wallet", topic: "wallet",
    keywords: [["wallet","balance","fund","money"], ["activate","open","show","check","see"]],
    phrases: ["activate wallet","open my wallet","fund wallet","top up"] },
  { id: "process", topic: "process",
    keywords: [["process","step","flow","how"], ["campaign","ad","launch","start"]],
    phrases: ["how do i start","how to launch","campaign flow"] },
];

function scoreIntent(rule: IntentRule, tokens: string[], raw: string): number {
  let score = 0;
  if (rule.phrases && includesPhrase(raw, rule.phrases)) score += 10;
  const nonEmpty = rule.keywords.filter((g) => g.length > 0);
  let hits = 0;
  for (const g of nonEmpty) if (hasAny(tokens, g)) hits++;
  if (nonEmpty.length > 0 && hits === nonEmpty.length) score += 5;
  else score += hits * 2;
  return score;
}

// ---------------------------------------------------------------------------
// Public: goal selection, greeting, intent detection
// ---------------------------------------------------------------------------

// Called by the UI whenever the user picks or states a goal. Returns a
// reply plus the state updates the caller should apply.
export function acknowledgeGoal(goal: string, ctx: AssistantContext): AssistantReply {
  const goalText = goal.trim();
  const normalizedGoal = goalText.toLowerCase();
  if (/\b(create|start|launch|run|setup|set up|build|place)\b/.test(normalizedGoal) && /\b(campaign|ad|advert)\b/.test(normalizedGoal)) {
    const type = inferCampaignType(normalize(goalText)) || getAllowedCampaignType(ctx);
    if (type && !isCampaignTypeAllowed(type, ctx)) return campaignTypeMismatchReply(type, ctx);
    return {
      text: "I can create it with you here. I will ask the details, prepare the campaign, then send you to review and submit.",
      action: "start_campaign_flow",
      campaignType: type || null,
      stateUpdates: { lastIntent: "start_campaign" },
    };
  }
  const { domain, campaignType } = classifyGoal(goalText);
  const canonicalNoun = goalNoun(domain, goalText);
  const type = campaignType || getAllowedCampaignType(ctx);

  const nextStep = !ctx.walletActivated
    ? " Let's activate your wallet first. Minimum is $10."
    : type
      ? ` The best fit is a ${CAMPAIGN_TYPE_LABELS[type]} campaign. I can walk you through setup step by step.`
      : "";

  const nav = !ctx.walletActivated ? "/wallet" : undefined;

  return {
    text: `Perfect. You want ${canonicalNoun}.${nextStep} Ask me how it works, or say "start" and I will build it with you.`,
    suggestions: !ctx.walletActivated
      ? ["Activate wallet", "How does tracking work?", "How much does it cost?"]
      : type
        ? [`Start ${CAMPAIGN_TYPE_LABELS[type].toLowerCase()} setup`, "How does tracking work?", "How does billing work?"]
        : ["How does tracking work?", "How does billing work?", "Types of campaigns"],
    navigateTo: nav,
    stateUpdates: { goal: canonicalNoun, goalDomain: domain, campaignType: type, lastIntent: "goal_selected" },
  };
}

export function getProactiveGreeting(ctx: AssistantContext): AssistantReply {
  const name = ctx.userName ? " " + ctx.userName.split(/[\s@]/)[0] : "";
  if (ctx.walletActivated !== true) {
    return {
      text: `Welcome${name}! Let's activate your wallet so you can start running campaigns.`,
      suggestions: ["Activate my wallet", "How much do I need?", "What is Karbali?"],
    };
  }
  if (ctx.categoryStatus !== "active") {
    return {
      text: `Hey${name}! Your category is still pending. I'll ping you once it goes live.`,
      suggestions: ["Check category", "View campaigns"],
    };
  }
  const allowedType = getAllowedCampaignType(ctx);
  if (allowedType) {
    return {
      text: `Welcome back${name}! Your profile is ${CAMPAIGN_TYPE_LABELS[allowedType]}. Tell me what you want and I'll set it up.`,
      suggestions: [`Create ${CAMPAIGN_TYPE_LABELS[allowedType]}`, "What is Karbali?", "Open wallet"],
    };
  }
  return {
    text: `Welcome back${name}! What are you trying to achieve today?`,
    suggestions: ["Get more customers", "Grow app installs", "Promote my music"],
  };
}

// Main entry point. Uses conversation state to keep answers on-topic.
export function detectIntent(
  input: string,
  ctx: AssistantContext,
  state: ConversationState = initialState(),
): AssistantReply {
  const raw = input.trim();
  const tokens = normalize(raw);

  if (!tokens.length) {
    return {
      text: state.goal
        ? `Ask me anything about getting ${state.goal} on Karbali.`
        : "Ask me anything about Karbali: campaigns, wallet, tracking, fees.",
      suggestions: state.goal
        ? ["How does tracking work?", "How does billing work?", "Start setup"]
        : ["What is Karbali?", "Create a campaign", "How does billing work?"],
    };
  }

  // Meta-complaints: user says the AI ignored context.
  if (includesPhrase(raw.toLowerCase(), ["you did not", "you didnt", "i said", "i asked", "not related", "not connected", "how is", "why did you"])) {
    if (state.goal) {
      return {
        text: `Sorry. You're focused on ${state.goal}. Ask me anything specific about that: cost, tracking, setup, or launch, and I'll answer for ${state.goal} directly.`,
        suggestions: [`How much for ${state.goal}?`, `How is ${state.goal} tracked?`, `Start ${state.goal} campaign`],
      };
    }
  }

  // User states a goal in free text ("I want more app installs").
  if (includesPhrase(raw.toLowerCase(), ["i want", "i need", "help me get", "how do i get", "trying to get", "looking for"])) {
    const { domain } = classifyGoal(raw);
    if (domain) return acknowledgeGoal(raw, ctx);
  }

  // Explicit "start / launch / create": start the campaign flow.
  const wantsCreate = hasAny(tokens, ["create","start","launch","new","run","make","setup","build","begin"]);
  const requestedType = inferCampaignType(tokens) || state.campaignType;
  if (wantsCreate && (hasAny(tokens, ["campaign","ad","advert","setup"]) || state.goal)) {
    if (!ctx.walletActivated) {
      return {
        text: "Activate your wallet first (minimum $10), then I'll set up the campaign with you.",
        navigateTo: "/wallet",
        autoNavigate: true,
      };
    }
    const type = requestedType;
    if (type && !isCampaignTypeAllowed(type, ctx)) return campaignTypeMismatchReply(type, ctx);
      return {
        text: state.goal
          ? `I can build the campaign for ${state.goal}.`
          : `I can set up your campaign here.`,
      action: "start_campaign_flow",
      campaignType: type || getAllowedCampaignType(ctx) || null,
      stateUpdates: { lastIntent: "start_campaign" },
    };
  }

  // Score all knowledge intents.
  let best: { score: number; rule: IntentRule | null } = { score: 0, rule: null };
  for (const rule of INTENT_RULES) {
    const s = scoreIntent(rule, tokens, raw.toLowerCase());
    if (s > best.score) best = { score: s, rule };
  }

  if (best.rule && best.score >= 3 && best.rule.topic) {
    const reply = answerTopic(best.rule.topic, state, ctx);
    return { ...reply, stateUpdates: { ...reply.stateUpdates, lastIntent: best.rule.id } };
  }

  // Greeting / thanks fallbacks.
  if (hasAny(tokens, ["hi","hello","hey","yo","howdy"])) {
    return {
      text: state.goal
        ? `Hey! Still on ${state.goal}? Ask me anything or say "start" to launch.`
        : `Hey${ctx.userName ? " " + ctx.userName.split(/[\s@]/)[0] : ""}! What are you trying to achieve today?`,
      suggestions: state.goal
        ? [`How is ${state.goal} tracked?`, `How much for ${state.goal}?`, "Start setup"]
        : ["Get more customers", "Grow app installs", "Promote my music"],
    };
  }
  if (hasAny(tokens, ["thank","thanks","appreciate"])) {
    return { text: "Anytime. I'm here." };
  }
  if (hasAny(tokens, ["support","human","agent","contact"])) {
    return { text: "Ask me first. I usually can help. If you still need a human, email support@karbali.com." };
  }

  // Context-aware fallback: never dump a generic menu when we know the goal.
  if (state.goal) {
    return {
      text: `I want to keep this useful for ${state.goal}. Tell me what you want to know: cost, tracking, setup, minimum balance, or launch.`,
      suggestions: [`How much for ${state.goal}?`, `How is ${state.goal} tracked?`, `Start ${state.goal} campaign`],
    };
  }

  return {
    text: "I can help with Karbali campaigns, wallet, websites, tracking, billing, and approvals. What are you trying to do?",
    suggestions: ["What is Karbali?", "Types of campaigns", "How does tracking work?", "Activate wallet"],
  };
}
