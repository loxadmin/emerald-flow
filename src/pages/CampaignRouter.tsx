import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import MotionWrapper from "@/components/MotionWrapper";

export default function CampaignRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const route = async () => {
      let draftId = searchParams.get("draft");
      let adType: string | null = null;

      // Check if manual mode is enabled
      const { data: manualSetting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "manual_mode_enabled")
        .maybeSingle();
      const manualModeEnabled = manualSetting?.value === "true";

      // Check advertiser category - engagement ads should always go to engagement flow
      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("advertiser_type")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      adType = (catData as any)?.advertiser_type || null;

      // If engagement type, always go to engagement flow (no API/SDK needed)
      if (adType === "engagement") {
        navigate(`/campaigns/create/engagement`, { replace: true });
        setLoading(false);
        return;
      }

      // If manual mode is enabled and not engagement, go to manual flow
      if (manualModeEnabled) {
        navigate(`/campaigns/create/manual`, { replace: true });
        setLoading(false);
        return;
      }

      // If no explicit draft param, check for an existing draft with an API key
      if (!draftId) {
        const { data: existingDrafts } = await supabase
          .from("campaigns")
          .select("id, ad_type")
          .eq("advertiser_id", user.id)
          .eq("is_draft", true)
          .order("created_at", { ascending: false })
          .limit(5);

        if (existingDrafts && existingDrafts.length > 0) {
          for (const draft of existingDrafts) {
            const { count } = await supabase
              .from("api_keys")
              .select("id", { count: "exact", head: true })
              .eq("campaign_id", draft.id);
            if (count && count > 0) {
              draftId = draft.id;
              adType = (draft as any).ad_type || null;
              break;
            }
          }
        }
      }

      // If resuming a specific draft, get its ad_type
      if (draftId && !adType) {
        const { data: draft } = await supabase
          .from("campaigns")
          .select("ad_type")
          .eq("id", draftId)
          .eq("advertiser_id", user.id)
          .maybeSingle();
        adType = (draft as any)?.ad_type || null;
      }

      const draftQuery = draftId ? `?draft=${draftId}` : "";

      if (adType === "commerce") {
        navigate(`/campaigns/create/commerce${draftQuery}`, { replace: true });
      } else {
        navigate(`/campaigns/create/performance${draftQuery}`, { replace: true });
      }
      setLoading(false);
    };
    route();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, navigate, searchParams]);

  if (loading) {
    return (
      <DashboardLayout>
        <MotionWrapper className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </MotionWrapper>
      </DashboardLayout>
    );
  }

  return null;
}
