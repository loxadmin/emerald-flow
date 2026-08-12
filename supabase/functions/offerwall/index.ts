import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enforceRateLimit, RateLimits } from "../_shared/rate-limit.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Abuse protection for this public endpoint. Fails open if the limiter is down.
  const limited = await enforceRateLimit(req, "offerwall", RateLimits.publicRead);
  if (limited) return limited;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // GET ACTIVE OFFERWALL ADS
    if (action === "get_ads") {
      const { ad_type, limit = 20 } = body;

      let query = supabase
        .from("campaigns")
        .select("id, name, ad_type, budget_remaining, selected_milestones, price_download, price_signup, price_purchase")
        .eq("status", "active")
        .eq("is_draft", false)
        .gt("budget_remaining", 0)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (ad_type) {
        query = query.eq("ad_type", ad_type);
      }

      const { data: campaigns, error } = await query;
      if (error) throw error;

      // For engagement campaigns, also fetch creative data and referral links
      const campaignIds = (campaigns || []).map((c: any) => c.id);

      const [{ data: creatives }, { data: referrals }, { data: questions }] = await Promise.all([
        supabase.from("creative_campaigns").select("campaign_id, media_type, media_link, transcription").in("campaign_id", campaignIds),
        supabase.from("referrals").select("campaign_id, code, redirect_url, id").in("campaign_id", campaignIds),
        supabase.from("campaign_questions").select("id, campaign_id, question, correct_answer").in("campaign_id", campaignIds),
      ]);

      const creativesMap = new Map<string, any>();
      (creatives || []).forEach((c: any) => creativesMap.set(c.campaign_id, c));

      const referralsMap = new Map<string, any>();
      (referrals || []).forEach((r: any) => {
        if (!referralsMap.has(r.campaign_id)) referralsMap.set(r.campaign_id, r);
      });

      const questionsMap = new Map<string, any[]>();
      (questions || []).forEach((q: any) => {
        if (!questionsMap.has(q.campaign_id)) questionsMap.set(q.campaign_id, []);
        questionsMap.get(q.campaign_id)!.push(q);
      });

      const ads = (campaigns || []).map((c: any) => ({
        campaign_id: c.id,
        name: c.name,
        ad_type: c.ad_type,
        milestones: c.selected_milestones,
        creative: creativesMap.get(c.id) || null,
        referral: referralsMap.get(c.id) || null,
        questions: questionsMap.get(c.id) || [],
      }));

      return jsonResponse({ ads });
    }

    // ANSWER A QUESTION (engagement ads)
    if (action === "answer_question") {
      const { campaign_id, question_id, external_user_id, answer } = body;

      if (!campaign_id || !question_id || !external_user_id || answer === undefined) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      // Check if user already maxed out attempts (2 max)
      const { data: existing } = await supabase
        .from("offerwall_interactions")
        .select("id, attempt_number, is_correct")
        .eq("campaign_id", campaign_id)
        .eq("external_user_id", external_user_id)
        .order("attempt_number", { ascending: false });

      const attempts = existing || [];
      const hasCorrect = attempts.some((a: any) => a.is_correct);
      if (hasCorrect) {
        return jsonResponse({ error: "Already answered correctly" }, 409);
      }
      if (attempts.length >= 2) {
        return jsonResponse({ error: "Maximum attempts reached. No more tries." }, 403);
      }

      // Get the question
      const { data: question } = await supabase
        .from("campaign_questions")
        .select("correct_answer")
        .eq("id", question_id)
        .single();

      if (!question) {
        return jsonResponse({ error: "Question not found" }, 404);
      }

      const isCorrect = Boolean(answer) === question.correct_answer;
      const attemptNumber = attempts.length + 1;

      // Get campaign for billing
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("budget_remaining, ad_type, advertiser_id")
        .eq("id", campaign_id)
        .single();

      if (!campaign) return jsonResponse({ error: "Campaign not found" }, 404);

      // Get rate from creative_campaigns
      const { data: creative } = await supabase
        .from("creative_campaigns")
        .select("rate_per_interaction, media_type")
        .eq("campaign_id", campaign_id)
        .single();

      const rate = creative?.rate_per_interaction || 0.20;
      const chargeAmount = rate;

      // Check budget
      if (Number(campaign.budget_remaining) < chargeAmount) {
        await supabase.from("campaigns").update({ status: "rejected" }).eq("id", campaign_id);
        return jsonResponse({ error: "Campaign budget exhausted" }, 402);
      }

      // Points: if correct, user earns equivalent in naira (0.50 per point)
      // Rate is in USD, convert conceptually: user gets rate equivalent
      const pointsEarned = isCorrect ? 1 : 0;

      // Record interaction
      await supabase.from("offerwall_interactions").insert({
        campaign_id,
        question_id,
        external_user_id,
        is_correct: isCorrect,
        attempt_number: attemptNumber,
        points_earned: pointsEarned,
        charge_amount: chargeAmount,
      });

      // Always charge the advertiser (regardless of answer correctness)
      const newBudget = Number(campaign.budget_remaining) - chargeAmount;
      const updateData: Record<string, unknown> = { budget_remaining: newBudget };
      if (newBudget <= 0) updateData.status = "rejected";
      await supabase.from("campaigns").update(updateData).eq("id", campaign_id);

      // Record transaction
      await supabase.from("transactions").insert({
        campaign_id,
        amount: chargeAmount,
        description: `Engagement ${isCorrect ? "verified" : "failed"} interaction (attempt ${attemptNumber})`,
      });

      return jsonResponse({
        correct: isCorrect,
        attempt: attemptNumber,
        points_earned: pointsEarned,
        can_retry: !isCorrect && attemptNumber < 2,
        message: isCorrect
          ? "Correct! You earned points."
          : attemptNumber < 2
          ? "Incorrect. You have 1 more try."
          : "Incorrect. No more tries available.",
      });
    }

    // GET PUBLISHER INTEGRATION SCRIPT
    if (action === "get_publisher_script") {
      const baseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      const script = `
<!-- Karbali Offerwall Widget -->
<div id="karbali-offerwall"></div>
<script>
(function() {
  var API_URL = "${baseUrl}/functions/v1/offerwall";
  var ANON_KEY = "${anonKey}";
  var container = document.getElementById("karbali-offerwall");

  function getClientId() {
    var id = localStorage.getItem("karbali_ow_client");
    if (!id) { id = "ow_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("karbali_ow_client", id); }
    return id;
  }

  async function loadAds(adType) {
    var res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify({ action: "get_ads", ad_type: adType || null })
    });
    var data = await res.json();
    renderAds(data.ads || []);
  }

  function renderAds(ads) {
    container.innerHTML = "";
    if (ads.length === 0) { container.innerHTML = "<p>No ads available</p>"; return; }
    ads.forEach(function(ad) {
      var card = document.createElement("div");
      card.style.cssText = "border:1px solid #ddd;border-radius:12px;padding:16px;margin:8px 0;background:#fff;";
      var title = document.createElement("h3");
      title.textContent = ad.name;
      title.style.cssText = "margin:0 0 8px;font-size:16px;";
      card.appendChild(title);

      if (ad.creative) {
        var link = document.createElement("a");
        link.href = ad.creative.media_link;
        link.target = "_blank";
        link.textContent = ad.creative.media_type === "music" ? "🎵 Listen Now" : "🎬 Watch Now";
        link.style.cssText = "display:inline-block;padding:8px 16px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;margin-bottom:8px;";
        card.appendChild(link);
      }

      if (ad.referral) {
        var refLink = document.createElement("a");
        refLink.href = ad.referral.redirect_url || "#";
        refLink.target = "_blank";
        refLink.textContent = "Visit →";
        refLink.style.cssText = "display:inline-block;padding:8px 16px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;margin:4px;";
        card.appendChild(refLink);
      }

      if (ad.questions && ad.questions.length > 0) {
        var q = ad.questions[Math.floor(Math.random() * ad.questions.length)];
        var qDiv = document.createElement("div");
        qDiv.style.cssText = "margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;";
        qDiv.innerHTML = "<p style='font-size:14px;margin:0 0 8px;'>" + q.question + "</p>";
        ["Yes", "No"].forEach(function(ans) {
          var btn = document.createElement("button");
          btn.textContent = ans;
          btn.style.cssText = "padding:6px 16px;margin:4px;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#fff;";
          btn.onclick = async function() {
            var answer = ans === "Yes";
            var res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
              body: JSON.stringify({ action: "answer_question", campaign_id: ad.campaign_id, question_id: q.id, external_user_id: getClientId(), answer: answer })
            });
            var result = await res.json();
            qDiv.innerHTML = "<p style='font-size:14px;'>" + (result.message || result.error || "Done") + "</p>";
          };
          qDiv.appendChild(btn);
        });
        card.appendChild(qDiv);
      }

      container.appendChild(card);
    });
  }

  loadAds();
})();
</script>`;

      return jsonResponse({ script });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
