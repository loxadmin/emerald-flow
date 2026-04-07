import MigrationAnimation from "@/components/MigrationAnimation";

const frameStyle = {
  background:
    "linear-gradient(180deg, hsl(var(--card) / 0.96) 0%, hsl(var(--background) / 0.96) 100%)",
  boxShadow:
    "0 32px 90px hsl(var(--background) / 0.55), inset 0 1px 0 hsl(var(--foreground) / 0.05)",
} as const;

const sceneStyle = {
  background: `
    radial-gradient(circle at 22% 22%, hsl(var(--primary) / 0.18), transparent 0 18%),
    radial-gradient(circle at 76% 18%, hsl(var(--primary) / 0.14), transparent 0 26%),
    radial-gradient(circle at 58% 52%, hsl(var(--primary) / 0.08), transparent 0 18%),
    linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)
  `,
} as const;

const riverStyle = {
  background:
    "linear-gradient(180deg, hsl(var(--primary) / 0.32) 0%, hsl(var(--primary) / 0.14) 100%)",
  boxShadow: "inset 0 0 0 1px hsl(var(--foreground) / 0.04)",
} as const;

const groundStyle = {
  background:
    "linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--primary) / 0.1) 100%)",
} as const;

const plaqueStyle = {
  background:
    "linear-gradient(180deg, hsl(var(--card) / 0.96) 0%, hsl(var(--background) / 0.96) 100%)",
  boxShadow: "0 20px 50px hsl(var(--background) / 0.45)",
} as const;

export default function LandingHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div
        className="absolute -left-[8%] top-[16%] h-48 w-48 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.14)" }}
        aria-hidden
      />
      <div
        className="absolute -right-[6%] top-[8%] h-56 w-56 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.1)" }}
        aria-hidden
      />

      <div className="relative rounded-[2.3rem] border border-border/30 p-3" style={frameStyle}>
        <div className="relative overflow-hidden rounded-[1.9rem] border border-border/25" style={sceneStyle}>
          <div className="absolute inset-x-0 bottom-0 h-[34%]" style={groundStyle} aria-hidden />

          <div
            className="absolute left-[5%] top-[42%] h-[28%] w-[22%] rounded-[1.6rem] border border-border/25 p-3"
            style={{ background: "hsl(var(--card) / 0.52)" }}
            aria-hidden
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex gap-2">
                <div className="h-10 w-10 rounded-xl border border-border/25 bg-background/50" />
                <div className="h-8 w-8 rounded-lg border border-border/20 bg-background/35" />
              </div>
              <div className="rounded-xl border border-border/30 bg-background/70 px-3 py-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-foreground/90 md:text-[0.7rem]">
                Competitor Brand
              </div>
            </div>
          </div>

          <div className="absolute left-[42%] top-[8%] h-[72%] w-[15%] rounded-[999px]" style={riverStyle} aria-hidden />

          <div className="absolute left-[31%] bottom-[17%] h-[20%] w-[34%]" aria-hidden>
            <div className="absolute inset-x-[8%] bottom-0 h-[55%] rounded-t-full border-x border-t border-border/30 bg-card/65" />
            <div className="absolute inset-x-[16%] bottom-[15%] h-[11%] rounded-full bg-background/75" />
          </div>

          <div
            className="absolute right-[4%] top-[8%] h-[58%] w-[37%] rounded-[2.1rem] border border-border/25 p-4"
            style={{ background: "hsl(var(--card) / 0.58)" }}
            aria-hidden
          >
            <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] border border-border/20 bg-background/30">
              <div className="absolute inset-x-[10%] top-[8%] h-[18%] rounded-[1.2rem] bg-background/20" />
              <div className="absolute inset-x-[12%] bottom-[16%] top-[18%] grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[1rem] border border-border/20"
                    style={{
                      background:
                        index % 2 === 0
                          ? "linear-gradient(180deg, hsl(var(--primary) / 0.28) 0%, hsl(var(--primary) / 0.12) 100%)"
                          : "linear-gradient(180deg, hsl(var(--background) / 0.65) 0%, hsl(var(--card) / 0.5) 100%)",
                    }}
                  />
                ))}
              </div>
              <div className="absolute inset-x-[19%] bottom-[10%] h-[20%] rounded-t-[999px] border border-border/25 bg-card/75" />
              <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded-full border border-border/30 bg-background/92 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-foreground md:text-[0.72rem]">
                Your Brand
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 pt-5 pb-2 md:px-5 md:pt-8">
            <div className="scale-[0.96] origin-center md:scale-100">
              <MigrationAnimation />
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-[-1.2rem] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-[1rem] border border-border/35 px-5 py-2 text-xs font-medium text-foreground/90 md:text-sm"
        style={plaqueStyle}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        Migrating customers in real-time.
      </div>
    </div>
  );
}
