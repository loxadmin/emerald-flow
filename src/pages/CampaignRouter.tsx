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

      // If resuming a draft, get the ad_type from that campaign
      if (draftId) {
        const { data: draft } = await supabase
          .from("campaigns")
          .select("ad_type")
          .eq("id", draftId)
          .eq("advertiser_id", user.id)
          .maybeSingle();
        adType = (draft as any)?.ad_type || null;
      }

      // Fallback to advertiser category type
      if (!adType) {
        const { data } = await supabase
          .from("advertiser_categories")
          .select("advertiser_type")
          .eq("advertiser_id", user.id)
          .maybeSingle();
        adType = (data as any)?.advertiser_type || null;
      }

      const draftQuery = draftId ? `?draft=${draftId}` : "";

      if (adType === "engagement") {
        navigate(`/campaigns/create/engagement${draftQuery}`, { replace: true });
      } else if (adType === "commerce") {
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
