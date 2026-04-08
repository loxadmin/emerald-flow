import { useRef, useEffect } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/20 shadow-2xl shadow-primary/10">
      <video
        ref={videoRef}
        src="/hero-animation.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto block"
        style={{ minHeight: 300 }}
      />
      {/* Overlay status badges */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 text-sm border border-border/30">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-foreground font-medium">Migrating customers in real-time</span>
        </div>
      </div>
    </div>
  );
}
