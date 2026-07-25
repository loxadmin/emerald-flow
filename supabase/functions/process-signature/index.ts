// Signature background remover.
// Accepts a signed-in user's uploaded PNG/JPEG (base64), strips the near-white
// background to transparent, uploads the transparent PNG to loi-documents/{uid}/signatures/,
// and returns the storage path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { file_base64, mime } = await req.json();
    if (!file_base64) return json({ error: "file_base64 required" }, 400);

    if (mime && !["image/png", "image/jpeg", "image/jpg"].includes(mime)) {
      return json({ error: "Only PNG or JPEG supported. Please export your signature as PNG or JPEG." }, 400);
    }

    // Decode base64
    const b64 = file_base64.includes(",") ? file_base64.split(",")[1] : file_base64;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const img = await Image.decode(bytes);

    // Threshold: any pixel where R,G,B > 235 becomes fully transparent.
    // Darker pixels are kept but darkened to sharpen the ink.
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const rgba = img.getPixelAt(x + 1, y + 1); // imagescript is 1-indexed
        const r = (rgba >> 24) & 0xff;
        const g = (rgba >> 16) & 0xff;
        const b = (rgba >> 8) & 0xff;
        if (r > 235 && g > 235 && b > 235) {
          img.setPixelAt(x + 1, y + 1, 0x00000000);
        } else if (r < 200 || g < 200 || b < 200) {
          // Keep ink; darken slightly for contrast
          img.setPixelAt(x + 1, y + 1, ((r * 0.5) & 0xff) << 24 | ((g * 0.5) & 0xff) << 16 | ((b * 0.5) & 0xff) << 8 | 0xff);
        }
      }
    }

    const png = await img.encode();
    const path = `${user.id}/signatures/${Date.now()}-signature.png`;
    const { error: upErr } = await admin.storage.from("loi-documents").upload(path, png, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ success: true, path });
  } catch (err) {
    console.error("process-signature error", err);
    return json({ error: err instanceof Error ? err.message : "server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
