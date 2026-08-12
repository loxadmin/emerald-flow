// Central query-key registry.
//
// Every cached server-state read in the app derives its key from here so that
// invalidation is explicit and greppable. Never inline a raw string array as a
// query key in a component.
//
// Convention: [domain, scope, ...params]. User-scoped keys ALWAYS carry the
// owning user id so that one user's cache can never be served to another user
// after an account switch (the whole cache is also cleared on sign-out).

export const qk = {
  // --- auth / identity -----------------------------------------------------
  session: () => ["session"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  roles: (userId: string) => ["roles", userId] as const,
  advertiserCategory: (userId: string) => ["advertiser-category", userId] as const,

  // --- money ---------------------------------------------------------------
  wallet: (userId: string) => ["wallet", userId] as const,
  walletTransactions: (userId: string, page: number) =>
    ["wallet", userId, "transactions", page] as const,

  // --- campaigns -----------------------------------------------------------
  campaigns: (userId: string) => ["campaigns", userId] as const,
  campaign: (id: string) => ["campaign", id] as const,
  campaignEvents: (id: string, page: number) => ["campaign", id, "events", page] as const,

  // --- packages / offers ---------------------------------------------------
  packages: (scope: string) => ["packages", scope] as const,
  packageMilestones: () => ["package-milestones"] as const,
  packageOrders: (userId: string) => ["package-orders", userId] as const,
  switchOffers: (userId: string) => ["switch-offers", userId] as const,
  switchOrders: (userId: string) => ["switch-orders", userId] as const,

  // --- public / mostly-static ----------------------------------------------
  siteContent: () => ["site-content"] as const,
  categories: () => ["categories"] as const,
  categoryGroups: () => ["category-groups"] as const,
  adminSetting: (key: string) => ["admin-setting", key] as const,
  blogs: () => ["blogs"] as const,

  // --- admin ---------------------------------------------------------------
  adminCampaigns: (status: string) => ["admin", "campaigns", status] as const,
  adminOrders: (source: string) => ["admin", "orders", source] as const,
  adminAdvertisers: (page: number) => ["admin", "advertisers", page] as const,
} as const;

/**
 * Data volatility classes -> cache policy.
 *
 * Applied per-query via `...cachePolicy.static` etc. Keeping the four classes
 * in one place stops per-page guesswork and keeps refetch behaviour uniform.
 */
export const cachePolicy = {
  /** Public config, categories, marketing copy. Rarely changes. */
  static: { staleTime: 30 * 60_000, gcTime: 60 * 60_000, refetchOnWindowFocus: false },
  /** Lists that change on user action: campaigns, orders, packages. */
  standard: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  /** Balances, live delivery metrics. Cheap to be a little stale, costly to be wrong. */
  frequent: { staleTime: 15_000, gcTime: 5 * 60_000, refetchOnWindowFocus: true },
  /** Must reflect the database now (post-mutation confirmations). */
  live: { staleTime: 0, gcTime: 60_000, refetchOnWindowFocus: true },
} as const;
