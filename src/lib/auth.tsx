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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isLoading: true,
  hasCategory: null,
  categoryStatus: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCategory, setHasCategory] = useState<boolean | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setHasCategory(null);
    setCategoryStatus(null);
    localStorage.removeItem("karbali-last-activity");
  }, []);

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
    const checkAdmin = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    };

    const checkCategory = async (userId: string) => {
      const { data } = await supabase
        .from("advertiser_categories")
        .select("status")
        .eq("advertiser_id", userId)
        .maybeSingle();
      setHasCategory(!!data);
      setCategoryStatus(data?.status || null);
    };

    const handleUser = async (user: User | undefined) => {
      if (user) {
        const admin = await checkAdmin(user.id);
        setIsAdmin(admin);
        if (!admin) {
          await checkCategory(user.id);
        }
      } else {
        setIsAdmin(false);
        setHasCategory(null);
        setCategoryStatus(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setIsLoading(false);
        handleUser(session?.user);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      handleUser(session?.user);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isLoading,
        hasCategory,
        categoryStatus,
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
