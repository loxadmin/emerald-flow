// React data hooks. UI components call these; they never call Supabase directly.
//
// Each hook picks a cache policy from `cachePolicy` based on how volatile its
// data is, so N components mounting the same hook produce ONE network request
// (TanStack Query deduplicates by key) instead of N useEffect fetches.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cachePolicy, qk } from "@/lib/query-keys";
import * as repo from "./repository";

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: qk.profile(userId || "anon"),
    queryFn: () => repo.fetchProfile(userId as string),
    enabled: !!userId,
    ...cachePolicy.standard,
  });
}

export function useWallet(userId: string | undefined) {
  return useQuery({
    queryKey: qk.wallet(userId || "anon"),
    queryFn: () => repo.fetchWallet(userId as string),
    enabled: !!userId,
    ...cachePolicy.frequent,
  });
}

export function useWalletTransactions(walletId: string | undefined, page = 0) {
  return useQuery({
    queryKey: qk.walletTransactions(walletId || "anon", page),
    queryFn: () => repo.fetchWalletTransactions(walletId as string, page),
    enabled: !!walletId,
    placeholderData: (prev) => prev, // keep the previous page visible while paging
    ...cachePolicy.standard,
  });
}

export function useCampaigns(userId: string | undefined, page = 0) {
  return useQuery({
    queryKey: [...qk.campaigns(userId || "anon"), page],
    queryFn: () => repo.fetchCampaigns(userId as string, page),
    enabled: !!userId,
    placeholderData: (prev) => prev,
    ...cachePolicy.standard,
  });
}

export function useSiteContent() {
  return useQuery({
    queryKey: qk.siteContent(),
    queryFn: repo.fetchSiteContent,
    ...cachePolicy.static,
  });
}

export function useCategoryGroups() {
  return useQuery({
    queryKey: qk.categoryGroups(),
    queryFn: repo.fetchCategoryGroups,
    ...cachePolicy.static,
  });
}

export function useAdminSetting(key: string) {
  return useQuery({
    queryKey: qk.adminSetting(key),
    queryFn: () => repo.fetchAdminSetting(key),
    ...cachePolicy.static,
  });
}

/**
 * Explicit invalidation helpers. Call the matching one after a mutation
 * instead of reloading the page or refetching everything.
 */
export function useInvalidate() {
  const qc = useQueryClient();
  return {
    wallet: (userId: string) => {
      qc.invalidateQueries({ queryKey: qk.wallet(userId) });
      qc.invalidateQueries({ queryKey: ["wallet", userId, "transactions"] });
    },
    campaigns: (userId: string) => qc.invalidateQueries({ queryKey: qk.campaigns(userId) }),
    packages: () => qc.invalidateQueries({ queryKey: ["packages"] }),
    orders: () => {
      qc.invalidateQueries({ queryKey: ["package-orders"] });
      qc.invalidateQueries({ queryKey: ["switch-orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    adminCampaigns: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
    /** Sign-out: drop every cached response so no data survives an account switch. */
    everything: () => qc.clear(),
  };
}
