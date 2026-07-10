// Central subtype registry — mirrors advertiser_subtype enum in Postgres and
// the taxonomy shown in Signup / CategorySelection.

export type AdvertiserSubtype =
  | "musician" | "youtuber" | "social_media_creator"
  | "app" | "website" | "fintech"
  | "ecommerce" | "online_vendor" | "realtor"
  | "food_beverage" | "household_items"
  | "telecom" | "oil_gas";

export type SubtypeGroupSlug =
  | "engagement" | "performance" | "commerce"
  | "daily_essentials" | "mainstream";

export interface SubtypeMeta {
  id: AdvertiserSubtype;
  label: string;
  group: SubtypeGroupSlug;
  mode: "online" | "offline";
}

export const SUBTYPES: SubtypeMeta[] = [
  // Online — Engagement
  { id: "musician",             label: "Musician",              group: "engagement",      mode: "online"  },
  { id: "youtuber",             label: "YouTuber",              group: "engagement",      mode: "online"  },
  { id: "social_media_creator", label: "Social Media Creator",  group: "engagement",      mode: "online"  },
  // Online — Commerce
  { id: "ecommerce",            label: "E-commerce",            group: "commerce",        mode: "online"  },
  { id: "online_vendor",        label: "Online Vendor",         group: "commerce",        mode: "online"  },
  { id: "realtor",              label: "Realtor / Real Estate", group: "commerce",        mode: "online"  },
  // Online — Performance
  { id: "app",                  label: "Mobile App Owner",      group: "performance",     mode: "online"  },
  { id: "website",              label: "Website Owner",         group: "performance",     mode: "online"  },
  { id: "fintech",              label: "Fintech",               group: "performance",     mode: "online"  },
  // Offline — Daily Essentials
  { id: "food_beverage",        label: "Food & Beverage",       group: "daily_essentials",mode: "offline" },
  { id: "household_items",      label: "Household Items",       group: "daily_essentials",mode: "offline" },
  // Offline — Mainstream
  { id: "telecom",              label: "Telecommunications",    group: "mainstream",      mode: "offline" },
  { id: "oil_gas",              label: "Oil & Gas",             group: "mainstream",      mode: "offline" },
];

export const GROUP_LABELS: Record<SubtypeGroupSlug, string> = {
  engagement: "Engagement",
  commerce: "Commerce",
  performance: "Performance",
  daily_essentials: "Daily Essentials",
  mainstream: "Mainstream",
};

export const subtypeLabel = (id: string | null | undefined): string =>
  SUBTYPES.find((s) => s.id === id)?.label ?? (id ?? "");

export const subtypesByGroup = (): Record<SubtypeGroupSlug, SubtypeMeta[]> => {
  const map = {
    engagement: [], commerce: [], performance: [], daily_essentials: [], mainstream: [],
  } as Record<SubtypeGroupSlug, SubtypeMeta[]>;
  for (const s of SUBTYPES) map[s.group].push(s);
  return map;
};
