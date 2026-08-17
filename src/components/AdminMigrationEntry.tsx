import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";

type Target = {
  advertiserId: string;
  campaignId?: string;
  packageOrderId?: string;
  switchOrderId?: string;
};

type Row = {
  id: string;
  source_name: string;
  users_migrated: number;
  migration_date: string;
};

const PRESET_SOURCES = ["YouTube", "Instagram", "TikTok", "Facebook", "Twitter", "Opay", "Kuda", "PalmPay", "Direct search", "Google", "Other"];

export default function AdminMigrationEntry(props: Target) {
  const { advertiserId, campaignId, packageOrderId, switchOrderId } = props;
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState("");
  const [users, setUsers] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    let q = supabase.from("campaign_migrations" as any).select("id,source_name,users_migrated,migration_date");
    if (campaignId) q = q.eq("campaign_id", campaignId);
    else if (packageOrderId) q = q.eq("package_order_id", packageOrderId);
    else if (switchOrderId) q = q.eq("switch_order_id", switchOrderId);
    const { data } = await q.order("migration_date", { ascending: false });
    setRows(((data as any) || []) as Row[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [campaignId, packageOrderId, switchOrderId]);

  const add = async () => {
    if (!source.trim() || users <= 0) return toast.error("Source and users required");
    setSaving(true);
    const payload: any = {
      advertiser_id: advertiserId,
      source_name: source.trim(),
      users_migrated: users,
      migration_date: date,
      campaign_id: campaignId || null,
      package_order_id: packageOrderId || null,
      switch_order_id: switchOrderId || null,
    };
    const { error } = await supabase.from("campaign_migrations" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    setSource(""); setUsers(0);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this migration entry?")) return;
    const { error } = await supabase.from("campaign_migrations" as any).delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    load();
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold">User migration entries</h4>
        <p className="text-[11px] text-muted-foreground">
          Log where users are switching from (e.g. "100 users from YouTube"). Advertiser sees these live.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_100px_140px_auto]">
        <div>
          <Label className="text-[11px]">Source</Label>
          <Input list="mig-src-list" value={source} onChange={(e) => setSource(e.target.value)} placeholder="YouTube, Opay, …" />
          <datalist id="mig-src-list">
            {PRESET_SOURCES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <Label className="text-[11px]">Users</Label>
          <Input type="number" min={1} value={users || ""} onChange={(e) => setUsers(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-[11px]">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button size="sm" onClick={add} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="mr-1 h-3.5 w-3.5" /> Add</>}
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="max-h-40 overflow-y-auto border rounded-md">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-2 py-1.5">Date</th>
                <th className="text-left px-2 py-1.5">Source</th>
                <th className="text-right px-2 py-1.5">Users</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1.5">{new Date(r.migration_date).toLocaleDateString()}</td>
                  <td className="px-2 py-1.5">{r.source_name}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.users_migrated.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
