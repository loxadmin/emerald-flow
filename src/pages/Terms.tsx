import { Link } from "react-router-dom";
import { Helmet } from "@/components/Seo";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

const SECTIONS: { id: string; title: string; body: (string | { warning: string })[] }[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    body: [
      "By creating an advertiser account on Karbali Ads (\"Karbali\", \"we\", \"us\"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the platform.",
      "You confirm you are the authorised representative of the business or brand you register, and that all information you supply is accurate.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    body: [
      "You must be at least 18 years old and legally able to enter contracts.",
      "Business advertisers must sign up with a matching business email and provide a live, working website they own.",
      "Offline advertisers must upload a valid CAC certificate for verification before running any offer.",
    ],
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable use",
    body: [
      "You may only promote products, apps, services and content that you legally own or are authorised to represent.",
      "All tracking links, install pages and destination URLs you provide must resolve to the real, live product you registered — no bait-and-switch, no cloaking, no redirect farms.",
      "You are responsible for ensuring your creative, offers, and destination pages comply with Nigerian law and any applicable local regulations.",
    ],
  },
  {
    id: "prohibited",
    title: "4. Prohibited content and conduct",
    body: [
      { warning: "Any of the following results in immediate account suspension, permanent ban, and forfeiture of any wallet or escrow balance held on the platform." },
      "Scam, fraud, phishing, Ponzi, HYIP, fake investment schemes, or any offer that misrepresents earnings or value.",
      "Malware, spyware, cryptojacking, drive-by downloads, or software that installs without clear user consent.",
      "Adult, pornographic, or sexually explicit material.",
      "Unlicensed gambling, betting, lottery or casino promotions.",
      "Sale of illegal drugs, prescription medication without licence, weapons, endangered wildlife, stolen goods, or counterfeit products.",
      "Hate speech, targeted harassment, incitement to violence, or content that promotes terrorism.",
      "Fake reviews, fake engagement, click farms, bot traffic, incentivised installs that violate the destination app store's policies, or any attempt to manipulate Karbali's tracking.",
      "Impersonation of another brand, celebrity or public figure without written authorisation.",
    ],
  },
  {
    id: "billing",
    title: "5. Wallet, billing & refunds",
    body: [
      "Karbali operates an escrow model. When a campaign is submitted, the estimated cost is held from your wallet and released to Karbali only as valid outcomes are recorded.",
      "Wallet top-ups are processed via Paystack or Flutterwave. Currency conversions, gateway fees, and stamp duties may apply and are non-refundable.",
      "Unused escrow is refunded to your wallet when a campaign ends or is cancelled by you before approval. Karbali does not refund funds spent on validated outcomes.",
      "In Simple (manual) mode, all campaign approvals and outcome counts are recorded by a Karbali official. You accept the recorded figures unless you raise a dispute within 7 days.",
    ],
  },
  {
    id: "tracking",
    title: "6. Tracking, data & attribution",
    body: [
      "You authorise Karbali to place tracking identifiers on your destination pages (in Advance mode) or to record manual events on your behalf (in Simple mode) strictly for attribution and billing.",
      "Karbali filters duplicate events, bot traffic, and known invalid patterns before billing you. Filtered events are not charged.",
      "You retain ownership of your customer data. Karbali stores only the minimum attribution identifiers required to bill and report.",
    ],
  },
  {
    id: "suspension",
    title: "7. Suspension and termination",
    body: [
      "Karbali may suspend or terminate your account at any time, with or without notice, if we reasonably believe you have breached these Terms.",
      "You may close your account at any time by contacting support. Any unspent wallet balance is refunded to your original funding method net of gateway fees, subject to fraud checks.",
      "For repeat or severe breaches — especially the categories listed in Section 4 — Karbali may report your details to law enforcement.",
    ],
  },
  {
    id: "liability",
    title: "8. Warranties and liability",
    body: [
      "The platform is provided \"as is\". Karbali does not guarantee a specific number of installs, sales, streams or conversions.",
      "To the maximum extent allowed by law, Karbali's total liability to you for any claim relating to the platform is capped at the amount you have paid Karbali in the 3 months preceding the claim.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes to these terms",
    body: [
      "Karbali may update these Terms from time to time. Material changes will be notified by email or in-app banner at least 7 days before they take effect.",
      "Continued use of the platform after changes take effect constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "contact",
    title: "10. Contact",
    body: [
      "Questions? Reach us at hello@karbali.com or through the in-app support chat.",
    ],
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms & Conditions — Karbali Ads</title>
        <meta name="description" content="Karbali Ads advertiser Terms & Conditions: acceptable use, prohibited content, billing, and suspension policies." />
      </Helmet>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-base font-semibold">Karbali Ads</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Terms & Conditions</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          These Terms govern your use of Karbali Ads as an advertiser. Read them carefully — especially Section 4 on prohibited content. Breaches of that section result in a permanent ban and forfeiture of any wallet balance.
        </p>

        <nav aria-label="Contents" className="mt-10 rounded-xl border border-border p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Contents</p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-foreground/80 hover:text-primary">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-14 space-y-14">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{s.title}</h2>
              <div className="mt-4 space-y-4">
                {s.body.map((item, i) =>
                  typeof item === "string" ? (
                    <p key={i} className="text-sm leading-relaxed text-foreground/75">{item}</p>
                  ) : (
                    <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive">
                      {item.warning}
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 border-t border-border pt-8 text-xs text-muted-foreground">
          By creating an account you confirm you have read, understood and agree to these Terms.
        </div>
      </main>

      <Footer />
    </div>
  );
}
