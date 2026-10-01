import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  officeVegaApiKey,
  officeVegaAuthPath,
  officeVegaLoginInFlight,
  officeVegaLogout,
  officeVegaProxyFallbackPreferred,
  loadOfficeVegaAuth,
  resetOfficeVegaAuthCache,
  setOfficeVegaAuthListener,
  startOfficeVegaLogin,
  vegaAccountInfo,
  type OfficeVegaAuth,
  type GskLoginProgress,
} from '../src/officevega-auth'
import { gskApiKey, setGskProxyUrl } from '../src/gsk'

const DEVICE_CODE = 'd'.repeat(64)
const API_KEY = `sk-apivega-${'a'.repeat(48)}`
const AUTH_URL = `https://api.vega.chat/device?user_code=ABCD-1234`

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'officevega-auth-'))
  process.env.OFFICEVEGA_AUTH_DIR = dir
  delete process.env.GSK_API_KEY
  delete process.env.VEGA_API_ROOT
  resetOfficeVegaAuthCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(dir, { recursive: true, force: true })
  delete process.env.OFFICEVEGA_AUTH_DIR
  delete process.env.GSK_API_KEY
  delete process.env.VEGA_API_ROOT
  setGskProxyUrl('')
  resetOfficeVegaAuthCache()
})

function jsonResponse(json: unknown, opts: { status?: number } = {}): Response {
  return {
    ok: (opts.status ?? 200) < 400,
    status: opts.status ?? 200,
    json: async () => json,
    headers: new Headers(),
  } as unknown as Response
}

interface FlowOpts {
  /** poll answers before the approved one */
  polls?: Record<string, unknown>[]
  /** override for the key-issuance response */
  keyResponse?: { body: unknown; status?: number }
}

/** fetch stub for the VEGA device flow: device/code → device/token polls → keys/officevega */
function stubFlow(opts: FlowOpts = {}) {
  let tokenPolls = 0
  const fetchMock = vi.fn(async (input: string | URL, _init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/auth/device/code')) {
      return jsonResponse({
        device_code: DEVICE_CODE,
        user_code: 'ABCD-1234',
        verification_uri: 'https://api.vega.chat/device',
        verification_uri_complete: AUTH_URL,
        expires_in: 600,
        interval: 0.001,
      })
    }
    if (url.includes('/api/auth/device/token')) {
      const scripted = (opts.polls ?? [])[tokenPolls]
      tokenPolls++
      if (scripted) return jsonResponse(scripted, { status: 400 })
      return jsonResponse({ access_token: 'vega-session-token' })
    }
    if (url.includes('/api/v1/keys/officevega/revoke')) return jsonResponse({ ok: true })
    if (url.includes('/api/v1/keys/officevega')) {
      const r = opts.keyResponse ?? { body: { id: 'kid-1', key: API_KEY } }
      return jsonResponse(r.body, { status: r.status })
    }
    if (url.includes('/api/v1/account')) {
      return jsonResponse({
        email: 'user@example.com',
        name: 'User',
        balance: 12.34,
        balanceRub: 1020.55,
        currency: 'USD',
        totalUsage: 45.67,
        limit: null,
        keyName: 'officevega',
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const PENDING = { error: 'authorization_pending' }

async function loginAndCollect(timeout = 4000): Promise<GskLoginProgress[]> {
  const events: GskLoginProgress[] = []
  startOfficeVegaLogin((progress) => events.push(progress))
  await vi.waitFor(
    () => {
      expect(['success', 'error']).toContain(events.at(-1)?.phase)
    },
    { timeout },
  )
  return events
}

describe('startOfficeVegaLogin (VEGA device flow)', () => {
  it('runs device/code → poll → token → key issuance and stores the key', async () => {
    const fetchMock = stubFlow({ polls: [PENDING, PENDING] })
    const events = await loginAndCollect()

    expect(events[0]).toEqual({
      phase: 'url',
      url: AUTH_URL,
      expiresInSec: 600,
      userCode: 'ABCD-1234',
    })
    expect(events.at(-1)).toEqual({ phase: 'success' })

    const saved = JSON.parse(readFileSync(officeVegaAuthPath(), 'utf-8'))
    expect(saved).toEqual({ api_key: API_KEY, key_id: 'kid-1' })
    // POSIX-only: Windows reports 0o666 regardless of the requested mode
    if (process.platform !== 'win32') {
      expect(statSync(officeVegaAuthPath()).mode & 0o777).toBe(0o600)
    }
    expect(officeVegaApiKey()).toBe(API_KEY)
    expect(officeVegaLoginInFlight()).toBe(false)

    // the device request identifies the server-registered client
    const codeCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/api/auth/device/code'),
    )!
    expect(JSON.parse(String(codeCall[1]!.body))).toMatchObject({ client_id: 'officevega' })

    // polls carry the RFC 8628 grant fields
    const pollCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/api/auth/device/token'),
    )!
    expect(JSON.parse(String(pollCall[1]!.body))).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: DEVICE_CODE,
      client_id: 'officevega',
    })

    // key issuance rides on the session Bearer, never on a cookie
    const keyCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/api/v1/keys/officevega'),
    )!
    const init = keyCall[1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer vega-session-token')
    expect(JSON.parse(String(init.body))).toEqual({ name: 'officevega' })
  })

  it('keeps the issued VEGA key out of gskApiKey() — it must never reach Genspark endpoints', async () => {
    stubFlow()
    await loginAndCollect()
    expect(officeVegaApiKey()).toBe(API_KEY)
    expect(gskApiKey()).toBe('')
    process.env.GSK_API_KEY = 'gsk-env-override'
    expect(gskApiKey()).toBe('gsk-env-override')
  })

  it('reads a pre-VEGA (gsk-…) auth file as signed out', () => {
    writeFileSync(
      officeVegaAuthPath(),
      JSON.stringify({ api_key: 'gsk-legacy-key', key_id: 'kid-0' }),
    )
    expect(loadOfficeVegaAuth()).toBeNull()
    expect(officeVegaApiKey()).toBe('')
  })

  it('adopts a key left in the pre-rename ~/.genoffice dir and migrates it', () => {
    const legacyDir = mkdtempSync(join(tmpdir(), 'genoffice-auth-'))
    process.env.GENOFFICE_AUTH_DIR = legacyDir
    try {
      writeFileSync(
        join(legacyDir, 'auth.json'),
        JSON.stringify({ api_key: API_KEY, key_id: 'kid-legacy' }),
      )
      expect(loadOfficeVegaAuth()).toMatchObject({ apiKey: API_KEY, keyId: 'kid-legacy' })
      expect(officeVegaApiKey()).toBe(API_KEY)
      // migrated into the new location
      expect(JSON.parse(readFileSync(officeVegaAuthPath(), 'utf-8'))).toEqual({
        api_key: API_KEY,
        key_id: 'kid-legacy',
      })
    } finally {
      delete process.env.GENOFFICE_AUTH_DIR
      rmSync(legacyDir, { recursive: true, force: true })
    }
  })

  it('reports a network failure at device/code as error "network"', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)
    const events = await loginAndCollect()
    expect(events).toEqual([{ phase: 'error', error: 'network' }])
    expect(loadOfficeVegaAuth()).toBeNull()
    // no proxy registered → nothing better to retry through
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries through the registered proxy channel when the direct fetch cannot connect', async () => {
    setGskProxyUrl('http://127.0.0.1:7890')
    const flow = stubFlow()
    let deviceCodeCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/device/code') && ++deviceCodeCalls === 1) {
          throw new Error('ECONNRESET')
        }
        return flow(input, init)
      }),
    )
    const events = await loginAndCollect()
    expect(deviceCodeCalls).toBe(2)
    expect(events.at(-1)).toEqual({ phase: 'success' })
    expect(officeVegaApiKey()).toBe(API_KEY)
    expect(officeVegaProxyFallbackPreferred()).toBe(true)
  })

  it('treats a gateway status (502) as channel failure: fails over without adopting the channel', async () => {
    setGskProxyUrl('http://127.0.0.1:7890')
    const fetchMock = vi.fn(async () => jsonResponse({}, { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)
    const events = await loginAndCollect()
    expect(events).toEqual([{ phase: 'error', error: 'network' }])
    // both channels tried, neither adopted
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(officeVegaProxyFallbackPreferred()).toBe(false)
  })

  it('counts an endpoint 4xx (authorization_pending) as channel success', async () => {
    setGskProxyUrl('http://127.0.0.1:7890')
    const flow = stubFlow()
    let deviceCodeCalls = 0
    let tokenCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/device/code') && ++deviceCodeCalls === 1) {
          throw new Error('ECONNRESET')
        }
        if (url.includes('/device/token') && ++tokenCalls === 1) {
          return jsonResponse(PENDING, { status: 400 })
        }
        return flow(input, init)
      }),
    )
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'success' })
    // the 400 poll neither failed over to a second attempt nor dropped the preference
    expect(tokenCalls).toBe(2)
    expect(officeVegaProxyFallbackPreferred()).toBe(true)
  })

  it(
    'honors slow_down by continuing to poll until the code is approved',
    { timeout: 25_000 },
    async () => {
      const fetchMock = stubFlow({ polls: [{ error: 'slow_down' }, PENDING] })
      // RFC 8628 slow_down adds 5 s and the bump persists — two waits ≈ 10 s
      const events = await loginAndCollect(20_000)
      expect(events.at(-1)).toEqual({ phase: 'success' })
      const polls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/device/token')).length
      expect(polls).toBe(3)
    },
  )

  it('reports expired_token as error "expired"', async () => {
    stubFlow({ polls: [{ error: 'expired_token' }] })
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'expired' })
  })

  it('reports access_denied as error "denied"', async () => {
    stubFlow({ polls: [{ error: 'access_denied' }] })
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'denied' })
  })

  it('surfaces the server message when key issuance fails', async () => {
    stubFlow({
      keyResponse: { body: { message: 'Key quota exceeded.' }, status: 403 },
    })
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'Key quota exceeded.' })
    expect(loadOfficeVegaAuth()).toBeNull()
  })

  it('rejects an issued key that does not match the sk-apivega format', async () => {
    stubFlow({ keyResponse: { body: { id: 'kid-1', key: 'not-a-vega-key' } } })
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'error', error: 'issued key has an unexpected format' })
    expect(loadOfficeVegaAuth()).toBeNull()
  })

  it('re-login replaces the stored key (the server revokes the old same-named one)', async () => {
    stubFlow()
    await loginAndCollect()
    stubFlow({ keyResponse: { body: { id: 'kid-2', key: `sk-apivega-${'b'.repeat(48)}` } } })
    await loginAndCollect()
    expect(loadOfficeVegaAuth()).toMatchObject({
      apiKey: `sk-apivega-${'b'.repeat(48)}`,
      keyId: 'kid-2',
    })
  })

  it('a new login cancels the in-flight one without emitting on it', async () => {
    // first flow polls pending forever
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('/device/code')) {
          return jsonResponse({
            device_code: DEVICE_CODE,
            verification_uri_complete: AUTH_URL,
            expires_in: 600,
            interval: 0.001,
          })
        }
        return jsonResponse(PENDING, { status: 400 })
      }),
    )
    const first: GskLoginProgress[] = []
    startOfficeVegaLogin((progress) => first.push(progress))
    await vi.waitFor(() => expect(first.length).toBeGreaterThan(0))
    expect(officeVegaLoginInFlight()).toBe(true)

    stubFlow()
    const second = await loginAndCollect()
    expect(second.at(-1)).toEqual({ phase: 'success' })
    expect(first.every((e) => e.phase === 'url')).toBe(true)
  })
})

describe('officeVegaLogout', () => {
  it('self-revokes the API key server-side and removes the local file', async () => {
    const fetchMock = stubFlow()
    await loginAndCollect()

    await officeVegaLogout()
    expect(existsSync(officeVegaAuthPath())).toBe(false)
    expect(officeVegaApiKey()).toBe('')
    const revokeCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/keys/officevega/revoke'),
    )!
    // self-revocation: the API key itself is the Bearer
    expect((revokeCall[1]!.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${API_KEY}`,
    )
  })

  it('still clears locally when the server revoke fails', async () => {
    stubFlow()
    await loginAndCollect()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await officeVegaLogout()
    expect(existsSync(officeVegaAuthPath())).toBe(false)
    expect(loadOfficeVegaAuth()).toBeNull()
  })

  it('is a no-op network-wise when not signed in', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await officeVegaLogout()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('also removes a migrated legacy-dir key so sign-out sticks', async () => {
    const legacyDir = mkdtempSync(join(tmpdir(), 'genoffice-auth-'))
    process.env.GENOFFICE_AUTH_DIR = legacyDir
    try {
      writeFileSync(
        join(legacyDir, 'auth.json'),
        JSON.stringify({ api_key: API_KEY, key_id: 'kid-legacy' }),
      )
      expect(officeVegaApiKey()).toBe(API_KEY)
      stubFlow()
      await officeVegaLogout()
      expect(officeVegaApiKey()).toBe('')
      expect(existsSync(officeVegaAuthPath())).toBe(false)
      expect(existsSync(join(legacyDir, 'auth.json'))).toBe(false)
    } finally {
      delete process.env.GENOFFICE_AUTH_DIR
      rmSync(legacyDir, { recursive: true, force: true })
    }
  })
})

describe('setOfficeVegaAuthListener', () => {
  it('fires with the stored auth on login and with null on logout', async () => {
    const seen: (OfficeVegaAuth | null)[] = []
    setOfficeVegaAuthListener((auth) => seen.push(auth))

    stubFlow()
    await loginAndCollect()
    expect(seen).toEqual([{ apiKey: API_KEY, keyId: 'kid-1' }])

    await officeVegaLogout()
    expect(seen).toEqual([{ apiKey: API_KEY, keyId: 'kid-1' }, null])
  })

  it('a throwing listener does not fail the login or logout that just ran', async () => {
    setOfficeVegaAuthListener(() => {
      throw new Error('broken broadcast')
    })
    stubFlow()
    const events = await loginAndCollect()
    expect(events.at(-1)).toEqual({ phase: 'success' })
    expect(officeVegaApiKey()).toBe(API_KEY)
    await expect(officeVegaLogout()).resolves.toBeUndefined()
    expect(officeVegaApiKey()).toBe('')
  })

  it('is cleared by resetOfficeVegaAuthCache and can be unregistered', async () => {
    const seen: (OfficeVegaAuth | null)[] = []
    setOfficeVegaAuthListener((auth) => seen.push(auth))
    resetOfficeVegaAuthCache()
    stubFlow()
    await loginAndCollect()
    expect(seen).toEqual([])

    setOfficeVegaAuthListener((auth) => seen.push(auth))
    setOfficeVegaAuthListener(null)
    await officeVegaLogout()
    expect(seen).toEqual([])
  })
})

describe('vegaAccountInfo', () => {
  it('returns the account deposit fields for the signed-in key', async () => {
    const fetchMock = stubFlow()
    await loginAndCollect()
    const info = await vegaAccountInfo()
    expect(info).toEqual({
      email: 'user@example.com',
      name: 'User',
      balance: 12.34,
      balanceRub: 1020.55,
      currency: 'USD',
      totalUsage: 45.67,
      limit: null,
      keyName: 'officevega',
    })
    const call = fetchMock.mock.calls.find(([u]) => String(u).includes('/api/v1/account'))!
    expect((call[1]!.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`)
  })

  it('is null when signed out, on HTTP errors (401/402) and on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, { status: 401 })),
    )
    expect(await vegaAccountInfo()).toBeNull()

    stubFlow()
    await loginAndCollect()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, { status: 402 })),
    )
    expect(await vegaAccountInfo()).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await vegaAccountInfo()).toBeNull()
  })
})
