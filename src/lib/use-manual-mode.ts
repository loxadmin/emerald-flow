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
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "manual_mode_enabled")
        .maybeSingle();
      if (!cancelled) setEnabled(data?.value === "true");
    })();
    return () => { cancelled = true; };
  }, []);
  return enabled;
}
