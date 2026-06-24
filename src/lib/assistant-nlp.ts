import type { AiCampaignType } from "@/lib/ai-campaign-prefill";

// Inbuilt Karbali Assistant NLP. No external APIs.
// Rule-based: tokenization, light stemming, synonym groups, weighted scoring,
// plus a knowledge base so it can actually answer questions about the platform.

export type AssistantContext = {
  walletActivated: boolean | null;
  categoryStatus: string | null;
  advertiserType: string | null;
  businessVerified?: boolean | null;
  pathname: string;
  userName?: string;
};

export type AssistantReply = {
  text: string;
  navigateTo?: string;
  action?: "start_campaign_flow";
  campaignType?: AiCampaignType | null;
  // Only true when the assistant should auto-redirect (payment / account activation).
  // Otherwise navigateTo is exposed as a clickable suggestion the user opts into.
  autoNavigate?: boolean;
  suggestions?: string[];
};

export const CAMPAIGN_TYPE_LABELS: Record<AiCampaignType, string> = {
  performance: "Performance Ads",
  engagement: "Engagement Ads",
  commerce: "Commerce Ads",
};


type Intent = {
  id: string;
  // Each inner array is a synonym group. Intent fires when every non-empty group has at least one hit.
  keywords: string[][];
  // Strong single-word triggers (any one of these alone bumps the score).
  any?: string[];
  handler: (ctx: AssistantContext, input: string, tokens: string[]) => AssistantReply;
};

const STOPWORDS = new Set([
  "the","a","an","is","i","to","my","me","of","for","on","in","at","do",
  "can","you","please","and","or","with","this","that","be","am","are","it",
  "there","here",
  "should","would","will","have","has","had","was","were","into","from","by",
  "if","so","as","but","then","also","too","not","no","yes","ok","okay",
]);

const TYPO_FIXES: Record<string, string> = {
  camaign: "campaign",
  camaigns: "campaign",
  campain: "campaign",
  campains: "campaign",
  engagemnet: "engagement",
  engagmnt: "engagement",
  inteligent: "intelligent",
  isnt: "is not",
  advertis: "advertise",
  advertiz: "advertise",
  ecommerce: "commerce",
  ecom: "commerce",
  shopify: "commerce",
  client: "customer",
  customers: "customer",
  costumer: "customer",
};

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => {
      const stem = w.replace(/(ing|ed|s)$/g, "");
      return TYPO_FIXES[stem] || TYPO_FIXES[w] || stem;
    });
}

function inferCampaignType(tokens: string[]): AiCampaignType | null {
  if (hasAny(tokens, ["commerce", "store", "shop", "sale", "purchase", "woocommerce", "product"])) return "commerce";
  if (hasAny(tokens, ["engagement", "music", "video", "viewer", "views", "subscriber", "listener", "youtube"])) return "engagement";
  if (hasAny(tokens, ["performance", "cpa", "cpc", "conversion", "signup", "download", "lead", "app"])) return "performance";
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
    return { text: `Good. Let's build your ${type} campaign here.`, action: "start_campaign_flow", campaignType: type };
  }
  return {
    text: `Your account is set for ${CAMPAIGN_TYPE_LABELS[allowedType]}. I can only create that campaign type unless your advertiser type is changed.`,
    suggestions: [`Create ${CAMPAIGN_TYPE_LABELS[allowedType]}`, "Change advertiser type", "Why can't I create this?"],
    navigateTo: "/category",
  };
}

function hasAny(tokens: string[], group: string[]): boolean {
  const norm = group.map((g) => g.replace(/(ing|ed|s)$/g, ""));
  return tokens.some((t) => norm.includes(t));
}

// Light naija seasoning, sparing and clean English otherwise.
const spice = () => {
  const opts = ["", "", "", "Sharp!", "Oya,", "Got you.", "Cool.", "Alright,"];
  return opts[Math.floor(Math.random() * opts.length)];
};
const join = (...p: string[]) => p.filter(Boolean).join(" ").trim();

const campaignFlowReply = (ctx: AssistantContext, input: string, tokens: string[]): AssistantReply => {
  const type = inferCampaignType(tokens);
  if (ctx.walletActivated !== true) {
    return {
      text: "Activate your wallet first, then I can set up the campaign with you. Minimum is $10.",
      navigateTo: "/wallet",
      autoNavigate: true,
      suggestions: ["Activate wallet", "How much do I need?"],
    };
  }
  if (!type) {
    const allowedType = getAllowedCampaignType(ctx);
    if (allowedType) {
      return {
        text: `Your profile is ${CAMPAIGN_TYPE_LABELS[allowedType]}, so I'll set up that campaign type for you. What should we call it?`,
        action: "start_campaign_flow",
        campaignType: allowedType,
      };
    }
    return {
      text: "I can set it up in chat. Which campaign type do you want?",
      action: "start_campaign_flow",
      campaignType: null,
      suggestions: ["Performance campaign", "Engagement campaign", "Commerce campaign"],
    };
  }
  if (!isCampaignTypeAllowed(type, ctx)) return campaignTypeMismatchReply(type, ctx);
  return {
    text: `Good. Let's build your ${type} campaign here.`,
    action: "start_campaign_flow",
    campaignType: type,
  };
};

const INTENTS: Intent[] = [
  // ===== Platform knowledge =====
  {
    id: "what_is_karbali",
    keywords: [["karbali","platform","system","app","product"], ["what","explain","about","tell","describe","mean"]],
    any: ["karbali"],
    handler: () => ({
      text: "Karbali helps Nigerian advertisers buy real outcomes, not empty impressions. You fund your wallet, create the right campaign type, track results, and pay only for valid clicks, conversions, engagement, or sales.",
      suggestions: ["Types of campaigns", "How does billing work?", "How is tracking done?"],
    }),
  },
  {
    id: "campaign_types",
    keywords: [["type","kind","category","option","difference","which","choose"], ["campaign","ad","advert"]],
    any: ["types", "options"],
    handler: () => ({
      text: "Three campaign types: Engagement (media and quizzes where users earn points), Performance (pay per click or conversion), and Commerce (flat fee plus commission on sales).",
      suggestions: ["What is Commerce?", "What is Engagement?", "Create a campaign"],
    }),
  },
  {
    id: "engagement_ads",
    keywords: [["engagement","quiz","point","reward","media"], []],
    any: ["engagement","quiz","points","reward"],
    handler: () => ({
      text: "Engagement Ads are for creators and media campaigns. Users watch, listen, subscribe, answer quizzes, or complete approved actions, then earn points while you buy real attention.",
      suggestions: ["Performance ads", "Commerce ads", "Create campaign"],
    }),
  },
  {
    id: "performance_ads",
    keywords: [["performance","cpa","cpc","conversion","click"], []],
    any: ["cpa","cpc","performance"],
    handler: () => ({
      text: "Performance Ads are for apps and websites. You pay for measurable actions like clicks, downloads, signups, or purchases, tracked with Karbali attribution.",
      suggestions: ["What is CPA?", "What is CPC?", "Setup tracking"],
    }),
  },
  {
    id: "commerce_ads",
    keywords: [["commerce","shopify","ecommerce","store","shop","sale"], []],
    any: ["commerce","ecommerce","shopify"],
    handler: () => ({
      text: "Commerce Ads are for stores and vendors. You pay a flat fee plus commission when sales happen, with a $200 minimum wallet balance before launch.",
      suggestions: ["How much is the minimum?", "How is tracking done?"],
    }),
  },
  {
    id: "cpa_vs_cpc",
    keywords: [["cpa","cpc","difference"], []],
    any: ["cpa","cpc"],
    handler: () => ({
      text: "CPC means Cost Per Click: you pay per click. CPA means Cost Per Action: you pay only when a signup, purchase, or other action happens. CPA costs more per event but carries lower risk.",
    }),
  },
  {
    id: "tracking_how",
    keywords: [["track","attribution","conversion","pixel","sdk"], []],
    any: ["tracking","attribution","pixel","sdk"],
    handler: () => ({
      text: "We use a deterministic click_id (UUID). Install the Karbali script or WordPress plugin on your site, fire a conversion event, and we attribute the sale back to the right campaign.",
      suggestions: ["Open docs", "Verify my integration"],
    }),
  },
  {
    id: "ad_fraud",
    keywords: [["fraud","fake","bot","invalid"], []],
    any: ["fraud"],
    handler: () => ({
      text: "Karbali filters bot traffic, duplicate clicks, and suspicious patterns before billing. You only pay for clean, attributable activity.",
    }),
  },
  {
    id: "minimum_funding",
    keywords: [["minimum","least","start","fund","activation"], ["wallet","balance","fund","amount","money"]],
    any: ["minimum"],
    handler: () => ({
      text: "Minimum wallet activation is $10. For Commerce campaigns you need at least $200 balance. Partnership accounts need a $50 fee and $200 minimum.",
      suggestions: ["Activate my wallet", "Fund wallet"],
    }),
  },
  {
    id: "payment_methods",
    keywords: [["pay","payment","fund","topup","deposit"], ["method","option","how","gateway"]],
    any: ["paystack","flutterwave"],
    handler: () => ({
      text: "Fund through Paystack or Flutterwave using card, bank transfer, or your dedicated virtual account. Funds land in your wallet after confirmation.",
      suggestions: ["Open wallet"],
    }),
  },
  {
    id: "billing_how",
    keywords: [["billing","cost","charge","escrow","deduct","pay"], ["work","how","explain"]],
    any: ["billing", "escrow", "deduct"],
    handler: () => ({
      text: "Karbali uses escrow. When you submit a campaign, the cost is held from your wallet first. Spend is released only as valid campaign results happen.",
      suggestions: ["Minimum funding", "Create a campaign", "Open wallet"],
    }),
  },
  {
    id: "campaign_process",
    keywords: [["process","steps","flow","how"], ["campaign","ad","launch","approve"]],
    handler: () => ({
      text: "Campaign flow is simple: activate wallet, add/verify website, choose campaign type, set goals, install tracking if needed, submit for review, then admin approval.",
      suggestions: ["Create a campaign", "Setup tracking", "Add website"],
    }),
  },
  {
    id: "customer_acquisition",
    keywords: [["get","bring","find","acquire","gain"], ["customer","client","buyer","sales","users","traffic"]],
    handler: () => ({
      text: "For ecommerce, start with Commerce ads if you want sales, or Performance ads if you want signups/leads first. Karbali tracks results so you avoid paying for empty exposure.",
      suggestions: ["Create commerce campaign", "Create performance campaign", "CPA vs CPC"],
    }),
  },
  {
    id: "verify_business",
    keywords: [["verify","verification","approve","kyc","business"], []],
    any: ["verification","kyc"],
    handler: () => ({
      text: "Business verification confirms your brand details and unlocks higher limits. Submit your documents on the Verification page and we review within 24–48 hours.",
      navigateTo: "/verification",
    }),
  },
  {
    id: "website_verify",
    keywords: [["verify","add","connect"], ["website","domain","site"]],
    handler: () => ({
      text: "Add your website, then verify via OTP or DNS. Once verified the domain locks, so confirm it before submitting.",
      navigateTo: "/websites",
    }),
  },

  // ===== Navigation intents =====
  {
    id: "activate_wallet",
    keywords: [["activate","enable","setup","start"], ["wallet","account"]],
    any: ["activate"],
    handler: (ctx) => ({
      text: ctx.walletActivated
        ? "Your wallet is already active. You can place campaigns now."
        : join(spice(), "Taking you to the Wallet page to activate. Minimum is $10."),
      navigateTo: ctx.walletActivated ? undefined : "/wallet",
      autoNavigate: ctx.walletActivated ? false : true,
    }),
  },
  {
    id: "fund_wallet",
    keywords: [["fund","topup","top","deposit","add"], ["wallet","balance","money","fund"]],
    any: ["fund","topup","deposit"],
    handler: () => ({
      text: join(spice(), "Opening the wallet so you can fund via Paystack or Flutterwave."),
      navigateTo: "/wallet",
      autoNavigate: true,
    }),
  },

  {
    id: "create_campaign",
    keywords: [["create","start","new","launch","place","run","make","setup","build"], ["campaign","ad","advert","promotion"]],
    handler: campaignFlowReply,
  },
  {
    id: "fill_campaign_form",
    keywords: [["fill","help","guide","walk","complete","assist"], ["form","campaign","field","step"]],
    handler: campaignFlowReply,
  },
  {
    id: "wallet_view",
    keywords: [["show","check","view","see","open","my"], ["wallet","balance","fund","money"]],
    any: ["balance","wallet"],
    handler: () => ({ text: "Opening your wallet.", navigateTo: "/wallet" }),
  },
  {
    id: "campaigns_view",
    keywords: [["my","show","view","see","list","check","open"], ["campaign","ad","advert"]],
    handler: () => ({ text: "Here are your campaigns.", navigateTo: "/ads" }),
  },
  {
    id: "category",
    keywords: [["category","industry","niche"], []],
    any: ["category","categories","niche"],
    handler: (ctx) => ({
      text: ctx.categoryStatus === "active"
        ? "Your category is live and active."
        : "Your category is still pending. We'll notify you once it's approved.",
      navigateTo: "/category",
    }),
  },
  {
    id: "websites",
    keywords: [["website","site","domain","url"], []],
    any: ["website","websites","domain","domains"],
    handler: () => ({ text: "Opening Websites.", navigateTo: "/websites" }),
  },
  {
    id: "docs",
    keywords: [["doc","documentation","guide","manual"], []],
    any: ["docs","documentation"],
    handler: () => ({ text: "Here's the documentation hub.", navigateTo: "/docs" }),
  },
  {
    id: "integration",
    keywords: [["install","integrate","script","plugin","wordpress","setup"], ["track","conversion","site"]],
    any: ["integration"],
    handler: () => ({
      text: "Two options: drop our JS snippet on your site, or use the WordPress plugin. Both fire the conversion event automatically.",
      navigateTo: "/docs",
    }),
  },

  // ===== Conversational =====
  {
    id: "greet",
    keywords: [["hi","hello","hey","yo","howdy","greeting","good","morning","evening","afternoon"], []],
    any: ["hi","hello","hey","yo"],
    handler: (ctx) => ({
      text: `Hey${ctx.userName ? " " + ctx.userName.split(/[\s@]/)[0] : ""}! What can I help you with today?`,
      suggestions: ["What is Karbali?", "Create a campaign", "Activate my wallet"],
    }),
  },
  {
    id: "thanks",
    keywords: [["thank","appreciate","bless","grateful"], []],
    any: ["thanks","thank"],
    handler: () => ({ text: "Anytime. I'm right here whenever you need me." }),
  },
  {
    id: "support",
    keywords: [["talk","contact","support","human","agent"], []],
    any: ["support","human"],
    handler: () => ({
      text: "Ask me anything first. I can usually help. If you still need a human, reach support@karbali.com.",
    }),
  },
];

export function detectIntent(input: string, ctx: AssistantContext): AssistantReply {
  const tokens = normalize(input);
  if (!tokens.length) {
    return {
      text: "Ask me anything about Karbali: campaigns, wallet, tracking, fees.",
      suggestions: ["What is Karbali?", "Create a campaign", "How does billing work?"],
    };
  }

  if (tokens.includes("karbali") && hasAny(tokens, ["what", "about", "explain", "mean", "platform", "system", "all"])) {
    return INTENTS.find((intent) => intent.id === "what_is_karbali")!.handler(ctx, input, tokens);
  }

  const requestedCampaignType = inferCampaignType(tokens);
  if (requestedCampaignType && hasAny(tokens, ["create", "start", "new", "launch", "place", "run", "make", "setup", "build", "campaign", "ad", "advert"])) {
    const mismatch = campaignTypeMismatchReply(requestedCampaignType, ctx);
    if (mismatch.campaignType !== requestedCampaignType) return mismatch;
  }

  let best: { score: number; intent: Intent | null } = { score: 0, intent: null };
  for (const intent of INTENTS) {
    let score = 0;
    if (intent.any?.some((w) => tokens.includes(w.replace(/(ing|ed|s)$/g, "")))) score += 3;
    let groupHits = 0;
    const nonEmpty = intent.keywords.filter((g) => g.length > 0);
    for (const group of nonEmpty) if (hasAny(tokens, group)) groupHits++;
    if (nonEmpty.length > 0 && groupHits === nonEmpty.length) score += 5;
    else if (groupHits > 0) score += groupHits;
    if (score > best.score) best = { score, intent };
  }

  if (!best.intent || best.score < 2) {
    if (hasAny(tokens, ["campaign", "ad", "advert", "form", "launch", "setup"])) {
      return campaignFlowReply(ctx, input, tokens);
    }
    if (hasAny(tokens, ["wallet", "fund", "pay", "activate", "balance"])) {
      return {
        text: "Wallet first, campaign next. Activate with at least $10, then fund based on the campaign cost.",
        suggestions: ["Activate wallet", "Fund wallet", "Minimum funding"],
      };
    }
    return {
      text: "I can help with Karbali campaigns, wallet, websites, tracking, billing, and approvals. Pick one and I will guide you.",
      suggestions: ["What is Karbali?", "Types of campaigns", "How does tracking work?", "Activate wallet"],
    };
  }
  return best.intent.handler(ctx, input, tokens);
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
      text: `Welcome back${name}! Your profile is ${CAMPAIGN_TYPE_LABELS[allowedType]}. I can help you create that campaign or answer Karbali questions.`,
      suggestions: [`Create ${CAMPAIGN_TYPE_LABELS[allowedType]}`, "What is Karbali?", "Open wallet"],
    };
  }
  return {
    text: `Welcome back${name}! Ready to launch something today?`,
    suggestions: ["Create a campaign", "View my campaigns", "Open wallet"],
  };
}
