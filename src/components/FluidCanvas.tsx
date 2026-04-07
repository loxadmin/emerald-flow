import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const isDark = theme === "dark";

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Metaball-style liquid blobs
    const blobs = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      r: 150 + Math.random() * 250,
      phase: Math.random() * Math.PI * 2,
      hueShift: i * 3,
    }));

    // Liquid surface ripples
    const ripples = Array.from({ length: 5 }, () => ({
      cx: Math.random(),
      cy: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      amplitude: 20 + Math.random() * 30,
    }));

    const draw = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      time += 0.004;
      const scroll = scrollRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Background
      ctx.fillStyle = isDark ? "hsl(165, 30%, 4%)" : "hsl(150, 10%, 96%)";
      ctx.fillRect(0, 0, W, H);

      // === LIQUID METABALLS ===
      // Create offscreen for metaball calculation
      const blobAlpha = isDark ? 0.06 : 0.04;
      blobs.forEach((b) => {
        b.x += b.vx + (mx - 0.5) * 0.00005;
        b.y += b.vy + (my - 0.5) * 0.00005;
        if (b.x < -0.3 || b.x > 1.3) b.vx *= -1;
        if (b.y < -0.3 || b.y > 1.3) b.vy *= -1;

        // Organic pulsing
        const pulse = b.r + Math.sin(time * 0.6 + b.phase) * 50 + Math.sin(time * 1.1 + b.phase * 2) * 20;
        const bx = b.x * W;
        const by = b.y * H;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, pulse);
        const hue = 158 + b.hueShift;
        grad.addColorStop(0, `hsla(${hue}, 75%, ${isDark ? 50 : 40}%, ${blobAlpha * 1.5})`);
        grad.addColorStop(0.4, `hsla(${hue}, 70%, ${isDark ? 45 : 35}%, ${blobAlpha})`);
        grad.addColorStop(1, `hsla(${hue}, 65%, ${isDark ? 40 : 30}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      // === LIQUID CAUSTICS (organic, not geometric) ===
      const causticAlpha = isDark ? 0.018 : 0.02;
      for (let i = 0; i < 6; i++) {
        ctx.save();
        const cx = (0.15 + i * 0.14) * W + Math.sin(time * 0.3 + i * 1.5) * 60;
        const cy = (0.3 + Math.sin(time * 0.2 + i * 0.8) * 0.2) * H + scroll * 0.03;
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.1 + i);

        ctx.beginPath();
        const points = 60;
        for (let p = 0; p <= points; p++) {
          const angle = (p / points) * Math.PI * 2;
          const rBase = 60 + i * 20;
          const distort =
            Math.sin(angle * 3 + time * 1.5) * 0.3 +
            Math.sin(angle * 5 + time * 0.8) * 0.15 +
            Math.sin(angle * 7 + time * 2.1) * 0.08;
          const r = rBase * (1 + distort);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = isDark
          ? `hsla(160, 80%, 65%, ${causticAlpha + Math.sin(time * 1.2 + i) * 0.005})`
          : `hsla(160, 70%, 45%, ${causticAlpha + Math.sin(time * 1.2 + i) * 0.005})`;
        ctx.fill();
        ctx.restore();
      }

      // === LIQUID WAVES (smooth bezier curves, not sine segments) ===
      const waveConfigs = [
        { yBase: 0.65, amp: 50, freq: 1.5, speed: 0.2, opacity: isDark ? 0.06 : 0.05 },
        { yBase: 0.72, amp: 40, freq: 2.0, speed: 0.35, opacity: isDark ? 0.05 : 0.04 },
        { yBase: 0.80, amp: 55, freq: 1.2, speed: 0.15, opacity: isDark ? 0.04 : 0.035 },
        { yBase: 0.87, amp: 30, freq: 2.5, speed: 0.45, opacity: isDark ? 0.05 : 0.04 },
        { yBase: 0.93, amp: 20, freq: 3.0, speed: 0.6, opacity: isDark ? 0.03 : 0.025 },
      ];

      waveConfigs.forEach((w) => {
        const scrollShift = scroll * w.yBase * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, H);

        // Use many small segments for smooth liquid feel
        for (let x = 0; x <= W; x += 2) {
          const nx = x / W;
          const y =
            H * w.yBase +
            Math.sin(nx * Math.PI * w.freq + time * w.speed) * w.amp +
            Math.sin(nx * Math.PI * w.freq * 1.6 + time * w.speed * 1.3 + 1) * w.amp * 0.5 +
            Math.sin(nx * Math.PI * w.freq * 2.8 + time * w.speed * 0.7 + 2) * w.amp * 0.2 +
            Math.cos(nx * Math.PI * 0.5 + time * 0.1) * 15 -
            scrollShift;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(W, H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, H * w.yBase - w.amp - scrollShift, 0, H);
        grad.addColorStop(0, `hsla(160, 75%, ${isDark ? 50 : 40}%, ${w.opacity})`);
        grad.addColorStop(0.5, `hsla(162, 70%, ${isDark ? 45 : 35}%, ${w.opacity * 0.6})`);
        grad.addColorStop(1, `hsla(165, 65%, ${isDark ? 40 : 30}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // === SURFACE LIGHT REFLECTIONS ===
      const reflAlpha = isDark ? 0.02 : 0.015;
      ripples.forEach((r) => {
        const rx = r.cx * W + Math.sin(time * r.speed * 0.5) * 100;
        const ry = r.cy * H + Math.cos(time * r.speed * 0.3) * 60 + scroll * 0.02;
        const rSize = r.amplitude + Math.sin(time * r.speed + r.phase) * 15;

        const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rSize * 3);
        grad.addColorStop(0, `hsla(160, 60%, ${isDark ? 70 : 50}%, ${reflAlpha})`);
        grad.addColorStop(0.5, `hsla(160, 50%, ${isDark ? 60 : 40}%, ${reflAlpha * 0.3})`);
        grad.addColorStop(1, `hsla(160, 40%, 30%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
      />
      {/* Glass Layer Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-[1px]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 100%)",
        }}
      />
      {/* Noise Texture */}
      <div className="noise pointer-events-none fixed inset-0 z-[2] opacity-20 mix-blend-overlay" />
    </>
  );
}
