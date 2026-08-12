// Data-access (repository) layer.
//
// This is the ONLY place new code should call `supabase.from(...)` for shared
// entities. Components consume the hooks in `src/lib/data/hooks.ts`, which wrap
// these functions in TanStack Query.
//
// Rules enforced here:
//  - explicit column lists, never `select("*")`
//  - every list query is bounded (limit / range)
//  - ownership filters are applied in addition to RLS (defence in depth)
//
// Portability: nothing above this file imports the Supabase client directly, so
// swapping PostgREST for a DigitalOcean-hosted API later means reimplementing
// this module only.

import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type Page<T> = { rows: T[]; page: number; pageSize: number; hasMore: boolean };

function range(page: number, pageSize: number) {
  const size = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const from = page * size;
  return { from, to: from + size, size }; // fetch one extra row to detect hasMore
}

function toPage<T>(rows: T[] | null, page: number, size: number): Page<T> {
  const list = rows || [];
  const hasMore = list.length > size;
  return { rows: hasMore ? list.slice(0, size) : list, page, pageSize: size, hasMore };
}

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------------------------------------------ profile */

export const PROFILE_COLUMNS =
  "id, email, full_name, company_name, phone, country, avatar_url, created_at";

export function fetchProfile(userId: string) {
  return unwrap(
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
  );
}

/* ------------------------------------------------------------------- wallet */

export const WALLET_COLUMNS =
  "id, advertiser_id, balance, currency, activated, activation_amount, created_at, updated_at";

export function fetchWallet(userId: string) {
  return unwrap(
    supabase.from("wallets").select(WALLET_COLUMNS).eq("advertiser_id", userId).maybeSingle(),
  );
}

export async function fetchWalletTransactions(
  walletId: string,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const { from, to, size } = range(page, pageSize);
  const rows = await unwrap(
    supabase
      .from("wallet_transactions")
      .select("id, amount, type, description, reference, status, created_at")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  return toPage(rows as unknown[], page, size);
}

/* ---------------------------------------------------------------- campaigns */

export const CAMPAIGN_LIST_COLUMNS =
  "id, name, status, campaign_mode, target_users, cost_per_user, budget, spent, created_at, advertiser_id";

export async function fetchCampaigns(userId: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) {
  const { from, to, size } = range(page, pageSize);
  const rows = await unwrap(
    supabase
      .from("campaigns")
      .select(CAMPAIGN_LIST_COLUMNS)
      .eq("advertiser_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  return toPage(rows as unknown[], page, size);
}

/**
 * Aggregate event counts for a set of campaigns in ONE round trip.
 * Replaces the "for each campaign -> count events" N+1 pattern.
 */
export async function fetchEventCountsByCampaign(campaignIds: string[]) {
  if (campaignIds.length === 0) return {} as Record<string, number>;
  const rows = await unwrap(
    supabase
      .from("events")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .limit(10_000),
  );
  const counts: Record<string, number> = {};
  for (const r of (rows as { campaign_id: string }[]) || []) {
    counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1;
  }
  return counts;
}

/* ------------------------------------------------------------ public config */

export function fetchAdminSetting(key: string) {
  return unwrap(supabase.from("admin_settings").select("value").eq("key", key).maybeSingle());
}

export function fetchSiteContent() {
  return unwrap(supabase.from("site_content").select("key, value, updated_at").limit(200));
}

export function fetchCategoryGroups() {
  return unwrap(
    supabase.from("category_groups").select("id, slug, name, description").limit(100),
  );
}
