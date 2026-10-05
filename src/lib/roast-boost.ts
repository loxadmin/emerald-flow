// Roast & Boost: shared helpers for advertiser and admin screens.
import type { AdvertiserSubtype } from "@/lib/advertiser-subtypes";

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
  facebook: "Facebook",
  youtube: "YouTube",
  spotify: "Spotify",
  audiomack: "Audiomack",
};
export const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS);

const THING: Partial<Record<AdvertiserSubtype, string>> = {
  musician: "music",
  youtuber: "channel",
  social_media_creator: "content",
  app: "app",
  website: "website",
  fintech: "fintech brand",
  ecommerce: "store",
  online_vendor: "store",
  realtor: "listings",
  food_beverage: "brand",
  household_items: "brand",
  telecom: "brand",
  oil_gas: "brand",
};

export function roastBoostHeadline(subtype: string | null | undefined): string {
  const thing = THING[subtype as AdvertiserSubtype] ?? "brand";
  if (subtype === "musician") return "Make your music viral on social media";
  return `Take your ${thing} viral on social media`;
}

export type RoastBoostPricing = {
  subtype: string;
  price_per_1000: number;
  daily_fee_per_user: number;
  platforms: string[];
  min_followers: number;
  min_days: number;
  is_active: boolean;
};

export function roastBoostCost(p: Pick<RoastBoostPricing, "price_per_1000" | "daily_fee_per_user">, followers: number, days: number) {
  const follower = Math.round((followers / 1000) * Number(p.price_per_1000) * 100) / 100;
  const daily = Math.round(followers * days * Number(p.daily_fee_per_user) * 100) / 100;
  return { follower, daily, total: Math.round((follower + daily) * 100) / 100 };
}

export const usd = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
