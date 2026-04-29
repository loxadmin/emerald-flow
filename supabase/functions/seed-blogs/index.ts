import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SEED_TOKEN = "dcRDtVQ7IroSx2cq2qght91WuDXdA3DsJOhedRoPkr4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { posts, secret } = await req.json();
    if (secret !== SEED_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    if (!Array.isArray(posts)) {
      return new Response(JSON.stringify({ error: "posts must be array" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const slugs = posts.map((p: any) => p.slug);
    await supabase.from("blogs").delete().in("slug", slugs);
    const { data, error } = await supabase.from("blogs").insert(
      posts.map((p: any) => ({
        title: p.title,
        slug: p.slug,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        excerpt: p.excerpt,
        content: p.content,
        is_published: true,
      }))
    ).select("id, slug");
    if (error) throw error;
    return new Response(JSON.stringify({ inserted: data?.length, slugs: data?.map((d: any) => d.slug) }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
