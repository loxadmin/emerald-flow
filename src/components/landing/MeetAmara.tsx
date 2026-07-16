import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Wallet, UtensilsCrossed, ShoppingBag, Check, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import amaraAsset from "@/assets/amara-character.png.asset.json";

type Step = {
  key: string;
  icon: typeof Car;
  category: string;
  currentBrand: string;
  targetBrand: string;
  milestone: string;
  contribution: number; // NGN
  color: string;
};

const GOAL = 2_000_000;

const STEPS: Step[] = [
  {
    key: "transport",
    icon: Car,
    category: "Transport",
    currentBrand: "Bolt",
    targetBrand: "Uber",
    milestone: "Use Uber for your rides over the next 90 days. Complete your first ride, then keep riding.",
    contribution: 260_000,
    color: "hsl(160 84% 39%)",
  },
  {
    key: "banking",
    icon: Wallet,
    category: "Banking",
    currentBrand: "OPay",
    targetBrand: "PalmPay",
    milestone: "Open a PalmPay account, complete your first transaction, and use it as your primary wallet for 30 days.",
    contribution: 320_000,
    color: "hsl(217 91% 60%)",
  },
  {
    key: "food",
    icon: UtensilsCrossed,
    category: "Food Delivery",
    currentBrand: "Chowdeck",
    targetBrand: "Glovo",
    milestone: "Order with Glovo three times this month.",
    contribution: 180_000,
    color: "hsl(38 92% 50%)",
  },
  {
    key: "shopping",
    icon: ShoppingBag,
    category: "Shopping",
    currentBrand: "Jumia",
    targetBrand: "Konga",
    milestone: "Make your next big purchase through Konga.",
    contribution: 280_000,
    color: "hsl(280 70% 55%)",
  },
];

const formatNaira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export default function MeetAmara() {
  const [active, setActive] = useState(0);
  const completed = STEPS.slice(0, active + 1);
  const raised = completed.reduce((s, x) => s + x.contribution, 0);
  const progress = Math.min(100, (raised / GOAL) * 100);
  const step = STEPS[active];

  return (
    <section className="relative py-24 sm:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-block text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-4">
            How Karbali migrates customers to brands
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Meet Amara <span className="inline-block">👋</span>
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            Amara works a 9–5 in Lagos and dreams of a December vacation. She sets a
            <span className="font-semibold text-foreground"> {formatNaira(GOAL)} Vacation Goal </span>
            on Karbali. Watch how her everyday spending funds it.
          </p>
        </div>

        {/* Storyboard */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12 items-stretch">
          {/* Amara character panel */}
          <div className="relative rounded-3xl bg-card border border-border overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative p-8 flex flex-col items-center text-center">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl" />
                <img
                  src={amaraAsset.url}
                  alt="Amara — a young Nigerian professional saving for her December vacation"
                  className="relative h-72 w-72 sm:h-80 sm:w-80 object-contain drop-shadow-2xl"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground">Amara Okafor</h3>
              <p className="text-xs text-muted-foreground">Lagos • Marketing Associate</p>

              {/* Goal progress */}
              <div className="mt-8 w-full max-w-sm">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    🏝️ Vacation goal
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                    {formatNaira(raised)} / {formatNaira(GOAL)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 20 }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-primary tabular-nums">
                  {progress.toFixed(0)}% funded
                </p>

                {/* Sponsor chips */}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.key}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        i <= active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {i <= active && <Check className="h-3 w-3" />} {s.targetBrand}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive step panel */}
          <div className="rounded-3xl bg-card border border-border p-8 flex flex-col">
            {/* Step index rail */}
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const state = i < active ? "done" : i === active ? "current" : "todo";
                return (
                  <button
                    key={s.key}
                    onClick={() => setActive(i)}
                    className={`group flex-1 flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                      state === "current"
                        ? "border-primary bg-primary/5"
                        : state === "done"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        state === "todo" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${
                      state === "current" ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {s.category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground line-through"
                  >
                    {step.currentBrand}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.targetBrand}
                  </span>
                </div>

                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  Switch to {step.targetBrand}
                </h3>
                <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {step.milestone}
                </p>

                <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Result
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Part of <span className="font-semibold" style={{ color: step.color }}>{step.targetBrand}</span>'s
                    customer acquisition budget funds Amara's vacation goal.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Contribution unlocked</span>
                    <span className="text-lg font-bold text-primary tabular-nums">
                      +{formatNaira(step.contribution)}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setActive((i) => Math.max(0, i - 1))}
                disabled={active === 0}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {active < STEPS.length - 1 ? (
                <button
                  onClick={() => setActive((i) => Math.min(STEPS.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Next milestone <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <PartyPopper className="h-4 w-4" /> Goal complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Closing line */}
        <div className="mt-16 mx-auto max-w-3xl text-center">
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Amara didn't earn cashback. She didn't watch ads. She simply switched from brands she
            already used to brands investing in her future. Every completed milestone unlocked
            more of her vacation fund.
          </p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            That's how Karbali acquires customers.
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto">
            We don't interrupt people with advertising. We identify what they're already using,
            create verified preference-switch milestones, and help brands migrate customers by
            becoming part of their success story.
          </p>
        </div>
      </div>
    </section>
  );
}
