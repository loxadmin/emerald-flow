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
  suggestions?: string[];
};

type Intent = {
  id: string;
  // Each inner array is a synonym group. Intent fires when every non-empty group has at least one hit.
  keywords: string[][];
  // Strong single-word triggers (any one of these alone bumps the score).
  any?: string[];
  handler: (ctx: AssistantContext) => AssistantReply;
};

const STOPWORDS = new Set([
  "the","a","an","is","i","to","my","me","of","for","on","in","at","do",
  "can","you","please","and","or","with","this","that","be","am","are","it",
  "what","whats","tell","about","explain","mean","means","there","here","does",
  "should","would","will","have","has","had","was","were","into","from","by",
  "if","so","as","but","then","also","too","not","no","yes","ok","okay",
]);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => w.replace(/(ing|ed|s)$/g, ""));
}

function hasAny(tokens: string[], group: string[]): boolean {
  const norm = group.map((g) => g.replace(/(ing|ed|s)$/g, ""));
  return tokens.some((t) => norm.includes(t));
}

// Light naija seasoning — sparing, used only sometimes for warmth. Clean English otherwise.
const spice = () => {
  const opts = ["", "", "", "Sharp!", "Oya,", "Got you.", "Cool —", "Alright,"];
  return opts[Math.floor(Math.random() * opts.length)];
};
const join = (...p: string[]) => p.filter(Boolean).join(" ").trim();

const INTENTS: Intent[] = [
  // ===== Platform knowledge =====
  {
    id: "what_is_karbali",
    keywords: [["karbali","platform","system","app","product"], ["what","explain","about","tell","describe"]],
    any: [],
    handler: () => ({
      text: "Karbali is a Nigerian performance ad platform. You fund a wallet, run campaigns (engagement, performance, or commerce), and only pay for real results — clicks, conversions, or sales.",
      suggestions: ["Types of campaigns", "How does billing work?", "How is tracking done?"],
    }),
  },
  {
    id: "campaign_types",
    keywords: [["type","kind","category","option","difference"], ["campaign","ad","advert"]],
    handler: () => ({
      text: "Three campaign types: Engagement (media, quizzes — users earn points), Performance (pay per click or conversion), and Commerce (pay flat fee + commission on sales).",
      suggestions: ["What is Commerce?", "What is Engagement?", "Create a campaign"],
    }),
  },
  {
    id: "engagement_ads",
    keywords: [["engagement","quiz","point","reward","media"], []],
    any: ["engagement","quiz","points","reward"],
    handler: () => ({
      text: "Engagement ads let users interact with media or quizzes and earn points. 1 point equals 0.50 Naira. Great for awareness and lead capture.",
      suggestions: ["Performance ads", "Commerce ads", "Create campaign"],
    }),
  },
  {
    id: "performance_ads",
    keywords: [["performance","cpa","cpc","conversion","click"], []],
    any: ["cpa","cpc","performance"],
    handler: () => ({
      text: "Performance ads charge you per click (CPC) or per conversion (CPA). You set the budget, we track every click with a unique click_id, and only valid actions count.",
      suggestions: ["What is CPA?", "What is CPC?", "Setup tracking"],
    }),
  },
  {
    id: "commerce_ads",
    keywords: [["commerce","shopify","ecommerce","store","shop","sale"], []],
    any: ["commerce","ecommerce","shopify"],
    handler: () => ({
      text: "Commerce ads are for ecommerce stores. Minimum wallet balance is $200. You pay a flat fee plus a small commission only when a sale happens.",
      suggestions: ["How much is the minimum?", "How is tracking done?"],
    }),
  },
  {
    id: "cpa_vs_cpc",
    keywords: [["cpa","cpc","difference"], []],
    any: ["cpa","cpc"],
    handler: () => ({
      text: "CPC = Cost Per Click — you pay each time someone clicks. CPA = Cost Per Action — you pay only when a real action (signup, purchase) happens. CPA costs more per event but is lower risk.",
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
      text: "Fund through Paystack or Flutterwave — card, bank transfer, or your dedicated virtual account. Funds land in your wallet instantly after confirmation.",
      suggestions: ["Open wallet"],
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
      text: "Add your website, then verify via OTP or DNS. Once verified the domain locks — you can't change it later, so confirm before submitting.",
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
      navigateTo: ctx.walletActivated ? "/dashboard" : "/wallet",
    }),
  },
  {
    id: "create_campaign",
    keywords: [["create","start","new","launch","place","run","make"], ["campaign","ad","advert","promotion"]],
    handler: (ctx) => {
      if (ctx.walletActivated !== true) {
        return {
          text: "Activate your wallet first, then we launch. Minimum is $10.",
          navigateTo: "/wallet",
          suggestions: ["Activate my wallet", "How much do I need?"],
        };
      }
      return {
        text: join(spice(), "Let's set up a new campaign."),
        navigateTo: "/campaigns/create",
        suggestions: ["Help me fill the form", "What's a good budget?"],
      };
    },
  },
  {
    id: "fill_campaign_form",
    keywords: [["fill","help","guide","walk"], ["form","campaign","field","step"]],
    handler: () => ({
      text: "Quick rundown: pick a clear title, paste your destination URL, set daily budget, then choose targeting. Ask about any field and I'll explain it.",
      suggestions: ["What's a good budget?", "What is CPA?", "Targeting tips"],
    }),
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
    handler: () => ({ text: "Anytime — I'm right here whenever you need me." }),
  },
  {
    id: "support",
    keywords: [["talk","contact","support","human","agent"], []],
    any: ["support","human"],
    handler: () => ({
      text: "Ask me anything first — I can usually help. If you still need a human, reach support@karbali.com.",
    }),
  },
];

export function detectIntent(input: string, ctx: AssistantContext): AssistantReply {
  const tokens = normalize(input);
  if (!tokens.length) {
    return {
      text: "Ask me anything about Karbali — campaigns, wallet, tracking, fees.",
      suggestions: ["What is Karbali?", "Create a campaign", "How does billing work?"],
    };
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
    return {
      text: "I'm not sure I caught that. Try rephrasing, or pick one below:",
      suggestions: ["What is Karbali?", "Types of campaigns", "How does tracking work?", "Activate wallet"],
    };
  }
  return best.intent.handler(ctx);
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
      text: `Hey${name}! Your category is still pending — I'll ping you once it goes live.`,
      suggestions: ["Check category", "View campaigns"],
    };
  }
  return {
    text: `Welcome back${name}! Ready to launch something today?`,
    suggestions: ["Create a campaign", "View my campaigns", "Open wallet"],
  };
}
