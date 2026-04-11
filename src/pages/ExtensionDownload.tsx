import { useState } from "react";
import { Download, Chrome, Shield, Zap, Gift, ArrowRight, CheckCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function ExtensionDownload() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    fetch("/kabali-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "kabali-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message))
      .finally(() => setDownloading(false));
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="relative px-6 py-16 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Chrome className="h-4 w-4" />
              Chrome Extension
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Earn While You Browse
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Kabali detects offers from brands you already visit and rewards you with points.
              No extra effort — just browse as usual.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              {downloading ? "Downloading..." : "Download Extension"}
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              Works on Chrome, Edge, Brave, Arc & all Chromium browsers
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "Auto-Detection", desc: "Automatically finds offers matching sites you visit" },
            { icon: Gift, title: "Earn Points", desc: "Get rewarded for signups, clicks, and purchases you'd do anyway" },
            { icon: Shield, title: "Privacy First", desc: "We never sell your data. Tracking is campaign-specific only" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Install Steps */}
        <div className="mt-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">How to Install</h2>
          <div className="space-y-3">
            {[
              "Download and unzip the extension file",
              'Open chrome://extensions in your browser',
              "Enable Developer mode (toggle in top-right)",
              'Click "Load unpacked" and select the unzipped folder',
              "Sign in and start earning!",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="pt-1 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 pb-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">How It Works</h2>
          <div className="space-y-3">
            {[
              "You browse the web normally",
              "Kabali checks if the site has an active campaign",
              "If there's an offer, you see a notification badge",
              "Click the extension to view and claim the offer",
              "Complete the action (signup, download, etc.)",
              "Points are credited to your account automatically",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <span>{step}</span>
                {i < 5 && <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-30" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
