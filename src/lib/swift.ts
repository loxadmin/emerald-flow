export type SwiftTier = {
  id?: string;
  min_units: number;
  max_units: number;
  price_per_user_usd: number;
};

export type SwiftAction = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_per_user_per_day: number;
  is_active: boolean;
  sort_order: number;
};

export type SwiftPkgAction = {
  action_id: string;
  price_override_usd: number | null;
};

export type SwiftOrderAction = {
  key: string;
  action_id?: string;
  name: string;
  price_per_user_per_day: number;
  source: "preset" | "custom";
  status?: string;
};

/** Price per user for a given volume, using the descending range table. */
export function tierPriceFor(tiers: SwiftTier[], units: number): number | null {
  const match = tiers
    .filter((t) => units >= t.min_units && units <= t.max_units)
    .sort((a, b) => a.price_per_user_usd - b.price_per_user_usd)[0];
  return match ? Number(match.price_per_user_usd) : null;
}

export function swiftMinUnits(tiers: SwiftTier[], fallback = 10): number {
  if (!tiers.length) return fallback;
  return Math.max(10, Math.min(...tiers.map((t) => t.min_units)));
}

export function swiftMaxUnits(tiers: SwiftTier[], fallback = 0): number {
  if (!tiers.length) return fallback;
  return Math.max(...tiers.map((t) => t.max_units));
}

/**
 * Cheapest possible entry cost for a swift package: the smallest volume
 * on offer priced at its own tier rate.
 */
export function swiftStartingPrice(tiers: SwiftTier[]): number | null {
  if (!tiers.length) return null;
  const min = swiftMinUnits(tiers);
  const price = tierPriceFor(tiers, min);
  return price == null ? null : Number((price * min).toFixed(2));
}

export function swiftDailyRate(actions: { price_per_user_per_day: number }[]): number {
  return actions.reduce((s, a) => s + (Number(a.price_per_user_per_day) || 0), 0);
}

export function swiftTotal(
  unitPrice: number,
  units: number,
  durationDays: number,
  actions: { price_per_user_per_day: number }[],
) {
  const base = Number((unitPrice * units).toFixed(2));
  const daily = Number((swiftDailyRate(actions) * units * durationDays).toFixed(2));
  return { base, daily, total: Number((base + daily).toFixed(2)) };
}

export function sortTiers(tiers: SwiftTier[]): SwiftTier[] {
  return [...tiers].sort((a, b) => b.min_units - a.min_units);
}

/** Returns an error string when the ranges overlap, invert, or are empty. */
export function validateTiers(tiers: SwiftTier[]): string | null {
  if (tiers.length === 0) return "Add at least one user range with a price";
  for (const t of tiers) {
    if (!Number.isFinite(t.min_units) || t.min_units < 10) return "Ranges must start at 10 users or more";
    if (t.max_units < t.min_units) return "A range cannot end below where it starts";
    if (!Number.isFinite(t.price_per_user_usd) || t.price_per_user_usd <= 0) return "Every range needs a price above zero";
  }
  const sorted = [...tiers].sort((a, b) => a.min_units - b.min_units);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min_units <= sorted[i - 1].max_units) return "User ranges must not overlap";
  }
  return null;
}
