/**
 * GigaChat OAuth: the "API key" stored for the sber provider is the
 * authorization key from the Sber developer console (base64'd client
 * credentials). It is never sent to the model endpoint — it is exchanged here
 * for a 30-minute access token, which is what actually rides in the Bearer
 * header. The exchange is POST ngw.devices.sberbank.ru:9443/api/v2/oauth with
 * the key as Basic auth plus a per-request RqUID.
 *
 * The console issues three mutually exclusive scopes — PERS (personal keys),
 * B2B (legal-entity prepaid) and CORP (legal-entity pay-as-you-go) — and
 * nothing in the key says which one it was minted for, so the exchange probes
 * them in order and the first successful answer wins. Tokens are cached per
 * key with a re-mint margin so a turn never starts on a token that dies
 * mid-request; concurrent callers share one inflight exchange.
 */
import { aiFetch } from './fetch'
import { readCappedResponseText } from './protocols/shared'

const GIGACHAT_OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
const GIGACHAT_SCOPES = [
  'GIGACHAT_API_PERS',
  'GIGACHAT_API_B2B',
  'GIGACHAT_API_CORP',
] as const
/** re-mint this far before expires_at so a token never dies mid-turn */
const EXPIRY_MARGIN_MS = 60_000
/** fallback lifetime when the token response omits expires_at (docs say 30 min) */
const DEFAULT_TOKEN_TTL_MS = 30 * 60_000
const TOKEN_TIMEOUT_MS = 15_000

interface CachedToken {
  token: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()
const tokenInflight = new Map<string, Promise<string>>()

/** test seam: drop cached tokens between isolated cases */
export function clearGigachatTokens(): void {
  tokenCache.clear()
  tokenInflight.clear()
}

async function fetchToken(
  authKey: string,
  scope: (typeof GIGACHAT_SCOPES)[number],
  signal: AbortSignal,
): Promise<{ token: CachedToken } | { error: string }> {
  const resp = await aiFetch(GIGACHAT_OAUTH_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: crypto.randomUUID(),
      Authorization: `Basic ${authKey}`,
    },
    body: `scope=${scope}`,
  })
  if (!resp.ok) {
    const detail = await readCappedResponseText(resp, { onOverflow: 'truncate' })
    return { error: `HTTP ${resp.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` }
  }
  let json: { access_token?: unknown; expires_at?: unknown }
  try {
    json = JSON.parse(await readCappedResponseText(resp)) as typeof json
  } catch {
    return { error: 'a non-JSON token response' }
  }
  if (typeof json.access_token !== 'string' || !json.access_token) {
    return { error: 'a token response without access_token' }
  }
  return {
    token: {
      token: json.access_token,
      expiresAt:
        typeof json.expires_at === 'number'
          ? json.expires_at
          : Date.now() + DEFAULT_TOKEN_TTL_MS,
    },
  }
}

async function exchangeToken(authKey: string, signal?: AbortSignal): Promise<string> {
  const timeout = AbortSignal.timeout(TOKEN_TIMEOUT_MS)
  const failures: string[] = []
  for (const scope of GIGACHAT_SCOPES) {
    const outcome = await fetchToken(
      authKey,
      scope,
      signal ? AbortSignal.any([signal, timeout]) : timeout,
    )
    if ('token' in outcome) {
      tokenCache.set(authKey, outcome.token)
      return outcome.token.token
    }
    failures.push(`${scope} — ${outcome.error}`)
  }
  throw new Error(`GigaChat OAuth failed: ${failures.join('; ')}`)
}

export async function gigachatAccessToken(
  authorizationKey: string,
  signal?: AbortSignal,
): Promise<string> {
  const key = authorizationKey.trim()
  if (!key) {
    throw new Error('GigaChat requires the authorization key from the Sber developer console')
  }
  const cached = tokenCache.get(key)
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.token
  let pending = tokenInflight.get(key)
  if (!pending) {
    // the .finally() product is what callers await — no floating rejection
    pending = exchangeToken(key, signal).finally(() => tokenInflight.delete(key))
    tokenInflight.set(key, pending)
  }
  return pending
}
