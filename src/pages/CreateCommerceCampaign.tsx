import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Key, Code, CheckCircle, Send, Loader2, Copy, AlertCircle, Globe, ShoppingBag, Download, RotateCcw } from "lucide-react";
import JSZip from "jszip";

interface Website { id: string; domain: string; is_verified: boolean; }

const SALE_FLAT_FEE = 1;
const SALE_COMMISSION_RATE = 0.10;
const MIN_WALLET_BALANCE = 200;
const COMMISSION_BUFFER = 100; // Extra escrow held to cover unknown 10% commission on purchases

export default function CreateCommerceCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, walletActivated } = useAuth();
  const draftParam = searchParams.get("draft");
  const stepParam = searchParams.get("step");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [integrationType, setIntegrationType] = useState<"custom" | "wordpress">("custom");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [targetSales, setTargetSales] = useState("100");
  const [walletBalance, setWalletBalance] = useState(0);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");

  const syncDraftUrl = (draftId: string, nextStep: number) => {
    const currentStep = Number(stepParam ?? "0");
    if (draftParam === draftId && currentStep === nextStep) return;
    navigate(`/campaigns/create/commerce?draft=${draftId}&step=${nextStep}`, { replace: true });
  };

  const goToStep = (nextStep: number, draftId = campaignId) => {
    setStep(nextStep);
    if (draftId) syncDraftUrl(draftId, nextStep);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: ws } = await supabase.from("advertiser_websites" as any)
        .select("id, domain, is_verified").eq("advertiser_id", user.id).eq("is_verified", true);
      const websites = (ws as any as Website[]) || [];
      setWebsites(websites);
      if (websites.length === 1) { setSelectedWebsiteId(websites[0].id); setSelectedDomain(websites[0].domain); }

      const { data: w } = await supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle();
      if (w) setWalletBalance(Number(w.balance));

      let draftId = draftParam;
      const requestedStep = Number(stepParam ?? "0");

      if (!draftId) {
        const { data: existingDrafts } = await supabase.from("campaigns")
          .select("id")
          .eq("advertiser_id", user.id)
          .eq("is_draft", true)
          .eq("ad_type", "commerce")
          .order("created_at", { ascending: false })
          .limit(5);

        if (existingDrafts?.length) {
          for (const draft of existingDrafts) {
            const { count } = await supabase
              .from("api_keys")
              .select("id", { count: "exact", head: true })
              .eq("campaign_id", draft.id);

            if (count && count > 0) {
              draftId = draft.id;
              break;
            }
          }
        }
      }

      if (draftId) {
        const { data: draft } = await supabase.from("campaigns")
          .select("*").eq("id", draftId).eq("advertiser_id", user.id).eq("is_draft", true).maybeSingle();
        if (draft) {
          setCampaignId(draft.id);
          setCampaignName(draft.name === "Draft Commerce Campaign" ? "" : draft.name);
          setTargetSales(String(draft.target_users || 100));
          setIntegrationType((draft.integration_type as "custom" | "wordpress") || "custom");
          setVerified(draft.integration_verified || false);
          if (draft.website_id) setSelectedWebsiteId(draft.website_id);

          const { data: keys } = await supabase.from("api_keys").select("key").eq("campaign_id", draft.id).limit(1);
          if (keys && keys.length > 0) {
            setApiKey(keys[0].key);
            let nextStep = requestedStep >= 1 && requestedStep <= 4 ? requestedStep : 1;
            if (!draft.integration_verified) {
              nextStep = Math.min(nextStep, 2);
            } else {
              nextStep = Math.max(nextStep, 3);
            }
            goToStep(nextStep, draft.id);
          }
        }
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, draftParam, stepParam]);

  useEffect(() => {
    if (!selectedWebsiteId) return;
    const w = websites.find((w) => w.id === selectedWebsiteId);
    if (w) setSelectedDomain(w.domain);
  }, [selectedWebsiteId, websites]);

  const sales = Math.max(100, Number(targetSales) || 100);
  const baseCost = SALE_FLAT_FEE * sales;
  const totalCost = baseCost + COMMISSION_BUFFER;

  const handleGenerateKey = async () => {
    if (!user) return;
    if (walletActivated !== true) { toast.error("Activate your wallet first"); navigate("/wallet"); return; }
    if (walletBalance < MIN_WALLET_BALANCE) {
      toast.error(`Commerce Ads require a minimum wallet balance of $${MIN_WALLET_BALANCE}. You have $${walletBalance.toFixed(2)}.`);
      return;
    }
    if (websites.length === 0) { toast.error("Please add and verify a website first"); navigate("/websites"); return; }
    if (websites.length > 1 && !selectedWebsiteId) { toast.error("Please select a website"); return; }

    setLoading(true);
    const { data: campaign, error } = await supabase.from("campaigns").insert({
      advertiser_id: user.id, name: "Draft Commerce Campaign", budget_remaining: 0,
      integration_type: integrationType, is_draft: true,
      website_id: selectedWebsiteId, ad_type: "commerce",
      selected_milestones: ["purchase"],
    } as any).select().single();
    if (error) { toast.error(error.message); setLoading(false); return; }

    const key = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    await supabase.functions.invoke("manage-campaign", {
      body: { action: "create_api_key", campaign_id: campaign.id, api_key: key },
    });

    setApiKey(key); setCampaignId(campaign.id);
    toast.success("API key generated!");
    goToStep(1, campaign.id);
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!campaignId || !apiKey) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-integration", {
        body: { campaign_id: campaignId, api_key: apiKey, website: selectedDomain },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.verified) {
        setVerified(true);
        toast.success("Integration verified!");
        goToStep(3, campaignId);
      } else toast.error(payload?.error || "Verification failed");
    } catch (err: unknown) { toast.error((err as Error).message); }
    finally { setVerifying(false); }
  };

  const handleSubmit = async () => {
    if (!user || !campaignId) return;
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    if (!verified) { toast.error("Verify your integration first"); return; }
    if (walletBalance < totalCost) { toast.error(`Insufficient balance. Need $${totalCost.toFixed(2)}`); return; }

    setLoading(true);
    await supabase.from("campaigns").update({
      name: campaignName.trim(), target_users: sales,
      selected_milestones: ["purchase"], total_cost: totalCost,
      price_purchase: SALE_FLAT_FEE,
      integration_verified: verified, ad_type: "commerce",
    } as any).eq("id", campaignId);

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const { data: escrowResult, error: escrowError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "submit_campaign", campaign_id: campaignId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (escrowError || escrowResult?.error) {
      toast.error(escrowResult?.error || escrowError?.message || "Failed to fund escrow");
      setLoading(false);
      return;
    }

    setLoading(false);
    toast.success("Commerce campaign submitted!");
    navigate(`/campaigns/${campaignId}`);
  };

  const brandedBaseUrl = "https://advertiser.karbali.com";
  const trackerScriptUrl = `${brandedBaseUrl}/karbali-tracker.js`;
  const directTrackUrl = `${brandedBaseUrl}/api/track`;

  const downloadWordPressPlugin = async () => {
    const pluginCode = `<?php
/**
 * Plugin Name: Karbali Commerce Tracking
 * Description: Tracks sales for Karbali Commerce Ads.
 * Version: 1.1.0
 */
if (!defined('ABSPATH')) exit;
class KarbaliCommerce {
    private $api_key;
    private $api_url = '${directTrackUrl}';
    private $tracker_url = '${trackerScriptUrl}';
    public function __construct() {
        $this->api_key = get_option('karbali_api_key', '');
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_head', [$this, 'inject_tracking_script']);
        add_action('woocommerce_thankyou', [$this, 'track_purchase']);
    }
    public function admin_menu() { add_options_page('Karbali Commerce', 'Karbali Commerce', 'manage_options', 'karbali-commerce', [$this, 'settings_page']); }
    public function register_settings() { register_setting('karbali_settings', 'karbali_api_key'); }
    public function settings_page() { ?>
        <div class="wrap"><h1>Karbali Commerce Settings</h1>
        <form method="post" action="options.php"><?php settings_fields('karbali_settings'); ?>
        <table class="form-table"><tr><th>API Key</th><td><input type="text" name="karbali_api_key" value="<?php echo esc_attr(get_option('karbali_api_key')); ?>" class="regular-text" /></td></tr></table>
        <?php submit_button(); ?></form></div><?php }
    private function browser_client_id() {
        return isset($_COOKIE['karbali_client_id']) ? sanitize_text_field(wp_unslash($_COOKIE['karbali_client_id'])) : '';
    }
    private function browser_referral() {
        if (isset($_COOKIE['karbali_referral_id'])) return sanitize_text_field(wp_unslash($_COOKIE['karbali_referral_id']));
        if (isset($_COOKIE['karbali_referral_code'])) return sanitize_text_field(wp_unslash($_COOKIE['karbali_referral_code']));
        return '';
    }
    public function inject_tracking_script() { if (empty($this->api_key)) return; ?>
        <script>
        window.KarbaliConfig = { apiKey: '<?php echo esc_js($this->api_key); ?>' };
        </script>
        <script async src="<?php echo esc_url($this->tracker_url); ?>" data-api-key="<?php echo esc_attr($this->api_key); ?>"></script><?php }
    public function track_purchase($oid) {
        if (empty($this->api_key) || !function_exists('wc_get_order')) return;
        $order = wc_get_order($oid);
        if (!$order) return;
        $user_id = $order->get_user_id() ? 'wp_' . $order->get_user_id() : ($order->get_billing_email() ?: 'order_' . $oid);
        wp_remote_post($this->api_url, [
            'body' => wp_json_encode([
                'api_key' => $this->api_key,
                'event_type' => 'purchase',
                'user_id' => $user_id,
                'client_id' => $this->browser_client_id() ?: null,
                'referral_id' => $this->browser_referral() ?: null,
                'amount' => (float) $order->get_total(),
                'source_url' => home_url('/'),
            ]),
            'headers' => [
                'Content-Type' => 'application/json',
                'Origin' => home_url(),
                'Referer' => home_url('/'),
                'X-Karbali-Domain' => wp_parse_url(home_url(), PHP_URL_HOST),
            ],
            'timeout' => 10,
        ]);
    }
}
new KarbaliCommerce();`;
    const zip = new JSZip();
    const folder = zip.folder("karbali-commerce");
    folder!.file("karbali-commerce.php", pluginCode);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "karbali-commerce.zip"; a.click();
    URL.revokeObjectURL(url);
    toast.success("WordPress plugin downloaded!");
  };

  const handleStartOver = async () => {
    if (!campaignId) return;
    if (!confirm("Delete this draft and start a new campaign? This cannot be undone.")) return;
    setLoading(true);
    await supabase.from("api_keys").delete().eq("campaign_id", campaignId);
    await supabase.from("campaign_sources").delete().eq("campaign_id", campaignId);
    await supabase.from("campaigns").delete().eq("id", campaignId);
    setLoading(false);
    toast.success("Draft deleted");
    navigate("/campaigns/create", { replace: true });
    setCampaignId(null); setApiKey(null); setStep(0); setVerified(false);
    setCampaignName(""); setTargetSales("100");
  };

  const STEPS = ["Generate API Key", "Integrate", "Verify", "Configure", "Submit"];

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Create Commerce Campaign
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Sales tracking with $1 flat fee + 10% commission per sale</p>
          </div>
          {campaignId && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleStartOver} disabled={loading}>
              <RotateCcw className="h-3.5 w-3.5" /> Start Over
            </Button>
          )}
        </div>

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

        {/* Website Selection */}
        {websites.length >= 1 && step === 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Select Website</h3>
            <div className="grid gap-2">
              {websites.map((w) => (
                <button key={w.id} onClick={() => { setSelectedWebsiteId(w.id); setSelectedDomain(w.domain); }}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                    selectedWebsiteId === w.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                  }`}>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{w.domain}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 0: Generate API Key */}
        {step === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Generate API Key</h3>
              <p className="text-xs text-muted-foreground mt-1">Commerce campaigns require a minimum wallet balance of $200</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "custom" as const, label: "Custom Site", desc: "JavaScript SDK" },
                { value: "wordpress" as const, label: "WordPress", desc: "WooCommerce plugin" },
              ]).map((opt) => (
                <button key={opt.value} onClick={() => setIntegrationType(opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${integrationType === opt.value ? "border-primary bg-primary/5" : "border-border"}`}>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {walletBalance < MIN_WALLET_BALANCE && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Min $200 required. Balance: ${walletBalance.toFixed(2)}.{" "}
                  <button onClick={() => navigate("/wallet")} className="underline">Fund wallet</button>
                </p>
              </div>
            )}
            <Button className="w-full" onClick={handleGenerateKey} disabled={loading || walletBalance < MIN_WALLET_BALANCE}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Key className="mr-2 h-4 w-4" /> Generate API Key</>}
            </Button>
          </div>
        )}

        {/* Step 1: Integrate */}
        {step === 1 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Code className="h-4 w-4 text-primary" /> Integrate Sales Tracking</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm text-primary truncate">{apiKey}</code>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey || ""); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            {integrationType === "wordpress" ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Download and install the WooCommerce tracking plugin:</p>
                <Button className="w-full" onClick={downloadWordPressPlugin}><Download className="mr-2 h-4 w-4" /> Download Plugin (ZIP)</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Add this to your checkout success page:</p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground/70">
{`<script>
  window.KarbaliConfig = { apiKey: "${apiKey}", campaignId: "${campaignId}" };
</script>
<script async src="${brandedBaseUrl}/karbali-tracker/c/${campaignId}.js"></script>
<script>
  // Bridge the referral visitor to the customer identity.
  window.Karbali.identify("customer_email_or_id");

  // Call after successful payment.
  window.Karbali.trackPurchase({
    user_id: "customer_email_or_id",
    amount: orderTotal
  });
</script>`}
                </pre>
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={() => goToStep(2)}>I've integrated → Verify</Button>
          </div>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Verify</h3>
            <p className="text-xs text-muted-foreground">Scanning {selectedDomain}...</p>
            {verified && <div className="flex items-center gap-2 text-primary text-sm"><CheckCircle className="h-4 w-4" /> Verified!</div>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleVerify} disabled={verifying || verified}>
                {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : verified ? "Verified ✓" : "Verify"}
              </Button>
              {verified && <Button variant="outline" onClick={() => goToStep(3)}>Continue →</Button>}
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-sm font-medium text-foreground">Campaign Configuration</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Commerce Campaign" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Target Sales (min 100) *</Label>
              <Input type="number" min="100" value={targetSales} onChange={(e) => setTargetSales(e.target.value)} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <p className="font-medium text-foreground text-xs">Pricing</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• $1.00 flat fee per sale</p>
                <p>• 10% commission on each sale amount</p>
                <p>• Base reserve: ${baseCost.toFixed(2)} (${SALE_FLAT_FEE} × {sales} sales)</p>
                <p>• Commission buffer: ${COMMISSION_BUFFER.toFixed(2)} (covers unknown 10% per sale)</p>
                <p className="text-foreground font-medium pt-1">Total escrow: ${totalCost.toFixed(2)}</p>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between text-xs">
                <span className="text-muted-foreground">Balance</span>
                <span className={walletBalance >= totalCost ? "text-primary" : "text-destructive"}>${walletBalance.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => goToStep(4)} disabled={!campaignName.trim() || sales < 100}>Review →</Button>
          </div>
        )}

        {/* Step 4: Submit */}
        {step === 4 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Review & Submit</h3>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {[
                { l: "Campaign", v: campaignName },
                { l: "Type", v: "Commerce Ads" },
                { l: "Website", v: selectedDomain },
                { l: "Target Sales", v: sales.toString() },
                { l: "Pricing", v: "$1 + 10% per sale" },
                { l: "Escrow Reserve", v: `$${totalCost.toFixed(2)}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="text-foreground font-medium">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading || walletBalance < totalCost}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit for Review"}
              </Button>
            </div>
          </div>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
