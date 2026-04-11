import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You are Karbali AI — a friendly, intelligent browser savings assistant embedded in the Karbali Chrome Extension. Your personality is warm, concise, and value-focused.

CORE IDENTITY:
- You help users maximize their savings within the Karbali ecosystem
- You are NOT a coupon bot or spam tool — you are a personal savings advisor
- You speak naturally, like a helpful friend who knows about deals

CAPABILITIES:
- You understand shopping intent, product comparisons, and purchase decisions
- You can interpret page context (URL, title, product info) sent with messages
- You suggest Karbali partner savings opportunities when relevant
- You help users understand their savings potential

BEHAVIOR RULES:
- Always frame actions around "increasing your Karbali savings"
- Be concise — 2-3 sentences max unless user asks for detail
- If you detect shopping intent, suggest checking Karbali partners
- Never fabricate specific prices, discounts, or partner names you don't know
- If you have offer/partner data in context, reference it specifically
- Be proactive but never pushy
- Use emoji sparingly for warmth (1-2 per message max)

CONTEXT FORMAT:
Messages may include a [PAGE_CONTEXT] block with current page info. Use this to provide relevant suggestions.

EXAMPLE INTERACTIONS:
User: "I want to buy sneakers"
You: "I can help with that! Let me check if any Karbali partners have savings on sneakers for you. Want me to search?"

User: "Is this site trustworthy?"
You: "I can check if this site is a verified Karbali partner. If it is, your purchase could add to your savings balance ✨"

User on checkout page:
You: "Looks like you're about to check out! Let me verify if you're earning Karbali savings on this purchase."`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate user token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const extUrl = Deno.env.get("EXT_USER_SUPABASE_URL");
    const extKey = Deno.env.get("EXT_USER_SUPABASE_SERVICE_KEY");

    if (!extUrl || !extKey) {
      return json({ error: "External user system not configured" }, 500);
    }

    const extSupabase = createClient(extUrl, extKey);
    const { data: userData, error: userError } = await extSupabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const { messages, page_context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: "Missing messages array" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI not configured" }, 500);
    }

    // Enrich the last user message with page context if available
    const enrichedMessages = [...messages];
    if (page_context && enrichedMessages.length > 0) {
      const lastIdx = enrichedMessages.length - 1;
      if (enrichedMessages[lastIdx].role === "user") {
        enrichedMessages[lastIdx] = {
          ...enrichedMessages[lastIdx],
          content: `[PAGE_CONTEXT]\nURL: ${page_context.url || "unknown"}\nTitle: ${page_context.title || "unknown"}\nPage Type: ${page_context.pageType || "unknown"}\nIs Partner: ${page_context.isPartner ? "Yes" : "No"}\nOffer: ${page_context.offer ? JSON.stringify(page_context.offer) : "None"}\n[/PAGE_CONTEXT]\n\n${enrichedMessages[lastIdx].content}`,
        };
      }
    }

    // Also fetch available offers/partners for context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active partner count for context
    const { count: partnerCount } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_draft", false)
      .gt("budget_remaining", 0);

    const contextNote = partnerCount
      ? `\n\nCURRENT KARBALI NETWORK: There are ${partnerCount} active partner campaigns available on the Karbali network.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextNote },
          ...enrichedMessages,
        ],
        stream: false,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json({ error: "AI is busy, please try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return json({ error: "AI service temporarily unavailable." }, 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json({ error: "AI service error" }, 500);
    }

    const aiData = await response.json();
    const reply = aiData.choices?.[0]?.message?.content || "I'm not sure how to help with that. Try asking about savings or shopping!";

    return json({ reply });
  } catch (err) {
    console.error("extension-ai-chat error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
