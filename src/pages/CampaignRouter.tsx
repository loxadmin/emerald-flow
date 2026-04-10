import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import MotionWrapper from "@/components/MotionWrapper";

export default function CampaignRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const route = async () => {
      const { data } = await supabase
        .from("advertiser_categories")
        .select("advertiser_type")
        .eq("advertiser_id", user.id)
        .maybeSingle();

      const adType = (data as any)?.advertiser_type;

      if (adType === "engagement") {
        navigate("/campaigns/create/engagement", { replace: true });
      } else if (adType === "commerce") {
        navigate("/campaigns/create/commerce", { replace: true });
      } else {
        // Default to performance (existing flow)
        navigate("/campaigns/create/performance", { replace: true });
      }
      setLoading(false);
    };
    route();
  }, [user, navigate]);

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
