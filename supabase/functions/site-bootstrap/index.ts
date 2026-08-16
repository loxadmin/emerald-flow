// Public landing bootstrap: one first-party endpoint that returns everything the
// marketing page needs (content blocks, hero design, headline metrics) and accepts
// contact submissions. Keeps table names out of the browser network panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const name = String(body?.name ?? "").trim().slice(0, 120);
      const email = String(body?.email ?? "").trim().slice(0, 200);
      const message = String(body?.message ?? "").trim().slice(0, 4000);
      if (!name || !email || !message || !email.includes("@")) {
        return json({ error: "invalid_input" }, 400);
      }
      const { data, error } = await admin
        .from("contact_messages")
        .insert({ name, email, message })
        .select("id")
        .single();
      if (error) return json({ error: "insert_failed" }, 500);
      return json({ id: data?.id });
    }

    const [contentRes, designRes, adv, camp, ev] = await Promise.all([
      admin.from("site_content").select("section_key, title, subtitle, content, is_visible"),
      admin.from("admin_settings").select("value").eq("key", "landing_design").maybeSingle(),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("campaigns").select("id", { count: "exact", head: true }),
      admin.from("events").select("id", { count: "exact", head: true }),
    ]);

    return new Response(
      JSON.stringify({
        content: contentRes.data ?? [],
        design: typeof designRes.data?.value === "string" ? designRes.data.value : "default",
        metrics: { advertisers: adv.count ?? 0, campaigns: camp.count ?? 0, events: ev.count ?? 0 },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      },
    );
  } catch (_e) {
    return json({ error: "unexpected" }, 500);
  }
});
