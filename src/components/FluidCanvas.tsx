import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
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

    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const blobs = Array.from({ length: 6 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      r: 200 + Math.random() * 300,
      phase: Math.random() * Math.PI * 2,
    }));

    const caustics = Array.from({ length: 12 }, () => ({
      x: Math.random(),
      y: Math.random(),
      rotation: Math.random() * Math.PI * 2,
      size: 40 + Math.random() * 100,
      sides: 3 + Math.floor(Math.random() * 3),
      speed: 0.0001 + Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      time += 0.005;
      const scroll = scrollRef.current;

      ctx.fillStyle = isDark ? "hsl(165, 30%, 4%)" : "hsl(150, 10%, 96%)";
      ctx.fillRect(0, 0, W, H);

      const blobOpacity = isDark ? 0.04 : 0.03;
      blobs.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -0.2 || b.x > 1.2) b.vx *= -1;
        if (b.y < -0.2 || b.y > 1.2) b.vy *= -1;

        const pulse = b.r + Math.sin(time * 0.8 + b.phase) * 40;
        const grad = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, pulse);
        const hue = 160;
        grad.addColorStop(0, `hsla(${hue}, 80%, 50%, ${blobOpacity})`);
        grad.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      const causticBaseOpacity = isDark ? 0.012 : 0.015;
      caustics.forEach((c) => {
        c.rotation += c.speed;
        const opacity = causticBaseOpacity + Math.sin(time * 1.5 + c.phase) * 0.005;
        const cx = c.x * W;
        const cy = (c.y * H + scroll * 0.05) % H;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(c.rotation);
        ctx.beginPath();
        for (let i = 0; i <= c.sides; i++) {
          const angle = (i / c.sides) * Math.PI * 2;
          const distort = 1 + Math.sin(time * 2 + angle * 3) * 0.1;
          const px = Math.cos(angle) * c.size * distort;
          const py = Math.sin(angle) * c.size * distort;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = isDark ? `hsla(160, 100%, 70%, ${opacity})` : `hsla(160, 100%, 40%, ${opacity})`;
        ctx.fill();
        ctx.restore();
      });

      const waveConfigs = [
        { amp: 40, freq: 0.002, speed: 0.3, yOffset: 0.7, opacity: isDark ? 0.05 : 0.04 },
        { amp: 30, freq: 0.004, speed: 0.5, yOffset: 0.75, opacity: isDark ? 0.04 : 0.03 },
        { amp: 50, freq: 0.003, speed: 0.2, yOffset: 0.82, opacity: isDark ? 0.03 : 0.02 },
        { amp: 25, freq: 0.005, speed: 0.7, yOffset: 0.88, opacity: isDark ? 0.04 : 0.03 },
      ];

      waveConfigs.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        const scrollShift = scroll * (w.yOffset * 0.15);
        for (let x = 0; x <= W; x += 5) {
          const y =
            H * w.yOffset +
            Math.sin(x * w.freq + time * w.speed + scroll * 0.002) * w.amp +
            Math.cos(x * w.freq * 0.8 + time * w.speed * 1.2) * w.amp * 0.6 -
            scrollShift;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, H * w.yOffset - w.amp - scrollShift, 0, H);
        const hue = 160;
        grad.addColorStop(0, `hsla(${hue}, 70%, 50%, ${w.opacity})`);
        grad.addColorStop(1, `hsla(${hue}, 70%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="fluid-canvas"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-[1px]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      <div className="noise pointer-events-none fixed inset-0 z-[2] opacity-30 mix-blend-overlay" />
    </>
  );
}
