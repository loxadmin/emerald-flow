import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const INACTIVITY_TIMEOUT = 48 * 60 * 60 * 1000; // 48 hours in ms
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // check every minute

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setSession(null);
    setIsAdmin(false);
    localStorage.removeItem("karbali-last-activity");
  }, []);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem("karbali-last-activity", String(Date.now()));
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // Check inactivity
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
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        return !!data;
      } catch (e) {
        console.error("Admin check error:", e);
        return false;
      }
    };

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log("Auth state change:", event, !!session);
        setSession(session);
        setIsLoading(false);

        if (session?.user) {
          checkAdmin(session.user.id).then(res => {
            if (mounted) setIsAdmin(res);
          });
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      console.log("Initial session:", !!session);
      setSession(session);
      setIsLoading(false);

      if (session?.user) {
        checkAdmin(session.user.id).then(res => {
          if (mounted) setIsAdmin(res);
        });
      } else {
        setIsAdmin(false);
      }
    }).catch(err => {
      console.error("Error getting session:", err);
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !session && navigate) {
      try {
        navigate("/login");
      } catch (e) {}
    }
  }, [session, isLoading, navigate]);

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
    if (!isLoading && !isAdmin && navigate) {
      try {
        navigate("/dashboard");
      } catch (e) {}
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
