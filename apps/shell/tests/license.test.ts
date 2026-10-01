import { describe, expect, it } from 'vitest'
import { createLicenseClient } from '../src/main/license/client'
import { formatLicenseKey, isWellFormedLicenseKey, normalizeLicenseKey } from '../src/main/license/keys'
import { createLicenseManager } from '../src/main/license/manager'
import type { LicenseState } from '../src/main/license/manager'
import { MOCK_KEYS, createMockLicenseServer } from '../src/main/license/mock-server'
import { verifyToken } from '../src/main/license/token'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.parse('2026-10-01T10:00:00Z')

function setup(opts: { server?: ReturnType<typeof createMockLicenseServer>; deviceId?: string } = {}) {
  const clock = { t: T0 }
  const server = opts.server ?? createMockLicenseServer({ now: () => clock.t })
  let saved: LicenseState | null = null
  const changes: boolean[] = []
  const manager = createLicenseManager({
    store: { load: () => saved, save: (s) => (saved = s) },
    client: createLicenseClient({ baseUrl: 'https://x.test/api/license', fetchImpl: server.fetch }),
    keys: server.publicKeys,
    deviceName: 'Test PC',
    appVersion: '1.0.0',
    now: () => clock.t,
    newDeviceId: () => opts.deviceId ?? 'device-aaaaaaaaaaaaaaaa',
    onChange: (s) => changes.push(s.licensed),
  })
  return { clock, server, manager, changes, saved: () => saved }
}

describe('license key helpers', () => {
  it('normalizes any case / dashes / spaces', () => {
    expect(normalizeLicenseKey('vegat-est22 22222-22222-22222')).toBe('VEGATEST22222222222222222')
    expect(isWellFormedLicenseKey(MOCK_KEYS.valid.toLowerCase().replaceAll('-', ''))).toBe(true)
    expect(formatLicenseKey('vegatest22222222222222222')).toBe(MOCK_KEYS.valid)
  })
  it('rejects excluded alphabet characters and wrong length', () => {
    expect(isWellFormedLicenseKey('0'.repeat(25))).toBe(false)
    expect(isWellFormedLicenseKey('ABCDE-FGHJK')).toBe(false)
  })
})

describe('license manager', () => {
  it('starts unlicensed', () => {
    const { manager } = setup()
    expect(manager.isLicensed()).toBe(false)
    expect(manager.status().state).toBe('none')
  })

  it('activates with a valid key, tolerating lower case and missing dashes', async () => {
    const { manager, server, saved } = setup()
    const r = await manager.activate(MOCK_KEYS.valid.toLowerCase().replaceAll('-', ''))
    expect(r.ok).toBe(true)
    expect(manager.isLicensed()).toBe(true)
    const s = manager.status()
    expect(s).toMatchObject({ state: 'active', holderEmail: 'mock@officevega.com', keyHint: '2222' })
    expect(saved()?.token).toBeTruthy()
    expect(server.calls[0]?.path).toBe('activate')
  })

  it('rejects an unknown key and a malformed key without a network call', async () => {
    const { manager, server } = setup()
    expect(await manager.activate('AAAAA-AAAAA-AAAAA-AAAAA-AAAAA')).toMatchObject({ code: 'invalid_key' })
    expect(await manager.activate('nope')).toMatchObject({ code: 'bad_request' })
    expect(server.calls).toHaveLength(1)
    expect(manager.isLicensed()).toBe(false)
  })

  it('reports expired and rate_limited with Retry-After', async () => {
    const { manager } = setup()
    expect(await manager.activate(MOCK_KEYS.expired)).toMatchObject({ code: 'expired' })
    expect(await manager.activate(MOCK_KEYS.rateLimited)).toMatchObject({
      code: 'rate_limited',
      retryAfterSec: 60,
    })
  })

  it('one key, one device: a second device gets device_limit', async () => {
    const a = setup()
    await a.manager.activate(MOCK_KEYS.valid)
    const b = setup({ server: a.server, deviceId: 'device-bbbbbbbbbbbbbbbb' })
    expect(await b.manager.activate(MOCK_KEYS.valid)).toMatchObject({ code: 'device_limit' })
    expect(b.manager.isLicensed()).toBe(false)
  })

  it('deactivate frees the slot for another device', async () => {
    const a = setup()
    await a.manager.activate(MOCK_KEYS.valid)
    expect((await a.manager.deactivate()).ok).toBe(true)
    expect(a.manager.status().state).toBe('none')
    const b = setup({ server: a.server, deviceId: 'device-bbbbbbbbbbbbbbbb' })
    expect((await b.manager.activate(MOCK_KEYS.valid)).ok).toBe(true)
  })

  it('stays licensed offline until graceUntil (30 days), then lapses', async () => {
    const { manager, clock, server } = setup()
    await manager.activate(MOCK_KEYS.valid)
    clock.t = T0 + 29 * DAY
    expect(manager.isLicensed()).toBe(true)
    clock.t = T0 + 31 * DAY
    expect(manager.isLicensed()).toBe(false)
    expect(manager.status().state).toBe('lapsed')
    expect(server.calls).toHaveLength(1)
  })

  it('a failed network refresh keeps the license', async () => {
    const s = setup()
    await s.manager.activate(MOCK_KEYS.valid)
    const failing = createLicenseManager({
      store: { load: () => s.saved(), save: () => undefined },
      client: createLicenseClient({
        baseUrl: 'https://x.test/api/license',
        fetchImpl: (async () => {
          throw new TypeError('offline')
        }) as unknown as typeof fetch,
      }),
      keys: s.server.publicKeys,
      deviceName: 'x',
      appVersion: '1',
      now: () => s.clock.t,
    })
    s.clock.t += 2 * DAY
    expect(await failing.refresh()).toMatchObject({ ok: false, code: 'network' })
    expect(failing.isLicensed()).toBe(true)
  })

  it('refresh renews the token and the offline window', async () => {
    const { manager, clock } = setup()
    await manager.activate(MOCK_KEYS.valid)
    clock.t = T0 + 20 * DAY
    expect((await manager.refresh()).ok).toBe(true)
    clock.t = T0 + 45 * DAY
    expect(manager.isLicensed()).toBe(true)
  })

  it('closes access at once when the server revokes the key', async () => {
    const { manager, server, saved } = setup()
    await manager.activate(MOCK_KEYS.valid)
    server.revoke(MOCK_KEYS.valid)
    expect(await manager.refresh()).toMatchObject({ ok: false, code: 'invalid_key' })
    expect(manager.isLicensed()).toBe(false)
    expect(saved()?.token).toBeUndefined()
    expect(saved()?.key).toBeUndefined()
  })

  it('re-activates when the server says not_activated, or drops the license on device_limit', async () => {
    const { manager, server } = setup()
    await manager.activate(MOCK_KEYS.valid)
    server.bindTo(MOCK_KEYS.valid, 'someone-else-xxxxxxxx')
    expect(await manager.refresh()).toMatchObject({ ok: false, code: 'device_limit' })
    expect(manager.isLicensed()).toBe(false)
  })

  it('does not accept the OS clock being wound back', async () => {
    const { manager, clock } = setup()
    await manager.activate(MOCK_KEYS.valid)
    clock.t = T0 + 40 * DAY
    expect(manager.isLicensed()).toBe(false)
    clock.t = T0 + DAY
    expect(manager.isLicensed()).toBe(false)
  })

  it('rejects a token signed by an untrusted key', async () => {
    const rogue = createMockLicenseServer({ now: () => T0 })
    const s = setup()
    const manager = createLicenseManager({
      store: { load: () => null, save: () => undefined },
      client: createLicenseClient({ baseUrl: 'https://x.test/api/license', fetchImpl: rogue.fetch }),
      keys: s.server.publicKeys,
      deviceName: 'x',
      appVersion: '1',
      now: () => T0,
      newDeviceId: () => 'device-aaaaaaaaaaaaaaaa',
    })
    expect(await manager.activate(MOCK_KEYS.valid)).toMatchObject({ ok: false, code: 'untrusted' })
    expect(manager.isLicensed()).toBe(false)
  })

  it('fails closed with an empty key ring', async () => {
    const server = createMockLicenseServer({ now: () => T0 })
    const manager = createLicenseManager({
      store: { load: () => null, save: () => undefined },
      client: createLicenseClient({ baseUrl: 'https://x.test/api/license', fetchImpl: server.fetch }),
      keys: {},
      deviceName: 'x',
      appVersion: '1',
      now: () => T0,
    })
    expect(await manager.activate(MOCK_KEYS.valid)).toMatchObject({ ok: false, code: 'untrusted' })
  })
})

describe('token verification', () => {
  async function token() {
    const server = createMockLicenseServer({ now: () => T0 })
    const client = createLicenseClient({ baseUrl: 'https://x.test/api/license', fetchImpl: server.fetch })
    const r = await client.activate({ key: MOCK_KEYS.valid, deviceId: 'device-aaaaaaaaaaaaaaaa' })
    if (!r.ok) throw new Error('mock activation failed')
    return { server, token: r.token }
  }

  it('accepts a genuine token for its device', async () => {
    const { server, token: t } = await token()
    expect(verifyToken(t, server.publicKeys, 'device-aaaaaaaaaaaaaaaa').ok).toBe(true)
  })

  it('rejects another device', async () => {
    const { server, token: t } = await token()
    expect(verifyToken(t, server.publicKeys, 'device-bbbbbbbbbbbbbbbb')).toEqual({
      ok: false,
      reason: 'wrong_device',
    })
  })

  it('rejects a tampered payload', async () => {
    const { server, token: t } = await token()
    const [body, sig] = t.split('.') as [string, string]
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Record<string, unknown>
    payload.exp = '2099-01-01T00:00:00.000Z'
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`
    expect(verifyToken(forged, server.publicKeys, 'device-aaaaaaaaaaaaaaaa')).toEqual({
      ok: false,
      reason: 'bad_signature',
    })
  })

  it('rejects garbage', () => {
    expect(verifyToken('abc', {}, 'x')).toEqual({ ok: false, reason: 'malformed' })
  })
})

describe('license client', () => {
  it('refuses plain http', async () => {
    const client = createLicenseClient({ baseUrl: 'http://officevega.com/api/license' })
    expect(await client.activate({ key: 'k', deviceId: 'device-aaaaaaaaaaaaaaaa' })).toMatchObject({
      ok: false,
      code: 'untrusted',
    })
  })

  it('maps an unreachable server to network', async () => {
    const client = createLicenseClient({
      baseUrl: 'https://x.test/api/license',
      fetchImpl: (async () => {
        throw new TypeError('down')
      }) as unknown as typeof fetch,
    })
    expect(await client.validate({ key: 'k', deviceId: 'device-aaaaaaaaaaaaaaaa' })).toMatchObject({
      code: 'network',
    })
  })
})
