import { useEffect, useRef } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[2.4rem] border border-border/25 bg-card shadow-[0_32px_80px_hsl(var(--foreground)/0.18)]">
      <div className="absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-background/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-background/35 to-transparent" />

      <div className="aspect-[16/11] w-full bg-muted">
        <video
          ref={videoRef}
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[2.4rem] ring-1 ring-inset ring-border/10" />

      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="whitespace-nowrap">Migrating customers in real-time</span>
        </div>
      </div>
    </div>
  );
}
