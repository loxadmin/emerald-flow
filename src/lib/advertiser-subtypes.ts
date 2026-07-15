// Central subtype registry — mirrors advertiser_subtype enum in Postgres and
// the taxonomy shown in Signup / CategorySelection.

export type AdvertiserSubtype =
  | "musician" | "youtuber" | "social_media_creator"
  | "app" | "website" | "fintech" | "game_developers" | "sports_betting"
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
  { id: "game_developers",      label: "Game Developers",       group: "performance",     mode: "online"  },
  { id: "sports_betting",       label: "Sports and Betting",    group: "performance",     mode: "online"  },
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

export const SUBTYPE_GOAL_OPTIONS: Record<AdvertiserSubtype, string[]> = {
  musician: ["Music streams", "Lyric quiz completions", "Brand awareness", "Social engagement"],
  youtuber: ["Video plays", "Watch-time completions", "Subscribers", "Brand awareness"],
  social_media_creator: ["Social engagement", "Video plays", "Brand awareness"],
  app: ["App installs", "Signups", "In-app engagement", "Subscriptions"],
  website: ["Signups", "Leads", "CPA conversions", "Page engagement"],
  fintech: ["App installs", "Signups", "KYC completions", "First deposits", "Transactions"],
  game_developers: ["Game installs", "Signups", "In-game purchases", "In-game engagement"],
  sports_betting: ["Signups", "First deposits", "Placing bets", "App installs"],
  ecommerce: ["Sales", "Cart conversions", "Repeat purchases"],
  online_vendor: ["Sales", "Cart conversions", "Repeat purchases", "Lead orders"],
  realtor: ["Property leads", "Inspection bookings", "Property sales"],
  food_beverage: ["MOQ orders", "Distribution reach", "Store visits", "Repeat orders"],
  household_items: ["MOQ orders", "Distribution reach", "Store visits", "Repeat orders"],
  telecom: ["Brand awareness", "Store visits", "Agent activations", "Distribution reach"],
  oil_gas: ["Brand awareness", "Distributor orders", "Station visits", "Repeat orders"],
};

export const subtypeLabel = (id: string | null | undefined): string =>
  SUBTYPES.find((s) => s.id === id)?.label ?? (id ?? "");

export const subtypeMeta = (id: string | null | undefined): SubtypeMeta | undefined =>
  SUBTYPES.find((s) => s.id === id);

export const getSubtypeGoalOptions = (id: string | null | undefined): string[] => {
  const subtype = id as AdvertiserSubtype | null | undefined;
  return subtype && SUBTYPE_GOAL_OPTIONS[subtype] ? SUBTYPE_GOAL_OPTIONS[subtype] : [];
};

export const subtypesByGroup = (): Record<SubtypeGroupSlug, SubtypeMeta[]> => {
  const map = {
    engagement: [], commerce: [], performance: [], daily_essentials: [], mainstream: [],
  } as Record<SubtypeGroupSlug, SubtypeMeta[]>;
  for (const s of SUBTYPES) map[s.group].push(s);
  return map;
};
