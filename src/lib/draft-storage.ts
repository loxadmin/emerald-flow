// Local persistence for in-progress campaign creation forms.
// Survives reloads, accidental tab refreshes, and stale auth refreshes.
// Keyed per user + flow + draft id so different drafts don't collide.

const KEY_PREFIX = "karbali-draft:";

export function draftKey(userId: string | undefined, flow: string, draftId: string | null) {
  return `${KEY_PREFIX}${userId || "anon"}:${flow}:${draftId || "new"}`;
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function clearDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Clean up old drafts on a different user/flow that match a prefix
export function clearDraftsByPrefix(prefix: string) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
