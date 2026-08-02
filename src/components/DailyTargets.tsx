import { CheckCircle2, Circle, CalendarDays } from "lucide-react";

type Props = {
  startsAt: string | null;
  durationDays: number;
  /** target per day (0 disables the target check and any delivery counts as hit) */
  dailyTarget: number;
  /** map of ISO date (yyyy-mm-dd) -> users delivered on that day */
  deliveredByDate: Record<string, number>;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Day 1 … Day N checklist showing which daily targets have been achieved. */
export default function DailyTargets({ startsAt, durationDays, dailyTarget, deliveredByDate }: Props) {
  if (!startsAt || durationDays <= 0) return null;

  const start = new Date(startsAt);
  const today = iso(new Date());

  const days = Array.from({ length: durationDays }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = iso(d);
    const delivered = deliveredByDate[key] || 0;
    const hit = dailyTarget > 0 ? delivered >= dailyTarget : delivered > 0;
    const isFuture = key > today;
    const isToday = key === today;
    return { n: i + 1, key, d, delivered, hit, isFuture, isToday };
  });

  const achieved = days.filter((x) => x.hit).length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-sm font-semibold">Daily delivery targets</h4>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {achieved} / {durationDays} days achieved
          {dailyTarget > 0 && <span className="ml-1">· {dailyTarget.toLocaleString()}/day</span>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.key}
            title={`${day.d.toLocaleDateString()} — ${day.delivered.toLocaleString()} delivered`}
            className={`rounded-lg border px-2 py-2 text-center transition-colors ${
              day.hit
                ? "border-primary/30 bg-primary/5"
                : day.isFuture
                  ? "border-dashed border-border bg-muted/20 opacity-60"
                  : day.isToday
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/20"
            }`}
          >
            <div className="mb-1 flex items-center justify-center">
              {day.hit ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
            <p className="text-[11px] font-medium text-foreground">Day {day.n}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {day.isFuture ? "—" : day.delivered.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
