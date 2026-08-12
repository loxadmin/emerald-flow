import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AuthError, requireInternalOrUser } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Karbali Ads <noreply@karbali.com>";
const APP_URL = "https://karbali.com";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing — skipping email to", to);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Resend error", res.status, text);
    return { error: text };
  }
  return await res.json();
}

const wrap = (heading: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string) => `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="font-size:18px;font-weight:bold;color:#10b981;margin-bottom:24px;">Karbali Ads</div>
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${heading}</h1>
    <div style="font-size:14px;color:#475569;line-height:1.6;">${bodyHtml}</div>
    ${ctaUrl ? `<p style="margin:28px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel || "View campaign"}</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Karbali Ads — Performance attribution platform</p>
  </div>
</body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "digest";

    // Only the scheduled digest may run without a caller identity
    if (action !== "digest") await requireInternalOrUser(req);

    // ============ APPROVAL NOTIFICATION ============
    if (action === "approval") {
      const campaignId = body.campaign_id;
      if (!campaignId) return json({ error: "Missing campaign_id" }, 400);

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, name, advertiser_id, target_users, total_cost, approval_notified_at, email_notifications_enabled")
        .eq("id", campaignId)
        .maybeSingle();
      if (!campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.approval_notified_at) return json({ ok: true, skipped: "already_notified" });
      if (campaign.email_notifications_enabled === false) return json({ ok: true, skipped: "disabled" });

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", campaign.advertiser_id)
        .maybeSingle();
      if (!profile?.email) return json({ error: "Advertiser email not found" }, 404);

      const html = wrap(
        "Your campaign is approved 🎉",
        `<p>Hi ${profile.full_name || "there"},</p>
         <p>Good news — <strong>${campaign.name}</strong> has been approved and is now <strong>live</strong>.</p>
         <ul style="padding-left:18px;">
           <li>Target events: <strong>${campaign.target_users}</strong></li>
           <li>Budget: <strong>$${Number(campaign.total_cost || 0).toFixed(2)}</strong></li>
         </ul>
         <p>You can start tracking results in your dashboard now.</p>`,
        `${APP_URL}/campaigns/${campaign.id}`,
        "Open campaign"
      );
      await sendEmail(profile.email, `Campaign approved: ${campaign.name}`, html);

      await supabase
        .from("campaigns")
        .update({ approval_notified_at: new Date().toISOString() })
        .eq("id", campaignId);

      return json({ ok: true });
    }

    // ============ FULFILLMENT / COMPLETION NOTIFICATION ============
    if (action === "fulfilled") {
      const campaignId = body.campaign_id;
      if (!campaignId) return json({ error: "Missing campaign_id" }, 400);

      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, name, advertiser_id, target_users, completed_at, email_notifications_enabled")
        .eq("id", campaignId)
        .maybeSingle();
      if (!campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.email_notifications_enabled === false) return json({ ok: true, skipped: "disabled" });

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", campaign.advertiser_id)
        .maybeSingle();
      if (!profile?.email) return json({ error: "Advertiser email not found" }, 404);

      const html = wrap(
        "Campaign goal reached ✅",
        `<p>Hi ${profile.full_name || "there"},</p>
         <p><strong>${campaign.name}</strong> has reached its target of <strong>${campaign.target_users}</strong> events and has now been <strong>closed</strong> automatically.</p>
         <p>Any remaining escrow has been refunded to your wallet.</p>`,
        `${APP_URL}/campaigns/${campaign.id}`,
        "View results"
      );
      await sendEmail(profile.email, `Campaign completed: ${campaign.name}`, html);
      return json({ ok: true });
    }

    // ============ HOURLY DIGEST (cron) ============
    // For each active campaign with new events since notified_event_count, send a digest
    if (action === "digest") {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name, advertiser_id, target_users, notified_event_count, email_notifications_enabled, status")
        .eq("status", "active")
        .eq("email_notifications_enabled", true);

      const results: any[] = [];
      for (const c of campaigns || []) {
        const { count: totalEvents } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id);

        const total = totalEvents || 0;
        const newCount = total - (c.notified_event_count || 0);
        if (newCount <= 0) continue;

        // Per-type breakdown for new events (last hour window — approximate via total since notified marker)
        const sinceISO = new Date(Date.now() - 65 * 60 * 1000).toISOString();
        const { data: recent } = await supabase
          .from("events")
          .select("event_type, amount")
          .eq("campaign_id", c.id)
          .gte("created_at", sinceISO);

        const breakdown: Record<string, { count: number; revenue: number }> = {};
        let revenue = 0;
        for (const e of recent || []) {
          const t = (e as any).event_type;
          if (!breakdown[t]) breakdown[t] = { count: 0, revenue: 0 };
          breakdown[t].count += 1;
          if (t === "purchase") {
            const amt = Number((e as any).amount || 0);
            breakdown[t].revenue += amt;
            revenue += amt;
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", c.advertiser_id)
          .maybeSingle();
        if (!profile?.email) continue;

        const rowsHtml = Object.entries(breakdown)
          .map(([type, v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-transform:capitalize;">${type}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;"><strong>${v.count}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${type === "purchase" ? "$" + v.revenue.toFixed(2) : "—"}</td></tr>`)
          .join("");

        const html = wrap(
          `${newCount} new event${newCount === 1 ? "" : "s"} on ${c.name}`,
          `<p>Hi ${profile.full_name || "there"},</p>
           <p>Here's what happened on <strong>${c.name}</strong> in the last hour:</p>
           <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
             <thead><tr style="background:#f8fafc;">
               <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0;">Event</th>
               <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">Count</th>
               <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">Revenue</th>
             </tr></thead>
             <tbody>${rowsHtml || `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">${newCount} new event(s) recorded</td></tr>`}</tbody>
           </table>
           <p>Total events so far: <strong>${total}</strong> / ${c.target_users} target</p>`,
          `${APP_URL}/campaigns/${c.id}`,
          "Open dashboard"
        );

        await sendEmail(profile.email, `${newCount} new event${newCount === 1 ? "" : "s"} — ${c.name}`, html);

        await supabase
          .from("campaigns")
          .update({ notified_event_count: total })
          .eq("id", c.id);

        results.push({ campaign_id: c.id, sent: true, new_events: newCount });
      }

      return json({ ok: true, processed: results.length, details: results });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error("send-campaign-notification error", err);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
