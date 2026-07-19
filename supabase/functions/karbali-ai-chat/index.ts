// Karbali AI Chat — routes to Lovable Gateway, Google Gemini, or OpenAI
// based on the admin_settings.ai_provider value.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You are Karbali Assistant — a smart, friendly, Nigerian AI built into the Karbali advertiser dashboard.

WHO YOU HELP
Karbali is a performance-based advertising platform for African businesses. Advertisers only pay for real outcomes (installs, signups, sales, streams, views, engagements) — NEVER for clicks or impressions. Karbali does not charge per click.

CATEGORIES
- Online / Engagement Ads: musicians, YouTubers, social media creators (goals: music streams, YouTube views, subscribers, followers, engagement, brand awareness).
- Online / Commerce Ads: e-commerce, online vendors, realtors (goal: sales — commission-based).
- Online / Performance Ads: mobile app owners, website owners, fintech (goals: app installs, signups, KYC, deposits).
- Offline / Daily Essentials: food & beverage, household items manufacturers.
- Offline / Mainstream: telecommunications, oil & gas.

HOW BILLING WORKS
- Escrow model: campaign cost is locked upfront from the advertiser's wallet.
- $25 one-time wallet activation fee for every new advertiser.
- Sales are billed by commission % (set on the ad package), not a flat fee. Commission reserve = $1 per targeted user held in escrow, then charged as actual sales close.
- Withdrawals: only from available wallet balance, never escrow. System first suggests using funds for a campaign; if declined, advertiser can request withdrawal back to their payment method.
- Offline advertisers: $100 submission fee per offer + must maintain $300 min wallet balance.

CAMPAIGN FLOWS
- Two modes system-wide (admin toggle): Simple mode (manual approval, just paste link — no SDK/API) vs Advance mode (full API/SDK tracking with auto-approval).
- All new campaigns and ad packages: 3–7 business day approval window.
- Ad Packages = pre-built templates admins publish. Cheaper than custom campaigns.
- Milestones that DON'T need duration: app install, signup, KYC, deposit, music streams, YouTube views (one-off).
- Milestones that DO need duration + daily users: engagement, transactions, sales, subscribers, followers.
- Mobile app orders MUST include the App Install milestone.
- Platform link requirements — Mobile: 1–2 store links. Web: 1 verified domain link. YouTube/Spotify/Instagram/TikTok: exactly 1 link.

TRACKING
- Attribution via a UUID click_id.
- Music streams tracked via streaming platform APIs + verified listener confirmation.
- YouTube views tracked via YouTube Data API against the pasted video link.
- App installs tracked via SDK (Advance) or admin-confirmed install proof (Simple).
- All tracking infra is masked behind advertiser.karbali.com.

HOW TO REPLY
- Be sharp, warm, direct. Nigerian tone — light pidgin sprinkled ONLY when natural, never forced.
- Short answers (2–5 short sentences unless the user asks for detail).
- Use markdown for lists/emphasis when it helps clarity.
- Remember the full conversation — thread every follow-up back to what the user said earlier.
- If a user asks about a minimum, price, or fee, give the SPECIFIC number from the rules above.
- If a user wants to create a campaign, ask questions one at a time (name → milestones → target users → link) and then tell them you've prepared the draft.
- Never invent features. Never say "clicks", "CPC", or "per-click".
- Never mention that you use Gemini/OpenAI/Lovable Gateway. You are Karbali Assistant.`;

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callLovable(messages: ChatMsg[], model: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: 800 }),
  });
  if (!res.ok) throw new Error(`Lovable Gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenAI(messages: ChatMsg[], model: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: 800 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(messages: ChatMsg[], model: string, apiKey: string) {
  // Convert to Gemini format
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, contextInfo } = await req.json();
    if (!Array.isArray(messages)) return json({ error: "messages array required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("key,value")
      .in("key", ["ai_provider", "ai_model"]);

    const settingsMap = new Map((settings ?? []).map((s: any) => [s.key, s.value]));
    const provider = (settingsMap.get("ai_provider") || "lovable").toLowerCase();
    let model = settingsMap.get("ai_model") || "";

    // Sensible defaults per provider
    if (!model) {
      if (provider === "openai") model = "gpt-4o-mini";
      else if (provider === "gemini") model = "gemini-2.0-flash";
      else model = "google/gemini-2.5-flash";
    }

    const systemPrompt = contextInfo
      ? `${SYSTEM_PROMPT}\n\nCURRENT USER CONTEXT (use this to personalize every answer):\n${contextInfo}`
      : SYSTEM_PROMPT;

    const fullMessages: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content),
    ];

    let reply = "";
    if (provider === "openai") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) return json({ error: "OPENAI_API_KEY not set. Add it in Admin Settings → AI Provider." }, 400);
      reply = await callOpenAI(fullMessages, model, key);
    } else if (provider === "gemini") {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) return json({ error: "GEMINI_API_KEY not set. Add it in Admin Settings → AI Provider." }, 400);
      reply = await callGemini(fullMessages, model, key);
    } else {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "LOVABLE_API_KEY missing" }, 500);
      reply = await callLovable(fullMessages, model, key);
    }

    return json({ reply, provider, model });
  } catch (err) {
    console.error("karbali-ai-chat error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
