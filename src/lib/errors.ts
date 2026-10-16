/**
 * User-facing error mapping.
 *
 * Rule: technical/code errors (SQL, RLS, network, stack traces, provider
 * internals) must NEVER reach the user — they see "Oops! Something went
 * wrong!". Business/system rules the user can act on (wrong email domain,
 * insufficient balance, expired code, duplicate account, …) are shown as-is.
 */

export const GENERIC_ERROR = "Oops! Something went wrong!";

/** Messages a user can act on. Matched case-insensitively as substrings. */
const ACTIONABLE_PATTERNS: RegExp[] = [
  // Auth / account
  /invalid login credentials/i,
  /email not confirmed/i,
  /user already registered/i,
  /already registered/i,
  /already exists/i,
  /already has/i,
  /password/i,
  /email rate limit|rate limit|too many requests|try again in/i,
  /session expired|not authenticated|sign in again/i,
  /admin (only|access)/i,
  /affiliate/i,
  // Email / domain rules (e.g. gmail instead of a business domain)
  /public email provider|free email|business (email|website)|website domain|disposable email|valid email|email domain/i,
  // OTP / codes
  /code (is )?(invalid|expired)|invalid or expired|expired code|otp/i,
  // Money / limits
  /insufficient|balance|minimum|fund your wallet|activation fee|escrow/i,
  // Verification / eligibility flows
  /not verified|verification failed|verify your|pending approval|not approved|not eligible|not available for your/i,
  // Explicit validation phrasing
  /is required|please (enter|select|provide|accept|fill)|must be|cannot be empty|already used|could not create|no affiliate/i,
];

function extract(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as { message?: unknown; error?: unknown; error_description?: unknown };
  if (typeof e.error_description === "string") return e.error_description;
  if (typeof e.message === "string") return e.message;
  if (typeof e.error === "string") return e.error;
  return "";
}

/** True when the message is safe and useful to show verbatim. */
export function isActionableMessage(message: string): boolean {
  const m = message.trim();
  if (!m || m.length > 200) return false;
  // Never leak provider/database internals.
  if (/row-level security|violates|constraint|relation |column |postgres|pgrst|supabase|jwt|token|fetch failed|failed to fetch|networkerror|non-2xx|edge function|status code|stack|undefined is not|cannot read propert/i.test(m)) {
    return false;
  }
  return ACTIONABLE_PATTERNS.some((r) => r.test(m));
}

/**
 * Returns a message safe to show the user.
 * @param fallback optional business-context fallback (e.g. "Upload failed").
 */
export function friendlyError(error: unknown, fallback?: string): string {
  const raw = extract(error);
  if (import.meta.env.DEV && raw) console.error("[error]", raw, error);
  if (isActionableMessage(raw)) return raw;
  return fallback || GENERIC_ERROR;
}

/** Reads a JSON `error` field out of a supabase functions.invoke error. */
export async function functionError(error: unknown, fallback?: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.clone === "function") {
    try {
      const parsed = JSON.parse(await ctx.clone().text());
      if (typeof parsed?.error === "string") {
        return isActionableMessage(parsed.error) ? parsed.error : fallback || GENERIC_ERROR;
      }
    } catch { /* not json */ }
  }
  return friendlyError(error, fallback);
}
