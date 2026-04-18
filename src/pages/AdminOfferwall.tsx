import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { Copy, MonitorPlay, Music, HelpCircle, Coins, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const SUPABASE_URL = "https://dvkoafztquswcqniwcyf.supabase.co";

export default function AdminOfferwall() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalInteractions: 0, totalCorrect: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // All active engagement campaigns (offerwall sources)
      const { data: cs } = await supabase
        .from("campaigns")
        .select("id, name, ad_type, status, budget_remaining, target_users, created_at")
        .eq("ad_type", "engagement")
        .order("created_at", { ascending: false });

      const enriched = await Promise.all(
        (cs || []).map(async (c: any) => {
          const [{ data: creative }, { count: qCount }, { data: interactions }] = await Promise.all([
            supabase.from("creative_campaigns" as any).select("media_type, rate_per_interaction, min_interactions").eq("campaign_id", c.id).maybeSingle(),
            supabase.from("campaign_questions").select("*", { count: "exact", head: true }).eq("campaign_id", c.id),
            supabase.from("offerwall_interactions").select("is_correct, points_earned").eq("campaign_id", c.id),
          ]);
          const correct = (interactions || []).filter((i: any) => i.is_correct).length;
          const points = (interactions || []).reduce((s: number, i: any) => s + Number(i.points_earned || 0), 0);
          return {
            ...c,
            creative,
            questionCount: qCount || 0,
            interactions: interactions?.length || 0,
            correct,
            points,
          };
        })
      );

      setCampaigns(enriched);
      setStats({
        totalInteractions: enriched.reduce((s, c) => s + c.interactions, 0),
        totalCorrect: enriched.reduce((s, c) => s + c.correct, 0),
        totalPoints: enriched.reduce((s, c) => s + c.points, 0),
      });
      setLoading(false);
    };
    load();
  }, []);

  const offerwallEndpoint = `${SUPABASE_URL}/functions/v1/offerwall`;
  const integrationSnippet = `<!-- Karbali Offerwall (publisher integration) -->
<script>
  (function(){
    fetch("${offerwallEndpoint}?publisher_id=YOUR_PUBLISHER_ID")
      .then(r => r.json())
      .then(data => window.dispatchEvent(new CustomEvent("karbali:offers", { detail: data })));
  })();
</script>`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <MotionWrapper>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Offerwall</h1>
            <p className="text-sm text-muted-foreground">Engagement ad inventory distributed across publisher offerwalls.</p>
          </div>
        </MotionWrapper>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: Users, label: "Total Interactions", value: stats.totalInteractions },
            { icon: HelpCircle, label: "Correct Answers", value: stats.totalCorrect },
            { icon: Coins, label: "Points Awarded", value: stats.totalPoints.toFixed(0) },
            { icon: MonitorPlay, label: "Active Campaigns", value: campaigns.filter(c => c.status === "active").length },
          ].map((s) => (
            <GlassCard key={s.label} variant="strong">
              <GlassCardContent className="pt-5">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-semibold text-foreground">{s.value}</p>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        <MotionWrapper delay={0.05}>
          <GlassCard variant="glow">
            <GlassCardHeader><GlassCardTitle>Publisher Integration</GlassCardTitle></GlassCardHeader>
            <GlassCardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this snippet with publishers to embed the Karbali offerwall on their site.</p>
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto rounded-lg bg-muted/50 border border-border/50 p-3 text-xs text-foreground/80 whitespace-pre-wrap">{integrationSnippet}</pre>
                <GlassButton size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(integrationSnippet); toast.success("Snippet copied!"); }}>
                  <Copy className="h-4 w-4" />
                </GlassButton>
              </div>
              <p className="text-xs text-muted-foreground">Endpoint: <code className="text-primary">{offerwallEndpoint}</code></p>
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>

        <MotionWrapper delay={0.1}>
          <GlassCard variant="strong">
            <GlassCardHeader><GlassCardTitle>Engagement Campaigns ({campaigns.length})</GlassCardTitle></GlassCardHeader>
            <GlassCardContent>
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No engagement campaigns yet.</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((c) => (
                    <Link key={c.id} to={`/admin/campaigns/${c.id}`} className="block rounded-xl border border-border/50 p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {c.creative?.media_type === "music" ? <Music className="h-4 w-4 text-primary" /> : <MonitorPlay className="h-4 w-4 text-primary" />}
                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Questions: <span className="text-foreground">{c.questionCount}</span></span>
                            <span>Interactions: <span className="text-foreground">{c.interactions}</span></span>
                            <span>Correct: <span className="text-foreground">{c.correct}</span></span>
                            <span>Points: <span className="text-foreground">{c.points.toFixed(0)}</span></span>
                            <span>Budget: <span className="text-foreground">${Number(c.budget_remaining).toFixed(2)}</span></span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </MotionWrapper>
      </div>
    </AdminLayout>
  );
}
