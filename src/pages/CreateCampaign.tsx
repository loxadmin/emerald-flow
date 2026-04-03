import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Key, Code, CheckCircle, Settings, Send, Download, Loader2, Copy, AlertCircle, Handshake, ExternalLink } from "lucide-react";
import JSZip from "jszip";

interface AdminPrices { price_per_download: number; price_per_signup: number; price_per_purchase: number; ad_placement_fee: number; }

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { user, walletActivated } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPartnership, setIsPartnership] = useState(false);

  // Check if advertiser's category is partnership
  const [categoryPartnership, setCategoryPartnership] = useState<boolean | null>(null);

  // Standard flow
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [integrationType, setIntegrationType] = useState<"custom" | "wordpress">("custom");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [targetUsers, setTargetUsers] = useState("100");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [prices, setPrices] = useState<AdminPrices>({ price_per_download: 1, price_per_signup: 2, price_per_purchase: 5, ad_placement_fee: 2 });
  const [walletBalance, setWalletBalance] = useState(0);
  const [profileWebsite, setProfileWebsite] = useState<string | null>(null);
  const [manualWebsite, setManualWebsite] = useState("");

  // Partnership / External Referral flow
  const [hasExternalReferral, setHasExternalReferral] = useState<boolean | null>(null);
  const [referralGuide, setReferralGuide] = useState("");
  const [compensationStructure, setCompensationStructure] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [externalReferralFee, setExternalReferralFee] = useState(50);
  const [externalMinBalance, setExternalMinBalance] = useState(200);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      // Check category
      const { data: catData } = await supabase
        .from("advertiser_categories")
        .select("category_id")
        .eq("advertiser_id", user.id)
        .maybeSingle();
      if (catData) {
        const { data: cat } = await supabase.from("categories").select("is_partnership").eq("id", catData.category_id).single();
        setCategoryPartnership((cat as any)?.is_partnership ?? false);
      }
      // Fetch prices
      const { data } = await supabase.from("admin_settings").select("key, value").in("key", [
        "price_per_download", "price_per_signup", "price_per_purchase", "ad_placement_fee", "external_referral_fee", "external_referral_min_balance"
      ]);
      if (data) {
        const p = { ...prices };
        data.forEach((s: { key: string; value: string }) => {
          if (s.key in p) (p as Record<string, number>)[s.key] = Number(s.value);
          if (s.key === "external_referral_fee") setExternalReferralFee(Number(s.value));
          if (s.key === "external_referral_min_balance") setExternalMinBalance(Number(s.value));
        });
        setPrices(p);
      }
      const { data: w } = await supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle();
      if (w) setWalletBalance(Number(w.balance));

      const { data: profile } = await supabase.from("profiles").select("website").eq("id", user.id).maybeSingle();
      if (profile?.website) {
        setProfileWebsite(profile.website);
        setManualWebsite(profile.website);
      }
    };
    fetchData();
  }, [user]);

  const totalCost = (() => {
    const users = Math.max(100, Number(targetUsers) || 100);
    let milestoneTotal = 0;
    if (milestones.includes("download")) milestoneTotal += prices.price_per_download;
    if (milestones.includes("signup")) milestoneTotal += prices.price_per_signup;
    if (milestones.includes("purchase")) milestoneTotal += prices.price_per_purchase;
    return milestoneTotal * users + prices.ad_placement_fee;
  })();

  // Steps for standard flow
  const STEPS = isPartnership && hasExternalReferral
    ? ["Referral Info", "Configure", "Submit"]
    : ["Generate API Key", "Integrate", "Verify", "Configure", "Submit"];

  const handleGenerateKey = async () => {
    if (!user) return;
    if (walletActivated !== true) { toast.error("Activate your wallet first"); navigate("/wallet"); return; }
    setLoading(true);
    const { data: campaign, error } = await supabase.from("campaigns").insert({
      advertiser_id: user.id, name: "Draft Campaign", budget_remaining: 0, integration_type: integrationType,
    }).select().single();
    if (error) { toast.error(error.message); setLoading(false); return; }
    const key = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error: keyError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "create_api_key", campaign_id: campaign.id, api_key: key },
    });
    setLoading(false);
    if (keyError) { toast.error("Failed to generate API key"); return; }
    setApiKey(key); setCampaignId(campaign.id);
    toast.success("API key generated!");
    setStep(1);
  };

  const handleVerify = async () => {
    if (!campaignId || !apiKey) return;
    if (!manualWebsite.trim()) {
      toast.error("Please enter your website URL for verification");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-integration", {
        body: {
          campaign_id: campaignId,
          api_key: apiKey,
          website: manualWebsite.trim()
        },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload?.verified) {
        setVerified(true);
        setProfileWebsite(manualWebsite.trim());
        toast.success("Integration verified!");
        setStep(3);
      }
      else toast.error(payload?.error || "Verification failed");
    } catch (err: unknown) { toast.error((err as Error).message || "Verification failed"); }
    finally { setVerifying(false); }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    if (milestones.length === 0) { toast.error("Select at least one milestone"); return; }
    const users = Number(targetUsers);
    if (users < 100) { toast.error("Minimum 100 target users"); return; }
    if (walletBalance < totalCost) { toast.error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${walletBalance.toFixed(2)}.`); return; }
    setLoading(true);

    let cId = campaignId;
    if (!cId) {
      const { data: campaign, error } = await supabase.from("campaigns").insert({
        advertiser_id: user.id, name: campaignName.trim(), budget_remaining: 0, integration_type: isPartnership ? "external_referral" : integrationType,
      }).select().single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      cId = campaign.id;
      setCampaignId(cId);
    }

    const { error } = await supabase.from("campaigns").update({
      name: campaignName.trim(), target_users: users, selected_milestones: milestones, total_cost: totalCost,
      budget_remaining: totalCost - prices.ad_placement_fee,
      price_download: milestones.includes("download") ? prices.price_per_download : 0,
      price_signup: milestones.includes("signup") ? prices.price_per_signup : 0,
      price_purchase: milestones.includes("purchase") ? prices.price_per_purchase : 0,
      integration_verified: verified, integration_type: isPartnership ? "external_referral" : integrationType, status: "pending",
    }).eq("id", cId);
    if (error) { toast.error(error.message); setLoading(false); return; }

    // Deduct from wallet
    const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("advertiser_id", user.id).single();
    if (wallet) {
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - totalCost, updated_at: new Date().toISOString() }).eq("id", wallet.id);
      await supabase.from("wallet_transactions").insert({ wallet_id: wallet.id, amount: totalCost, type: "charge", status: "completed", description: `Campaign: ${campaignName.trim()}` });
    }

    setLoading(false);
    toast.success("Campaign submitted for review!");
    navigate(`/campaigns/${cId}`);
  };

  const handleExternalReferralSubmit = async () => {
    if (!user) return;
    if (!referralGuide.trim() || !compensationStructure.trim() || !registrationLink.trim()) {
      toast.error("Please fill in all fields"); return;
    }
    if (walletBalance < externalMinBalance) {
      toast.error(`Minimum wallet balance of $${externalMinBalance} required. You have $${walletBalance.toFixed(2)}.`); return;
    }
    setLoading(true);

    // Create campaign
    const { data: campaign, error: cErr } = await supabase.from("campaigns").insert({
      advertiser_id: user.id, name: `External Referral - ${campaignName || "Draft"}`, budget_remaining: 0,
      integration_type: "external_referral",
    }).select().single();
    if (cErr) { toast.error(cErr.message); setLoading(false); return; }

    // Create external referral program record
    const { error: extErr } = await supabase.from("external_referral_programs" as any).insert({
      campaign_id: campaign.id, advertiser_id: user.id,
      referral_guide: referralGuide.trim(), compensation_structure: compensationStructure.trim(),
      registration_link: registrationLink.trim(), status: "pending",
    } as any);
    if (extErr) { toast.error(extErr.message); setLoading(false); return; }

    setCampaignId(campaign.id);
    toast.success("External referral program submitted for admin review!");
    setStep(isPartnership && hasExternalReferral ? 1 : 3); // Go to configure step
    setLoading(false);
  };

  const downloadWordPressPlugin = async () => {
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

    const zip = new JSZip();
    const folder = zip.folder("karbali-tracking");
    folder!.file("karbali-tracking.php", pluginCode);
    folder!.file("readme.txt", `=== Karbali Tracking ===
Contributors: karbali
Tags: tracking, referral, analytics
Requires at least: 5.0
Tested up to: 6.5
Stable tag: 1.0.0
License: GPLv2

Integrates Karbali ad tracking into your WordPress site.

== Installation ==
1. Upload the plugin folder to /wp-content/plugins/
2. Activate via Plugins menu
3. Go to Settings > Karbali and enter your API key
`);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "karbali-tracking.zip";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("WordPress plugin downloaded as ZIP!");
  };

  const projectId = "dvkoafztquswcqniwcyf";
  const trackUrl = `https://${projectId}.supabase.co/functions/v1/track`;

  // Partnership category: show choice first
  if (categoryPartnership && hasExternalReferral === null) {
    return (
      <DashboardLayout>
        <MotionWrapper className="mx-auto max-w-xl space-y-6">
          <h1 className="text-xl font-semibold text-foreground">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">Your category supports external referral partnerships. Do you already have a referral program?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => { setHasExternalReferral(true); setIsPartnership(true); setStep(0); }}
              className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 transition-colors">
              <Handshake className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">Yes, I have a referral program</p>
              <p className="text-xs text-muted-foreground mt-1">Connect your existing referral program to Karbali ($50 activation fee)</p>
            </button>
            <button onClick={() => { setHasExternalReferral(false); setIsPartnership(false); setStep(0); }}
              className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 transition-colors">
              <Code className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">No, use Karbali's system</p>
              <p className="text-xs text-muted-foreground mt-1">Integrate our API or WordPress plugin</p>
            </button>
          </div>
        </MotionWrapper>
      </DashboardLayout>
    );
  }

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

        {/* External Referral Step 0: Submit referral info */}
        {isPartnership && hasExternalReferral && step === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> External Referral Program</h3>
              <p className="text-xs text-muted-foreground mt-1">Tell us about your existing referral program. Admin will review and register on your platform.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Referral Campaign" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">How does your referral program work? *</Label>
              <Textarea value={referralGuide} onChange={(e) => setReferralGuide(e.target.value)} placeholder="Describe step-by-step how referrals are tracked, how new users sign up, and how referrers are credited..." rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Compensation Structure *</Label>
              <Textarea value={compensationStructure} onChange={(e) => setCompensationStructure(e.target.value)} placeholder="E.g. $5 per signup, 10% commission per purchase, etc." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Registration / Referral Dashboard Link *</Label>
              <Input value={registrationLink} onChange={(e) => setRegistrationLink(e.target.value)} placeholder="https://yoursite.com/referral-signup" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Activation fee: <strong className="text-foreground">${externalReferralFee}</strong> (deducted upon admin approval)</p>
              <p>• Minimum wallet balance: <strong className="text-foreground">${externalMinBalance}</strong></p>
              <p>• Current balance: <strong className={walletBalance >= externalMinBalance ? "text-primary" : "text-destructive"}>${walletBalance.toFixed(2)}</strong></p>
            </div>
            <Button className="w-full" onClick={handleExternalReferralSubmit} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="mr-2 h-4 w-4" /> Submit for Admin Review</>}
            </Button>
          </div>
        )}

        {/* External Referral Step 1 (Configure) = same as standard step 3 */}
        {/* Standard Step 0: Generate API Key */}
        {!isPartnership && step === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Generate API Key</h3>
              <p className="text-xs text-muted-foreground mt-1">Choose integration type and generate an API key</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Integration Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "custom" as const, label: "Custom Site / App", desc: "REST API or JavaScript SDK" },
                  { value: "wordpress" as const, label: "WordPress (CMS)", desc: "Download WordPress plugin" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => setIntegrationType(opt.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${integrationType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleGenerateKey} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Key className="mr-2 h-4 w-4" /> Generate API Key</>}
            </Button>
          </div>
        )}

        {/* Standard Step 1: Integration */}
        {!isPartnership && step === 1 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Code className="h-4 w-4 text-primary" /> Integrate</h3>
              <p className="text-xs text-muted-foreground mt-1">{integrationType === "wordpress" ? "Download and install the plugin" : "Add tracking code to your site"}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm text-primary truncate">{apiKey}</code>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey || ""); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            {integrationType === "wordpress" ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-sm mb-1">Installation:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Download the plugin ZIP below</li>
                    <li>WordPress Admin → Plugins → Add New → Upload Plugin</li>
                    <li>Activate and go to Settings → Karbali</li>
                    <li>Enter your API key and save</li>
                  </ol>
                </div>
                <Button className="w-full" onClick={downloadWordPressPlugin}><Download className="mr-2 h-4 w-4" /> Download Plugin (ZIP)</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Add this to your website:</p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground/70">
{`<script>
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
</script>`}
                </pre>
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={() => setStep(2)}>I've integrated → Continue to Verify</Button>
          </div>
        )}

        {/* Standard Step 2: Verify */}
        {!isPartnership && step === 2 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Verify Integration</h3>
              <p className="text-xs text-muted-foreground mt-1">We'll send a test call to verify your API key is working from your domain.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Website URL *</Label>
              <Input
                value={manualWebsite}
                onChange={(e) => setManualWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                disabled={verified}
              />
              {!profileWebsite && (
                <p className="text-[10px] text-amber-600">Your profile is missing a website. This will also update your profile.</p>
              )}
            </div>

            {verified && (
              <div className="flex items-center gap-2 text-primary text-sm"><CheckCircle className="h-4 w-4" /> Integration verified!</div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleVerify} disabled={verifying || verified}>
                {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : verified ? "Verified ✓" : <><Send className="mr-2 h-4 w-4" /> Verify</>}
              </Button>
              {verified && <Button variant="outline" onClick={() => setStep(3)}>Continue →</Button>}
            </div>
          </div>
        )}

        {/* Configure (standard step 3, or partnership step 1) */}
        {((!isPartnership && step === 3) || (isPartnership && hasExternalReferral && step === 1)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Campaign Configuration</h3>
              <p className="text-xs text-muted-foreground mt-1">Set target audience and milestones</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Campaign" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Target Users (min 100) *</Label>
              <Input type="number" min="100" step="1" value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Milestones *</Label>
              {[
                { id: "download", label: "App Downloads", price: prices.price_per_download },
                { id: "signup", label: "Sign Ups", price: prices.price_per_signup },
                { id: "purchase", label: "Sales / Purchases", price: prices.price_per_purchase },
              ].map((m) => (
                <label key={m.id} className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${milestones.includes(m.id) ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={milestones.includes(m.id)} onCheckedChange={(checked) => { setMilestones(checked ? [...milestones, m.id] : milestones.filter(x => x !== m.id)); }} />
                    <span className="text-sm text-foreground">{m.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">${m.price.toFixed(2)} / user</Badge>
                </label>
              ))}
            </div>
            {milestones.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                <p className="font-medium text-foreground text-xs">Cost Breakdown</p>
                {milestones.map(m => {
                  const price = m === "download" ? prices.price_per_download : m === "signup" ? prices.price_per_signup : prices.price_per_purchase;
                  const users = Math.max(100, Number(targetUsers) || 100);
                  return <div key={m} className="flex justify-between text-xs text-muted-foreground"><span className="capitalize">{m}: ${price.toFixed(2)} × {users}</span><span className="text-foreground">${(price * users).toFixed(2)}</span></div>;
                })}
                <div className="flex justify-between text-xs text-muted-foreground"><span>Placement Fee</span><span className="text-foreground">${prices.ad_placement_fee.toFixed(2)}</span></div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-medium text-foreground"><span>Total</span><span className="text-primary">${totalCost.toFixed(2)}</span></div>
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>Balance</span><span className={walletBalance >= totalCost ? "text-primary" : "text-destructive"}>${walletBalance.toFixed(2)} {walletBalance < totalCost && "(Insufficient)"}</span></div>
              </div>
            )}
            {walletBalance < totalCost && milestones.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Need ${totalCost.toFixed(2)}, have ${walletBalance.toFixed(2)}. <button onClick={() => navigate("/wallet")} className="underline">Fund wallet</button></p>
              </div>
            )}
            <Button className="w-full" onClick={() => setStep(isPartnership ? 2 : 4)} disabled={!campaignName.trim() || milestones.length === 0 || Number(targetUsers) < 100}>
              Review & Submit
            </Button>
          </div>
        )}

        {/* Review & Submit (standard step 4, or partnership step 2) */}
        {((!isPartnership && step === 4) || (isPartnership && hasExternalReferral && step === 2)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Review & Submit</h3>
              <p className="text-xs text-muted-foreground mt-1">Review before submitting for admin approval</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {[
                { l: "Campaign Name", v: campaignName },
                { l: "Type", v: isPartnership ? "External Referral" : integrationType === "wordpress" ? "WordPress" : "Custom API" },
                ...(isPartnership ? [] : [{ l: "Verified", v: verified ? "Yes ✓" : "Pending" }]),
                { l: "Target Users", v: targetUsers },
                { l: "Milestones", v: milestones.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ") },
                { l: "Total Cost", v: `$${totalCost.toFixed(2)}` },
                { l: "Balance", v: `$${walletBalance.toFixed(2)}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm"><span className="text-muted-foreground">{r.l}</span><span className="text-foreground font-medium">{r.v}</span></div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(isPartnership ? 1 : 3)}>← Back</Button>
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
