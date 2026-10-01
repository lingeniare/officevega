import type { LicenseErrorCode } from '../../shared/license-api'

export type { LicenseErrorCode }

export interface LicenseInfo {
  expiresAt: string
  accountType: string
  holderEmail: string
}

export interface LicenseGrant {
  license: LicenseInfo
  token: string
  refreshAfter: string
  /** server clock; falls back to the `Date` header */
  serverTime: string | null
}

export type ClientResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: LicenseErrorCode; message: string; retryAfterSec?: number }

export interface LicenseRequest {
  key: string
  deviceId: string
  deviceName?: string
  appVersion?: string
}

export interface LicenseClient {
  activate(req: LicenseRequest): Promise<ClientResult<LicenseGrant>>
  validate(req: LicenseRequest): Promise<ClientResult<LicenseGrant>>
  deactivate(req: Pick<LicenseRequest, 'key' | 'deviceId'>): Promise<ClientResult<object>>
}

const SERVER_CODES: ReadonlySet<string> = new Set([
  'bad_request',
  'invalid_key',
  'not_activated',
  'expired',
  'device_limit',
  'rate_limited',
  'server_error',
])

const REQUEST_TIMEOUT_MS = 15_000

const fail = (
  code: LicenseErrorCode,
  message: string,
  retryAfterSec?: number,
): { ok: false; code: LicenseErrorCode; message: string; retryAfterSec?: number } =>
  retryAfterSec === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, retryAfterSec }

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function createLicenseClient(opts: {
  baseUrl: string
  fetchImpl?: typeof fetch
  /** tests / dev mock only: permit `http://` */
  allowInsecure?: boolean
}): LicenseClient {
  const fetchImpl = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/+$/, '')

  async function post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ClientResult<{ json: Record<string, unknown>; dateHeader: string | null }>> {
    if (!base.startsWith('https://') && !opts.allowInsecure) {
      return fail('untrusted', 'License server URL must use HTTPS')
    }
    let res: Response
    try {
      res = await fetchImpl(`${base}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      return fail('network', 'License server is unreachable')
    }
    let json: Record<string, unknown>
    try {
      json = (await res.json()) as Record<string, unknown>
    } catch {
      return fail(res.status >= 500 ? 'server_error' : 'network', 'Unreadable server response')
    }
    if (json.ok === true) {
      return { ok: true, json, dateHeader: res.headers.get('Date') }
    }
    const code = SERVER_CODES.has(str(json.code)) ? (str(json.code) as LicenseErrorCode) : 'server_error'
    const retry = Number.parseInt(res.headers.get('Retry-After') ?? '', 10)
    return fail(code, str(json.message), Number.isFinite(retry) ? retry : undefined)
  }

  function grantOf(
    r: ClientResult<{ json: Record<string, unknown>; dateHeader: string | null }>,
  ): ClientResult<LicenseGrant> {
    if (!r.ok) return r
    const lic = (r.json.license ?? {}) as Record<string, unknown>
    const token = str(r.json.token)
    const expiresAt = str(lic.expiresAt)
    if (!token || Number.isNaN(Date.parse(expiresAt))) {
      return fail('server_error', 'Malformed license response')
    }
    const header = r.dateHeader && !Number.isNaN(Date.parse(r.dateHeader)) ? r.dateHeader : null
    const serverTime = str(r.json.serverTime) || (header ? new Date(header).toISOString() : null)
    return {
      ok: true,
      license: {
        expiresAt,
        accountType: str(lic.accountType),
        holderEmail: str(lic.holderEmail),
      },
      token,
      refreshAfter: str(r.json.refreshAfter),
      serverTime: serverTime && !Number.isNaN(Date.parse(serverTime)) ? serverTime : null,
    }
  }

  return {
    activate: async (req) => grantOf(await post('activate', { ...req })),
    validate: async (req) => grantOf(await post('validate', { ...req })),
    deactivate: async (req) => {
      const r = await post('deactivate', { key: req.key, deviceId: req.deviceId })
      return r.ok ? { ok: true } : r
    },
  }
}
