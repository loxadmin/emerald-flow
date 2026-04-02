import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Key, Code, CheckCircle, Settings, Send, Download, Loader2, Copy, AlertCircle } from "lucide-react";

const STEPS = ["Generate API Key", "Integrate", "Verify", "Configure", "Submit"];

interface AdminPrices {
  price_per_download: number;
  price_per_signup: number;
  price_per_purchase: number;
  ad_placement_fee: number;
}

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { user, walletActivated } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0: API key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Step 1: Integration type
  const [integrationType, setIntegrationType] = useState<"custom" | "wordpress">("custom");

  // Step 2: Verification
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Step 3: Config
  const [campaignName, setCampaignName] = useState("");
  const [targetUsers, setTargetUsers] = useState("100");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [prices, setPrices] = useState<AdminPrices>({ price_per_download: 1, price_per_signup: 2, price_per_purchase: 5, ad_placement_fee: 2 });
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      const { data } = await supabase.from("admin_settings").select("key, value").in("key", [
        "price_per_download", "price_per_signup", "price_per_purchase", "ad_placement_fee"
      ]);
      if (data) {
        const p = { ...prices };
        data.forEach((s: { key: string; value: string }) => {
          if (s.key in p) (p as Record<string, number>)[s.key] = Number(s.value);
        });
        setPrices(p);
      }
      if (user) {
        const { data: w } = await supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle();
        if (w) setWalletBalance(Number(w.balance));
      }
    };
    fetchPrices();
  }, [user]);

  const totalCost = (() => {
    const users = Math.max(100, Number(targetUsers) || 100);
    let milestoneTotal = 0;
    if (milestones.includes("download")) milestoneTotal += prices.price_per_download;
    if (milestones.includes("signup")) milestoneTotal += prices.price_per_signup;
    if (milestones.includes("purchase")) milestoneTotal += prices.price_per_purchase;
    return milestoneTotal * users + prices.ad_placement_fee;
  })();

  const handleGenerateKey = async () => {
    if (!user) return;
    if (walletActivated !== true) {
      toast.error("Activate your wallet before creating a campaign");
      navigate("/wallet");
      return;
    }
    setLoading(true);

    // Create a draft campaign
    const { data: campaign, error } = await supabase.from("campaigns").insert({
      advertiser_id: user.id,
      name: "Draft Campaign",
      budget_remaining: 0,
      integration_type: integrationType,
    }).select().single();

    if (error) { toast.error(error.message); setLoading(false); return; }

    const key = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error: keyError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "create_api_key", campaign_id: campaign.id, api_key: key },
    });

    setLoading(false);
    if (keyError) { toast.error("Failed to generate API key"); return; }

    setApiKey(key);
    setCampaignId(campaign.id);
    toast.success("API key generated!");
    setStep(1);
  };

  const handleVerify = async () => {
    if (!campaignId || !apiKey) return;
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-integration", {
        body: { campaign_id: campaignId, api_key: apiKey },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.verified) {
        setVerified(true);
        toast.success("Integration verified successfully!");
        setStep(3);
      } else {
        toast.error(payload?.error || "Verification failed. Make sure the API is integrated on your website.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!campaignId || !user) return;
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    if (milestones.length === 0) { toast.error("Select at least one milestone"); return; }
    const users = Number(targetUsers);
    if (users < 100) { toast.error("Minimum 100 target users"); return; }

    if (walletBalance < totalCost) {
      toast.error(`Insufficient balance. You need $${totalCost.toFixed(2)} but have $${walletBalance.toFixed(2)}. Please fund your wallet.`);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("campaigns").update({
      name: campaignName.trim(),
      target_users: users,
      selected_milestones: milestones,
      total_cost: totalCost,
      budget_remaining: totalCost - prices.ad_placement_fee,
      price_download: milestones.includes("download") ? prices.price_per_download : 0,
      price_signup: milestones.includes("signup") ? prices.price_per_signup : 0,
      price_purchase: milestones.includes("purchase") ? prices.price_per_purchase : 0,
      integration_verified: verified,
      integration_type: integrationType,
      status: "pending",
    }).eq("id", campaignId);

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Deduct from wallet
    const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("advertiser_id", user.id).single();
    if (wallet) {
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - totalCost, updated_at: new Date().toISOString() }).eq("id", wallet.id);
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        amount: totalCost,
        type: "charge",
        status: "completed",
        description: `Campaign: ${campaignName.trim()}`,
      });
    }

    setLoading(false);
    toast.success("Campaign submitted for review!");
    navigate(`/campaigns/${campaignId}`);
  };

  const downloadWordPressPlugin = () => {
    const pluginCode = `<?php
/**
 * Plugin Name: Karbali Tracking
 * Description: Integrates Karbali ad tracking into your WordPress site.
 * Version: 1.0.0
 * Author: Karbali
 */

if (!defined('ABSPATH')) exit;

class KarbaliTracking {
    private $api_key;
    private $api_url = 'https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/track';

    public function __construct() {
        $this->api_key = get_option('karbali_api_key', '');
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_head', [$this, 'inject_tracking_script']);
        add_action('user_register', [$this, 'track_signup']);
        add_action('woocommerce_thankyou', [$this, 'track_purchase']);
        add_action('wp_footer', [$this, 'track_page_view']);
    }

    public function admin_menu() {
        add_options_page('Karbali Tracking', 'Karbali', 'manage_options', 'karbali-tracking', [$this, 'settings_page']);
    }

    public function register_settings() {
        register_setting('karbali_settings', 'karbali_api_key');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Karbali Tracking Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('karbali_settings'); ?>
                <table class="form-table">
                    <tr><th>API Key</th><td><input type="text" name="karbali_api_key" value="<?php echo esc_attr(get_option('karbali_api_key')); ?>" class="regular-text" /></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function inject_tracking_script() {
        if (empty($this->api_key)) return;
        ?>
        <script>
        (function(){
            var params = new URLSearchParams(window.location.search);
            var ref = params.get('ref') || params.get('referral_id');
            if(ref) document.cookie = 'karbali_ref=' + ref + ';path=/;max-age=2592000';
        })();
        function karbaliGetRef(){var m=document.cookie.match(/karbali_ref=([^;]+)/);return m?m[1]:null;}
        window.KarbaliTrack = function(event, userId, amount){
            fetch('<?php echo esc_js($this->api_url); ?>', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({api_key:'<?php echo esc_js($this->api_key); ?>',event_type:event,user_id:userId||'wp_'+Math.random().toString(36).substr(2,9),referral_id:karbaliGetRef(),amount:amount||null})
            });
        };
        </script>
        <?php
    }

    public function track_page_view() {
        if (empty($this->api_key)) return;
        $user_id = is_user_logged_in() ? 'wp_' . get_current_user_id() : 'anon_' . substr(md5($_SERVER['REMOTE_ADDR']), 0, 12);
        ?>
        <script>
        if(document.referrer && new URL(document.referrer).hostname !== window.location.hostname){
            KarbaliTrack('download', '<?php echo esc_js($user_id); ?>');
        }
        </script>
        <?php
    }

    public function track_signup($user_id) {
        if (empty($this->api_key)) return;
        $ref = isset($_COOKIE['karbali_ref']) ? sanitize_text_field($_COOKIE['karbali_ref']) : null;
        wp_remote_post($this->api_url, [
            'body' => json_encode(['api_key' => $this->api_key, 'event_type' => 'signup', 'user_id' => 'wp_' . $user_id, 'referral_id' => $ref]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 5,
        ]);
    }

    public function track_purchase($order_id) {
        if (empty($this->api_key) || !function_exists('wc_get_order')) return;
        $order = wc_get_order($order_id);
        if (!$order) return;
        $ref = isset($_COOKIE['karbali_ref']) ? sanitize_text_field($_COOKIE['karbali_ref']) : null;
        wp_remote_post($this->api_url, [
            'body' => json_encode(['api_key' => $this->api_key, 'event_type' => 'purchase', 'user_id' => 'wp_' . $order->get_user_id(), 'referral_id' => $ref, 'amount' => $order->get_total()]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 5,
        ]);
    }
}

new KarbaliTracking();`;

    const blob = new Blob([pluginCode], { type: "application/php" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "karbali-tracking.php";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("WordPress plugin downloaded!");
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "dvkoafztquswcqniwcyf";
  const trackUrl = `https://${projectId}.supabase.co/functions/v1/track`;

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Campaign</h1>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary/20 text-primary border border-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-4 sm:w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Choose type & Generate API Key */}
        {step === 0 && (
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> Generate API Key</GlassCardTitle>
              <GlassCardDescription>Choose your integration type and generate an API key</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-muted-foreground text-sm">Integration Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "custom" as const, label: "Custom Site / App", desc: "Use our REST API or JavaScript SDK" },
                    { value: "wordpress" as const, label: "WordPress (CMS)", desc: "Download our WordPress plugin" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setIntegrationType(opt.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        integrationType === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <GlassButton variant="glow" className="w-full" onClick={handleGenerateKey} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Key className="mr-2 h-4 w-4" /> Generate API Key</>}
              </GlassButton>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Step 1: Integration instructions */}
        {step === 1 && (
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> Integrate Your API</GlassCardTitle>
              <GlassCardDescription>
                {integrationType === "wordpress" ? "Download and install the plugin" : "Add the tracking code to your website"}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              {/* Show API Key */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Your API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 font-mono text-sm text-primary/80 truncate">{apiKey}</code>
                  <GlassButton variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey || ""); toast.success("Copied!"); }}>
                    <Copy className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>

              {integrationType === "wordpress" ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Installation Steps:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Download the plugin file below</li>
                      <li>Go to WordPress Admin → Plugins → Add New → Upload Plugin</li>
                      <li>Upload and activate the plugin</li>
                      <li>Go to Settings → Karbali and enter your API key</li>
                      <li>Save and return here to verify</li>
                    </ol>
                  </div>
                  <GlassButton variant="glow" onClick={downloadWordPressPlugin} className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download WordPress Plugin
                  </GlassButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Add this code to your website or app:</p>
                  <pre className="overflow-x-auto rounded-xl bg-muted/30 border border-border/50 p-4 text-xs text-foreground/70">
{`<!-- Karbali Tracking SDK -->
<script>
(function(){
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref') || params.get('referral_id');
  if(ref) document.cookie = 'karbali_ref=' + ref + ';path=/;max-age=2592000';
})();

window.Karbali = {
  apiKey: "${apiKey}",
  track: function(event, data) {
    var ref = (document.cookie.match(/karbali_ref=([^;]+)/)||[])[1]||null;
    fetch("${trackUrl}", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        api_key: this.apiKey,
        event_type: event,
        user_id: data.user_id,
        referral_id: data.referral_id || ref,
        amount: data.amount || null
      })
    });
  }
};

// Examples:
// Karbali.track("download", { user_id: "user_123" });
// Karbali.track("signup", { user_id: "user_123" });
// Karbali.track("purchase", { user_id: "user_123", amount: 29.99 });
</script>`}
                  </pre>
                </div>
              )}

              <GlassButton variant="glow" className="w-full" onClick={() => setStep(2)}>
                I've integrated the code → Continue to Verify
              </GlassButton>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /> Verify Integration</GlassCardTitle>
              <GlassCardDescription>We'll send a test call to verify your integration is working</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Click below to send a test event. The system will verify that your API key is active and can receive events from your registered domain.
                </p>
              </div>
              {verified && (
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Integration verified!</span>
                </div>
              )}
              <div className="flex gap-3">
                <GlassButton variant="glow" className="flex-1" onClick={handleVerify} disabled={verifying || verified}>
                  {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : verified ? "Verified ✓" : <><Send className="mr-2 h-4 w-4" /> Verify Integration</>}
                </GlassButton>
                {verified && (
                  <GlassButton variant="secondary" onClick={() => setStep(3)}>Continue →</GlassButton>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Campaign Configuration</GlassCardTitle>
              <GlassCardDescription>Set your target audience and milestones</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Campaign Name *</Label>
                <GlassInput value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My App Campaign" maxLength={200} required />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Target Users (minimum 100) *</Label>
                <GlassInput type="number" min="100" step="1" value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} placeholder="100" />
              </div>

              <div className="space-y-3">
                <Label className="text-muted-foreground text-sm">Select Milestones *</Label>
                {[
                  { id: "download", label: "App Downloads", price: prices.price_per_download },
                  { id: "signup", label: "Sign Ups", price: prices.price_per_signup },
                  { id: "purchase", label: "Sales / Purchases", price: prices.price_per_purchase },
                ].map((m) => (
                  <label key={m.id} className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                    milestones.includes(m.id) ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                  }`}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={milestones.includes(m.id)}
                        onCheckedChange={(checked) => {
                          setMilestones(checked ? [...milestones, m.id] : milestones.filter(x => x !== m.id));
                        }}
                      />
                      <span className="text-sm font-medium text-foreground">{m.label}</span>
                    </div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
                      ${m.price.toFixed(2)} / user
                    </Badge>
                  </label>
                ))}
              </div>

              {/* Cost breakdown */}
              {milestones.length > 0 && (
                <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Cost Breakdown</p>
                  {milestones.map(m => {
                    const price = m === "download" ? prices.price_per_download : m === "signup" ? prices.price_per_signup : prices.price_per_purchase;
                    const users = Math.max(100, Number(targetUsers) || 100);
                    return (
                      <div key={m} className="flex justify-between text-sm text-muted-foreground">
                        <span className="capitalize">{m}: ${price.toFixed(2)} × {users} users</span>
                        <span className="text-foreground">${(price * users).toFixed(2)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Ad Placement Fee</span>
                    <span className="text-foreground">${prices.ad_placement_fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Wallet Balance</span>
                    <span className={walletBalance >= totalCost ? "text-primary" : "text-destructive"}>
                      ${walletBalance.toFixed(2)} {walletBalance < totalCost && "(Insufficient)"}
                    </span>
                  </div>
                </div>
              )}

              {walletBalance < totalCost && milestones.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                  <div className="text-sm text-warning">
                    <p className="font-medium">Insufficient funds</p>
                    <p>You need ${totalCost.toFixed(2)} but only have ${walletBalance.toFixed(2)}. <button onClick={() => navigate("/wallet")} className="underline">Fund your wallet</button></p>
                  </div>
                </div>
              )}

              <GlassButton
                variant="glow"
                className="w-full"
                onClick={() => setStep(4)}
                disabled={!campaignName.trim() || milestones.length === 0 || Number(targetUsers) < 100}
              >
                Review & Submit
              </GlassButton>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <GlassCard variant="strong">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Review & Submit</GlassCardTitle>
              <GlassCardDescription>Review your campaign before submitting for admin approval</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
                {[
                  { l: "Campaign Name", v: campaignName },
                  { l: "Integration Type", v: integrationType === "wordpress" ? "WordPress Plugin" : "Custom API" },
                  { l: "Integration Verified", v: verified ? "Yes ✓" : "Pending" },
                  { l: "Target Users", v: targetUsers },
                  { l: "Milestones", v: milestones.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ") },
                  { l: "Total Cost", v: `$${totalCost.toFixed(2)}` },
                  { l: "Wallet Balance", v: `$${walletBalance.toFixed(2)}` },
                ].map((r) => (
                  <div key={r.l} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="text-foreground font-medium">{r.v}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <GlassButton variant="outline" onClick={() => setStep(3)}>← Back</GlassButton>
                <GlassButton
                  variant="glow"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={loading || walletBalance < totalCost}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit for Review"}
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
      </MotionWrapper>
    </DashboardLayout>
  );
}
