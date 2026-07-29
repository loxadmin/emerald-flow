import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const INACTIVITY_TIMEOUT = 48 * 60 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL = 60 * 1000;

declare global {
  interface Window {
    __KARBALI_IS_ADMIN__?: boolean;
  }
}

/* ------------------------------------------------------------------ *
 * Admin 2FA verification flag.
 *
 * Stored in localStorage (not sessionStorage) and keyed to the admin's
 * user id with a TTL. sessionStorage was lost on hard navigations and
 * could be cleared by a spurious SIGNED_IN event during bootstrap,
 * which bounced admins to the OTP screen mid-session.
 * ------------------------------------------------------------------ */
const ADMIN_2FA_KEY = "karbali-admin-2fa";
const ADMIN_2FA_TTL = 12 * 60 * 60 * 1000;

export function markAdmin2FAVerified(userId: string) {
  try {
    localStorage.setItem(ADMIN_2FA_KEY, JSON.stringify({ userId, at: Date.now() }));
  } catch { /* storage unavailable */ }
}

export function isAdmin2FAVerified(userId?: string | null): boolean {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(ADMIN_2FA_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { userId?: string; at?: number };
    return parsed.userId === userId && Date.now() - (parsed.at || 0) < ADMIN_2FA_TTL;
  } catch {
    return false;
  }
}

export function clearAdmin2FA() {
  try {
    localStorage.removeItem(ADMIN_2FA_KEY);
    sessionStorage.removeItem("karbali-admin-2fa-verified");
  } catch { /* storage unavailable */ }
}


interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasCategory: boolean | null;
  categoryStatus: string | null;
  walletActivated: boolean | null;
  maintenanceMode: boolean;
  advertiserType: string | null;
  advertiserSubtype: string | null;
  businessVerified: boolean | null;
  refreshAccessState: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isLoading: true,
  hasCategory: null,
  categoryStatus: null,
  walletActivated: null,
  maintenanceMode: false,
  advertiserType: null,
  advertiserSubtype: null,
  businessVerified: null,
  refreshAccessState: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCategory, setHasCategory] = useState<boolean | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<string | null>(null);
  const [walletActivated, setWalletActivated] = useState<boolean | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [advertiserType, setAdvertiserType] = useState<string | null>(null);
  const [advertiserSubtype, setAdvertiserSubtype] = useState<string | null>(null);
  const [businessVerified, setBusinessVerified] = useState<boolean | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accessRequestIdRef = useRef(0);

  const resetAccessState = useCallback(() => {
    setIsAdmin(false);
    if (typeof window !== "undefined") window.__KARBALI_IS_ADMIN__ = false;
    setHasCategory(null);
    setCategoryStatus(null);
    setWalletActivated(null);
    setAdvertiserType(null);
    setAdvertiserSubtype(null);
    setBusinessVerified(null);
  }, []);

  const signOut = useCallback(async () => {
    accessRequestIdRef.current += 1;
    await supabase.auth.signOut();
    setSession(null);
    resetAccessState();
    setIsLoading(false);
    clearAdmin2FA();

    localStorage.removeItem("karbali-ads-last-activity");
  }, [resetAccessState]);

  const loadAccessState = useCallback(async (activeUser: User | null | undefined) => {
    const requestId = ++accessRequestIdRef.current;

    if (!activeUser) {
      resetAccessState();
      if (requestId === accessRequestIdRef.current) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);

    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", activeUser.id);

      if (requestId !== accessRequestIdRef.current) return;

      if (rolesError) throw rolesError;

      const admin = (rolesData || []).some((role) => role.role === "admin");
      setIsAdmin(admin);
      if (typeof window !== "undefined") window.__KARBALI_IS_ADMIN__ = admin;

      if (admin) {
        setHasCategory(true);
        setCategoryStatus("active");
        setWalletActivated(true);
        setBusinessVerified(true);
        return;
      }

      const [{ data: categoryData }, { data: walletData }, { data: maintenanceData }, { data: profileData }, { data: verificationData }] = await Promise.all([
        supabase
          .from("advertiser_categories")
          .select("status, advertiser_type, advertiser_subtype, category_id")
          .eq("advertiser_id", activeUser.id)
          .maybeSingle(),
        supabase
          .from("wallets")
          .select("is_activated")
          .eq("advertiser_id", activeUser.id)
          .maybeSingle(),
        supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("is_blocked")
          .eq("id", activeUser.id)
          .maybeSingle(),
        supabase
          .from("business_verifications" as any)
          .select("status")
          .eq("advertiser_id", activeUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (requestId !== accessRequestIdRef.current) return;

      if ((profileData as { is_blocked?: boolean } | null)?.is_blocked) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          alert("Your account has been blocked. Please contact support.");
        }
        resetAccessState();
        return;
      }

      // Derive advertiserType. Prefer the stored advertiser_type; otherwise fall back
      // to the category's group slug so category-scoped UI (assistant, sidebar tabs,
      // package filtering) works for users whose row predates the column.
      let derivedType: string | null = (categoryData as any)?.advertiser_type || null;
      if (!derivedType && (categoryData as any)?.category_id) {
        const { data: catRow } = await supabase
          .from("categories")
          .select("group_id, category_groups:group_id(slug)")
          .eq("id", (categoryData as any).category_id)
          .maybeSingle();
        const slug = String((catRow as any)?.category_groups?.slug || "").toLowerCase();
        if (slug === "engagement" || slug === "performance" || slug === "commerce") {
          derivedType = slug;
        }
      }

      setHasCategory(!!categoryData);
      setCategoryStatus(categoryData?.status || null);
      setAdvertiserType(derivedType);
      setAdvertiserSubtype((categoryData as any)?.advertiser_subtype || null);
      setWalletActivated(walletData?.is_activated ?? false);
      setMaintenanceMode(maintenanceData?.value === "true");
      setBusinessVerified(((verificationData as any)?.status === "approved"));

    } catch (error) {
      if (requestId !== accessRequestIdRef.current) return;
      console.error("Failed to load access state:", error);
      resetAccessState();
    } finally {
      if (requestId === accessRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [resetAccessState]);

  const refreshAccessState = useCallback(async () => {
    await loadAccessState(session?.user ?? null);
  }, [loadAccessState, session?.user]);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem("karbali-ads-last-activity", String(Date.now()));
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    intervalRef.current = setInterval(() => {
      const lastActivity = Number(localStorage.getItem("karbali-ads-last-activity")) || Date.now();
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT && session) {
        signOut();
      }
    }, ACTIVITY_CHECK_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, signOut]);

  useEffect(() => {
    let active = true;
    let lastUserId: string | null = null;

    const syncSessionState = (
      nextSession: Session | null,
      options: { forceReload?: boolean; clearTwoFactor?: boolean } = {},
    ) => {
      if (!active) return;

      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = nextUserId !== lastUserId;

      if (options.clearTwoFactor) {
        clearAdmin2FA();
      }

      setSession(nextSession);
      lastUserId = nextUserId;

      if (options.forceReload || userChanged) {
        setIsLoading(true);
        void loadAccessState(nextSession?.user ?? null);
      }
    };

    const bootstrapAuth = async () => {
      try {
        const { data: { session: restoredSession } } = await supabase.auth.getSession();
        if (!active) return;

        syncSessionState(restoredSession, { forceReload: true });
      } catch {
        if (!active) return;
        resetAccessState();
        setIsLoading(false);
      }
    };

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        syncSessionState(nextSession, { forceReload: true, clearTwoFactor: true });
        return;
      }

      if (event === "SIGNED_IN") {
        const nextUserId = nextSession?.user?.id ?? null;
        const isNewUser = nextUserId !== null && nextUserId !== lastUserId;

        // Never clear the 2FA flag here — Supabase re-emits SIGNED_IN on
        // bootstrap/refresh, which previously wiped a valid verification and
        // bounced admins to the OTP page mid-session. The flag is keyed to the
        // user id, so a genuinely different user is already excluded.
        syncSessionState(nextSession, { forceReload: isNewUser });
        return;
      }



      // INITIAL_SESSION / TOKEN_REFRESHED / USER_UPDATED / PASSWORD_RECOVERY
      // should update session state silently unless the user identity changed.
      syncSessionState(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAccessState, resetAccessState]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isLoading,
        hasCategory,
        categoryStatus,
        walletActivated,
        maintenanceMode,
        advertiserType,
        advertiserSubtype,
        businessVerified,
        refreshAccessState,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading, isAdmin, hasCategory } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }
    // Admin users skip category check
    if (isAdmin) return;
    // If user hasn't picked a category yet and isn't on category-select page
    if (hasCategory === false && location.pathname !== "/category-select") {
      navigate("/category-select", { replace: true });
    }
  }, [session, isLoading, isAdmin, hasCategory, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return session ? <>{children}</> : null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && session && !isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    // Email OTP 2FA gate for admins, per-tab via sessionStorage
    if (
      !isLoading && session && isAdmin &&
      location.pathname !== "/admin/2fa" &&
      sessionStorage.getItem("karbali-admin-2fa-verified") !== "1"
    ) {
      navigate("/admin/2fa", { replace: true });
    }
  }, [session, isAdmin, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;
  if (sessionStorage.getItem("karbali-admin-2fa-verified") !== "1") return null;
  return <>{children}</>;
}
