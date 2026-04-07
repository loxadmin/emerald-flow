import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const INACTIVITY_TIMEOUT = 48 * 60 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL = 60 * 1000;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasCategory: boolean | null;
  categoryStatus: string | null;
  walletActivated: boolean | null;
  maintenanceMode: boolean;
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
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accessRequestIdRef = useRef(0);

  const resetAccessState = useCallback(() => {
    setIsAdmin(false);
    setHasCategory(null);
    setCategoryStatus(null);
    setWalletActivated(null);
  }, []);

  const signOut = useCallback(async () => {
    accessRequestIdRef.current += 1;
    await supabase.auth.signOut();
    setSession(null);
    resetAccessState();
    setIsLoading(false);
    localStorage.removeItem("karbali-last-activity");
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

      if (admin) {
        setHasCategory(true);
        setCategoryStatus("active");
        setWalletActivated(true);
        return;
      }

      const [{ data: categoryData }, { data: walletData }, { data: maintenanceData }] = await Promise.all([
        supabase
          .from("advertiser_categories")
          .select("status")
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
      ]);

      if (requestId !== accessRequestIdRef.current) return;

      setHasCategory(!!categoryData);
      setCategoryStatus(categoryData?.status || null);
      setWalletActivated(walletData?.is_activated ?? false);
      setMaintenanceMode(maintenanceData?.value === "true");
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
      localStorage.setItem("karbali-last-activity", String(Date.now()));
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    intervalRef.current = setInterval(() => {
      const lastActivity = Number(localStorage.getItem("karbali-last-activity")) || Date.now();
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
    const syncSessionState = (nextSession: Session | null) => {
      setSession(nextSession);
      setIsLoading(true);
      void loadAccessState(nextSession?.user ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        syncSessionState(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      syncSessionState(nextSession);
    }).catch(() => {
      resetAccessState();
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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

  useEffect(() => {
    if (!isLoading && session && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}
