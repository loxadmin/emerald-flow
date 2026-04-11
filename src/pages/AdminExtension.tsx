import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Chrome, MousePointerClick, CheckCircle, Gift, TrendingUp, Download } from "lucide-react";

export default function AdminExtension() {
  const [stats, setStats] = useState({ clicks: 0, conversions: 0, rewards: 0, totalPoints: 0 });
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    fetch("/kabali-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "kabali-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message))
      .finally(() => setDownloading(false));
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [clicksRes, convsRes, rewardsRes, recentRes] = await Promise.all([
        supabase.from("extension_clicks").select("id", { count: "exact", head: true }),
        supabase.from("extension_conversions").select("id", { count: "exact", head: true }),
        supabase.from("extension_rewards").select("points"),
        supabase.from("extension_clicks").select("*, campaigns(name)").order("created_at", { ascending: false }).limit(20),
      ]);

      const totalPoints = (rewardsRes.data || []).reduce((s: number, r: any) => s + (r.points || 0), 0);

      setStats({
        clicks: clicksRes.count || 0,
        conversions: convsRes.count || 0,
        rewards: (rewardsRes.data || []).length,
        totalPoints,
      });
      setRecentClicks(recentRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: "Total Clicks", value: stats.clicks, icon: MousePointerClick, color: "text-blue-500" },
    { label: "Conversions", value: stats.conversions, icon: CheckCircle, color: "text-green-500" },
    { label: "Rewards Issued", value: stats.rewards, icon: Gift, color: "text-amber-500" },
    { label: "Points Distributed", value: stats.totalPoints.toLocaleString(), icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Chrome className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Chrome Extension</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">{c.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <h2 className="font-semibold text-foreground">Recent Clicks</h2>
              </div>
              {recentClicks.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No extension clicks yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-5 py-2">User</th>
                        <th className="px-5 py-2">Campaign</th>
                        <th className="px-5 py-2">URL</th>
                        <th className="px-5 py-2">Status</th>
                        <th className="px-5 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClicks.map((c: any) => (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="px-5 py-2 font-mono text-xs">{c.ext_user_id?.slice(0, 8)}...</td>
                          <td className="px-5 py-2">{(c as any).campaigns?.name || "—"}</td>
                          <td className="max-w-[200px] truncate px-5 py-2">{c.destination_url}</td>
                          <td className="px-5 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "converted" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-5 py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
