/**
 * In Electron main processes AI requests run on Node's fetch (undici), which
 * connects directly instead of going through Chromium's network stack. Under
 * VPN/tun setups those direct connections can get reset (ECONNRESET) while
 * Chromium traffic — login, renderer fetches — works fine. Main processes
 * inject Electron's net.fetch here as a rescue path: when the primary fetch
 * fails at the network layer, the request is retried once over the Chromium
 * stack. Renderers never inject one (their fetch already is Chromium's).
 */

import { nativeAdmission } from './native-admission'

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

let rescueFetch: FetchLike | null = null

export function setRescueFetch(fn: FetchLike | null): void {
  rescueFetch = fn
}

/**
 * Node's fetch announces itself as a bare `node`, which gateways that watch
 * for anonymous automation treat as abusive traffic (OpenCode Go requires
 * clients to identify themselves and flags "broad" user agents). Main
 * processes refine the default with the app version.
 */
export const AI_DEFAULT_USER_AGENT = 'OfficeVega'

let userAgent = AI_DEFAULT_USER_AGENT

export function setAiUserAgent(ua: string): void {
  userAgent = ua || AI_DEFAULT_USER_AGENT
}

/**
 * openrouter.ai's edge answers any User-Agent containing "vega" (any case)
 * with a 403 HTML block page — verified 2026-10-17: `node`, `curl`,
 * `GenOffice` and `Mozilla` pass; `OfficeVega`, `Vega`, `x-officevega` all
 * 403 on /models and /chat/completions alike. On that host the product UA
 * is pinned to a plain `node` instead — merely dropping the header is not
 * enough, because a fetch stack that derives its default UA from the app
 * name (Electron's net fetch) would put the blocked token right back. The
 * app is named through OpenRouter's documented attribution headers instead —
 * HTTP-Referer / X-Title trip no rule and are how the gateway asks clients
 * to identify themselves. Without this, every OpenRouter call — catalog,
 * chat, media — dies at the edge and the model picker silently falls back
 * to the provider's static ids.
 */
const OPENROUTER_ATTRIBUTION = {
  'HTTP-Referer': 'https://officevega.com',
  'X-Title': 'OfficeVega',
} as const

export function isOpenRouterUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return host === 'openrouter.ai' || host.endsWith('.openrouter.ai')
  } catch {
    return false
  }
}

function applyOpenRouterHeaders(headers: Record<string, string>): Record<string, string> {
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() === 'user-agent' && /vega/i.test(headers[name]!)) {
      delete headers[name]
    }
  }
  // pin a UA the edge accepts rather than none at all: stacks that inject a
  // default (Electron's net fetch re-derives one from the app name, which
  // itself carries "vega") would otherwise put the blocked token back
  if (!Object.keys(headers).some((name) => name.toLowerCase() === 'user-agent')) {
    headers['User-Agent'] = 'node'
  }
  for (const [name, value] of Object.entries(OPENROUTER_ATTRIBUTION)) {
    if (!Object.keys(headers).some((n) => n.toLowerCase() === name.toLowerCase())) {
      headers[name] = value
    }
  }
  return headers
}

/**
 * Wire-level variant of the OpenRouter header fix, for the session's
 * webRequest hook: request stacks that cannot set User-Agent themselves —
 * a renderer's fetch drops it as a forbidden header name, net.fetch
 * re-derives one from the session — get their outgoing headers rewritten
 * here instead. Non-OpenRouter URLs pass through untouched.
 */
export function openRouterSafeHeaders(
  url: string,
  headers: Record<string, string>,
): Record<string, string> {
  return isOpenRouterUrl(url) ? applyOpenRouterHeaders({ ...headers }) : headers
}

/**
 * Sber's endpoints (api.giga.chat, ngw.devices.sberbank.ru) terminate TLS
 * under the Russian national root CA (Минцифры), which is in neither Node's
 * bundled root list nor Chromium's store — every GigaChat SDK ships
 * `verify_ssl_certs=False` for the same reason. Deliberate, host-scoped
 * relaxation: a dedicated undici agent with rejectUnauthorized:false handles
 * these hosts ONLY; all other traffic verifies normally. Where undici is not
 * resolvable (browser bundles — Chromium ignores the extra init field anyway)
 * the hook degrades to a no-op.
 */
const RU_CERT_HOSTS = /(^|\.)(giga\.chat|devices\.sberbank\.ru)$/i

let ruCertAgent: Promise<import('undici').Dispatcher | null> | null = null
function ruCertDispatcher(): Promise<import('undici').Dispatcher | null> {
  ruCertAgent ??= import(/* @vite-ignore */ 'undici')
    .then(({ Agent }) => new Agent({ connect: { rejectUnauthorized: false } }))
    .catch(() => null)
  return ruCertAgent
}

export function isVegaGatewayUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname === 'api.vega.chat'
  } catch {
    return false
  }
}

/**
 * Process-wide state of the "PII anonymization" settings switch: on by
 * default, so a process that never touches settings keeps masking. The main
 * process applies it wherever settings arrive (ai:get-settings /
 * ai:set-settings / ai:stream / ai:chat) and from the settings file reads in
 * ai-search's readAiSettingsFile.
 */
let piiShieldEnabled = true

export function setPiiShieldEnabled(enabled: boolean): void {
  piiShieldEnabled = enabled
}

/**
 * The PII-shield switch for requests to the VEGA gateway. The gateway runs
 * the shield in opt-in mode: `X-Vega-Anonymize: true` engages masking, its
 * absence (or `false`) lets the request pass through untouched. `X-Vega-Pii:
 * off` rides along while switched off for gateways still on the old opt-out
 * contract. Empty object when the URL is not the gateway. Callers that
 * bypass aiFetch (ai-search's own fetch, the file-index reranker) merge it
 * into their header records the same way.
 */
export function vegaPiiHeaders(url: string | undefined): Record<string, string> {
  if (!isVegaGatewayUrl(url)) return {}
  return piiShieldEnabled
    ? { 'X-Vega-Anonymize': 'true' }
    : { 'X-Vega-Anonymize': 'false', 'X-Vega-Pii': 'off' }
}

/**
 * Every request to the VEGA gateway carries X-Vega-Session (its PII shield
 * keeps a token dictionary per session). Chat protocols set a stable per-chat
 * id; anything that reaches here without one (media, one-shot calls) is its
 * own session. The anonymize flag itself comes from vegaPiiHeaders: explicit
 * on/off so the gateway's opt-in shield follows the settings switch.
 */
function withVegaSession(url: string, init: RequestInit): RequestInit {
  if (!isVegaGatewayUrl(url)) return init
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    ...vegaPiiHeaders(url),
  }
  if (!Object.keys(headers).some((n) => n.toLowerCase() === 'x-vega-session')) {
    headers['X-Vega-Session'] = crypto.randomUUID()
  }
  return { ...init, headers }
}

/** protocols pass plain header records; keep that shape so callers can read the request back */
export function withUserAgent(init: RequestInit, url?: string): RequestInit {
  const given = init.headers
  const headers: Record<string, string> = {}
  if (given instanceof Headers) given.forEach((value, name) => (headers[name] = value))
  else if (Array.isArray(given)) for (const [name, value] of given) headers[name] = value
  else Object.assign(headers, given)
  if (isOpenRouterUrl(url)) return { ...init, headers: applyOpenRouterHeaders(headers) }
  if (!Object.keys(headers).some((name) => name.toLowerCase() === 'user-agent')) {
    headers['User-Agent'] = userAgent
  }
  return { ...init, headers }
}

/**
 * A 403 with an HTML body is an edge block page (bot management, WAF), not an API
 * answer. Those edges score the Node network stack's TLS fingerprint differently
 * from Chromium's, so the rescue fetch (Electron net.fetch) often gets through.
 */
function isBlockPage(response: Response): boolean {
  return (
    response.status === 403 && (response.headers.get('content-type') || '').includes('text/html')
  )
}

/**
 * Reuse TLS connections between agent turns. undici's default pool drops idle
 * sockets after ~4s and model turns are spaced further apart, so every request
 * otherwise re-dials TCP+TLS before the first byte. Best-effort: where undici
 * is not resolvable (browser bundle, packaged app shipping only declared deps)
 * pooling stays at the default and nothing breaks.
 */
export function warmAiConnections(): void {
  void import(/* @vite-ignore */ 'undici')
    .then(({ Agent, setGlobalDispatcher }) => {
      setGlobalDispatcher(new Agent({ keepAliveTimeout: 60_000, keepAliveMaxTimeout: 600_000 }))
    })
    .catch(() => {})
}

export async function aiFetch(url: string, rawInit: RequestInit): Promise<Response> {
  let init = withVegaSession(url, withUserAgent(rawInit, url))
  try {
    if (RU_CERT_HOSTS.test(new URL(url).hostname)) {
      const dispatcher = await ruCertDispatcher()
      // `dispatcher` is an undici-only RequestInit extension — newer dom libs
      // already declare it, older ones don't, so widen by hand to stay portable
      if (dispatcher) (init as { dispatcher?: unknown }).dispatcher = dispatcher
    }
  } catch {
    // unparseable URL: let fetch itself report it
  }
  init = await nativeAdmission.prepare(url, init, (u, i) => fetch(u, i))
  const signal = init.signal as AbortSignal | null | undefined
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (primaryError) {
    if (!rescueFetch || signal?.aborted) throw primaryError
    console.warn('[ai-provider] fetch failed, retrying via rescue fetch:', String(primaryError))
    try {
      return await rescueFetch(url, init)
    } catch {
      throw primaryError
    }
  }
  const resendable = init.body == null || typeof init.body === 'string'
  if (rescueFetch && resendable && !signal?.aborted && isBlockPage(response)) {
    console.warn(
      '[ai-provider] 403 block page from',
      new URL(url).host,
      '- retrying via rescue fetch',
    )
    try {
      const rescued = await rescueFetch(url, init)
      if (!isBlockPage(rescued)) return rescued
    } catch {
      // fall through to the primary response
    }
  }
  return response
}
