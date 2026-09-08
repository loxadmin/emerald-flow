import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { type SwiftOrderAction, swiftDailyRate } from "@/lib/swift";

type Order = {
  id: string;
  package_name: string;
  units: number;
  duration_days: number;
  total_amount_usd: number;
  swift_base_price_usd: number | null;
  swift_actions: SwiftOrderAction[] | null;
};

export default function SwiftOrderEditDialog({
  order, onClose, onDone,
}: { order: Order | null; onClose: () => void; onDone: () => void }) {
  const [lines, setLines] = useState<SwiftOrderAction[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLines(order?.swift_actions ? [...order.swift_actions] : []);
    setNote("");
  }, [order?.id]);

  if (!order) return null;

  const base = Number(order.swift_base_price_usd || 0) * order.units;
  const daily = swiftDailyRate(lines) * order.units * order.duration_days;
  const proposed = Number((base + daily).toFixed(2));
  const diff = Number((proposed - Number(order.total_amount_usd)).toFixed(2));

  const submit = async () => {
    if (lines.length === 0) return toast.error("Keep at least one daily deliverable");
    setSaving(true);
    const { error } = await supabase.rpc("admin_edit_swift_order" as never, {
      _order_id: order.id,
      _actions: lines.map((l) => ({ ...l, status: "approved" })),
      _note: note.trim() || null,
    } as never);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    supabase.functions
      .invoke("notify", { body: { event: "package_order_edit_proposed", payload: { order_id: order.id } } })
      .catch(() => {});
    toast.success("Sent to the advertiser for approval");
    onDone();
  };

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review deliverables — {order.package_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Remove a deliverable you cannot fulfil, or change its price. The advertiser must approve the result;
            if they decline, the order is rejected and refunded automatically.
          </p>
          {lines.map((l, i) => (
            <div key={l.key} className="grid grid-cols-[1fr_110px_36px] items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{l.name}</p>
                <Badge variant={l.source === "custom" ? "outline" : "secondary"} className="mt-0.5 text-[10px]">
                  {l.source === "custom" ? "Advertiser request" : "Preset"}
                </Badge>
              </div>
              <Input
                type="number"
                step="0.01"
                value={l.price_per_user_per_day}
                onChange={(e) =>
                  setLines(lines.map((x, j) => (j === i ? { ...x, price_per_user_per_day: Number(e.target.value) || 0 } : x)))
                }
              />
              <Button size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div>
            <Label className="text-xs">Note to advertiser</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you changed this" />
          </div>

          <div className="rounded-lg border bg-secondary/20 p-3 text-xs">
            <div className="flex justify-between"><span>Current escrow</span><span>${Number(order.total_amount_usd).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-foreground"><span>Revised total</span><span>${proposed.toFixed(2)}</span></div>
            <div className="mt-1 text-muted-foreground">
              {diff > 0 ? `Advertiser tops up $${diff.toFixed(2)}` : diff < 0 ? `$${Math.abs(diff).toFixed(2)} released back` : "No change in amount"}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
