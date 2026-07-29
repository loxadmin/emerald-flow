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

/** Cardinal-spline smoothing so the trace reads as a curve, not a zig-zag. */
function smoothPath(coords: readonly (readonly [number, number])[], tension = 0.22): string {
  if (coords.length < 2) return "";
  let d = `M${coords[0][0].toFixed(2)},${coords[0][1].toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/**
 * Lightweight SVG sparkline whose line draws itself when scrolled into view.
 * Responsive: scales to its container via preserveAspectRatio="none".
 * Enhanced: features continuous dynamic live wiggling / flowing waves when visible.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 36,
  tone = "primary",
  area = true,
  className = "",
  strokeWidth = 1.25,
}: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(0);
  const gradientId = useRef(`spark-${Math.random().toString(36).slice(2, 9)}`);

  // Intersection Observer for visibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Request Animation Frame loop for continuous live motion when visible
  useEffect(() => {
    if (!visible) return;
    let frameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      // Advance wave time smoothly
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime((prev) => (prev + delta * 3.5) % (Math.PI * 2));
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [visible]);

  const points = data && data.length > 1 ? data : [0, 0];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);

  // Calculate coordinates with dynamic wave wiggling (anchored at start and end)
  const coords = points.map((v, i) => {
    const x = i * stepX;
    const baseRawY = height - 3 - ((v - min) / span) * (height - 6);

    // Anchor factor: 0 at first and last, peak of 1 in middle
    const anchorFactor = Math.sin((i / (points.length - 1)) * Math.PI);
    // Dynamic sine wave wiggle
    const wiggle = Math.sin(time + i * 0.7) * 2.2 * anchorFactor;

    const y = Math.max(2, Math.min(height - 2, baseRawY + (visible ? wiggle : 0)));
    return [x, y] as const;
  });

  const line = smoothPath(coords);
  const fill = `${line} L${width},${height} L0,${height} Z`;

  const [length, setLength] = useState(0);
  useEffect(() => {
    if (pathRef.current) {
      try {
        setLength(pathRef.current.getTotalLength());
      } catch (e) {
        // Fallback for environment constraints where getTotalLength might throw or be undefined
        setLength(width * 1.5);
      }
    }
  }, [line, width]);

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
          transition: length ? "stroke-dashoffset 1100ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
        }}
      />
    </svg>
  );
}
