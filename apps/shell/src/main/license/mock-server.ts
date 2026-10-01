import { createPrivateKey, generateKeyPairSync, sign } from 'node:crypto'
import { normalizeLicenseKey } from './keys'
import { sha256Hex } from './token'
import type { LicensePayload, PublicKeyRing } from './token'

/**
 * In-process stand-in for officevega.com/api/license/* following the agreed
 * contract (one device per key, 30-day offline window, Ed25519 tokens). Used by
 * the unit tests and by dev builds started with OFFICEVEGA_LICENSE_MOCK=1.
 *
 * Test keys:  VEGAT-EST22-22222-22222-22222  valid (one year)
 *             EXPRD-22222-22222-22222-22222  expired
 *             RATEL-22222-22222-22222-22222  429 with Retry-After
 * Any other well-formed key is `invalid_key`.
 */
export const MOCK_KEYS = {
  valid: 'VEGAT-EST22-22222-22222-22222',
  expired: 'EXPRD-22222-22222-22222-22222',
  rateLimited: 'RATEL-22222-22222-22222-22222',
} as const

const DAY = 24 * 60 * 60 * 1000
export const MOCK_KID = 'mock-1'

export function createMockLicenseServer(opts: { now?: () => number } = {}) {
  const now = opts.now ?? Date.now
  const pair = generateKeyPairSync('ed25519')
  const privateKey = createPrivateKey(pair.privateKey.export({ type: 'pkcs8', format: 'pem' }))
  const publicKeys: PublicKeyRing = {
    [MOCK_KID]: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
  /** normalized key → bound device hash */
  const bound = new Map<string, string>()
  /** keys the "dashboard" has revoked */
  const revoked = new Set<string>()
  const calls: Array<{ path: string; body: Record<string, unknown> }> = []

  const reply = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Date: new Date(now()).toUTCString(),
        ...headers,
      },
    })

  const error = (status: number, code: string, message: string, headers?: Record<string, string>) =>
    reply(status, { ok: false, code, message }, headers)

  function token(keyId: string, device: string, exp: string): string {
    const payload: LicensePayload = {
      v: 1,
      kid: MOCK_KID,
      keyId,
      device,
      exp,
      iat: new Date(now()).toISOString(),
      graceUntil: new Date(now() + 30 * DAY).toISOString(),
    }
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${body}.${sign(null, Buffer.from(body, 'utf8'), privateKey).toString('base64url')}`
  }

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname.split('/').pop() ?? ''
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    calls.push({ path, body })
    const rawKey = typeof body.key === 'string' ? body.key : ''
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId : ''
    if (!['activate', 'validate', 'deactivate'].includes(path) || deviceId.length < 16 || !rawKey) {
      return error(400, 'bad_request', 'Invalid request')
    }
    const key = normalizeLicenseKey(rawKey)
    const device = sha256Hex(deviceId)
    if (key === normalizeLicenseKey(MOCK_KEYS.rateLimited)) {
      return error(429, 'rate_limited', 'Too many requests', { 'Retry-After': '60' })
    }
    const known = key === normalizeLicenseKey(MOCK_KEYS.valid) || key === normalizeLicenseKey(MOCK_KEYS.expired)
    if (!known || revoked.has(key)) return error(404, 'invalid_key', 'Invalid license key')

    if (path === 'deactivate') {
      if (bound.get(key) === device) bound.delete(key)
      return reply(200, { ok: true })
    }
    const isExpired = key === normalizeLicenseKey(MOCK_KEYS.expired)
    if (isExpired) return error(403, 'expired', 'License expired')
    if (path === 'validate' && bound.get(key) !== device) {
      return error(404, 'not_activated', 'Device is not activated')
    }
    const owner = bound.get(key)
    if (owner && owner !== device) {
      return error(403, 'device_limit', 'Key is already used on another device')
    }
    bound.set(key, device)
    const exp = new Date(now() + 365 * DAY).toISOString()
    return reply(200, {
      ok: true,
      license: { expiresAt: exp, accountType: 'individual', holderEmail: 'mock@officevega.com' },
      token: token(`mock-${key.slice(0, 5)}`, device, exp),
      refreshAfter: new Date(now() + DAY).toISOString(),
      serverTime: new Date(now()).toISOString(),
    })
  }) as typeof fetch

  return {
    fetch: fetchImpl,
    publicKeys,
    calls,
    /** simulate "release seat" / key reissue in the dashboard */
    revoke: (rawKey: string) => revoked.add(normalizeLicenseKey(rawKey)),
    /** another machine takes the single slot */
    bindTo: (rawKey: string, deviceId: string) => bound.set(normalizeLicenseKey(rawKey), sha256Hex(deviceId)),
  }
}
