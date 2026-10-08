/**
 * OfficeVega's VEGA identity (api.vega.chat, better-auth): OAuth device
 * authorization (RFC 8628) minting one sk-apivega-… API key named "officevega"
 * — usage_logs.api_key_id attributes all traffic to OfficeVega. Stored in
 * ~/.officevega/auth.json.
 *
 * Flow: POST /api/auth/device/code → browser approve at verification_uri →
 * poll POST /api/auth/device/token for a session Bearer →
 * POST /api/v1/keys/officevega. The session token is dropped after key
 * issuance; the API key self-revokes on logout
 * (POST /api/v1/keys/officevega/revoke) and GET /api/v1/account reads the
 * deposit for the account UI.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  unwatchFile,
  watchFile,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { vegaPiiHeaders } from '@genoffice/ai-provider'
import { asRecord, gskProxyUrl } from './shared'

/** Progress event for the browser login flow. */
export interface GskLoginProgress {
  phase: 'url' | 'success' | 'error'
  url?: string
  /** RFC 8628 user code (e.g. "ABCD-1234") shown next to the waiting button */
  userCode?: string
  expiresInSec?: number
  /** 'network' | 'expired' | 'denied' | 'auth_url_rejected' | raw error text */
  error?: string
}

// Server-registered wire identity. api.vega.chat whitelists client_id
// "officevega" and serves /api/v1/keys/officevega; the PII shield is enabled
// per API-key name, so the key must be minted under exactly this name.
const CLIENT_ID = 'officevega'
const KEY_NAME = 'officevega'
const HTTP_TIMEOUT_MS = 30_000
/** RFC 8628: a slow_down answer adds 5 s to the poll interval */
const SLOW_DOWN_EXTRA_MS = 5_000
/** sign-in-issued keys carry this prefix; anything else in auth.json is a stale Genspark-era key */
const VEGA_KEY_PREFIX = 'sk-apivega-'
/** the issued key's contract shape (sk-apivega-<48 lowercase hex>) */
const VEGA_KEY_RE = /^sk-apivega-[0-9a-f]{48}$/

/** The only URL the login flow may ask the OS to open: https, on the
 *  endpoint's registrable domain — host == or a `.`-suffix of the endpoint
 *  host minus a leading "www." — so the auth service may serve its login
 *  pages from any of its own hosts (apex, www, auth.*, a staging tree).
 *  IP literals and single-label hosts (localhost) have no subdomain tree and
 *  must match exactly: `evil.127.0.0.1` is a public DNS name that resolves
 *  elsewhere, not a sibling of 127.0.0.1. Exported for the allowlist tests. */
export function isAllowedAuthUrl(raw: string, origin: string): URL | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const endpointHost = new URL(origin).hostname
    // VEGA serves auth from api.<domain>; the verify page may live on a
    // sibling host (auth. / bare domain), so strip the service label too.
    const registrable = endpointHost.replace(/^(?:www|api)\./, '')
    const flatHost =
      endpointHost.startsWith('[') /* IPv6 literal */ ||
      /^[\d.]+$/.test(endpointHost) /* IPv4 literal */ ||
      !registrable.includes('.') /* localhost & co */
    if (flatHost) return url.hostname === endpointHost ? url : null
    if (url.hostname !== registrable && !url.hostname.endsWith(`.${registrable}`)) return null
    return url
  } catch {
    return null
  }
}

function rootUrl(): string {
  return (process.env.VEGA_API_ROOT || 'https://api.vega.chat').replace(/\/$/, '')
}

const authBase = () => `${rootUrl()}/api/auth`
const apiBase = () => `${rootUrl()}/api/v1`
// mint/self-revoke paths are keyed by the server-registered name (KEY_NAME)
const keysUrl = () => `${apiBase()}/keys/${KEY_NAME}`

let cachedFetch: typeof fetch | undefined

/**
 * Chromium's net.fetch is preferred in the Electron main process (system TLS
 * stack, per-session proxy support, spec-exposing getSetCookie). Falls back
 * to global fetch outside Electron (tests).
 */
function resolveFetch(): typeof fetch {
  if (cachedFetch) return cachedFetch
  let impl: typeof fetch = (...args) => fetch(...args)
  if (process.versions.electron) {
    try {
      const require = createRequire(import.meta.url)
      const { net } = require('electron') as { net?: { fetch?: typeof fetch } }
      if (net?.fetch) impl = net.fetch.bind(net)
    } catch {
      /* non-main context: keep global fetch */
    }
  }
  cachedFetch = impl
  return impl
}

interface ProxySession {
  setProxy: (config: { proxyRules: string }) => Promise<void>
  fetch: typeof fetch
}

let proxyFetchCache: { url: string; impl: typeof fetch } | undefined
let proxyFallbackPreferred = false

// proxy/gateway rejections, not endpoint answers — must not mark a channel healthy
const GATEWAY_ERROR_STATUSES = new Set([407, 502, 504])

/**
 * Retry channel when the primary fetch cannot connect: net.fetch follows only
 * Chromium's own proxy config, so a proxy the bootstraps resolved from env
 * vars — or a system proxy Chromium failed to apply — never reaches it. Pin a
 * dedicated session to the registered proxy. null when no proxy is registered.
 */
async function proxyFallbackFetch(): Promise<typeof fetch | null> {
  const proxyUrl = gskProxyUrl()
  if (!proxyUrl) return null
  if (proxyFetchCache?.url === proxyUrl) return proxyFetchCache.impl
  let impl: typeof fetch = (...args) => fetch(...args)
  if (process.versions.electron) {
    try {
      const require = createRequire(import.meta.url)
      const { session } = require('electron') as {
        session?: { fromPartition: (partition: string) => ProxySession }
      }
      if (session) {
        const ses = session.fromPartition('officevega-login-proxy')
        await ses.setProxy({ proxyRules: proxyUrl })
        impl = ses.fetch.bind(ses)
      }
    } catch {
      /* non-main context: global fetch rides the bootstrap's undici dispatcher */
    }
  }
  proxyFetchCache = { url: proxyUrl, impl }
  return impl
}

/** Primary + fallback, ordered by which one last succeeded after a failover. */
async function loginFetchChannels(): Promise<(typeof fetch)[]> {
  const primary = resolveFetch()
  const fallback = await proxyFallbackFetch()
  if (!fallback) return [primary]
  return proxyFallbackPreferred ? [fallback, primary] : [primary, fallback]
}

/** Override dir via OFFICEVEGA_AUTH_DIR (test isolation; the pre-rename VEGAOFFICE_AUTH_DIR is still honored). */
export function officeVegaAuthPath(): string {
  const dir =
    process.env.OFFICEVEGA_AUTH_DIR ||
    process.env.VEGAOFFICE_AUTH_DIR ||
    join(homedir(), '.officevega')
  return join(dir, 'auth.json')
}

/**
 * Pre-rename installs kept the key at ~/.vegaoffice, ~/.getoffice or
 * ~/.genoffice auth.json (overridable via the legacy GETOFFICE_AUTH_DIR /
 * GENOFFICE_AUTH_DIR envs). Returns [] when OFFICEVEGA_AUTH_DIR is set
 * without a matching legacy env — tests must never touch the real home dir.
 */
function legacyAuthPaths(): string[] {
  if (process.env.GETOFFICE_AUTH_DIR) return [join(process.env.GETOFFICE_AUTH_DIR, 'auth.json')]
  if (process.env.GENOFFICE_AUTH_DIR) return [join(process.env.GENOFFICE_AUTH_DIR, 'auth.json')]
  if (process.env.OFFICEVEGA_AUTH_DIR || process.env.VEGAOFFICE_AUTH_DIR) return []
  return [
    join(homedir(), '.vegaoffice', 'auth.json'),
    join(homedir(), '.getoffice', 'auth.json'),
    join(homedir(), '.genoffice', 'auth.json'),
  ]
}

export interface OfficeVegaAuth {
  apiKey: string
  keyId?: string
}

let cachedAuth: OfficeVegaAuth | null | undefined

function parseAuthFile(path: string): OfficeVegaAuth | null {
  try {
    const raw = asRecord(JSON.parse(readFileSync(path, 'utf-8')))
    const apiKey = typeof raw.api_key === 'string' ? raw.api_key : ''
    // a pre-VEGA auth.json holds a Genspark gsk key — useless against
    // api.vega.chat, so it reads as signed-out and the next login overwrites it
    if (!apiKey.startsWith(VEGA_KEY_PREFIX)) return null
    return {
      apiKey,
      ...(typeof raw.key_id === 'string' && raw.key_id ? { keyId: raw.key_id } : {}),
    }
  } catch {
    return null
  }
}

function readAuthFile(): OfficeVegaAuth | null {
  const current = parseAuthFile(officeVegaAuthPath())
  if (current) return current
  // upgrade path: adopt a key a pre-rename build stored in ~/.getoffice or
  // ~/.genoffice so the product renames don't sign the user out
  for (const legacy of legacyAuthPaths()) {
    if (legacy === officeVegaAuthPath()) continue
    const auth = parseAuthFile(legacy)
    if (auth) {
      try {
        saveAuth(auth) // migrate into ~/.officevega; a failed write just retries next read
      } catch {
        /* best-effort migration — the key is still usable from the old file */
      }
      return auth
    }
  }
  return null
}

export function loadOfficeVegaAuth(): OfficeVegaAuth | null {
  if (cachedAuth === undefined) cachedAuth = readAuthFile()
  return cachedAuth
}

// ── Auth-change notification ─────────────────────────────────────────

/**
 * Single-slot observer registered by the app's AI IPC setup to push
 * sign-in/out to renderers (tabs hold a cached settings snapshot and would
 * otherwise keep sending the pre-login provider route). Save fires with the
 * stored auth, clear with null. One slot is enough: exactly one AI IPC
 * registrar runs per process (shell mode registers docs'; a standalone app
 * build registers its own — a re-register just swaps the same broadcast).
 */
let authChangedListener: ((auth: OfficeVegaAuth | null) => void) | null = null

export function setOfficeVegaAuthListener(
  fn: ((auth: OfficeVegaAuth | null) => void) | null,
): void {
  authChangedListener = fn
}

function emitAuthChanged(auth: OfficeVegaAuth | null): void {
  try {
    authChangedListener?.(auth)
  } catch {
    /* a broken listener must not fail the login/logout that just ran */
  }
}

/** The app-issued VEGA key (server key name "officevega"); '' when not signed in. Cached (invalidated by login/logout). */
export function officeVegaApiKey(): string {
  return loadOfficeVegaAuth()?.apiKey ?? ''
}

/** Drop the cache so the next read sees a key written by another process. */
export function reloadOfficeVegaAuth(): void {
  cachedAuth = undefined
}

/**
 * Fires when the sign-in key changes on disk — another OfficeVega instance
 * re-logging in mints a new key and revokes the one this process holds.
 * Polls by path (watchFile): auth.json is replaced whole, and fs.watch misses
 * events for a moment after it is armed. In-process saveAuth/clearAuth already
 * notify via setOfficeVegaAuthListener; this covers writes we did not make.
 */
export function watchOfficeVegaApiKey(
  onChange: (key: string) => void,
  intervalMs = 2000,
): () => void {
  let last = officeVegaApiKey()
  const check = (): void => {
    reloadOfficeVegaAuth()
    const key = officeVegaApiKey()
    if (key === last) return
    last = key
    onChange(key)
  }
  const files = [officeVegaAuthPath(), ...legacyAuthPaths()]
  for (const f of files) watchFile(f, { persistent: false, interval: intervalMs }, check)
  return () => {
    for (const f of files) unwatchFile(f, check)
  }
}

function saveAuth(auth: OfficeVegaAuth): void {
  const path = officeVegaAuthPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    JSON.stringify({ api_key: auth.apiKey, key_id: auth.keyId }, null, 2) + '\n',
    { mode: 0o600 },
  )
  cachedAuth = auth
  emitAuthChanged(auth)
}

function clearAuth(): void {
  // the legacy file too — otherwise the next read re-adopts it and sign-out
  // never sticks
  for (const path of [officeVegaAuthPath(), ...legacyAuthPaths()]) {
    try {
      if (path && existsSync(path)) unlinkSync(path)
    } catch {
      /* local sign-out must not throw */
    }
  }
  cachedAuth = null
  emitAuthChanged(null)
}

// ── HTTP helpers ─────────────────────────────────────────────────────

class LoginFlowError extends Error {
  constructor(
    /** matches GskLoginProgress.error conventions */
    public reason: 'network' | 'expired' | 'denied' | string,
  ) {
    super(reason)
  }
}

async function httpJson(
  url: string,
  init: RequestInit & { signal: AbortSignal },
): Promise<{ resp: Response; json: Record<string, unknown> }> {
  const flowSignal = init.signal
  let resp: Response | undefined
  const channels = await loginFetchChannels()
  for (const [i, impl] of channels.entries()) {
    try {
      // per-attempt timeout: a blackholed direct connection would otherwise
      // hang for the OS TCP timeout before the fallback ever runs
      resp = await impl(url, {
        ...init,
        signal: AbortSignal.any([flowSignal, AbortSignal.timeout(HTTP_TIMEOUT_MS)]),
      })
    } catch (e) {
      if (flowSignal.aborted) throw e
      continue
    }
    // gateway statuses fail over like connect errors (endpoint 4xx such as the
    // poll's authorization_pending still counts as a healthy channel); clearing
    // resp keeps a trailing-channel 502 from surfacing as an endpoint answer
    if (GATEWAY_ERROR_STATUSES.has(resp.status)) {
      resp = undefined
      continue
    }
    // the losing channel keeps losing on proxy-only networks — lead with the winner
    if (i > 0) proxyFallbackPreferred = !proxyFallbackPreferred
    break
  }
  if (!resp) throw new LoginFlowError('network')
  let json: Record<string, unknown> = {}
  try {
    json = asRecord(await resp.json())
  } catch {
    /* non-JSON body; status checks below carry the error */
  }
  return { resp, json }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('login cancelled', 'AbortError'))
    }
    // remove on resolve — the poll loop reuses one signal and would accumulate listeners
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

// ── Device-code login ────────────────────────────────────────────────

/**
 * The device-code endpoint chooses the poll interval and the code lifetime, and
 * both are read straight off its response, so one odd (or hostile) answer could
 * stretch a login for hours or leave it polling at a crawl. Both are clamped.
 *
 * The poll ceiling is 10s: an approval is noticed promptly without hammering
 * the endpoint.
 *
 * The lifetime ceiling is 1h. RFC 8628 keeps device codes short-lived and its
 * own example is 1800s; mainstream providers (Google, Microsoft, Okta, Auth0)
 * issue somewhere in 600s–3600s, so 1h is above every legitimate value and a
 * clamp must never truncate a code the server still considers valid — the old
 * 900s ceiling cut Google's 1800s in half and logged out a user who was still
 * able to approve. The ceiling is not the round number 1800s for the same
 * reason: 1h leaves headroom above the largest lifetime in circulation while
 * still collapsing a hostile or buggy value (1e9s ≈ 31 years) to a bounded
 * window, and an hour is already past the point where a person who walked away
 * from the browser is coming back, so ending the login is correct rather than
 * premature. A full hour is also cheap to bound: the separate 10s poll ceiling
 * caps it at ~360 requests.
 */
const MAX_POLL_INTERVAL_MS = 10_000
const MAX_LOGIN_SEC = 3600

/** `fallback` when the value is absent or not a positive number, else at most `max`. */
function clampLoginValue(value: unknown, fallback: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, max)
}

/**
 * VEGA device authorization (better-auth deviceAuthorization plugin, RFC 8628):
 * request a code, let the user approve it in the browser, poll for the session
 * token, then mint the single "officevega" API key (the server deletes any
 * previous key of the same name before inserting — re-login rotates it).
 */
async function runDeviceLogin(
  signal: AbortSignal,
  emit: (progress: GskLoginProgress) => void,
): Promise<void> {
  const { resp, json } = await httpJson(`${authBase()}/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...vegaPiiHeaders(authBase()) },
    body: JSON.stringify({ client_id: CLIENT_ID }),
    signal,
  })
  const deviceCode = String(json.device_code ?? '')
  const authUrl = String(json.verification_uri_complete ?? json.verification_uri ?? '')
  if (!resp.ok || !deviceCode || !authUrl) {
    throw new LoginFlowError(resp.ok ? 'network' : `device code failed (HTTP ${resp.status})`)
  }
  // The server (or a repointed VEGA_API_ROOT) decides this URL and every caller
  // hands it to the OS opener: only https on the endpoint's registrable domain
  // passes, so a compromised endpoint cannot turn the login flow into "open
  // arbitrary protocol handler / phishing URL". Distinct from 'network' so the
  // shell can log/show a policy rejection instead of an outage.
  const allowed = isAllowedAuthUrl(authUrl, rootUrl())
  if (!allowed) throw new LoginFlowError('auth_url_rejected')
  const expiresInSec = clampLoginValue(json.expires_in, 600, MAX_LOGIN_SEC)
  let pollMs = clampLoginValue(Number(json.interval) * 1000, 5000, MAX_POLL_INTERVAL_MS)
  // RFC 8628 user_code; when the response omits the top-level field the
  // complete verification URI still carries it as ?user_code=
  let userCode = String(json.user_code ?? '')
  if (!userCode) {
    userCode = allowed.searchParams.get('user_code') ?? ''
  }
  emit({ phase: 'url', url: allowed.href, expiresInSec, ...(userCode ? { userCode } : {}) })

  const deadline = Date.now() + expiresInSec * 1000
  let accessToken: string
  for (;;) {
    if (Date.now() >= deadline) throw new LoginFlowError('expired')
    await sleep(pollMs, signal)
    const { resp: pollResp, json: poll } = await httpJson(`${authBase()}/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...vegaPiiHeaders(authBase()) },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: CLIENT_ID,
      }),
      signal,
    })
    if (pollResp.ok) {
      accessToken = String(poll.access_token ?? '')
      if (!accessToken) throw new LoginFlowError('expired')
      break
    }
    // RFC 8628 error polling: pending keeps waiting, slow_down backs off 5 s,
    // everything else (expired_token, access_denied, unknown) ends the flow
    const error = String(poll.error ?? '')
    if (error === 'authorization_pending') continue
    if (error === 'slow_down') {
      pollMs += SLOW_DOWN_EXTRA_MS
      continue
    }
    throw new LoginFlowError(error === 'access_denied' ? 'denied' : 'expired')
  }

  // the session token is only needed to mint the key — dropped right after
  const { resp: keyResp, json: created } = await httpJson(keysUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...vegaPiiHeaders(keysUrl()),
    },
    body: JSON.stringify({ name: KEY_NAME }),
    signal,
  })
  const apiKey = typeof created.key === 'string' ? created.key : ''
  if (!keyResp.ok || !apiKey) {
    const detail = asRecord(created.error)
    throw new LoginFlowError(
      String(
        created.message ?? detail.message ?? `API key creation failed (HTTP ${keyResp.status})`,
      ),
    )
  }
  // a malformed key would store as signed-in yet fail every call — surface it instead
  if (!VEGA_KEY_RE.test(apiKey)) throw new LoginFlowError('issued key has an unexpected format')
  saveAuth({
    apiKey,
    ...(typeof created.id === 'string' && created.id ? { keyId: created.id } : {}),
  })
  emit({ phase: 'success' })
}

let activeLogin: { cancel: () => void } | null = null

/**
 * Starts the OfficeVega device-code login, cancelling a previous in-flight one
 * (its device code would otherwise be approved into a dead flow). The caller
 * opens `url` in the system browser. Returns whether the flow was started.
 */
export function startOfficeVegaLogin(onEvent?: (progress: GskLoginProgress) => void): boolean {
  activeLogin?.cancel()
  const emit = onEvent ?? (() => {})
  const controller = new AbortController()
  let done = false
  const self = {
    cancel: () => {
      done = true
      controller.abort()
    },
  }
  activeLogin = self
  const finish = (progress: GskLoginProgress) => {
    if (done) return
    done = true
    if (activeLogin === self) activeLogin = null
    emit(progress)
  }
  void runDeviceLogin(controller.signal, (progress) => {
    if (done) return
    if (progress.phase === 'url') emit(progress)
    else finish(progress)
  }).catch((e: unknown) => {
    if (controller.signal.aborted) return
    finish({
      phase: 'error',
      error: e instanceof LoginFlowError ? e.reason : String((e as Error)?.message ?? e),
    })
  })
  return true
}

/** True while a login started via startOfficeVegaLogin is in flight. */
export function officeVegaLoginInFlight(): boolean {
  return activeLogin !== null
}

/**
 * Fire-and-forget login for entry points without progress UI. Reuses an
 * in-flight flow (restarting would strand it on a dead device code); openUrl
 * is the caller's browser opener (this module is Electron-free).
 */
export function ensureOfficeVegaLogin(openUrl: (url: string) => void): void {
  if (officeVegaLoginInFlight()) return
  startOfficeVegaLogin((progress) => {
    if (progress.url) openUrl(progress.url)
  })
}

/**
 * Signs out: best-effort server-side self-revocation of the officevega key
 * (the API key itself is the Bearer — no session needed), then local removal.
 */
export async function officeVegaLogout(): Promise<void> {
  const auth = loadOfficeVegaAuth()
  if (auth?.apiKey) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
    try {
      await resolveFetch()(`${keysUrl()}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.apiKey}`, ...vegaPiiHeaders(keysUrl()) },
        signal: controller.signal,
      })
    } catch {
      /* revoke is best-effort; the local key removal below is the contract */
    } finally {
      clearTimeout(timer)
    }
  }
  clearAuth()
}

// ── Account / deposit ────────────────────────────────────────────────

export interface VegaAccountInfo {
  email: string
  name?: string
  /** deposit balance in `currency` (USD) */
  balance: number
  /** the same deposit converted to RUB at VEGA's current rate */
  balanceRub?: number
  currency: string
  /** lifetime spend, same currency */
  totalUsage?: number
  /** per-key spend limit; null = none */
  limit?: number | null
  keyName?: string
}

/**
 * Account + deposit for the signed-in key (GET /api/v1/account, Bearer = the
 * API key). null when signed out or the call fails — a revoked key answers
 * 401 and also reads as null.
 */
export async function vegaAccountInfo(): Promise<VegaAccountInfo | null> {
  const key = officeVegaApiKey()
  if (!key) return null
  try {
    const resp = await resolveFetch()(`${apiBase()}/account`, {
      headers: { Authorization: `Bearer ${key}`, ...vegaPiiHeaders(apiBase()) },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })
    if (!resp.ok) return null
    const d = asRecord(await resp.json())
    const email = String(d.email ?? '')
    if (!email) return null
    const info: VegaAccountInfo = {
      email,
      balance: Number.isFinite(Number(d.balance)) ? Number(d.balance) : 0,
      currency: String(d.currency ?? 'USD'),
    }
    if (typeof d.name === 'string' && d.name) info.name = d.name
    if (Number.isFinite(Number(d.balanceRub))) info.balanceRub = Number(d.balanceRub)
    if (Number.isFinite(Number(d.totalUsage))) info.totalUsage = Number(d.totalUsage)
    if (d.limit === null || Number.isFinite(Number(d.limit))) info.limit = d.limit as number | null
    if (typeof d.keyName === 'string' && d.keyName) info.keyName = d.keyName
    return info
  } catch {
    return null
  }
}

/** Test hook: drop the auth cache, the listener and fetch-channel state. */
export function resetOfficeVegaAuthCache(): void {
  cachedAuth = undefined
  authChangedListener = null
  proxyFetchCache = undefined
  proxyFallbackPreferred = false
}

/** Test hook: whether the proxy fallback channel is currently preferred. */
export function officeVegaProxyFallbackPreferred(): boolean {
  return proxyFallbackPreferred
}
