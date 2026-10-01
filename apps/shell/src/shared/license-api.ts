export type LicenseErrorCode =
  | 'bad_request'
  | 'invalid_key'
  | 'not_activated'
  | 'expired'
  | 'device_limit'
  | 'rate_limited'
  | 'server_error'
  /** no reachable server / unreadable reply */
  | 'network'
  /** insecure URL or a token that failed verification */
  | 'untrusted'

export interface LicenseStatus {
  /** paid features are unlocked */
  licensed: boolean
  /** none: no key; active: token valid; lapsed: token expired / offline window over */
  state: 'none' | 'active' | 'lapsed'
  holderEmail: string
  accountType: string
  expiresAt: string
  /** offline cut-off of the current token */
  graceUntil: string
  /** last 4 characters of the key */
  keyHint: string
}

export type LicenseActionResult =
  | { ok: true; status: LicenseStatus }
  | { ok: false; code: LicenseErrorCode; message: string; retryAfterSec?: number }
