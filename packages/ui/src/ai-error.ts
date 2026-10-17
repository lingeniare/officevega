/**
 * Map a raw provider/transport error string to a friendly i18n key. The chat
 * bubbles used to paint the wire text verbatim ("HTTP 401: {\"detail\":…}") —
 * users get a localized explanation instead, and anything unrecognized keeps
 * the original text so no information is lost.
 */
export type AiErrorKey =
  | 'aiErrorAuth'
  | 'aiErrorCredits'
  | 'aiErrorRate'
  | 'aiErrorNetwork'
  | 'aiErrorServer'

export function aiErrorKey(raw: string | null | undefined): AiErrorKey | null {
  if (!raw) return null
  const s = String(raw)
  if (
    /\bHTTP 401\b|\b401\b|unauthori[sz]ed|invalid or expired token|invalid_api_key|authentication/i.test(
      s,
    )
  ) {
    return 'aiErrorAuth'
  }
  if (
    /\bHTTP 402\b|payment required|insufficient credits|insufficient_quota|out of credits|balance (too low|insufficient)/i.test(
      s,
    )
  ) {
    return 'aiErrorCredits'
  }
  if (/\bHTTP 429\b|rate.?limit|too many requests|quota exceeded|tokens per/i.test(s)) {
    return 'aiErrorRate'
  }
  if (/\bHTTP 5\d\d\b|internal server error|bad gateway|service unavailable|overloaded/i.test(s)) {
    return 'aiErrorServer'
  }
  if (
    /fetch failed|failed to fetch|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|socket hang up|network error|timed? ?out/i.test(
      s,
    )
  ) {
    return 'aiErrorNetwork'
  }
  return null
}

/**
 * The shared renderer-side mapping every chat panel uses: a known failure
 * becomes the localized line for its key; anything unrecognized falls back to
 * `fallbackKey` (the app's wrapped "error: {error}" string) or the raw text —
 * no information is lost either way.
 */
export function aiErrorText<K extends string>(
  raw: string,
  t: (key: K, params?: Record<string, string | number>) => string,
  fallbackKey?: K,
): string {
  const key = aiErrorKey(raw)
  if (key) return t(key as K)
  return fallbackKey ? t(fallbackKey, { error: raw }) : raw
}
