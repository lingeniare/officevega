import type { PublicKeyRing } from './token'

export const LICENSE_API_URL = 'https://officevega.com/api/license'

/** Page opened on `device_limit` (the server does not return the device list). */
export const LICENSE_DASHBOARD_URL = 'https://officevega.com/dashboard'

/**
 * Trusted Ed25519 public keys by `kid` (SPKI PEM). Keys are issued by the
 * officevega.com server team; add a new entry here on rotation and keep the
 * old one until its tokens have expired. With an empty ring no token
 * verifies, so activation fails closed.
 */
export const LICENSE_PUBLIC_KEYS: PublicKeyRing = {
  '2026-10': [
    '-----BEGIN PUBLIC KEY-----',
    'MCowBQYDK2VwAyEAvsXl8SUewGMV7hrQW06O5gfE3mYSKnLHisstu/Pvb5k=',
    '-----END PUBLIC KEY-----',
  ].join('\n'),
}

/** the alphabet of generated keys; the server normalizes, the client only pre-validates */
const KEY_ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{25}$/

/** strips spaces/dashes and upper-cases, like the server's normalizeLicenseKey */
export const normalizeLicenseKey = (input: string): string =>
  input.replace(/[\s-]/g, '').toUpperCase()

export const isWellFormedLicenseKey = (input: string): boolean =>
  KEY_ALPHABET.test(normalizeLicenseKey(input))

/** XXXXX-XXXXX-XXXXX-XXXXX-XXXXX */
export const formatLicenseKey = (input: string): string =>
  normalizeLicenseKey(input)
    .match(/.{1,5}/g)
    ?.join('-') ?? ''
