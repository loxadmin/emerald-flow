import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;

    const handleRedirect = async () => {
      // Log click via edge function (bypasses RLS)
      const { data, error: fnError } = await supabase.functions.invoke("referral-click", {
        body: { code },
      });

      if (fnError || !data?.redirect_url) {
        setError(true);
        return;
      }

      // Set cookie
      document.cookie = `karbali_ref=${code};path=/;max-age=2592000;SameSite=Lax`;

      // Redirect
      window.location.href = data.redirect_url;
    };

    handleRedirect();
  }, [code]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Referral Link</h1>
          <p className="mt-2 text-muted-foreground">This link is no longer valid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
