import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { draftKey, loadDraft, saveDraft, clearDraft } from "@/lib/draft-storage";
import {
  Globe, Smartphone, CheckCircle, Send, Loader2, Settings, Download, UserPlus, ShoppingCart, AlertCircle, Lock,
} from "lucide-react";
import PromoMediaUpload, { PromoMediaValue } from "@/components/PromoMediaUpload";
import { friendlyError } from "@/lib/errors";

interface Website { id: string; domain: string; is_verified: boolean; }
interface AdminPrices {
  price_per_download: number; price_per_signup: number; price_per_purchase: number; ad_placement_fee: number;
  min_price_per_download: number; min_price_per_signup: number; min_price_per_purchase: number;
}

const functionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: { text?: () => Promise<string> } } | null)?.context;
  if (context?.text) {
    try {
      const body = await context.text();
      const parsed = JSON.parse(body);
      return parsed?.error || parsed?.message || body || fallback;
    } catch {
      return (error as Error)?.message || fallback;
    }
  }
  return (error as Error)?.message || fallback;
};

interface ManualDraft {
  step: number;
  platformType: "website" | "mobile_app" | null;
  campaignName: string;
  targetUsers: string;
  milestones: string[];
  appLink: string;
  selectedWebsiteId: string | null;
  customPrices: { download?: number; signup?: number; purchase?: number };
}

export default function CreateManualCampaign() {
  const navigate = useNavigate();
  const { user, walletActivated } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Platform & subtype
  const [platformType, setPlatformType] = useState<"website" | "mobile_app" | null>(null);
  const [advertiserSubtype, setAdvertiserSubtype] = useState<string | null>(null);

  // Website
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");

  // Campaign config
  const [campaignName, setCampaignName] = useState("");
  const [targetUsers, setTargetUsers] = useState("100");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [appLink, setAppLink] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [prices, setPrices] = useState<AdminPrices>({
    price_per_download: 1, price_per_signup: 2, price_per_purchase: 5, ad_placement_fee: 2,
    min_price_per_download: 0.5, min_price_per_signup: 0.5, min_price_per_purchase: 1,
  });
  // Per-event prices the advertiser may raise above the admin floor
  const [customPrices, setCustomPrices] = useState<{ download?: number; signup?: number; purchase?: number }>({});
  const [promoMedia, setPromoMedia] = useState<PromoMediaValue>({ url: null, path: null, type: null });
  const restored = useRef(false);

  const dKey = draftKey(user?.id, "manual", null);

  // Restore from localStorage on mount
  useEffect(() => {
    if (restored.current || !user?.id) return;
    const saved = loadDraft<ManualDraft>(dKey);
    if (saved) {
      setStep(saved.step ?? 0);
      setPlatformType(saved.platformType ?? null);
      setCampaignName(saved.campaignName ?? "");
      setTargetUsers(saved.targetUsers ?? "100");
      setMilestones(saved.milestones ?? []);
      setAppLink(saved.appLink ?? "");
      setSelectedWebsiteId(saved.selectedWebsiteId ?? null);
      setCustomPrices(saved.customPrices ?? {});
    }
    restored.current = true;
  }, [user?.id, dKey]);

  // Persist on changes (after restore so we don't overwrite with empty initial state)
  useEffect(() => {
    if (!restored.current || !user?.id) return;
    const snapshot: ManualDraft = {
      step, platformType, campaignName, targetUsers, milestones, appLink,
      selectedWebsiteId, customPrices,
    };
    saveDraft(dKey, snapshot);
  }, [step, platformType, campaignName, targetUsers, milestones, appLink, selectedWebsiteId, customPrices, user?.id, dKey]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      // Detect advertiser subtype — only "app" owners see the download event
      const { data: cat } = await supabase
        .from("advertiser_categories")
        .select("advertiser_subtype")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      setAdvertiserSubtype((cat as any)?.advertiser_subtype ?? null);

      const { data: ws } = await supabase
        .from("advertiser_websites" as any)
        .select("id, domain, is_verified")
        .eq("advertiser_id", user.id)
        .eq("is_verified", true);
      const websites = (ws as any as Website[]) || [];
      setWebsites(websites);
      if (websites.length === 1 && !selectedWebsiteId) {
        setSelectedWebsiteId(websites[0].id);
        setSelectedDomain(websites[0].domain);
      }

      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", [
          "price_per_download", "price_per_signup", "price_per_purchase", "ad_placement_fee",
          "min_price_per_download", "min_price_per_signup", "min_price_per_purchase",
        ]);
      if (data) {
        const p = { ...prices };
        data.forEach((s: { key: string; value: string }) => {
          if (s.key in p) (p as Record<string, number>)[s.key] = Number(s.value);
        });
        setPrices(p);
      }

      const { data: w } = await supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle();
      if (w) setWalletBalance(Number(w.balance));
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Re-sync selected domain when website list arrives
  useEffect(() => {
    if (!selectedWebsiteId) return;
    const w = websites.find((w) => w.id === selectedWebsiteId);
    if (w) setSelectedDomain(w.domain);
  }, [selectedWebsiteId, websites]);

  const isAppOwner = advertiserSubtype === "app";

  // Auto-select + lock download for mobile-app owners with an app campaign
  useEffect(() => {
    if (platformType === "mobile_app" && isAppOwner && !milestones.includes("download")) {
      setMilestones((prev) => [...prev, "download"]);
    }
  }, [platformType, isAppOwner, milestones]);

  // Effective per-event price (custom override clamped to admin floor & default)
  const eventPrice = (event: "download" | "signup" | "purchase") => {
    const minKey = `min_price_per_${event}` as const;
    const baseKey = `price_per_${event}` as const;
    const floor = Number(prices[minKey]) || 0;
    const def = Number(prices[baseKey]) || floor;
    if (event === "purchase") return Math.max(floor, def, 1); // commerce-style reserve
    const requested = customPrices[event];
    return Math.max(floor, requested == null ? def : Number(requested));
  };

  const totalCost = (() => {
    const users = Math.max(100, Number(targetUsers) || 100);
    let milestoneTotal = 0;
    if (milestones.includes("download")) milestoneTotal += eventPrice("download");
    if (milestones.includes("signup")) milestoneTotal += eventPrice("signup");
    if (milestones.includes("purchase")) milestoneTotal += eventPrice("purchase");
    return milestoneTotal * users + prices.ad_placement_fee;
  })();

  const milestoneOptions = [
    // Only mobile-app owners ever see the download event
    ...(platformType === "mobile_app" && isAppOwner
      ? [{ id: "download", label: "App Downloads", priceLabel: `$${eventPrice("download").toFixed(2)} / user`, icon: Download, locked: true }]
      : []),
    { id: "signup", label: "Sign Ups", priceLabel: `$${eventPrice("signup").toFixed(2)} / user`, icon: UserPlus, locked: false },
    { id: "purchase", label: "Purchases", priceLabel: `$${eventPrice("purchase").toFixed(2)} reserve + 10% / sale`, icon: ShoppingCart, locked: false },
  ];

  const isValidAppLink = (link: string) => {
    const lower = link.toLowerCase();
    return (
      lower.includes("play.google.com") ||
      lower.includes("apps.apple.com") ||
      lower.includes("itunes.apple.com") ||
      lower.includes("testflight.apple.com")
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    if (milestones.length === 0) { toast.error("Select at least one goal"); return; }
    if (websites.length === 0) { toast.error("Please add and verify a website first"); navigate("/websites"); return; }
    if (!selectedWebsiteId) { toast.error("Please select a website"); return; }
    if (platformType === "mobile_app" && milestones.includes("download")) {
      if (!appLink.trim() || !isValidAppLink(appLink)) {
        toast.error("Please enter a valid App Store or Play Store link");
        return;
      }
    }
    const users = Number(targetUsers);
    if (users < 100) { toast.error("Minimum 100 target users"); return; }
    if (walletBalance < totalCost) {
      toast.error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${walletBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    // Create the campaign in manual mode
    const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
      advertiser_id: user.id,
      name: campaignName.trim(),
      budget_remaining: 0,
      integration_type: "manual",
      integration_verified: true, // manual campaigns don't need verification
      is_draft: false,
      ad_type: "performance",
      website_id: selectedWebsiteId,
      campaign_mode: "manual",
      platform_type: platformType,
      app_link: platformType === "mobile_app" ? appLink.trim() : null,
      target_users: users,
      selected_milestones: milestones,
      total_cost: totalCost,
      price_download: milestones.includes("download") ? eventPrice("download") : 0,
      price_signup: milestones.includes("signup") ? eventPrice("signup") : 0,
      price_purchase: milestones.includes("purchase") ? eventPrice("purchase") : 0,
      promo_media_url: promoMedia.url,
      promo_media_path: promoMedia.path,
      promo_media_type: promoMedia.type,
    } as any).select().single();

    if (campErr) { toast.error(friendlyError(campErr)); setLoading(false); return; }

    // Submit for escrow
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const { data: escrowResult, error: escrowError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "submit_campaign", campaign_id: campaign.id },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (escrowError || escrowResult?.error) {
      toast.error(escrowResult?.error || await functionErrorMessage(escrowError, "Failed to fund campaign escrow"));
      setLoading(false);
      return;
    }

    clearDraft(dKey);
    setLoading(false);
    toast.success("Campaign submitted for approval!");
    supabase.functions.invoke("notify", { body: { event: "campaign_submitted", payload: { campaign_id: campaign.id } } }).catch(() => {});
    navigate(`/campaigns/${campaign.id}`);
  };

  const STEPS = ["Platform", "Website", "Configure", "Submit"];

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Create Campaign</h1>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "border-2 border-primary text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Platform Type */}
        {step === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground">What type of platform is your campaign for?</h3>
              <p className="text-xs text-muted-foreground mt-1">This determines what goals are available</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setPlatformType("website"); setStep(1); setMilestones([]); }}
                className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 transition-colors"
              >
                <Globe className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">Website</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sign ups & purchases</p>
              </button>
              <button
                onClick={() => { setPlatformType("mobile_app"); setStep(1); setMilestones([]); }}
                className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 transition-colors"
              >
                <Smartphone className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">Mobile App</p>
                <p className="text-xs text-muted-foreground mt-0.5">Downloads, sign ups & purchases</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Select Website */}
        {step === 1 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Select Your Website
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Choose the verified website for this campaign</p>
            </div>
            {websites.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-sm text-muted-foreground mb-3">No verified websites found</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/websites")}>Add Website</Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {websites.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => { setSelectedWebsiteId(w.id); setSelectedDomain(w.domain); }}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                      selectedWebsiteId === w.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    }`}
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{w.domain}</span>
                    {selectedWebsiteId === w.id && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(2)} disabled={!selectedWebsiteId}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Campaign Configuration
              </h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Campaign" />
            </div>

            {platformType === "mobile_app" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">App Store / Play Store Link *</Label>
                <Input
                  value={appLink}
                  onChange={(e) => setAppLink(e.target.value)}
                  placeholder="https://play.google.com/store/apps/... or https://apps.apple.com/..."
                />
                {appLink && !isValidAppLink(appLink) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Must be an Apple App Store or Google Play Store link
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Target Users (min 100) *</Label>
              <Input type="number" min="100" value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Campaign Goals *</Label>
              {milestoneOptions.map((m) => {
                const checked = milestones.includes(m.id);
                const isDownload = m.id === "download";
                const isLockedDownload = isDownload && isAppOwner && platformType === "mobile_app";
                const evt = m.id as "download" | "signup" | "purchase";
                const floor =
                  evt === "purchase" ? eventPrice("purchase") : Number(prices[`min_price_per_${evt}` as const]);
                const showPriceInput = checked && evt !== "purchase";
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    }`}
                  >
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          disabled={isLockedDownload}
                          onCheckedChange={(c) => {
                            if (isLockedDownload) return;
                            setMilestones(c ? [...milestones, m.id] : milestones.filter((x) => x !== m.id));
                          }}
                        />
                        <m.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{m.label}</span>
                        {isLockedDownload && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <Badge variant="outline" className="text-xs">{m.priceLabel}</Badge>
                    </label>
                    {showPriceInput && (
                      <div className="mt-2 ml-6 flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">Your price ($):</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={floor}
                          value={customPrices[evt] ?? eventPrice(evt)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCustomPrices({ ...customPrices, [evt]: isNaN(val) ? undefined : val });
                          }}
                          className="h-8 w-28 text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground">min ${floor.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {platformType === "mobile_app" && isAppOwner && (
                <p className="text-xs text-muted-foreground">
                  App downloads are mandatory for mobile-app advertisers and cannot be deselected.
                </p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <p className="font-medium text-foreground text-xs">Cost Breakdown</p>
              {milestones.map((m) => {
                const opt = milestoneOptions.find((o) => o.id === m);
                return opt ? (
                  <div key={m} className="flex justify-between text-xs text-muted-foreground">
                    <span>{opt.label}</span>
                    <span className="text-foreground">{opt.priceLabel}</span>
                  </div>
                ) : null;
              })}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ad Placement Fee</span>
                <span className="text-foreground">${prices.ad_placement_fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between text-xs font-medium text-foreground">
                <span>Total</span>
                <span className="text-primary">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Balance</span>
                <span className={walletBalance >= totalCost ? "text-primary" : "text-destructive"}>
                  ${walletBalance.toFixed(2)} {walletBalance < totalCost && "(Insufficient)"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={milestones.length === 0 || !campaignName.trim()}>
                Review & Submit
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Review & Submit
              </h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {[
                { l: "Campaign Name", v: campaignName },
                { l: "Platform", v: platformType === "mobile_app" ? "Mobile App" : "Website" },
                { l: "Website", v: selectedDomain },
                ...(platformType === "mobile_app" && appLink ? [{ l: "App Link", v: appLink }] : []),
                { l: "Target Users", v: String(Number(targetUsers)) },
                { l: "Goals", v: milestones.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ") },
                { l: "Total Cost", v: `$${totalCost.toFixed(2)}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="text-foreground font-medium truncate ml-2 max-w-[200px]">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>Your campaign will be submitted for admin approval. Once approved, a referral link will be auto-generated and your campaign will go live.</p>
            </div>
            <PromoMediaUpload value={promoMedia} onChange={setPromoMedia} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading || walletBalance < totalCost}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit for Approval"}
              </Button>
            </div>
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
