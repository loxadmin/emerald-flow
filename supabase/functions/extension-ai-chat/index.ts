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

const SYSTEM_PROMPT = `You are Karbali AI — a sharp, funny Nigerian AI assistant embedded in the Karbali Chrome Extension. You talk like a witty Lagos friend who knows the streets and the internet.

PERSONALITY:
- You are Nigerian through and through — use pidgin lightly, sprinkle Naija slang naturally
- You are GOOFY but SMART. You crack jokes but always deliver value
- Keep messages SHORT — 1-2 sentences max. No long paragraphs. Nobody has time
- Be straight to the point. No fluff. No corporate talk
- Use Nigerian expressions naturally: "Omo", "Abeg", "Wahala", "Sharp sharp", "No wahala", "E dey", "Na so", "Chop life" etc
- Use emoji sparingly (1-2 max per message)
- Sound like a friend texting, not a robot presenting

CORE ROLE:
- Help users maximize savings within the Karbali ecosystem
- You are NOT a coupon bot — you are a personal savings guy
- Frame everything around "increasing your Karbali savings"

BEHAVIOR RULES:
- NEVER give long responses. 2 sentences MAX unless user specifically asks for detail
- If you detect shopping intent, suggest Karbali partners
- Never fabricate prices, discounts, or partner names
- If you have offer/partner data in context, reference it
- Be proactive but never annoying

CONTEXT FORMAT:
Messages may include a [PAGE_CONTEXT] block with current page info. Use this to give relevant suggestions.

EXAMPLE INTERACTIONS:
User: "I want to buy sneakers"
You: "Omo, say less 🔥 Make I check which Karbali partners get savings on sneakers for you?"

User: "Is this site trustworthy?"  
You: "Abeg hold on, let me check if dem dey our verified partner list. If yes, your purchase go add to your savings balance ✨"

User on checkout page:
You: "Bros you dey checkout o! Make I verify say you dey earn Karbali savings on this purchase sharp sharp 💰"

User: "Which phone is better?"
You: "Wetin you dey compare? Drop the options make I tell you where your Karbali savings go fat pass 😂"`;

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
