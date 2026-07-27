import { useEffect, useRef, useState } from "react";

type Segment = { label: string; value: number; color: string };

/** Animated donut that fills in when scrolled into view. */
export default function AnimatedDonut({
  segments,
  centerLabel,
  centerValue,
  size = 168,
  thickness = 14,
}: {
  segments: Segment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  thickness?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={thickness}
          />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dash = visible ? `${len} ${c - len}` : `0 ${c}`;
            const dashOffset = visible ? -offset : 0;
            offset += len;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                style={{ transition: `stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1) ${i * 140}ms` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{centerValue}</span>
          {centerLabel && <span className="text-[11px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
