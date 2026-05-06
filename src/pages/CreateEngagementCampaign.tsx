import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Music, MonitorPlay, Send, Loader2, CheckCircle, Edit3, AlertCircle, DollarSign } from "lucide-react";

type MediaType = "music" | "video";

const RATES = { music: 0.20, video: 0.60 };
const PLACEMENT_FEE = 10;
const MIN_INTERACTIONS = 200;

export default function CreateEngagementCampaign() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Campaign fields
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [mediaLink, setMediaLink] = useState("");
  const [transcription, setTranscription] = useState("");
  const [transcriptionConfirmed, setTranscriptionConfirmed] = useState(false);
  const [targetInteractions, setTargetInteractions] = useState("200");
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setWalletBalance(Number(data.balance)); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const rate = mediaType ? RATES[mediaType] : 0;
  const interactions = Math.max(MIN_INTERACTIONS, Number(targetInteractions) || MIN_INTERACTIONS);
  const totalCost = rate * interactions + PLACEMENT_FEE;

  const handleTranscribe = async () => {
    if (!mediaLink.trim()) { toast.error("Enter a media link first"); return; }
    setTranscribing(true);
    // Simulated transcription — in production this would call an AI service
    // For now, prompt the user to paste their own lyrics/script
    setTimeout(() => {
      setTranscribing(false);
      toast.info("Please paste your song lyrics or video script below for verification.");
      setStep(2);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!user || !mediaType || !campaignName.trim() || !mediaLink.trim() || !transcription.trim()) {
      toast.error("Please fill in all fields"); return;
    }
    if (!transcriptionConfirmed) { toast.error("Please confirm the transcription is correct"); return; }
    if (interactions < MIN_INTERACTIONS) { toast.error(`Minimum ${MIN_INTERACTIONS} ${mediaType === "music" ? "listeners" : "viewers"}`); return; }
    if (walletBalance < totalCost) {
      toast.error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${walletBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    // Create campaign
    const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
      advertiser_id: user.id,
      name: campaignName.trim(),
      budget_remaining: 0,
      integration_type: "engagement",
      ad_type: "engagement",
      target_users: interactions,
      selected_milestones: [],
      total_cost: totalCost,
      price_download: 0,
      price_signup: 0,
      price_purchase: 0,
      is_draft: false,
    } as any).select().single();

    if (campErr) { toast.error(campErr.message); setLoading(false); return; }

    // Create creative campaign record
    const { error: creativeErr } = await supabase.from("creative_campaigns" as any).insert({
      campaign_id: campaign.id,
      advertiser_id: user.id,
      media_type: mediaType,
      media_link: mediaLink.trim(),
      transcription: transcription.trim(),
      transcription_confirmed: true,
      rate_per_interaction: rate,
      min_interactions: MIN_INTERACTIONS,
      placement_fee: PLACEMENT_FEE,
    } as any);

    if (creativeErr) { toast.error(creativeErr.message); setLoading(false); return; }

    // Submit for escrow
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const { data: escrowResult, error: escrowError } = await supabase.functions.invoke("manage-campaign", {
      body: { action: "submit_campaign", campaign_id: campaign.id },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (escrowError || escrowResult?.error) {
      toast.error(escrowResult?.error || escrowError?.message || "Failed to fund campaign escrow");
      setLoading(false);
      return;
    }

    setLoading(false);
    toast.success("Campaign submitted for review! Questions will be auto-generated upon approval.");
    navigate(`/campaigns/${campaign.id}`);
  };

  const STEPS = ["Media Type", "Upload", "Transcription", "Configure", "Submit"];

  return (
    <DashboardLayout>
      <MotionWrapper className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Create Engagement Campaign</h1>

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

        {/* Step 0: Choose media type */}
        {step === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground">What are you promoting?</h3>
              <p className="text-xs text-muted-foreground mt-1">Choose between music or video content</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { type: "music" as MediaType, label: "Music", desc: "$0.20 per listener", icon: Music },
                { type: "video" as MediaType, label: "Video", desc: "$0.60 per viewer", icon: MonitorPlay },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setMediaType(opt.type); setStep(1); }}
                  className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/30 transition-colors"
                >
                  <opt.icon className="h-6 w-6 text-primary mb-2" />
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Upload media link */}
        {step === 1 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                {mediaType === "music" ? <Music className="h-4 w-4 text-primary" /> : <MonitorPlay className="h-4 w-4 text-primary" />}
                {mediaType === "music" ? "Paste your song link" : "Paste your video link"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {mediaType === "music" ? "Link to your song on Spotify, Apple Music, YouTube Music, etc." : "Link to your YouTube video"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Music Campaign" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{mediaType === "music" ? "Song Link" : "Video Link"} *</Label>
              <Input value={mediaLink} onChange={(e) => setMediaLink(e.target.value)} placeholder={mediaType === "music" ? "https://open.spotify.com/track/..." : "https://youtube.com/watch?v=..."} />
            </div>
            <Button className="w-full" onClick={handleTranscribe} disabled={transcribing || !mediaLink.trim() || !campaignName.trim()}>
              {transcribing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Continue to Transcription →"}
            </Button>
          </div>
        )}

        {/* Step 2: Transcription */}
        {step === 2 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" /> {mediaType === "music" ? "Song Lyrics / Transcription" : "Video Script / Transcription"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Paste or edit the {mediaType === "music" ? "lyrics" : "script"} below. This will be used to generate quiz questions for listeners.
              </p>
            </div>
            <Textarea
              value={transcription}
              onChange={(e) => { setTranscription(e.target.value); setTranscriptionConfirmed(false); }}
              placeholder={mediaType === "music" ? "Paste your song lyrics here..." : "Paste your video script here..."}
              rows={10}
              className="font-mono text-sm"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transcriptionConfirmed}
                onChange={(e) => setTranscriptionConfirmed(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">I confirm this transcription is correct</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!transcription.trim() || !transcriptionConfirmed}>
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Campaign Budget
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Target {mediaType === "music" ? "Listeners" : "Viewers"} (min {MIN_INTERACTIONS.toLocaleString()}) *
              </Label>
              <Input
                type="number"
                min={MIN_INTERACTIONS}
                value={targetInteractions}
                onChange={(e) => setTargetInteractions(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <p className="font-medium text-foreground text-xs">Cost Breakdown</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{interactions.toLocaleString()} {mediaType === "music" ? "listeners" : "viewers"} × ${rate.toFixed(2)}</span>
                <span className="text-foreground">${(rate * interactions).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ad Placement Fee</span>
                <span className="text-foreground">${PLACEMENT_FEE.toFixed(2)}</span>
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
            {walletBalance < totalCost && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Need ${totalCost.toFixed(2)}, have ${walletBalance.toFixed(2)}.{" "}
                  <button onClick={() => navigate("/wallet")} className="underline">Fund wallet</button>
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button className="flex-1" onClick={() => setStep(4)} disabled={interactions < MIN_INTERACTIONS}>
                Review & Submit →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Review & Submit
              </h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {[
                { l: "Campaign Name", v: campaignName },
                { l: "Type", v: mediaType === "music" ? "Music (Engagement)" : "Video (Engagement)" },
                { l: "Media Link", v: mediaLink },
                { l: `Target ${mediaType === "music" ? "Listeners" : "Viewers"}`, v: interactions.toLocaleString() },
                { l: "Rate", v: `$${rate.toFixed(2)} per ${mediaType === "music" ? "listener" : "viewer"}` },
                { l: "Total Cost", v: `$${totalCost.toFixed(2)}` },
                { l: "Balance", v: `$${walletBalance.toFixed(2)}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="text-foreground font-medium">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>Upon admin approval, 50 quiz questions will be auto-generated from your transcription and a referral link will be created.</p>
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
