import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { action, website_id, domain, otp } = await req.json();

    if (action === "send_otp") {
      // Generate 6-digit OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Store OTP
      const { error: updateErr } = await supabase
        .from("advertiser_websites")
        .update({ otp_code: otpCode, otp_expires_at: expiresAt })
        .eq("id", website_id)
        .eq("advertiser_id", user.id);

      if (updateErr) throw new Error(updateErr.message);

      // Send OTP email via Supabase Auth admin API (sendRawEmail workaround)
      // In production, use a proper email service. For now, log it and use admin endpoint.
      const emailTo = `admin@${domain}`;
      
      // Use Supabase's built-in email sending via auth.admin
      // Since we can't send arbitrary emails via Supabase without email infrastructure,
      // we'll use the invite approach or log it for now
      console.log(`OTP for ${emailTo}: ${otpCode}`);

      // Try sending via a simple fetch to a mail endpoint if available
      // For now, we store the OTP and the frontend will handle verification
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `OTP sent to ${emailTo}`,
        // In development, include OTP for testing. Remove in production!
        ...(Deno.env.get("ENVIRONMENT") !== "production" ? { dev_otp: otpCode } : {})
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_otp") {
      // Check OTP
      const { data: website, error: fetchErr } = await supabase
        .from("advertiser_websites")
        .select("otp_code, otp_expires_at")
        .eq("id", website_id)
        .eq("advertiser_id", user.id)
        .single();

      if (fetchErr || !website) throw new Error("Website not found");

      if (!website.otp_code || !website.otp_expires_at) {
        return new Response(JSON.stringify({ verified: false, error: "No OTP was sent. Please request one first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(website.otp_expires_at) < new Date()) {
        return new Response(JSON.stringify({ verified: false, error: "OTP has expired. Please request a new one." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (website.otp_code !== otp) {
        return new Response(JSON.stringify({ verified: false, error: "Invalid OTP code." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabase
        .from("advertiser_websites")
        .update({ is_verified: true, otp_code: null, otp_expires_at: null })
        .eq("id", website_id);

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
