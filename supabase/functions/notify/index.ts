// Karbali notification dispatcher — sends templated emails via Resend
// Events: wallet_activated, wallet_funded, campaign_submitted, campaign_rejected,
//         support_message, package_created, package_order_submitted, withdrawal_requested
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Karbali Ads <noreply@karbali.com>";
const APP_URL = "https://karbali.com";
const DEFAULT_ADMIN = "adahosabex@gmail.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const wrap = (heading: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string) => `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="font-size:18px;font-weight:bold;color:#10b981;margin-bottom:24px;">Karbali Ads</div>
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${heading}</h1>
    <div style="font-size:14px;color:#475569;line-height:1.6;">${bodyHtml}</div>
    ${ctaUrl ? `<p style="margin:28px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel || "Open"}</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Karbali Ads — Performance attribution platform</p>
  </div>
</body></html>`;

async function sendEmail(to: string | string[], subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY missing; skipping", subject); return { skipped: true }; }
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject, html }),
  });
  if (!res.ok) { const t = await res.text(); console.error("Resend error", res.status, t); return { error: t }; }
  return await res.json();
}

async function getAdminEmail(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "admin_notification_email").maybeSingle();
  return (data?.value as string) || DEFAULT_ADMIN;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { event, payload = {} } = await req.json();
    const admin = await getAdminEmail(supabase);

    switch (event) {
      case "wallet_activated": {
        const { wallet_id } = payload;
        const { data: w } = await supabase.from("wallets").select("advertiser_id, balance").eq("id", wallet_id).maybeSingle();
        if (!w) return json({ error: "wallet not found" }, 404);
        const { data: p } = await supabase.from("profiles").select("email, full_name").eq("id", w.advertiser_id).maybeSingle();
        if (p?.email) await sendEmail(p.email, "Wallet activated 🎉", wrap("Your Karbali wallet is active",
          `<p>Hi ${p.full_name || "there"},</p><p>Your wallet has been activated. You can now fund it, create campaigns, and buy ad packages.</p>`,
          `${APP_URL}/wallet`, "Open wallet"));
        await sendEmail(admin, "New wallet activated", wrap("Wallet activation", `<p>${p?.email || w.advertiser_id} activated their wallet.</p>`));
        return json({ ok: true });
      }
      case "wallet_funded": {
        const { tx_id } = payload;
        const { data: tx } = await supabase.from("wallet_transactions").select("*, wallets!inner(advertiser_id)").eq("id", tx_id).maybeSingle();
        if (!tx) return json({ error: "tx not found" }, 404);
        const advId = (tx as any).wallets.advertiser_id;
        const { data: p } = await supabase.from("profiles").select("email, full_name").eq("id", advId).maybeSingle();
        if (p?.email) await sendEmail(p.email, `Wallet funded: +$${Number(tx.amount).toFixed(2)}`, wrap("Funds received",
          `<p>Hi ${p.full_name || "there"},</p><p>We just credited <strong>$${Number(tx.amount).toFixed(2)}</strong> to your wallet.</p>`,
          `${APP_URL}/wallet`, "View wallet"));
        return json({ ok: true });
      }
      case "campaign_submitted": {
        const { campaign_id } = payload;
        const { data: c } = await supabase.from("campaigns").select("id, name, advertiser_id, total_cost").eq("id", campaign_id).maybeSingle();
        if (!c) return json({ error: "campaign not found" }, 404);
        const { data: p } = await supabase.from("profiles").select("email").eq("id", c.advertiser_id).maybeSingle();
        await sendEmail(admin, `New campaign for review: ${c.name}`, wrap("Campaign submitted",
          `<p>Advertiser: ${p?.email || c.advertiser_id}</p><p>Campaign: <strong>${c.name}</strong></p><p>Escrow: $${Number(c.total_cost || 0).toFixed(2)}</p>`,
          `${APP_URL}/admin/campaigns/${c.id}`, "Review campaign"));
        return json({ ok: true });
      }
      case "campaign_rejected": {
        const { campaign_id, reason } = payload;
        const { data: c } = await supabase.from("campaigns").select("id, name, advertiser_id").eq("id", campaign_id).maybeSingle();
        if (!c) return json({ error: "campaign not found" }, 404);
        const { data: p } = await supabase.from("profiles").select("email, full_name").eq("id", c.advertiser_id).maybeSingle();
        if (p?.email) await sendEmail(p.email, `Campaign not approved: ${c.name}`, wrap("Campaign needs changes",
          `<p>Hi ${p.full_name || "there"},</p><p>Your campaign <strong>${c.name}</strong> was not approved.</p>${reason ? `<p>Reason: ${reason}</p>` : ""}<p>Escrow has been refunded to your wallet.</p>`,
          `${APP_URL}/campaigns/${c.id}`, "Open campaign"));
        return json({ ok: true });
      }
      case "support_message": {
        const { message_id } = payload;
        const { data: m } = await supabase.from("contact_messages").select("*").eq("id", message_id).maybeSingle();
        if (!m) return json({ error: "message not found" }, 404);
        await sendEmail(admin, `New support message from ${m.name}`, wrap("Support message",
          `<p><strong>${m.name}</strong> &lt;${m.email}&gt;</p><p>${String(m.message).replace(/</g,"&lt;").replace(/\n/g,"<br/>")}</p>`,
          `${APP_URL}/admin/messages`, "Open inbox"));
        return json({ ok: true });
      }
      case "package_created": {
        const { package_id } = payload;
        const { data: pkg } = await supabase.from("ad_packages").select("id, name, advertiser_subtypes, is_active").eq("id", package_id).maybeSingle();
        if (!pkg || !pkg.is_active) return json({ ok: true, skipped: "inactive" });
        const subtypes = (pkg as any).advertiser_subtypes || [];
        if (!Array.isArray(subtypes) || subtypes.length === 0) return json({ ok: true, skipped: "no subtypes" });
        const { data: cats } = await supabase.from("advertiser_categories").select("advertiser_id").in("advertiser_subtype", subtypes);
        const ids = (cats || []).map((c: any) => c.advertiser_id);
        if (ids.length === 0) return json({ ok: true, skipped: "no matching advertisers" });
        const { data: wallets } = await supabase.from("wallets").select("advertiser_id").in("advertiser_id", ids).eq("is_activated", true);
        const activeIds = (wallets || []).map((w: any) => w.advertiser_id);
        if (activeIds.length === 0) return json({ ok: true, skipped: "no activated wallets" });
        const { data: profiles } = await supabase.from("profiles").select("email, full_name").in("id", activeIds);
        const emails = (profiles || []).map((p: any) => p.email).filter(Boolean);
        // Send individually so recipients don't see each other
        for (const email of emails) {
          await sendEmail(email, "You have a new gift package 📦", wrap("A new ad package is live for you",
            `<p>Good news — a new package <strong>${(pkg as any).name}</strong> is now available for your category. Check it out and grab it before it fills up!</p>`,
            `${APP_URL}/packages`, "View packages"));
        }
        return json({ ok: true, sent: emails.length });
      }
      case "package_order_submitted": {
        const { order_id } = payload;
        const { data: o } = await supabase.from("package_orders").select("id, package_name, advertiser_id, total_amount_usd").eq("id", order_id).maybeSingle();
        if (!o) return json({ error: "order not found" }, 404);
        const { data: p } = await supabase.from("profiles").select("email").eq("id", o.advertiser_id).maybeSingle();
        await sendEmail(admin, `New package order: ${o.package_name}`, wrap("Package order for review",
          `<p>Advertiser: ${p?.email || o.advertiser_id}</p><p>Package: <strong>${o.package_name}</strong></p><p>Amount: $${Number(o.total_amount_usd || 0).toFixed(2)}</p>`,
          `${APP_URL}/admin/packages`, "Review order"));
        return json({ ok: true });
      }
      case "withdrawal_requested": {
        const { request_id } = payload;
        const { data: r } = await supabase.from("withdrawal_requests").select("*").eq("id", request_id).maybeSingle();
        if (!r) return json({ error: "request not found" }, 404);
        const { data: p } = await supabase.from("profiles").select("email").eq("id", r.advertiser_id).maybeSingle();
        await sendEmail(admin, `Withdrawal request: $${Number(r.amount_usd).toFixed(2)}`, wrap("Withdrawal requested",
          `<p>Advertiser: ${p?.email || r.advertiser_id}</p><p>Amount: <strong>$${Number(r.amount_usd).toFixed(2)}</strong></p><p>Method: ${r.method}</p>`,
          `${APP_URL}/admin/wallets`, "Open wallets"));
        return json({ ok: true });
      }
      default:
        return json({ error: "unknown event" }, 400);
    }
  } catch (err) {
    console.error("notify error", err);
    return json({ error: err instanceof Error ? err.message : "server error" }, 500);
  }
});
