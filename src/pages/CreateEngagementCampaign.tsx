import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Music, MonitorPlay, Send, Loader2, CheckCircle, Edit3, AlertCircle, DollarSign, Eye, UserPlus, Plus, Trash2 } from "lucide-react";

type MediaType = "music" | "video";
type EventType = "viewer" | "subscriber";

const MUSIC_RATE = 0.20;
const VIDEO_VIEWER_RATE = 0.40;
const VIDEO_SUBSCRIBER_RATE = 0.15;
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
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [mediaLink, setMediaLink] = useState("");
  const [musicLinks, setMusicLinks] = useState<string[]>([""]);
  const MAX_MUSIC_LINKS = 3;
  const validMusicLinks = musicLinks.map(l => l.trim()).filter(Boolean);
  const effectiveMediaLink = isMusicLinkMode() ? validMusicLinks.join("\n") : mediaLink.trim();
  function isMusicLinkMode() { return mediaType === "music"; }
  const updateMusicLink = (i: number, v: string) => setMusicLinks(prev => prev.map((x, idx) => idx === i ? v : x));
  const addMusicLink = () => setMusicLinks(prev => prev.length < MAX_MUSIC_LINKS ? [...prev, ""] : prev);
  const removeMusicLink = (i: number) => setMusicLinks(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const [transcription, setTranscription] = useState("");
  const [transcriptionConfirmed, setTranscriptionConfirmed] = useState(false);
  const [targetViewers, setTargetViewers] = useState("200");
  const [targetSubscribers, setTargetSubscribers] = useState("200");
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("advertiser_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setWalletBalance(Number(data.balance)); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // For music: single event implicit ("listener")
  const isMusic = mediaType === "music";
  const isVideo = mediaType === "video";
  const hasViewer = isMusic || eventTypes.includes("viewer");
  const hasSubscriber = isVideo && eventTypes.includes("subscriber");
  const needsTranscription = isMusic || (isVideo && eventTypes.includes("viewer"));

  const viewerRate = isMusic ? MUSIC_RATE : VIDEO_VIEWER_RATE;
  const subscriberRate = VIDEO_SUBSCRIBER_RATE;
  const viewerCount = Math.max(MIN_INTERACTIONS, Number(targetViewers) || MIN_INTERACTIONS);
  const subscriberCount = Math.max(MIN_INTERACTIONS, Number(targetSubscribers) || MIN_INTERACTIONS);
  const viewerCost = hasViewer ? viewerRate * viewerCount : 0;
  const subscriberCost = hasSubscriber ? subscriberRate * subscriberCount : 0;
  const totalCost = viewerCost + subscriberCost + PLACEMENT_FEE;

  const viewerLabel = isMusic ? "listener" : "viewer";

  const handleAfterMediaType = (t: MediaType) => {
    setMediaType(t);
    if (t === "music") {
      setEventTypes(["viewer"]); // music = listener event only
      setStep(1);
    } else {
      setEventTypes([]);
      setStep(1); // event selection step for video
    }
  };

  const handleTranscribe = async () => {
    if (isMusic) {
      if (validMusicLinks.length === 0) { toast.error("Add at least one song link"); return; }
    } else if (!mediaLink.trim()) { toast.error("Enter a media link first"); return; }
    if (!needsTranscription) {
      // Skip transcription entirely, go to configure
      setStep(4);
      return;
    }
    setTranscribing(true);
    setTimeout(() => {
      setTranscribing(false);
      toast.info(`Please paste your ${isMusic ? "song lyrics" : "video script"} below for verification.`);
      setStep(3);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!user || !mediaType || !campaignName.trim() || !effectiveMediaLink) {
      toast.error("Please fill in all fields"); return;
    }
    if (isVideo && eventTypes.length === 0) {
      toast.error("Select at least one event type"); return;
    }
    if (needsTranscription) {
      if (!transcription.trim()) { toast.error("Transcription is required"); return; }
      if (!transcriptionConfirmed) { toast.error("Please confirm the transcription is correct"); return; }
    }
    if (hasViewer && viewerCount < MIN_INTERACTIONS) {
      toast.error(`Minimum ${MIN_INTERACTIONS} ${viewerLabel}s`); return;
    }
    if (hasSubscriber && subscriberCount < MIN_INTERACTIONS) {
      toast.error(`Minimum ${MIN_INTERACTIONS} subscribers`); return;
    }
    if (walletBalance < totalCost) {
      toast.error(`Insufficient balance. Need $${totalCost.toFixed(2)}, have $${walletBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
      advertiser_id: user.id,
      name: campaignName.trim(),
      budget_remaining: 0,
      integration_type: "engagement",
      ad_type: "engagement",
      target_users: hasViewer ? viewerCount : subscriberCount,
      selected_milestones: [],
      total_cost: totalCost,
      price_download: 0,
      price_signup: 0,
      price_purchase: 0,
      is_draft: false,
    } as any).select().single();

    if (campErr) { toast.error(campErr.message); setLoading(false); return; }

    const { error: creativeErr } = await supabase.from("creative_campaigns" as any).insert({
      campaign_id: campaign.id,
      advertiser_id: user.id,
      media_type: mediaType,
      media_link: effectiveMediaLink,
      transcription: needsTranscription ? transcription.trim() : null,
      transcription_confirmed: needsTranscription ? true : null,
      rate_per_interaction: hasViewer ? viewerRate : subscriberRate,
      min_interactions: MIN_INTERACTIONS,
      placement_fee: PLACEMENT_FEE,
      event_types: isMusic ? ["viewer"] : eventTypes,
      viewer_rate: hasViewer ? viewerRate : null,
      subscriber_rate: hasSubscriber ? subscriberRate : null,
      target_subscribers: hasSubscriber ? subscriberCount : null,
    } as any);

    if (creativeErr) { toast.error(creativeErr.message); setLoading(false); return; }

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
    toast.success("Campaign submitted for review!");
    navigate(`/campaigns/${campaign.id}`);
  };

  const STEPS = isVideo
    ? ["Media Type", "Events", "Upload", needsTranscription ? "Transcription" : null, "Configure", "Submit"].filter(Boolean) as string[]
    : ["Media Type", "Upload", "Transcription", "Configure", "Submit"];

  // Step indices (variable due to optional transcription for video)
  // 0 = media type, 1 = events (video) or upload (music), 2 = upload (video) or transcription (music)
  // For clarity we use the original step numbers but skip transcription where appropriate.

  const toggleEvent = (e: EventType) => {
    setEventTypes((prev) => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

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
                { type: "video" as MediaType, label: "Video", desc: "From $0.15 per event", icon: MonitorPlay },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleAfterMediaType(opt.type)}
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

        {/* Step 1 (video only): Choose events */}
        {step === 1 && isVideo && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground">Which events do you want to track?</h3>
              <p className="text-xs text-muted-foreground mt-1">Select one or both. You pay per completed event.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { type: "viewer" as EventType, label: "Viewer", desc: `$${VIDEO_VIEWER_RATE.toFixed(2)} per viewer`, sub: "Requires transcript + auto-generated quiz", icon: Eye },
                { type: "subscriber" as EventType, label: "Subscriber", desc: `$${VIDEO_SUBSCRIBER_RATE.toFixed(2)} per subscriber`, sub: "No transcript needed", icon: UserPlus },
              ]).map((opt) => {
                const active = eventTypes.includes(opt.type);
                return (
                  <button
                    key={opt.type}
                    onClick={() => toggleEvent(opt.type)}
                    className={`rounded-xl border p-5 text-left transition-colors ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                  >
                    <div className="flex items-start justify-between">
                      <opt.icon className="h-6 w-6 text-primary mb-2" />
                      {active && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
              <Button className="flex-1" onClick={() => setStep(2)} disabled={eventTypes.length === 0}>Continue →</Button>
            </div>
          </div>
        )}

        {/* Upload step: step 1 (music) or step 2 (video) */}
        {((step === 1 && isMusic) || (step === 2 && isVideo)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                {isMusic ? <Music className="h-4 w-4 text-primary" /> : <MonitorPlay className="h-4 w-4 text-primary" />}
                {isMusic ? "Paste your song link" : "Paste your video link"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isMusic ? "Link to your song on Spotify, Apple Music, YouTube Music, etc." : "Link to your YouTube video"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My Campaign" />
            </div>
            {isMusic ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Song Links * <span className="text-muted-foreground/70">(up to {MAX_MUSIC_LINKS} platforms)</span></Label>
                  {musicLinks.length < MAX_MUSIC_LINKS && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addMusicLink}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add link
                    </Button>
                  )}
                </div>
                {musicLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(e) => updateMusicLink(i, e.target.value)}
                      placeholder={i === 0 ? "https://open.spotify.com/track/..." : i === 1 ? "https://music.apple.com/..." : "https://music.youtube.com/..."}
                    />
                    {musicLinks.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeMusicLink(i)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">Add the same song from different platforms (Spotify, Apple Music, YouTube Music, etc.).</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Video Link *</Label>
                <Input value={mediaLink} onChange={(e) => setMediaLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(isVideo ? 1 : 0)}>← Back</Button>
              <Button className="flex-1" onClick={handleTranscribe} disabled={transcribing || !campaignName.trim() || (isMusic ? validMusicLinks.length === 0 : !mediaLink.trim())}>
                {transcribing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : needsTranscription ? "Continue to Transcription →" : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {/* Transcription step: step 2 (music) or step 3 (video, when needed) */}
        {needsTranscription && ((step === 2 && isMusic) || (step === 3 && isVideo)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" /> {isMusic ? "Song Lyrics / Transcription" : "Video Script / Transcription"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Paste or edit the {isMusic ? "lyrics" : "script"} below. This will be used to generate quiz questions for {viewerLabel}s.
              </p>
            </div>
            <Textarea
              value={transcription}
              onChange={(e) => { setTranscription(e.target.value); setTranscriptionConfirmed(false); }}
              placeholder={isMusic ? "Paste your song lyrics here..." : "Paste your video script here..."}
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
              <Button variant="outline" onClick={() => setStep(isMusic ? 1 : 2)}>← Back</Button>
              <Button className="flex-1" onClick={() => setStep(isMusic ? 3 : 4)} disabled={!transcription.trim() || !transcriptionConfirmed}>
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Configure step: step 3 (music) or step 4 (video) */}
        {((step === 3 && isMusic) || (step === 4 && isVideo)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Campaign Budget
              </h3>
            </div>

            {hasViewer && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Target {viewerLabel}s (min {MIN_INTERACTIONS.toLocaleString()}) — ${viewerRate.toFixed(2)} each *
                </Label>
                <Input
                  type="number"
                  min={MIN_INTERACTIONS}
                  value={targetViewers}
                  onChange={(e) => setTargetViewers(e.target.value)}
                />
              </div>
            )}

            {hasSubscriber && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Target subscribers (min {MIN_INTERACTIONS.toLocaleString()}) — ${subscriberRate.toFixed(2)} each *
                </Label>
                <Input
                  type="number"
                  min={MIN_INTERACTIONS}
                  value={targetSubscribers}
                  onChange={(e) => setTargetSubscribers(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <p className="font-medium text-foreground text-xs">Cost Breakdown</p>
              {hasViewer && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{viewerCount.toLocaleString()} {viewerLabel}s × ${viewerRate.toFixed(2)}</span>
                  <span className="text-foreground">${viewerCost.toFixed(2)}</span>
                </div>
              )}
              {hasSubscriber && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{subscriberCount.toLocaleString()} subscribers × ${subscriberRate.toFixed(2)}</span>
                  <span className="text-foreground">${subscriberCost.toFixed(2)}</span>
                </div>
              )}
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
              <Button variant="outline" onClick={() => setStep(needsTranscription ? (isMusic ? 2 : 3) : 2)}>← Back</Button>
              <Button className="flex-1" onClick={() => setStep(isMusic ? 4 : 5)}>
                Review & Submit →
              </Button>
            </div>
          </div>
        )}

        {/* Submit step: step 4 (music) or step 5 (video) */}
        {((step === 4 && isMusic) || (step === 5 && isVideo)) && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Review & Submit
              </h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {[
                { l: "Campaign Name", v: campaignName },
                { l: "Type", v: isMusic ? "Music (Engagement)" : "Video (Engagement)" },
                ...(isVideo ? [{ l: "Events", v: eventTypes.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(", ") }] : []),
                { l: isMusic && validMusicLinks.length > 1 ? `Song Links (${validMusicLinks.length})` : "Media Link", v: isMusic ? validMusicLinks.join(" • ") : mediaLink },
                ...(hasViewer ? [{ l: `Target ${viewerLabel}s`, v: `${viewerCount.toLocaleString()} × $${viewerRate.toFixed(2)}` }] : []),
                ...(hasSubscriber ? [{ l: "Target subscribers", v: `${subscriberCount.toLocaleString()} × $${subscriberRate.toFixed(2)}` }] : []),
                { l: "Total Cost", v: `$${totalCost.toFixed(2)}` },
                { l: "Balance", v: `$${walletBalance.toFixed(2)}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="text-foreground font-medium">{r.v}</span>
                </div>
              ))}
            </div>
            {needsTranscription && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p>Upon admin approval, 20 simple yes/no questions will be auto-generated by AI from your transcription and a referral link will be created.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(isMusic ? 3 : 4)}>← Back</Button>
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
