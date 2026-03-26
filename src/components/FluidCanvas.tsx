import { useEffect, useRef } from "react";

export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Light blobs
    const blobs = Array.from({ length: 5 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      r: 150 + Math.random() * 200,
      phase: Math.random() * Math.PI * 2,
    }));

    // Caustic polygons
    const caustics = Array.from({ length: 8 }, () => ({
      x: Math.random(),
      y: Math.random(),
      rotation: Math.random() * Math.PI * 2,
      size: 60 + Math.random() * 120,
      sides: 3 + Math.floor(Math.random() * 4),
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      time += 0.008;
      const scroll = scrollRef.current * 0.1;

      // Clear
      ctx.fillStyle = "hsl(165, 30%, 4%)";
      ctx.fillRect(0, 0, W, H);

      // Draw light blobs
      blobs.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -0.1 || b.x > 1.1) b.vx *= -1;
        if (b.y < -0.1 || b.y > 1.1) b.vy *= -1;
        const pulse = b.r + Math.sin(time * 1.5 + b.phase) * 30;
        const grad = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, pulse);
        grad.addColorStop(0, "hsla(160, 80%, 45%, 0.05)");
        grad.addColorStop(1, "hsla(160, 80%, 45%, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      // Caustic polygons
      caustics.forEach((c) => {
        c.rotation += c.speed;
        const opacity = 0.015 + Math.sin(time * 2 + c.phase) * 0.01;
        const cx = c.x * W;
        const cy = c.y * H;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(c.rotation);
        ctx.beginPath();
        for (let i = 0; i <= c.sides; i++) {
          const angle = (i / c.sides) * Math.PI * 2;
          const distort = 1 + Math.sin(time * 3 + angle * 2) * 0.15;
          const px = Math.cos(angle) * c.size * distort;
          const py = Math.sin(angle) * c.size * distort;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(160, 70%, 50%, ${opacity})`;
        ctx.fill();
        ctx.restore();
      });

      // Wave layers
      const waveConfigs = [
        { amp: 30, freq: 0.003, speed: 0.4, yOffset: 0.75, opacity: 0.06 },
        { amp: 20, freq: 0.005, speed: 0.6, yOffset: 0.78, opacity: 0.04 },
        { amp: 25, freq: 0.004, speed: 0.3, yOffset: 0.82, opacity: 0.05 },
        { amp: 15, freq: 0.006, speed: 0.8, yOffset: 0.86, opacity: 0.03 },
      ];

      waveConfigs.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 3) {
          const y =
            H * w.yOffset +
            Math.sin(x * w.freq + time * w.speed + scroll * 0.01) * w.amp +
            Math.cos(x * w.freq * 0.7 + time * w.speed * 1.3) * w.amp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, H * w.yOffset - w.amp, 0, H);
        grad.addColorStop(0, `hsla(160, 80%, 40%, ${w.opacity})`);
        grad.addColorStop(1, `hsla(160, 80%, 30%, 0)`);
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
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Glass overlay layer */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background: "linear-gradient(180deg, hsla(165,20%,8%,0.3) 0%, hsla(165,30%,4%,0.6) 100%)",
          backdropFilter: "blur(0.5px)",
        }}
      />
    </>
  );
}
