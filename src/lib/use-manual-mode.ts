import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Reads admin_settings.manual_mode_enabled ("Simple mode" toggle).
// When ON, campaigns run without an SDK — advertisers just submit
// their app / website / song / video link and a Karbali official
// approves the campaign manually.
export function useManualMode() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "manual_mode_enabled")
          .maybeSingle();
        if (!cancelled) {
          if (error || !data) {
            // Default to Simple Mode (true) if fetch fails, is unauthorized (e.g. public user), or missing
            setEnabled(true);
          } else {
            setEnabled(data.value === "true");
          }
        }
      } catch (err) {
        if (!cancelled) setEnabled(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return enabled;
}
