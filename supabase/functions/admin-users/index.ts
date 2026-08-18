import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Not authorized" }, 200);

    const anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await anonClient.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) return json({ error: "Not authorized" }, 200);

    const { data: superRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!superRole) return json({ error: "Super admin access required" }, 200);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin
          .from("profiles")
          .select("id, email, full_name, company_name, is_blocked, created_at, deleted_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        admin.from("user_roles").select("user_id, role").limit(5000),
      ]);


      const roleMap: Record<string, string[]> = {};
      for (const r of roles || []) {
        (roleMap[r.user_id] ||= []).push(r.role as string);
      }

      const users = (profiles || []).map((p) => ({
        ...p,
        roles: roleMap[p.id] || [],
      }));
      return json({ users });
    }

    const targetId = typeof body.user_id === "string" ? body.user_id : "";

    if (action === "create_admin") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json({ error: "Enter a valid email address" });

      // find existing user, otherwise invite one
      let userId = "";
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        userId = existing.id;
      } else {
        const password = crypto.randomUUID() + "aA1!";
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: String(body.full_name || "") },
        });
        if (createErr || !created?.user) return json({ error: "Could not create that account" });
        userId = created.user.id;
        await admin.auth.resetPasswordForEmail(email).catch(() => {});
      }

      const role = body.super === true ? "super_admin" : "admin";
      await admin.from("user_roles").upsert(
        [{ user_id: userId, role }, { user_id: userId, role: "admin" }],
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "user");
      return json({ ok: true, user_id: userId });
    }

    if (!targetId) return json({ error: "Missing user" });
    if (targetId === caller.id && action !== "list") {
      return json({ error: "You cannot modify your own super admin account" });
    }

    if (action === "revoke_admin") {
      await admin.from("user_roles").delete().eq("user_id", targetId).in("role", ["admin", "super_admin"]);
      await admin.from("user_roles").upsert({ user_id: targetId, role: "user" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      return json({ ok: true });
    }

    if (action === "grant_super") {
      await admin.from("user_roles").upsert(
        [{ user_id: targetId, role: "super_admin" }, { user_id: targetId, role: "admin" }],
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      return json({ ok: true });
    }

    if (action === "ban" || action === "unban") {
      await admin.from("profiles").update({ is_blocked: action === "ban" }).eq("id", targetId);
      if (action === "ban") {
        await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" }).catch(() => {});
      } else {
        await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" }).catch(() => {});
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      await admin.auth.admin.deleteUser(targetId).catch(() => {});
      return json({ ok: true });
    }

    return json({ error: "Unknown action" });
  } catch (_e) {
    return json({ error: "Oops! Something went wrong!" }, 200);
  }
});
