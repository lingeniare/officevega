/**
 * In Electron main processes AI requests run on Node's fetch (undici), which
 * connects directly instead of going through Chromium's network stack. Under
 * VPN/tun setups those direct connections can get reset (ECONNRESET) while
 * Chromium traffic — login, renderer fetches — works fine. Main processes
 * inject Electron's net.fetch here as a rescue path: when the primary fetch
 * fails at the network layer, the request is retried once over the Chromium
 * stack. Renderers never inject one (their fetch already is Chromium's).
 */

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
 * The PII-shield opt-out for requests to the VEGA gateway: `X-Vega-Pii: off`
 * while the setting is off, empty object when it is on or the URL is not the
 * gateway. Callers that bypass aiFetch (ai-search's own fetch, the file-index
 * reranker) merge it into their header records the same way.
 */
export function vegaPiiHeaders(url: string | undefined): Record<string, string> {
  return !piiShieldEnabled && isVegaGatewayUrl(url) ? { 'X-Vega-Pii': 'off' } : {}
}

/**
 * Every request to the VEGA gateway carries X-Vega-Session (its PII shield
 * keeps a token dictionary per session). Chat protocols set a stable per-chat
 * id; anything that reaches here without one (media, one-shot calls) is its
 * own session. While the shield is switched off, X-Vega-Pii: off rides along
 * so the gateway skips masking entirely.
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
export function withUserAgent(init: RequestInit): RequestInit {
  const given = init.headers
  const headers: Record<string, string> = {}
  if (given instanceof Headers) given.forEach((value, name) => (headers[name] = value))
  else if (Array.isArray(given)) for (const [name, value] of given) headers[name] = value
  else Object.assign(headers, given)
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
  const init = withVegaSession(url, withUserAgent(rawInit))
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
