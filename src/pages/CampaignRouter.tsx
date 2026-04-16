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
      const draftId = searchParams.get("draft");
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
        .select("advertiser_type, category_id")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      adType = (catData as any)?.advertiser_type || null;
      const categoryId = (catData as any)?.category_id || null;

      if (!adType && categoryId) {
        const { data: category } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .maybeSingle();
        const categoryName = String((category as any)?.name || "").toLowerCase();
        if (categoryName.includes("engagement")) adType = "engagement";
        else if (categoryName.includes("commerce")) adType = "commerce";
        else adType = "performance";
      }

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
