export type AiCampaignType = "performance" | "engagement" | "commerce";

export type AiCampaignPrefill = {
  type: AiCampaignType;
  createdAt: number;
  campaignName?: string;
  targetUsers?: string;
  milestones?: string[];
  integrationType?: "custom" | "wordpress";
  mediaType?: "music" | "video";
  eventTypes?: string[];
  mediaLink?: string;
  musicLinks?: string[];
  transcription?: string;
  transcriptionConfirmed?: boolean;
  targetViewers?: string;
  targetSubscribers?: string;
  targetSales?: string;
};

const AI_CAMPAIGN_PREFILL_KEY = "karbali-ai-campaign-prefill";
const MAX_AGE_MS = 60 * 60 * 1000;

export function saveAiCampaignPrefill(prefill: AiCampaignPrefill) {
  try {
    localStorage.setItem(AI_CAMPAIGN_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // Ignore local storage quota errors.
  }
}

export function loadAiCampaignPrefill(): AiCampaignPrefill | null {
  try {
    const raw = localStorage.getItem(AI_CAMPAIGN_PREFILL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AiCampaignPrefill;
    if (!value?.type || Date.now() - Number(value.createdAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(AI_CAMPAIGN_PREFILL_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function clearAiCampaignPrefill() {
  try {
    localStorage.removeItem(AI_CAMPAIGN_PREFILL_KEY);
  } catch {
    // Ignore local storage errors.
  }
}