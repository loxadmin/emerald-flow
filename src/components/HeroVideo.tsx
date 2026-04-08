import { useEffect, useRef } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl neon-border">
      {/* Scan line overlay */}
      <div className="scan-line pointer-events-none absolute inset-0 z-20" />

      {/* Top/bottom vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 hero-vignette rounded-2xl" />

      {/* Corner accents */}
      <div className="absolute left-0 top-0 z-20 h-8 w-[1px] bg-gradient-to-b from-primary/60 to-transparent" />
      <div className="absolute left-0 top-0 z-20 h-[1px] w-8 bg-gradient-to-r from-primary/60 to-transparent" />
      <div className="absolute right-0 bottom-0 z-20 h-8 w-[1px] bg-gradient-to-t from-primary/60 to-transparent" />
      <div className="absolute right-0 bottom-0 z-20 h-[1px] w-8 bg-gradient-to-l from-primary/60 to-transparent" />

      <div className="aspect-video w-full bg-muted">
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

      {/* Status badge */}
      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div className="futuristic-label">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="whitespace-nowrap">Migrating customers in real-time</span>
        </div>
      </div>
    </div>
  );
}
