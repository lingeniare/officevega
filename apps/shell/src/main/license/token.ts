import { createHash, createPublicKey, verify } from 'node:crypto'

/**
 * License token: `base64url(payloadJSON).base64url(signature)` — not a JWT.
 * The Ed25519 signature covers the bytes of the `base64url(payload)` string.
 */

export interface LicensePayload {
  v: 1
  kid: string
  keyId: string
  /** hex SHA-256 of the installation's deviceId */
  device: string
  /** license expiry (entitlement), ISO */
  exp: string
  /** issue time, ISO */
  iat: string
  /** offline cut-off, ISO (iat + 30 days) */
  graceUntil: string
}

export type TokenCheck =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: 'malformed' | 'unknown_kid' | 'bad_signature' | 'wrong_device' }

/** kid → SPKI PEM of the Ed25519 public key */
export type PublicKeyRing = Readonly<Record<string, string>>

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex')

const b64urlDecode = (s: string): Buffer => Buffer.from(s, 'base64url')

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

function parsePayload(raw: Buffer): LicensePayload | null {
  try {
    const p = JSON.parse(raw.toString('utf8')) as Record<string, unknown>
    if (
      p.v !== 1 ||
      typeof p.kid !== 'string' ||
      typeof p.keyId !== 'string' ||
      typeof p.device !== 'string' ||
      !isIso(p.exp) ||
      !isIso(p.iat) ||
      !isIso(p.graceUntil)
    )
      return null
    return p as unknown as LicensePayload
  } catch {
    return null
  }
}

/** Verifies structure, signature (by the payload's `kid`) and device binding. */
export function verifyToken(token: string, keys: PublicKeyRing, deviceId: string): TokenCheck {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' }
  const [body, sig] = parts as [string, string]
  const payload = parsePayload(b64urlDecode(body))
  if (!payload) return { ok: false, reason: 'malformed' }
  const pem = keys[payload.kid]
  if (!pem) return { ok: false, reason: 'unknown_kid' }
  let valid = false
  try {
    valid = verify(null, Buffer.from(body, 'utf8'), createPublicKey(pem), b64urlDecode(sig))
  } catch {
    valid = false
  }
  if (!valid) return { ok: false, reason: 'bad_signature' }
  if (payload.device !== sha256Hex(deviceId)) return { ok: false, reason: 'wrong_device' }
  return { ok: true, payload }
}
