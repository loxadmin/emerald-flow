import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseDevice(ua: string) {
  const s = ua.toLowerCase();
  let device_type = "desktop";
  if (/ipad|tablet|playbook|silk/.test(s)) device_type = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) device_type = "mobile";
  else if (/bot|crawler|spider|curl|wget|python|deno|node|go-http|postman/.test(s)) device_type = "bot";

  let device_os = "Unknown";
  if (/windows nt 10/.test(s)) device_os = "Windows 10/11";
  else if (/windows/.test(s)) device_os = "Windows";
  else if (/iphone|ipad|ios/.test(s)) device_os = "iOS";
  else if (/mac os x|macintosh/.test(s)) device_os = "macOS";
  else if (/android/.test(s)) device_os = "Android";
  else if (/linux/.test(s)) device_os = "Linux";

  let browser = "Unknown";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "Chrome";
  else if (/firefox\//.test(s)) browser = "Firefox";
  else if (/safari\//.test(s) && !/chrome/.test(s)) browser = "Safari";
  else if (/curl|wget|python|deno|node|go-http/.test(s)) browser = "Script";

  return { device_type, device_os, browser };
}

async function geoLookup(ip: string | null) {
  if (!ip) return { country: null, city: null, region: null };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`,
      { signal: controller.signal },
    );
    clearTimeout(t);
    if (!res.ok) return { country: null, city: null, region: null };
    const j = await res.json();
    if (j?.status !== "success") return { country: null, city: null, region: null };
    return { country: j.country || null, city: j.city || null, region: j.regionName || null };
  } catch {
    return { country: null, city: null, region: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Payloads arrive scrambled from the honeypot page.
    if (typeof body.d === "string") {
      try {
        const MASK_KEY = "k7pQ2xVr9Lm4Zt";
        const b64 = body.d.replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
        const bytes = decodeURIComponent(escape(atob(b64 + pad)));
        let out = "";
        for (let i = 0; i < bytes.length; i++) {
          out += String.fromCharCode(
            bytes.charCodeAt(i) ^ MASK_KEY.charCodeAt(i % MASK_KEY.length),
          );
        }
        body = JSON.parse(out);
      } catch {
        body = {};
      }
    }

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      null;

    const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/admin";
    const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 80) : null;

    const ua = (req.headers.get("user-agent") || "").slice(0, 500);
    const { device_type, device_os, browser } = parseDevice(ua);

    const headerCountry = req.headers.get("cf-ipcountry");
    const geo = await geoLookup(ip);

    await supabase.from("admin_probe_log").insert({
      ip_address: ip,
      user_agent: ua,
      path,
      referer: (req.headers.get("referer") || "").slice(0, 500) || null,
      country: geo.country || headerCountry || null,
      city: geo.city,
      region: geo.region,
      device_type,
      device_os,
      browser,
      device_id: deviceId,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    // Never reveal anything to the prober.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
