// Shared internal-auth guard for Karbali Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const INTERNAL_SECRET = Deno.env.get("INTERNAL_TASK_SECRET");

export async function requireInternalOrUser(
  req: Request,
  opts: { requireAdmin?: boolean } = {},
): Promise<{ user?: { id: string; email?: string }; isInternal: boolean }> {
  const internalHeader = req.headers.get("x-internal-secret");
  const isInternal = !!INTERNAL_SECRET && internalHeader === INTERNAL_SECRET;

  if (isInternal) return { isInternal: true };

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new AuthError("Unauthorized", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const token = authHeader.replace("Bearer ", "").trim();

  // Service-role callers (other edge functions / webhooks) are trusted internal traffic
  if (serviceKey && token === serviceKey) return { isInternal: true };

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) throw new AuthError("Invalid token", 401);

  const user = data.user;

  if (opts.requireAdmin) {
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new AuthError("Admin only", 403);
  }

  return { user: { id: user.id, email: user.email }, isInternal: false };
}

export function requireInternal(req: Request): boolean {
  const internalHeader = req.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET) return false;
  if (internalHeader !== INTERNAL_SECRET) {
    throw new AuthError("Unauthorized", 401);
  }
  return true;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
