import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s };
}

export default function PendingCountdown({ targetDate }: { targetDate: string }) {
  const target = new Date(targetDate);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const i = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(i);
  }, [targetDate]);

  const formatted = target.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground">
            Awaiting admin approval
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your campaign will automatically go live on{" "}
            <span className="font-medium text-foreground">{formatted}</span> if
            not approved sooner.
          </p>
          {t ? (
            <div className="mt-3 grid grid-cols-4 gap-2 max-w-md">
              {[
                { l: "Days", v: t.d },
                { l: "Hours", v: t.h },
                { l: "Minutes", v: t.m },
                { l: "Seconds", v: t.s },
              ].map((u) => (
                <div
                  key={u.l}
                  className="rounded-lg bg-background/60 border border-amber-500/10 p-2 text-center"
                >
                  <div className="text-lg font-semibold text-foreground tabular-nums">
                    {String(u.v).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {u.l}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              Activation time reached. Refresh shortly to see your campaign go
              live.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
