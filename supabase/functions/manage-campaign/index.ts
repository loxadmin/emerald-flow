import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_CATEGORY_EVENTS = ["download", "signup", "purchase"];
const INTEGRATION_TYPES_REQUIRING_VERIFICATION = new Set(["custom", "wordpress"]);

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function parseCategoryEvents(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) {
      const events = parsed.filter((event): event is string => DEFAULT_CATEGORY_EVENTS.includes(String(event)));
      return events.length > 0 ? events : DEFAULT_CATEGORY_EVENTS;
    }
  } catch {
    return DEFAULT_CATEGORY_EVENTS;
  }

  return DEFAULT_CATEGORY_EVENTS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await req.json();
    const { action, campaign_id, api_key, code, category_id } = body;

    if (action === "get_category_events") {
      if (!category_id) {
        return jsonResponse({ error: "Missing category_id" }, 400);
      }

      const { data: setting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", `category_events:${category_id}`)
        .maybeSingle();

      return jsonResponse({ events: parseCategoryEvents(setting?.value) });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    if (action === "create_api_key") {
      if (!campaign_id || !api_key) {
        return jsonResponse({ error: "Missing campaign_id or api_key" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("advertiser_id")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { error } = await supabase
        .from("api_keys")
        .insert({ campaign_id, key: api_key });
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "submit_campaign") {
      if (!campaign_id) {
        return jsonResponse({ error: "Missing campaign_id" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const normalizedName = String(campaign.name || "").trim().toLowerCase();
      if (
        !normalizedName ||
        normalizedName === "draft campaign" ||
        normalizedName === "draft commerce campaign" ||
        normalizedName === "external referral - draft" ||
        normalizedName.startsWith("external referral - draft")
      ) {
        return jsonResponse({ error: "Campaign name is incomplete" }, 400);
      }

      const isManualMode = String(campaign.campaign_mode || "api").toLowerCase() === "manual";
      const requiresIntegrationVerification =
        !isManualMode &&
        INTEGRATION_TYPES_REQUIRING_VERIFICATION.has(String(campaign.integration_type || "").toLowerCase());

      const isIntegrationVerified = toBoolean(campaign.integration_verified);

      if (requiresIntegrationVerification && !isIntegrationVerified) {
        // Fallback for older/inconsistent drafts where a verified source exists
        // but integration_verified was not persisted correctly.
        const { data: verifiedSource } = await supabase
          .from("campaign_sources")
          .select("id")
          .eq("campaign_id", campaign_id)
          .eq("verified", true)
          .maybeSingle();

        if (!verifiedSource) {
          return jsonResponse({ error: "Verify integration before submitting" }, 400);
        }

        const { error: markVerifiedErr } = await supabase
          .from("campaigns")
          .update({ integration_verified: true })
          .eq("id", campaign_id);
        if (markVerifiedErr) throw markVerifiedErr;
      }

      const totalCost = Number(campaign.total_cost);
      if (totalCost <= 0) {
        return jsonResponse({ error: "Campaign has no cost configured" }, 400);
      }

      // Server-side: enforce admin-set minimum price floors (skip for engagement/external referral)
      const adType = String(campaign.ad_type || "performance").toLowerCase();
      const integration = String(campaign.integration_type || "").toLowerCase();
      if (adType !== "engagement" && integration !== "external_referral") {
        const { data: floorSettings } = await supabase
          .from("admin_settings")
          .select("key, value")
          .in("key", ["min_price_per_download", "min_price_per_signup", "min_price_per_purchase"]);
        const floors: Record<string, number> = {};
        (floorSettings || []).forEach((s: { key: string; value: string }) => {
          floors[s.key] = Number(s.value) || 0;
        });
        const milestones = Array.isArray(campaign.selected_milestones) ? campaign.selected_milestones : [];
        const checkFloor = (event: string, priceField: string, floorKey: string, label: string) => {
          if (!milestones.includes(event)) return null;
          const price = Number((campaign as Record<string, unknown>)[priceField]) || 0;
          const floor = floors[floorKey] || 0;
          if (floor > 0 && price < floor) {
            return `${label} price ($${price.toFixed(2)}) is below the platform minimum of $${floor.toFixed(2)}`;
          }
          return null;
        };
        const floorErr =
          checkFloor("download", "price_download", "min_price_per_download", "Download") ||
          checkFloor("signup", "price_signup", "min_price_per_signup", "Signup") ||
          checkFloor("purchase", "price_purchase", "min_price_per_purchase", "Purchase");
        if (floorErr) {
          return jsonResponse({ error: floorErr }, 400);
        }
      }

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("advertiser_id", campaign.advertiser_id)
        .single();

      if (!wallet) {
        return jsonResponse({ error: "Wallet not found" }, 404);
      }

      if (Number(wallet.balance) < totalCost) {
        return jsonResponse({
          error: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${Number(wallet.balance).toFixed(2)}.`,
        }, 402);
      }

      // Atomic: deduct wallet → fund escrow
      const newBalance = Number(wallet.balance) - totalCost;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);
      if (walletErr) throw walletErr;

      // Record wallet transaction
      const { error: txErr } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: totalCost,
          type: "escrow",
          status: "completed",
          description: `Campaign escrow: ${campaign.name}`,
        });
      if (txErr) throw txErr;

      // Activate campaign escrow (budget_remaining) and set status
      const { error: campErr } = await supabase
        .from("campaigns")
        .update({
          budget_remaining: totalCost,
          status: "pending",
          is_draft: false,
        })
        .eq("id", campaign_id);
      if (campErr) throw campErr;

      return jsonResponse({
        success: true,
        escrow_balance: totalCost,
        wallet_balance: newBalance,
      });
    }

    if (action === "create_referral") {
      if (!campaign_id || !code) {
        return jsonResponse({ error: "Missing campaign_id or code" }, 400);
      }

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("advertiser_id")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { data: sources } = await supabase
        .from("campaign_sources")
        .select("url")
        .eq("campaign_id", campaign_id)
        .limit(1);

      const redirect_url = sources?.[0]?.url || null;

      const { error } = await supabase
        .from("referrals")
        .insert({ campaign_id, code, redirect_url });
      if (error) throw error;
      return jsonResponse({ success: true, code });
    }

    if (action === "generate_questions") {
      if (!campaign_id) return jsonResponse({ error: "Missing campaign_id" }, 400);
      if (!isAdmin) return jsonResponse({ error: "Admin only" }, 403);

      // Get creative campaign transcription
      const { data: creative } = await supabase
        .from("creative_campaigns")
        .select("transcription, media_type")
        .eq("campaign_id", campaign_id)
        .single();

      if (!creative?.transcription) {
        return jsonResponse({ error: "No transcription found" }, 400);
      }

      // Use Lovable AI (NLP) to generate 20 simple yes/no questions from the transcription
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);

      const contentType = creative.media_type === "music" ? "song" : "video";
      const transcript = String(creative.transcription).slice(0, 8000);

      const systemPrompt = `You are an NLP engine that reads a ${contentType} transcript and writes 20 SIMPLE yes/no comprehension questions a casual viewer can answer after watching/listening once. Rules:
- Exactly 20 questions.
- Each must be answerable strictly with Yes or No.
- Mix correct answers: about 12 with answer "yes" (true facts from the transcript) and about 8 with answer "no" (plausible but contradicted by the transcript). Never use absurd or unrelated topics.
- Keep each question under 18 words, plain everyday English, no jargon, no quotes from the transcript longer than 6 words.
- Do not number the questions. Do not add explanations.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Transcript:\n${transcript}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_questions",
              description: "Submit 20 yes/no questions derived from the transcript.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    minItems: 20,
                    maxItems: 20,
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        correct_answer: { type: "boolean" },
                      },
                      required: ["question", "correct_answer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_questions" } },
        }),
      });

      if (!aiRes.ok) {
        const t = await aiRes.text();
        if (aiRes.status === 429) return jsonResponse({ error: "AI rate limit exceeded, try again shortly." }, 429);
        if (aiRes.status === 402) return jsonResponse({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }, 402);
        return jsonResponse({ error: `AI error: ${t}` }, 500);
      }

      const aiJson = await aiRes.json();
      const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { questions: { question: string; correct_answer: boolean }[] } | null = null;
      try { parsed = JSON.parse(toolCall?.function?.arguments || "{}"); } catch { /* noop */ }
      if (!parsed?.questions?.length) return jsonResponse({ error: "AI returned no questions" }, 500);

      const questions = parsed.questions.slice(0, 20).map((q) => ({
        campaign_id,
        question: String(q.question).trim(),
        correct_answer: Boolean(q.correct_answer),
      }));

      // Replace any existing auto-generated set first to keep counts clean
      await supabase.from("campaign_questions").delete().eq("campaign_id", campaign_id);

      const { error: qErr } = await supabase.from("campaign_questions").insert(questions);
      if (qErr) throw qErr;

      return jsonResponse({ success: true, count: questions.length });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
