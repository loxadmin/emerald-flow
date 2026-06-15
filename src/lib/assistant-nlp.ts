// Lightweight inbuilt NLP intent matcher. No external APIs.
// Rule-based: tokenization, stemming-lite, synonym expansion, weighted keyword scoring.

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
  keywords: string[][]; // groups: each inner array = synonyms; intent matches when at least one word from each group present
  any?: string[]; // any of these alone is enough
  handler: (ctx: AssistantContext) => AssistantReply;
};

const STOPWORDS = new Set([
  "the","a","an","is","i","to","my","me","of","for","on","in","at","do","how",
  "can","you","please","kindly","abeg","wetin","wan","go","just","want","need",
  "and","or","with","this","that","be","am","are","it","get","got","make","let","us",
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

// Light Naija flavor — warm, encouraging, no heavy pidgin
const naijaPrefix = () => {
  const opts = ["Sharp!", "Gotcha.", "No wahala.", "Easy one.", "On it.", "Say no more.", ""];
  return opts[Math.floor(Math.random() * opts.length)];
};

const join = (...parts: string[]) => parts.filter(Boolean).join(" ").trim();

const INTENTS: Intent[] = [
  {
    id: "activate_wallet",
    keywords: [["activate","activation","fund","top","add","enable","setup"], ["wallet","account","balance","fund"]],
    any: ["activate"],
    handler: (ctx) => ({
      text: ctx.walletActivated
        ? "Your wallet is already active. ✅ You fit place campaigns now."
        : join(naijaPrefix(), "Taking you to the Wallet page to activate. Minimum is $10."),
      navigateTo: ctx.walletActivated ? "/dashboard" : "/wallet",
    }),
  },
  {
    id: "create_campaign",
    keywords: [["create","start","new","launch","place","run","make","set"], ["campaign","ad","advert","promotion"]],
    any: [],
    handler: (ctx) => {
      if (ctx.walletActivated !== true) {
        return {
          text: "First things first — activate your wallet, then we go launch.",
          navigateTo: "/wallet",
          suggestions: ["Activate my wallet", "How much do I need?"],
        };
      }
      return {
        text: join(naijaPrefix(), "Let's set up a new campaign."),
        navigateTo: "/campaigns/create",
        suggestions: ["Help me fill the form", "What's the budget?"],
      };
    },
  },
  {
    id: "fill_campaign_form",
    keywords: [["fill","help","guide","explain","complete"], ["form","campaign","field"]],
    handler: () => ({
      text: "Quick tips: pick a clear title, your destination URL, daily budget, then target. Ask me about any field.",
      suggestions: ["What's a good budget?", "What's CPA?", "Pick targeting"],
    }),
  },
  {
    id: "wallet_view",
    keywords: [[ "show","check","view","see","balance","my"], ["wallet","balance","fund","money"]],
    handler: () => ({ text: "Opening your wallet now.", navigateTo: "/wallet" }),
  },
  {
    id: "campaigns_view",
    keywords: [["my","show","view","see","list","check"], ["campaign","ad","advert"]],
    handler: () => ({ text: "Here are your campaigns.", navigateTo: "/ads" }),
  },
  {
    id: "category",
    keywords: [["category","industry","niche","type"], []],
    any: ["category","categories","niche"],
    handler: (ctx) => ({
      text: ctx.categoryStatus === "active"
        ? "Your category dey live. ✅"
        : "Your category is still pending activation. We'll notify you sharp-sharp.",
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
    keywords: [["doc","api","integration","sdk","script","track","install"], []],
    any: ["docs","api","sdk","integration","tracking"],
    handler: () => ({ text: "Here's the docs hub.", navigateTo: "/docs" }),
  },
  {
    id: "pricing_budget",
    keywords: [["budget","cost","price","pricing","minimum","fee","how","much"], []],
    any: ["budget","minimum","pricing","cpa","cpc"],
    handler: () => ({
      text: "Minimum wallet funding is $10. For commerce campaigns you need $200+ balance.",
      suggestions: ["Activate wallet", "Create campaign"],
    }),
  },
  {
    id: "support",
    keywords: [["talk","contact","support","human","agent","help"], []],
    any: ["support","human","contact"],
    handler: () => ({
      text: "Drop your question and I go try first. If e pass me, support@karbali.com dey on standby.",
    }),
  },
  {
    id: "greet",
    keywords: [["hi","hello","hey","yo","howdy","greeting","good"], []],
    any: ["hi","hello","hey","yo","howfar","abeg"],
    handler: (ctx) => ({
      text: `Howfar${ctx.userName ? ", " + ctx.userName.split(/[\s@]/)[0] : ""}! What you wan handle today?`,
      suggestions: ["Activate my wallet", "Create campaign", "View my campaigns"],
    }),
  },
  {
    id: "thanks",
    keywords: [["thank","thanks","appreciate","bless"], []],
    any: ["thanks","thank"],
    handler: () => ({ text: "Anytime. I dey here whenever you need me. 🙌" }),
  },
];

export function detectIntent(input: string, ctx: AssistantContext): AssistantReply {
  const tokens = normalize(input);
  if (!tokens.length) {
    return { text: "Talk to me — wetin you wan do?", suggestions: ["Activate wallet", "Create campaign"] };
  }

  let best: { score: number; intent: Intent | null } = { score: 0, intent: null };
  for (const intent of INTENTS) {
    let score = 0;
    if (intent.any?.some((w) => tokens.includes(w.replace(/(ing|ed|s)$/g, "")))) score += 3;
    let groupHits = 0;
    for (const group of intent.keywords) {
      if (group.length === 0) continue;
      if (hasAny(tokens, group)) groupHits++;
    }
    const nonEmpty = intent.keywords.filter((g) => g.length > 0).length;
    if (nonEmpty > 0 && groupHits === nonEmpty) score += 5;
    else if (groupHits > 0) score += groupHits;
    if (score > best.score) best = { score, intent };
  }

  if (!best.intent || best.score < 2) {
    return {
      text: "I no fully catch that. Try one of these:",
      suggestions: ["Activate my wallet", "Create a campaign", "Show my campaigns", "Talk to support"],
    };
  }
  return best.intent.handler(ctx);
}

export function getProactiveGreeting(ctx: AssistantContext): AssistantReply {
  const name = ctx.userName ? ", " + ctx.userName.split(/[\s@]/)[0] : "";
  if (ctx.walletActivated !== true) {
    return {
      text: `Welcome${name}! 👋 Make we activate your wallet first so you fit run campaigns.`,
      suggestions: ["Activate my wallet", "How much do I need?", "Maybe later"],
    };
  }
  if (ctx.categoryStatus !== "active") {
    return {
      text: `Howfar${name}! Your category dey pending. I go ping you once it dey live.`,
      suggestions: ["Check category", "View campaigns"],
    };
  }
  return {
    text: `Welcome back${name}! Ready to launch something today?`,
    suggestions: ["Create a campaign", "View my campaigns", "Open wallet"],
  };
}
