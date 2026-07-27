import { useEffect, useRef, useState } from "react";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  /** semantic color: "primary" | "muted" | "destructive" | "warning" */
  tone?: "primary" | "muted" | "destructive" | "warning";
  area?: boolean;
  className?: string;
  strokeWidth?: number;
};

const TONES: Record<string, string> = {
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted-foreground))",
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
};

/**
 * Lightweight SVG sparkline whose line draws itself when scrolled into view.
 * Responsive: scales to its container via preserveAspectRatio="none".
 */
export default function Sparkline({
  data,
  width = 120,
  height = 36,
  tone = "primary",
  area = true,
  className = "",
  strokeWidth = 1.75,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [visible, setVisible] = useState(false);
  const gradientId = useRef(`spark-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const points = data && data.length > 1 ? data : [0, 0];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const fill = `${line} L${width},${height} L0,${height} Z`;

  const [length, setLength] = useState(0);
  useEffect(() => {
    if (pathRef.current) setLength(pathRef.current.getTotalLength());
  }, [line]);

  const stroke = TONES[tone] || TONES.primary;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`overflow-visible ${className}`}
      role="img"
      aria-label="Trend"
    >
      <defs>
        <linearGradient id={gradientId.current} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && (
        <path
          d={fill}
          fill={`url(#${gradientId.current})`}
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 700ms ease 250ms",
          }}
        />
      )}
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: length || undefined,
          strokeDashoffset: visible ? 0 : length || undefined,
          transition: "stroke-dashoffset 1100ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </svg>
  );
}
