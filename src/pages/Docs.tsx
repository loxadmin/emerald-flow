import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Check, X } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import ModeBanner from "@/components/ModeBanner";
import { useManualMode } from "@/lib/use-manual-mode";
import { useAuth } from "@/lib/auth";

const NAV = [
  { id: "overview", title: "Overview" },
  { id: "modes", title: "Simple vs Advance" },
  { id: "simple", title: "Simple mode" },
  { id: "advance", title: "Advance mode" },
  { id: "metrics", title: "Metrics & attribution" },
  { id: "milestones", title: "Milestones" },
  { id: "billing", title: "Billing & escrow" },
  { id: "wallet", title: "Wallet & fees" },
  { id: "approval", title: "Approval flow" },
  { id: "faq", title: "FAQ" },
];

function Row({ label, simple, advance }: { label: string; simple: string; advance: string }) {
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-6 text-sm font-medium text-foreground align-top w-48">{label}</td>
      <td className="py-3 pr-6 text-sm text-foreground/75 align-top">{simple}</td>
      <td className="py-3 text-sm text-foreground/75 align-top">{advance}</td>
    </tr>
  );
}

function MetricRow({ metric, simple, advance }: { metric: string; simple: string; advance: string }) {
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-6 text-sm font-medium text-foreground align-top w-40">{metric}</td>
      <td className="py-3 pr-6 text-sm text-foreground/75 align-top">{simple}</td>
      <td className="py-3 text-sm text-foreground/75 align-top">{advance}</td>
    </tr>
  );
}

export default function Docs() {
  const manual = useManualMode();
  const { session } = useAuth();
  const brandedBaseUrl = "https://advertiser.karbali.com";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Karbali Ads — Docs, metrics & tracking guide</title>
        <meta name="description" content="Karbali Ads documentation: Simple mode (manual approval) vs Advance mode (API tracking), metrics, milestones, billing and escrow." />
      </Helmet>

      <header className="border-b border-border sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-base font-semibold">Karbali Ads</span>
          </Link>
          <Link to={session ? "/dashboard" : "/"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {session ? "Dashboard" : "Home"}
          </Link>
        </div>
      </header>

      <div className="border-b border-border pb-6 pt-8">
        <ModeBanner />
      </div>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-14">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">On this page</p>
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="block rounded px-2 py-1.5 text-sm text-foreground/70 hover:bg-muted hover:text-foreground">
                {n.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Reading column */}
        <article className="min-w-0 flex-1 space-y-20">
          <section id="overview">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documentation</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              How Karbali Ads works
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-foreground/75">
              Karbali is a performance advertising platform for Nigerian brands. You fund a wallet, launch a campaign, and only pay for real outcomes — installs, signups, sales, streams, watch-time, or verified attention. Two modes decide how those outcomes are recorded.
            </p>
          </section>

          <section id="modes">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Simple vs Advance</h2>
            <p className="mt-3 text-sm text-foreground/70">
              Karbali runs in one of two modes at any time. The active mode is set by Karbali's team and shown in the banner above.
              {manual === true && " Right now: Simple mode."}
              {manual === false && " Right now: Advance mode."}
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground" />
                    <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Simple mode</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Advance mode</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Setup effort" simple="Paste a link. Done." advance="Install JS snippet or WordPress plugin." />
                  <Row label="Tracking method" simple="Karbali officials record every valid outcome by hand from the source of truth (your app store, your dashboard, your streaming numbers)." advance="Deterministic tracking ID + fires conversion events server-side." />
                  <Row label="Approval" simple="Every campaign is reviewed and approved by a Karbali official (typically within 12 hours)." advance="Auto-approved once the integration scan confirms the tracker is live." />
                  <Row label="Latency to first result" simple="Batched — updated daily by the review team." advance="Near real-time." />
                  <Row label="Fraud protection" simple="Human review + cross-check against source-of-truth counters." advance="Automatic bot / duplicate / IP-throttle filters + human spot-check." />
                  <Row label="Best for" simple="Musicians, YouTubers, offline brands, and anyone without an engineering team." advance="Apps, websites, fintechs, and e-commerce stores that can drop a script." />
                </tbody>
              </table>
            </div>
          </section>

          <section id="simple">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Simple mode (manual approval)</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/75">
              <p>You only need one thing: the link to whatever you are promoting.</p>
              <ul className="space-y-2 pl-5 list-disc marker:text-muted-foreground">
                <li><strong className="text-foreground">Mobile app</strong> → Play Store / App Store / TestFlight URL.</li>
                <li><strong className="text-foreground">Website / product</strong> → the landing page URL.</li>
                <li><strong className="text-foreground">Music</strong> → up to 3 streaming links (Spotify, Audiomack, Apple Music) plus the lyrics.</li>
                <li><strong className="text-foreground">Video</strong> → the YouTube / social link plus the script.</li>
              </ul>
              <p>Submit the campaign. A Karbali official reviews the destination, approves the campaign, and records outcomes daily against the source of truth (your store dashboard, your streaming counter, your CRM). You are only billed for outcomes recorded by the reviewer.</p>
              <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs">
                Simple mode does not require the Karbali tracker script. If you have an engineering team and want live numbers, ask an admin to switch you to Advance mode.
              </p>
            </div>
          </section>

          <section id="advance">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Advance mode (API tracking)</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/75">
              <p>Add the Karbali loader to your site or use the WordPress plugin. Events fire automatically and appear in your dashboard in near real-time.</p>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Install snippet</p>
                <pre className="overflow-x-auto text-xs leading-relaxed text-foreground/80">{`<script>
  window.KarbaliConfig = { apiKey: "kb_your_api_key", campaignId: "cmp_your_campaign_id" };
</script>
<script async src="${brandedBaseUrl}/karbali-tracker/c/cmp_your_campaign_id.js"></script>`}</pre>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Fire events</p>
                <pre className="overflow-x-auto text-xs leading-relaxed text-foreground/80">{`window.Karbali.identify("user_123");
window.Karbali.trackSignup("user_123");
window.Karbali.trackDownload("user_123");
window.Karbali.trackPurchase({ user_id: "user_123", amount: 49.99 });`}</pre>
              </div>
              <p>Verification checks that both the loader script and the API key are live on your verified domain. Once verified, the campaign auto-activates.</p>
            </div>
          </section>

          <section id="metrics">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Metrics & attribution</h2>
            <p className="mt-3 text-sm text-foreground/70">How each metric is measured under each mode.</p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Metric</th>
                    <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Simple mode</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">Advance mode</th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow metric="Click" simple="Not billed — used only for reach reporting." advance="Not billed. Recorded server-side, throttled per IP." />
                  <MetricRow metric="Valid click" simple="Manually spot-checked; only used to compute funnel." advance="Deduplicated per user + campaign within 1 hour; bots filtered." />
                  <MetricRow metric="App install" simple="Reviewer pulls install counts from your Play Store / App Store console daily." advance="Fires from the mobile SDK on first open; deduplicated per device." />
                  <MetricRow metric="Signup" simple="Reviewer verifies against your CRM export or dashboard." advance="Fires on successful signup form submit." />
                  <MetricRow metric="KYC / Deposit" simple="Reviewer verifies against your fintech dashboard." advance="Fires from your backend via server-to-server call." />
                  <MetricRow metric="Sale / Purchase" simple="Reviewer verifies against your order export." advance="Fires at checkout success. Commission billed at that moment." />
                  <MetricRow metric="Music stream" simple="Reviewer cross-checks streaming platform counters + validates attention via listen-time quiz." advance="Not available — music always runs in the engagement flow." />
                  <MetricRow metric="Video view" simple="Reviewer validates watch-time + quiz completion." advance="Not available — video always runs in the engagement flow." />
                </tbody>
              </table>
            </div>
          </section>

          <section id="milestones">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Milestones</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              A campaign can bill on one or more milestones. Some milestones are flat-priced per outcome (install, signup, KYC, deposit); sales are commission-based (a percentage of the sale value). Engagement milestones (streams, views, watch-time) run over a chosen duration.
            </p>
          </section>

          <section id="billing">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Billing & escrow</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/75">
              <p>Karbali holds campaign cost in escrow. When you submit a campaign, the estimated cost is deducted from your wallet and released only as validated outcomes come in.</p>
              <ul className="space-y-2 pl-5 list-disc marker:text-muted-foreground">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>You pay only for outcomes Karbali confirms.</span></li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>Unused escrow is refunded to your wallet when the campaign ends or is cancelled before approval.</span></li>
                <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> <span>Filtered / invalid / duplicate outcomes are never billed.</span></li>
              </ul>
            </div>
          </section>

          <section id="wallet">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Wallet & fees</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/75 pl-5 list-disc marker:text-muted-foreground">
              <li>Wallet activation: a one-time <strong className="text-foreground">$25</strong> applies to all categories. This amount is credited to your balance.</li>
              <li>Commerce campaigns: minimum <strong className="text-foreground">$200</strong> wallet + a flat fee and a commission on each sale.</li>
              <li>Offline offers: <strong className="text-foreground">$100</strong> submission escrow, <strong className="text-foreground">$300</strong> minimum wallet, 0.5% commission per order.</li>
              <li>Top-up via Paystack or Flutterwave. Gateway fees are not refundable.</li>
              <li>Campaign approval: every campaign or ad package is manually reviewed by a Karbali official and typically approved within <strong className="text-foreground">3–7 business days</strong>.</li>
              <li>Withdrawals: request payout of your available balance any time from the Wallet page. Funds locked in escrow for active campaigns cannot be withdrawn.</li>
            </ul>
          </section>

          <section id="approval">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Approval flow</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/75 pl-5 list-decimal marker:text-muted-foreground">
              <li>Advertiser submits a campaign (draft → submitted).</li>
              <li>Karbali checks the destination and, in Advance mode, verifies the tracker is live on the verified domain.</li>
              <li>Escrow is held from the wallet.</li>
              <li>Campaign goes live. Outcomes stream in (Advance) or are recorded daily by review (Simple).</li>
              <li>Campaign ends when target is met, wallet is empty, or advertiser stops it. Unused escrow refunds.</li>
            </ol>
          </section>

          <section id="faq">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">FAQ</h2>
            <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground/75">
              <div>
                <p className="text-foreground font-medium">Does Karbali bill for clicks?</p>
                <p className="mt-1">No. Karbali is CPA / outcome-based only. Clicks are free and used for reach reporting.</p>
              </div>
              <div>
                <p className="text-foreground font-medium">Can I move between Simple and Advance mode?</p>
                <p className="mt-1">The active mode is a platform-wide setting today. Individual accounts are moved by Karbali's team on request.</p>
              </div>
              <div>
                <p className="text-foreground font-medium">What happens if my tracker breaks in Advance mode?</p>
                <p className="mt-1">Our health monitor pings every 5 minutes and alerts you. The campaign pauses if the tracker is unreachable for too long so you don't burn budget with no attribution.</p>
              </div>
              <div>
                <p className="text-foreground font-medium">Which milestones can I skip?</p>
                <p className="mt-1">Any of them, with one exception: mobile-app orders must always include App Install. You can skip signup, KYC, and deposit and jump straight to engagement.</p>
              </div>
            </div>
          </section>
        </article>
      </div>

      <Footer />
    </div>
  );
}
