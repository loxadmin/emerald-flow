import heroBackground from "@/assets/hero-bg.png";
import MigrationAnimation from "@/components/MigrationAnimation";

export default function LandingHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      {/* Outer frame with glow */}
      <div className="relative rounded-[2rem] border border-border/30 bg-card/60 p-2 shadow-[0_24px_80px_hsl(var(--primary)/0.12)]">
        {/* Inner scene — the reference illustration as background with 3D animation overlaid */}
        <div className="relative overflow-hidden rounded-[1.6rem]">
          {/* Background illustration */}
          <img
            src={heroBackground}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />

          {/* 3D animation overlay */}
          <div className="relative z-10">
            <MigrationAnimation />
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div className="absolute -bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/30 bg-background/90 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
        Migrating customers in real-time.
      </div>
    </div>
  );
}
