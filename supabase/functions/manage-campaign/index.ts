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

      const placementFee = totalCost <= 500 ? 5 : 10;
      const grandTotal = totalCost + placementFee;

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

      if (Number(wallet.balance) < grandTotal) {
        return jsonResponse({
          error: `Insufficient balance. Need $${grandTotal.toFixed(2)} ($${totalCost.toFixed(2)} campaign cost + $${placementFee.toFixed(2)} placement fee), have $${Number(wallet.balance).toFixed(2)}.`,
        }, 402);
      }

      // Atomic: deduct wallet → fund escrow + placement fee
      const newBalance = Number(wallet.balance) - grandTotal;
      const { error: walletErr } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);
      if (walletErr) throw walletErr;

      // Record wallet transactions (escrow and non-refundable placement fee)
      const { error: txErr } = await supabase
        .from("wallet_transactions")
        .insert([
          {
            wallet_id: wallet.id,
            amount: totalCost,
            type: "escrow",
            status: "completed",
            description: `Campaign escrow: ${campaign.name}`,
          },
          {
            wallet_id: wallet.id,
            amount: placementFee,
            type: "placement_fee",
            status: "completed",
            description: `Placement fee: ${campaign.name}`,
          },
        ]);
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
        .select("advertiser_id, website_id, app_link")
        .eq("id", campaign_id)
        .maybeSingle();

      if (!campaign || (!isAdmin && campaign.advertiser_id !== user.id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const normalize = (value?: string | null) => {
        const raw = String(value || "").trim();
        if (!raw) return null;
        return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
      };

      const { data: sources } = await supabase
        .from("campaign_sources")
        .select("url")
        .eq("campaign_id", campaign_id)
        .limit(1);

      let redirect_url = normalize(sources?.[0]?.url);

      if (!redirect_url && campaign.website_id) {
        const { data: site } = await supabase
          .from("advertiser_websites")
          .select("domain")
          .eq("id", campaign.website_id)
          .maybeSingle();
        redirect_url = normalize(site?.domain);
      }

      if (!redirect_url) redirect_url = normalize(campaign.app_link);

      if (!redirect_url) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("website")
          .eq("id", campaign.advertiser_id)
          .maybeSingle();
        redirect_url = normalize(profile?.website);
      }

      if (!redirect_url) {
        return jsonResponse({ error: "This campaign has no website or app link yet. Add a destination URL before generating a referral link." }, 400);
      }

      const { error } = await supabase
        .from("referrals")
        .insert({ campaign_id, code, redirect_url });
      if (error) throw error;
      return jsonResponse({ success: true, code, redirect_url });
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

      // ===== Karbali in-house NLP question generator (no external AI) =====
      // Pipeline: clean -> sentence split -> tokenize -> stopword filter ->
      // entity & keyphrase extraction -> template-based yes/no synthesis ->
      // negative-sample synthesis from same corpus -> dedupe & balance.
      const STOPWORDS = new Set([
        "the","a","an","and","or","but","if","then","so","because","while","of","to","in","on","at","for","with","without",
        "is","am","are","was","were","be","been","being","do","does","did","done","have","has","had","i","you","he","she","it",
        "we","they","me","him","her","us","them","my","your","his","its","our","their","this","that","these","those","as",
        "by","from","into","onto","over","under","up","down","out","off","than","too","very","just","also","really","about",
        "not","no","yes","can","could","will","would","should","may","might","must","shall","there","here","what","when","where",
        "why","how","who","whom","which","whose","than","more","less","most","least","much","many","some","any","all","each",
        "every","other","another","such","own","same","new","old","one","two","three","get","got","go","goes","going","said",
        "says","like","want","wanted","make","made","take","took","let","lets",
        "https","http","www","com","org","net","html",
      ]);

      const clean = String(creative.transcription)
        .replace(/\[[^\]]*\]/g, " ") // [Music], [Applause]
        .replace(/\s+/g, " ")
        .trim();

      if (clean.split(/\s+/).filter(Boolean).length < 3) {
        return jsonResponse({
          error: "Transcription is empty or too short to build a quiz. Add a fuller transcription to the creative first, then regenerate.",
        }, 400);
      }

      // Sentence split (handles ., !, ?, newlines)
      const rawSentences = clean
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Keep meaningful sentences only
      const sentences = rawSentences.filter((s) => {
        const w = s.split(/\s+/);
        return w.length >= 4 && w.length <= 30;
      });

      type Token = { raw: string; lower: string };
      const tokenize = (s: string): Token[] =>
        s.replace(/[^A-Za-z0-9'\-\s]/g, " ")
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => ({ raw: t, lower: t.toLowerCase() }));

      // Term frequency across whole transcript for keyword scoring
      const tf = new Map<string, number>();
      tokenize(clean).forEach((t) => {
        if (STOPWORDS.has(t.lower) || t.lower.length < 3 || /\d/.test(t.lower)) return;
        tf.set(t.lower, (tf.get(t.lower) || 0) + 1);
      });

      const isProperNoun = (t: Token, idx: number) =>
        /^[A-Z][a-z'\-]+$/.test(t.raw) && idx > 0; // skip sentence-initial caps

      const isNumber = (t: Token) => /^\d[\d,\.]*$/.test(t.lower);

      // Extract candidate entities/keyphrases per sentence
      const sentenceMeta = sentences.map((sent) => {
        const toks = tokenize(sent);
        const entities: string[] = [];
        const numbers: string[] = [];
        const keywords: string[] = [];
        toks.forEach((t, i) => {
          if (isNumber(t)) numbers.push(t.raw);
          else if (isProperNoun(t, i)) entities.push(t.raw);
          else if (!STOPWORDS.has(t.lower) && t.lower.length >= 4 && !/\d/.test(t.lower)) keywords.push(t.lower);
        });
        // top keyword by global frequency
        keywords.sort((a, b) => (tf.get(b) || 0) - (tf.get(a) || 0));
        return { sent, toks, entities, numbers, keywords: keywords.slice(0, 3) };
      });

      // Global pools for negative-sample swapping
      const allEntities = Array.from(new Set(sentenceMeta.flatMap((m) => m.entities)));
      const allNumbers = Array.from(new Set(sentenceMeta.flatMap((m) => m.numbers)));
      const allKeywords = Array.from(
        new Set(sentenceMeta.flatMap((m) => m.keywords)),
      ).sort((a, b) => (tf.get(b) || 0) - (tf.get(a) || 0));

      const subject = creative.media_type === "music" ? "the song" : "the video";

      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const trimQ = (q: string) =>
        q.replace(/\s+/g, " ").replace(/\?+$/, "").trim() + "?";

      const seen = new Set<string>();
      const out: { question: string; correct_answer: boolean }[] = [];
      const push = (q: string, ans: boolean) => {
        const key = q.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ question: trimQ(cap(q)), correct_answer: ans });
      };

      // ----- TRUE templates from each sentence -----
      for (const m of sentenceMeta) {
        if (out.filter((q) => q.correct_answer).length >= 12) break;
        if (m.entities[0]) {
          push(`Is ${m.entities[0]} mentioned in ${subject}`, true);
        } else if (m.keywords[0]) {
          push(`Does ${subject} talk about ${m.keywords[0]}`, true);
        }
        if (m.numbers[0] && out.filter((q) => q.correct_answer).length < 12) {
          push(`Is the number ${m.numbers[0]} mentioned in ${subject}`, true);
        }
        if (m.keywords[1] && out.filter((q) => q.correct_answer).length < 12) {
          push(`Does ${subject} mention ${m.keywords[1]}`, true);
        }
      }

      // Fallback TRUE from top global keywords
      for (const kw of allKeywords) {
        if (out.filter((q) => q.correct_answer).length >= 12) break;
        push(`Does ${subject} mention ${kw}`, true);
      }

      // ----- FALSE templates: plausible but contradicted by transcript -----
      // We invent surface terms that sound on-topic but never appear in the text.
      const allText = " " + clean.toLowerCase() + " ";
      const containsWord = (w: string) =>
        new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
          allText,
        );

      const decoyTopics = [
        "the weather", "school", "money", "family", "football", "music lessons",
        "cooking", "travel plans", "phones", "shopping", "sleeping", "homework",
        "the market", "driving", "cars", "the office", "exams", "hospital",
        "the church", "the beach",
      ];
      const decoyVerbs = [
        "buy a house", "win a trophy", "change jobs", "move abroad", "open a shop",
        "join a band", "start a business", "sell a phone", "build a website",
      ];

      let falseNeeded = 8;
      // 1) Contradict by claiming an unrelated decoy topic is the focus
      for (const topic of decoyTopics) {
        if (falseNeeded <= 0) break;
        if (!containsWord(topic.split(" ").slice(-1)[0])) {
          push(`Is ${subject} mainly about ${topic}`, false);
          falseNeeded--;
        }
      }
      // 2) Decoy actions clearly absent from transcript
      for (const v of decoyVerbs) {
        if (falseNeeded <= 0) break;
        const last = v.split(" ").slice(-1)[0];
        if (!containsWord(last)) {
          push(`Does ${subject} say someone will ${v}`, false);
          falseNeeded--;
        }
      }
      // 3) Swap entities: ask if a fake-but-plausible name appears
      const fakeNames = ["John Smith", "Mary Jane", "Mr. Adekunle", "Sarah Lee", "David Brown"];
      for (const n of fakeNames) {
        if (falseNeeded <= 0) break;
        if (!allEntities.some((e) => e.toLowerCase() === n.toLowerCase())) {
          push(`Is ${n} mentioned in ${subject}`, false);
          falseNeeded--;
        }
      }
      // 4) Swap numbers: ask about a number not in transcript
      const fakeNumbers = ["100", "250", "999", "1500"];
      for (const n of fakeNumbers) {
        if (falseNeeded <= 0) break;
        if (!allNumbers.includes(n)) {
          push(`Does ${subject} mention the number ${n}`, false);
          falseNeeded--;
        }
      }

      // Balance to exactly 20: trim or pad
      let trues = out.filter((q) => q.correct_answer);
      let falses = out.filter((q) => !q.correct_answer);
      trues = trues.slice(0, 12);
      falses = falses.slice(0, 8);

      // If we are short on trues, pad from keywords
      let kwIdx = 0;
      while (trues.length < 12 && kwIdx < allKeywords.length) {
        const kw = allKeywords[kwIdx++];
        const q = trimQ(cap(`Does ${subject} include the word ${kw}`));
        if (!seen.has(q.toLowerCase())) { seen.add(q.toLowerCase()); trues.push({ question: q, correct_answer: true }); }
      }
      // Still short? Use remaining frequent words from the whole transcript
      for (const [word] of tf) {
        if (trues.length >= 12) break;
        const q = trimQ(cap(`Does ${subject} use the word ${word}`));
        if (!seen.has(q.toLowerCase())) { seen.add(q.toLowerCase()); trues.push({ question: q, correct_answer: true }); }
      }
      // If still short, pad with generic affirmations grounded in the medium
      const truePad = [
        `Does ${subject} have spoken or sung words`,
        `Is ${subject} in English`,
        `Does ${subject} contain a message for the listener`,
        `Is ${subject} meant for an audience`,
        `Does ${subject} have a beginning and an end`,
        `Is ${subject} shorter than one hour`,
        `Does ${subject} include at least one full sentence`,
        `Can ${subject} be played on a phone or computer`,
        `Is ${subject} available to watch or listen to online`,
      ];
      for (const q of truePad) {
        if (trues.length >= 12) break;
        const tq = trimQ(cap(q));
        if (!seen.has(tq.toLowerCase())) { seen.add(tq.toLowerCase()); trues.push({ question: tq, correct_answer: true }); }
      }
      // Pad falses if needed
      const falsePad = [
        `Is ${subject} a silent film with no audio`,
        `Does ${subject} last more than five hours`,
        `Is ${subject} only in sign language`,
        `Does ${subject} contain no words at all`,
        `Is ${subject} a printed newspaper article`,
        `Does ${subject} play backwards from end to start`,
        `Is ${subject} a blank screen with no content`,
      ];
      for (const q of falsePad) {
        if (falses.length >= 8) break;
        const tq = trimQ(cap(q));
        if (!seen.has(tq.toLowerCase())) { seen.add(tq.toLowerCase()); falses.push({ question: tq, correct_answer: false }); }
      }

      const finalQuestions = [...trues, ...falses]
        .slice(0, 20)
        .map((q) => ({ campaign_id, question: q.question, correct_answer: q.correct_answer }));

      if (finalQuestions.length < 20) {
        return jsonResponse({
          error: `Transcript is too short to generate 20 questions (got ${finalQuestions.length}). Please paste a longer/more detailed transcript.`,
        }, 400);
      }

      // Replace existing
      await supabase.from("campaign_questions").delete().eq("campaign_id", campaign_id);
      const { error: qErr } = await supabase.from("campaign_questions").insert(finalQuestions);
      if (qErr) throw qErr;

      return jsonResponse({ success: true, count: finalQuestions.length, engine: "karbali-nlp-v1" });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
