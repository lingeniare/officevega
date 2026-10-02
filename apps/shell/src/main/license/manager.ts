import { randomUUID } from 'node:crypto'
import type { ClientResult, LicenseClient, LicenseErrorCode, LicenseGrant, LicenseInfo } from './client'
import { isWellFormedLicenseKey, normalizeLicenseKey } from './keys'
import type { LicenseActionResult, LicenseStatus } from '../../shared/license-api'
import { verifyToken } from './token'
import type { LicensePayload, PublicKeyRing } from './token'

export interface LicenseState {
  deviceId: string
  /** normalized key, kept for the daily /validate; never shown in full */
  key?: string
  token?: string
  license?: LicenseInfo
  refreshAfter?: string
  /** latest server clock seen — the app never accepts an earlier "now" */
  lastServerTime?: string
  /** latest local clock seen — catches the OS clock being wound back */
  lastSeenAt?: string
  lastValidatedAt?: string
}

export interface LicenseStore {
  load(): LicenseState | null
  save(state: LicenseState): void
}


const DAY_MS = 24 * 60 * 60 * 1000
const SAVE_THROTTLE_MS = 60_000
/** server verdicts that end the licence at once */
const REVOKING: ReadonlySet<LicenseErrorCode> = new Set(['invalid_key', 'expired'])

export interface LicenseManagerDeps {
  store: LicenseStore
  client: LicenseClient
  keys: PublicKeyRing
  deviceName: string
  appVersion: string
  now?: () => number
  newDeviceId?: () => string
  onChange?: (status: LicenseStatus) => void
}

export function createLicenseManager(deps: LicenseManagerDeps) {
  const now = deps.now ?? Date.now
  let state: LicenseState = deps.store.load() ?? { deviceId: (deps.newDeviceId ?? randomUUID)() }
  let savedAt = 0
  let inflight: Promise<LicenseActionResult> | null = null

  const ms = (iso: string | undefined): number => {
    const t = iso ? Date.parse(iso) : Number.NaN
    return Number.isNaN(t) ? 0 : t
  }

  function persist(): void {
    savedAt = now()
    try {
      deps.store.save(state)
    } catch (error) {
      // userData may be unwritable (sandboxed dev, AV lock): keep running on
      // in-memory state, the next throttled persist retries the write.
      console.warn('[license] persist failed, continuing in memory:', (error as Error)?.message ?? error)
    }
  }
  persist()

  /** local clock, never earlier than any clock seen before */
  function effectiveNow(): number {
    const t = Math.max(now(), ms(state.lastSeenAt), ms(state.lastServerTime))
    if (t - ms(state.lastSeenAt) > SAVE_THROTTLE_MS && state.token) {
      state = { ...state, lastSeenAt: new Date(t).toISOString() }
      if (t - savedAt > SAVE_THROTTLE_MS) persist()
    }
    return t
  }

  function payload(): LicensePayload | null {
    if (!state.token) return null
    const check = verifyToken(state.token, deps.keys, state.deviceId)
    return check.ok ? check.payload : null
  }

  function status(): LicenseStatus {
    const p = payload()
    const none: LicenseStatus = {
      licensed: false,
      state: 'none',
      holderEmail: '',
      accountType: '',
      expiresAt: '',
      graceUntil: '',
      keyHint: '',
    }
    if (!p || !state.key) return none
    const t = effectiveNow()
    const live = t < ms(p.exp) && t < ms(p.graceUntil)
    return {
      licensed: live,
      state: live ? 'active' : 'lapsed',
      holderEmail: state.license?.holderEmail ?? '',
      accountType: state.license?.accountType ?? '',
      expiresAt: p.exp,
      graceUntil: p.graceUntil,
      keyHint: state.key.slice(-4),
    }
  }

  function emit(): LicenseStatus {
    const s = status()
    deps.onChange?.(s)
    return s
  }

  function clearLicense(): void {
    state = { deviceId: state.deviceId, lastServerTime: state.lastServerTime, lastSeenAt: state.lastSeenAt }
    persist()
    emit()
  }

  function applyGrant(key: string, grant: LicenseGrant): LicenseActionResult {
    const check = verifyToken(grant.token, deps.keys, state.deviceId)
    if (!check.ok) {
      return { ok: false, code: 'untrusted', message: `License token rejected (${check.reason})` }
    }
    const stamp = new Date(Math.max(now(), ms(state.lastSeenAt))).toISOString()
    state = {
      ...state,
      key,
      token: grant.token,
      license: grant.license,
      refreshAfter: grant.refreshAfter,
      lastServerTime: grant.serverTime ?? state.lastServerTime,
      lastSeenAt: stamp,
      lastValidatedAt: stamp,
    }
    persist()
    return { ok: true, status: emit() }
  }

  const request = () => ({
    deviceId: state.deviceId,
    deviceName: deps.deviceName,
    appVersion: deps.appVersion,
  })

  const failure = (r: Extract<ClientResult<object>, { ok: false }>): LicenseActionResult => r

  async function activate(rawKey: string): Promise<LicenseActionResult> {
    if (!isWellFormedLicenseKey(rawKey)) {
      return { ok: false, code: 'bad_request', message: 'Malformed license key' }
    }
    const key = normalizeLicenseKey(rawKey)
    const r = await deps.client.activate({ key, ...request() })
    return r.ok ? applyGrant(key, r) : failure(r)
  }

  async function runRefresh(): Promise<LicenseActionResult> {
    const key = state.key
    if (!key) return { ok: true, status: status() }
    let r = await deps.client.validate({ key, ...request() })
    // slot lost server-side (e.g. device was released): one re-activation attempt
    if (!r.ok && r.code === 'not_activated') r = await deps.client.activate({ key, ...request() })
    if (r.ok) return applyGrant(key, r)
    if (REVOKING.has(r.code) || r.code === 'not_activated' || r.code === 'device_limit') {
      clearLicense()
    }
    return failure(r)
  }

  function refresh(): Promise<LicenseActionResult> {
    inflight ??= runRefresh().finally(() => {
      inflight = null
    })
    return inflight
  }

  async function deactivate(): Promise<LicenseActionResult> {
    const key = state.key
    if (!key) return { ok: true, status: status() }
    const r = await deps.client.deactivate({ key, deviceId: state.deviceId })
    // an unreachable server must not silently pretend the slot was freed
    if (!r.ok && !REVOKING.has(r.code) && r.code !== 'not_activated') return failure(r)
    clearLicense()
    return { ok: true, status: status() }
  }

  function refreshDue(): boolean {
    if (!state.key) return false
    const t = effectiveNow()
    const due = Math.min(ms(state.refreshAfter) || Infinity, ms(state.lastValidatedAt) + DAY_MS)
    return t >= due
  }

  /** startup + hourly check; /validate runs about once a day, a failed attempt retries next hour */
  function startScheduler(): () => void {
    const tick = () => {
      if (refreshDue()) void refresh().catch(() => undefined)
    }
    const first = setTimeout(tick, 5_000)
    const timer = setInterval(tick, 60 * 60 * 1000)
    first.unref?.()
    timer.unref?.()
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }

  return {
    status,
    isLicensed: () => status().licensed,
    activate,
    deactivate,
    refresh,
    refreshDue,
    startScheduler,
  }
}

export type LicenseManager = ReturnType<typeof createLicenseManager>
