import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useManualMode } from "@/lib/use-manual-mode";

// Live banner surfaced on the homepage and docs.
// Reflects whichever mode Karbali is currently running so advertisers
// know upfront whether they'll be integrating an SDK or just handing
// over a link for manual approval.
export default function ModeBanner({ compact = false }: { compact?: boolean }) {
  const manual = useManualMode();
  if (manual === null) return null;

  return (
    <div className={`mx-auto ${compact ? "max-w-3xl" : "max-w-6xl"} px-4`}>
      <div className="rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {manual ? "Simple mode is live" : "Advance mode is live"}
          </p>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            {manual
              ? "No SDK, no code. Submit your app, website, song or video link — a Karbali official reviews and approves your campaign manually."
              : "Full API attribution. Install the Karbali tracker (JS snippet or WordPress plugin) and events fire automatically. Auto-approval after integration check."}
            {" "}
            <Link to="/docs" className="font-medium text-primary hover:underline">Read the docs</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
