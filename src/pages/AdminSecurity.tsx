import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw } from "lucide-react";

type Probe = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  path: string;
  referer: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device_type: string | null;
  device_os: string | null;
  browser: string | null;
  device_id: string | null;
  created_at: string;
};


export default function AdminSecurity() {
  const [rows, setRows] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_probe_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as Probe[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uniqueIps = new Set(rows.map((r) => r.ip_address).filter(Boolean)).size;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Security · /admin probes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every visit to the decoy /admin path is logged here. Admins use /ella.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total attempts</p>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Unique IPs</p>
            <p className="text-2xl font-semibold">{uniqueIps}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No probe attempts recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">User agent</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono">{r.ip_address || "unknown"}</td>
                      <td className="px-4 py-3">{r.country || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.path}</td>
                      <td className="px-4 py-3 max-w-[320px] truncate text-xs text-muted-foreground">
                        {r.user_agent || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
