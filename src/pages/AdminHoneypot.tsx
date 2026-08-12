import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

/**
 * Decoy for the legacy /admin path. The real admin panel lives elsewhere.
 * Anyone landing here has their IP recorded server-side (the browser cannot
 * see or forge it) and only ever sees an "Invalid" dialog.
 */
export default function AdminHoneypot() {
  const location = useLocation();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    supabase.functions
      .invoke("log-admin-probe", { body: { path: location.pathname } })
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Invalid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This request is not valid. Your access details have been recorded.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">Invalid</p>
    </div>
  );
}
