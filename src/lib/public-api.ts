// First-party public API helper.
//
// On production hosts the Vercel rewrite layer exposes `/api/site`, so no
// provider hostname, table name or SDK signature shows up in DevTools.
// Everywhere else (preview, local dev) we fall back to the function origin
// so behaviour is identical.

const ORIGIN_URL = "https://dvkoafztquswcqniwcyf.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";

const PROXY_HOSTS = new Set(["advertiser.karbali.com", "www.karbali.com", "karbali.com"]);

const isProxied = typeof window !== "undefined" && PROXY_HOSTS.has(window.location.hostname);

const SITE_ENDPOINT = isProxied ? "/api/site" : `${ORIGIN_URL}/functions/v1/site-bootstrap`;

const headers: Record<string, string> = isProxied
  ? { "Content-Type": "application/json" }
  : { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

export interface SiteBootstrap {
  content: Array<{
    section_key: string;
    title: string | null;
    subtitle: string | null;
    content: string | null;
    is_visible: boolean;
  }>;
  design: string;
  metrics: { advertisers: number; campaigns: number; events: number };
}

export async function fetchSiteBootstrap(): Promise<SiteBootstrap> {
  const res = await fetch(SITE_ENDPOINT, { headers });
  if (!res.ok) throw new Error("bootstrap_failed");
  return res.json();
}

export async function submitContactMessage(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<string | null> {
  const res = await fetch(SITE_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("contact_failed");
  const data = await res.json();
  return data?.id ?? null;
}
