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
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setHasCategory(null);
    setCategoryStatus(null);
    setWalletActivated(null);
    localStorage.removeItem("karbali-last-activity");
  }, []);

  const loadAccessState = useCallback(async (activeUser: User | null | undefined) => {
    if (!activeUser) {
      setIsAdmin(false);
      setHasCategory(null);
      setCategoryStatus(null);
      setWalletActivated(null);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", activeUser.id)
      .eq("role", "admin")
      .maybeSingle();

    const admin = !!roleData;
    setIsAdmin(admin);

    if (admin) {
      setHasCategory(true);
      setCategoryStatus(null);
      setWalletActivated(true);
      return;
    }

    const [{ data: categoryData }, { data: walletData }] = await Promise.all([
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
    ]);

    setHasCategory(!!categoryData);
    setCategoryStatus(categoryData?.status || null);
    setWalletActivated(walletData?.is_activated ?? false);
  }, []);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setIsLoading(false);
        void loadAccessState(session?.user);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      void loadAccessState(session?.user);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadAccessState]);

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
      navigate("/login");
      return;
    }
    // Admin users skip category check
    if (isAdmin) return;
    // If user hasn't picked a category yet and isn't on category-select page
    if (hasCategory === false && location.pathname !== "/category-select") {
      navigate("/category-select");
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
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}
