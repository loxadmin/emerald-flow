// Shared API-key -> campaign resolver.
//
// WHY: `api_keys` is read by key on every tracking request (~19k reads and the
// single hottest lookup in the database), yet the row is effectively static —
// a key maps to one campaign for its whole life. Resolving it through the
// cache-aside helper removes that round trip from the hot path.
//
// SECURITY: the cached value contains no secret. The key itself is the cache
// key input and only the campaign/advertiser ids are stored. Revocation is
// bounded by CacheTTL.lookup (60s); call `invalidateApiKey` from any path that
// deletes or rotates a key to make it immediate.

import { cached, cacheKeys, CacheTTL, invalidate } from "./cache.ts";

export type ResolvedApiKey = {
  campaignId: string | null;
  advertiserId: string | null;
};

// Structurally typed so any Supabase client (typed or untyped) can be passed
// without dragging the generated Database types into shared code.
// deno-lint-ignore no-explicit-any
type MinimalClient = { from: (table: string) => any };

/**
 * Resolve an API key to its campaign (and owning advertiser).
 * Returns `{ campaignId: null }` for unknown keys — callers decide the status
 * code, so behaviour is unchanged from the inline queries this replaces.
 */
export async function resolveApiKey(
  supabase: MinimalClient,
  apiKey: string,
): Promise<ResolvedApiKey> {
  if (!apiKey) return { campaignId: null, advertiserId: null };

  return await cached<ResolvedApiKey>(cacheKeys.apiKey(apiKey), CacheTTL.lookup, async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("campaign_id, campaigns(advertiser_id)")
      .eq("key", apiKey)
      .maybeSingle();

    const row = data as { campaign_id?: string; campaigns?: { advertiser_id?: string } | null } | null;
    return {
      campaignId: row?.campaign_id ?? null,
      advertiserId: row?.campaigns?.advertiser_id ?? null,
    };
  });
}

/** Call after deleting or rotating a key so revocation takes effect at once. */
export async function invalidateApiKey(apiKey: string) {
  await invalidate(cacheKeys.apiKey(apiKey));
}
