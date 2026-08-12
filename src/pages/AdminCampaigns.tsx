import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowUpRight, Megaphone } from "lucide-react";
import { ListSkeleton } from "@/components/skeletons";

type Row = {
  id: string; name: string; status: string; created_at: string;
  advertiser_id: string; total_cost: number | null; budget_remaining: number | null;
  target_users: number | null; integration_type: string | null; is_draft: boolean;
  source: "normal" | "package" | "switch";
};

const TABS = ["all", "pending", "active", "rejected", "draft"] as const;
type Tab = typeof TABS[number];

const SOURCES = [
  { key: "all", label: "All campaigns" },
  { key: "normal", label: "Normal" },
  { key: "package", label: "Ad package" },
  { key: "switch", label: "Switch offer" },
] as const;
type SourceKey = typeof SOURCES[number]["key"];

const SOURCE_LABEL: Record<Row["source"], string> = {
  normal: "Normal",
  package: "Ad package",
  switch: "Switch offer",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pending_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};


export default function AdminCampaigns() {
  const [rows, setRows] = useState<Row[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [source, setSource] = useState<SourceKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [camps, pkgs, sws] = await Promise.all([
        supabase
          .from("campaigns")
          .select("id,name,status,created_at,advertiser_id,total_cost,budget_remaining,target_users,integration_type,is_draft")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("package_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("switch_offer_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
      ]);

      const list: Row[] = [
        ...(((camps.data as any[]) || []).map((c) => ({ ...c, source: "normal" as const }))),
        ...(((pkgs.data as any[]) || []).map((o) => ({
          id: o.id,
          name: o.package_name || "Ad package campaign",
          status: o.status === "pending_review" ? "pending" : o.status,
          created_at: o.created_at,
          advertiser_id: o.advertiser_id,
          total_cost: Number(o.total_amount_usd || 0),
          budget_remaining: null,
          target_users: o.units || null,
          integration_type: o.platform || null,
          is_draft: false,
          source: "package" as const,
        }))),
        ...(((sws.data as any[]) || []).map((o) => ({
          id: o.id,
          name: o.offer_title || "Switch offer campaign",
          status: o.status,
          created_at: o.created_at,
          advertiser_id: o.advertiser_id,
          total_cost: Number(o.flat_price_usd || 0),
          budget_remaining: null,
          target_users: o.batch_size || null,
          integration_type: o.competitor_app_name || null,
          is_draft: false,
          source: "switch" as const,
        }))),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      setRows(list);

      const ids = [...new Set(list.map((r) => r.advertiser_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id,email,company_name").in("id", ids);
        const map: Record<string, string> = {};
        ((profs as any[]) || []).forEach((p) => { map[p.id] = p.company_name || p.email; });
        setEmails(map);
      }
      setLoading(false);
    })();
  }, []);

  const inSource = (r: Row) => source === "all" || r.source === source;

  const counts = useMemo(() => {
    const base = rows.filter(inSource);
    return {
      all: base.length,
      pending: base.filter((r) => r.status === "pending" && !r.is_draft).length,
      active: base.filter((r) => r.status === "active").length,
      rejected: base.filter((r) => r.status === "rejected").length,
      draft: base.filter((r) => r.is_draft).length,
    };
  }, [rows, source]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!inSource(r)) return false;
    const matchTab =
      tab === "all" ? true :
      tab === "draft" ? r.is_draft :
      r.status === tab && !r.is_draft;
    if (!matchTab) return false;
    if (!q.trim()) return true;
    const hay = `${r.name} ${emails[r.advertiser_id] || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [rows, tab, q, emails, source]);


  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Every campaign submitted across the platform.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaign or advertiser" className="pl-9" />
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                tab === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {SOURCES.map((s) => (
            <button
              key={s.key} onClick={() => setSource(s.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                source === s.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <ListSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No campaigns match this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-normal">Campaign</th>
                    <th className="px-3 py-2.5 font-normal">Advertiser</th>
                    <th className="px-3 py-2.5 font-normal">Source</th>
                    <th className="px-3 py-2.5 font-normal">Type</th>
                    <th className="px-3 py-2.5 font-normal">Status</th>
                    <th className="px-3 py-2.5 font-normal text-right">Budget</th>
                    <th className="px-3 py-2.5 font-normal text-right">Created</th>
                    <th className="px-5 py-2.5 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const href = r.source === "normal" ? `/admin/campaigns/${r.id}` : "/admin/orders";
                    return (
                    <tr key={`${r.source}-${r.id}`} className="border-b border-border last:border-0 transition-colors hover:bg-accent/40">
                      <td className="px-5 py-3">
                        <Link to={href} className="font-medium text-foreground hover:text-primary transition-colors">
                          {r.name}
                        </Link>
                        {r.target_users ? (
                          <p className="text-[11px] text-muted-foreground">{r.target_users.toLocaleString()} users</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{emails[r.advertiser_id] || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{SOURCE_LABEL[r.source]}</td>
                      <td className="px-3 py-3 text-xs capitalize text-muted-foreground">{r.integration_type || "—"}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-medium ${
                          r.is_draft ? "bg-muted text-muted-foreground border-border" : STATUS_STYLES[r.status] || "bg-muted text-muted-foreground border-border"
                        }`}>
                          {r.is_draft ? "draft" : r.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        ${Number(r.total_cost || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={href}><ArrowUpRight className="h-4 w-4 text-muted-foreground/50" /></Link>

                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
