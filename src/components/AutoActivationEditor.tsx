import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassButton } from "@/components/ui/glass-button";
import { toast } from "sonner";
import { CalendarClock, Save } from "lucide-react";
import { friendlyError } from "@/lib/errors";

// Convert ISO/timestamptz string to value usable by <input type="datetime-local">
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  campaignId: string;
  value: string | null | undefined;
  onSaved: (newValue: string) => void;
}

export default function AutoActivationEditor({ campaignId, value, onSaved }: Props) {
  const initial = value ? toLocalInputValue(value) : toLocalInputValue("2026-06-01T00:00:00Z");
  const [date, setDate] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date) {
      toast.error("Pick a valid date and time");
      return;
    }
    const iso = new Date(date).toISOString();
    setSaving(true);
    const { error } = await supabase
      .from("campaigns")
      .update({ auto_activation_at: iso } as any)
      .eq("id", campaignId);
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Auto-activation date updated");
    onSaved(iso);
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 w-full max-w-sm">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
        <CalendarClock className="h-3.5 w-3.5" /> Auto go-live date
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 text-xs"
        />
        <GlassButton size="sm" variant="glow" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving" : "Save"}
        </GlassButton>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Campaign auto-activates at this time if still pending.
      </p>
    </div>
  );
}
