import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const handleRedirect = async () => {
      const clientId = crypto.randomUUID();

      // Log click via edge function (bypasses RLS)
      const { data, error: fnError } = await supabase.functions.invoke("referral-click", {
        body: { code, client_id: clientId },
      });

      if (fnError || !data?.redirect_url) {
        setError(
          (data as { error?: string } | null)?.error ||
            "This link is no longer valid or has no destination set."
        );
        return;
      }

      try {
        const redirectUrl = new URL(data.redirect_url);
        redirectUrl.searchParams.set("ref", data.referral_id || code);
        redirectUrl.searchParams.set("ref_code", code);
        redirectUrl.searchParams.set("client_id", data.client_id || clientId);
        window.location.href = redirectUrl.toString();
      } catch {
        setError("The destination URL for this link is invalid.");
      }
    };

    handleRedirect();
  }, [code]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">Link unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
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
