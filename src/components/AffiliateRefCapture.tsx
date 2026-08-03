import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "karbali-affiliate-ref";
const DONE_PREFIX = "karbali-affiliate-attached:";

export function getStoredAffiliateRef(): string | null {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

/**
 * Captures ?ref=CODE from any landing URL and silently ties the visitor to the
 * affiliate once they create an account. Referred advertisers never type a code.
 */
export default function AffiliateRefCapture() {
  const location = useLocation();

  // 1. Capture the code from the URL on every navigation.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = (params.get("ref") || params.get("aff") || "").trim();
    if (code && /^[A-Za-z0-9_-]{4,32}$/.test(code)) {
      try {
        localStorage.setItem(REF_KEY, code.toUpperCase());
      } catch { /* storage may be blocked */ }
    }
  }, [location.search]);

  // 2. Attach the referral in the backend as soon as a session exists.
  useEffect(() => {
    const attach = async (userId: string, metaCode?: string | null) => {
      const code = (metaCode || getStoredAffiliateRef() || "").trim();
      if (!code) return;
      const doneKey = DONE_PREFIX + userId;
      try {
        if (localStorage.getItem(doneKey)) return;
      } catch { /* ignore */ }
      const { data } = await supabase.rpc("attach_affiliate_referral", { _code: code });
      const ok = (data as { success?: boolean } | null)?.success;
      try {
        localStorage.setItem(doneKey, "1");
        if (ok) localStorage.removeItem(REF_KEY);
      } catch { /* ignore */ }
    };

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) attach(u.id, (u.user_metadata as any)?.affiliate_ref);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) setTimeout(() => attach(u.id, (u.user_metadata as any)?.affiliate_ref), 0);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
