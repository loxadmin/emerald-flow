import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GiftBox from "@/components/GiftBox";

const SEEN_KEY = "karbali_gift_reveal_seen";

const RIBBONS = Array.from({ length: 22 });

/**
 * "You've got a package" reveal: a wrapped gift shakes, pops open and throws a
 * ribbon burst, then invites the advertiser into the ad packages page.
 */
export default function GiftReveal({ count }: { count: number }) {
  const [show, setShow] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-2xl animate-scale-in">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {opened && (
          <div className="pointer-events-none absolute inset-0">
            {RIBBONS.map((_, i) => (
              <span
                key={i}
                className="ribbon-piece"
                style={{
                  left: `${(i * 4.4 + 5) % 95}%`,
                  animationDelay: `${(i % 7) * 0.08}s`,
                  background: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--primary) / 0.55)" : "hsl(var(--foreground) / 0.25)",
                }}
              />
            ))}
          </div>
        )}

        <div className="relative flex justify-center pt-6">
          <GiftBox size={110} shake={!opened} open={opened} />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {opened ? "Unwrapped" : "You have a gift"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {opened ? `${count} ready-made ${count === 1 ? "package" : "packages"} for you` : "A package is waiting for you"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {opened
            ? "Pick your milestones, set your volume and go live in a few clicks — no campaign build needed."
            : "We wrapped up ready-to-run ad packages for your category. Open it."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {opened ? (
            <Link to="/packages" onClick={close}>
              <Button className="w-full rounded-full font-semibold">See my packages</Button>
            </Link>
          ) : (
            <Button className="w-full rounded-full font-semibold" onClick={() => setOpened(true)}>
              Open the gift
            </Button>
          )}
          <button onClick={close} className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
