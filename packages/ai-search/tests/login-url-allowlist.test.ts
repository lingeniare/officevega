import { afterEach, describe, expect, it, vi } from 'vitest'
// The real guard, not a mirror: isAllowedAuthUrl is exported so these pins
// fail if the predicate ever drifts (review point 2).
import { isAllowedAuthUrl, startOfficeVegaLogin } from '../src/officevega-auth'

describe('isAllowedAuthUrl', () => {
  const BASE = 'https://api.vega.chat'

  it('accepts https on the endpoint host', () => {
    expect(isAllowedAuthUrl('https://api.vega.chat/device?x=1', BASE)).toBeTruthy()
  })

  it('accepts sibling hosts on the endpoint registrable domain (review point 1)', () => {
    // the verify page may move between the auth service's own hosts
    expect(isAllowedAuthUrl('https://auth.vega.chat/device', BASE)).toBeTruthy()
    expect(isAllowedAuthUrl('https://vega.chat/device', BASE)).toBeTruthy()
  })

  it('accepts siblings of a non-www staging base', () => {
    expect(
      isAllowedAuthUrl(
        'https://auth.staging.vega.chat/device',
        'https://api.staging.vega.chat',
      ),
    ).toBeTruthy()
  })

  it('still refuses a different registrable domain', () => {
    // a staging endpoint must not be able to send the browser to production,
    // and no host outside the endpoint's registrable domain passes
    expect(
      isAllowedAuthUrl('https://api.vega.chat/device', 'https://staging.vega.chat'),
    ).toBeFalsy()
    expect(isAllowedAuthUrl('https://vega.chat.evil.example/x', BASE)).toBeFalsy()
    expect(isAllowedAuthUrl('https://notvega.chat/x', BASE)).toBeFalsy()
  })

  it('refuses other protocols and unparseable input', () => {
    for (const bad of [
      'file:///etc/passwd',
      'smb://share/x',
      'ms-msdt:-foo',
      'http://api.vega.chat/device',
      'javascript:alert(1)',
      'not a url',
    ]) {
      expect(isAllowedAuthUrl(bad, BASE)).toBeFalsy()
    }
  })

  it('requires exact host equality for IP literals and localhost', () => {
    expect(isAllowedAuthUrl('https://localhost/device', 'https://localhost')).toBeTruthy()
    expect(isAllowedAuthUrl('https://sub.localhost/device', 'https://localhost')).toBeFalsy()
    expect(isAllowedAuthUrl('https://127.0.0.1/device', 'https://127.0.0.1')).toBeTruthy()
    // `evil.127.0.0.1` is a public DNS name that resolves elsewhere
    expect(isAllowedAuthUrl('https://evil.127.0.0.1/device', 'https://127.0.0.1')).toBeFalsy()
    expect(isAllowedAuthUrl('https://[::1]/device', 'https://[::1]')).toBeTruthy()
    expect(isAllowedAuthUrl('https://[::2]/device', 'https://[::1]')).toBeFalsy()
  })
})

// Real-module pass: run the real login flow against a stubbed endpoint; the
// allowlist decision must surface in the emitted events.
describe('startOfficeVegaLogin verification_uri allowlist', () => {
  let savedBase: string | undefined
  let savedFetch: typeof fetch | undefined

  const stubDeviceCode = (authUrl: string, pollJson: unknown = { error: 'expired_token' }) => {
    savedBase = process.env.VEGA_API_ROOT
    savedFetch = globalThis.fetch
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/device/code')) {
        return new Response(
          JSON.stringify({
            device_code: 'dc',
            verification_uri_complete: authUrl,
            expires_in: 1,
            interval: 0.001,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify(pollJson), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch
    process.env.VEGA_API_ROOT = 'https://api.vega.chat'
  }

  afterEach(() => {
    if (savedBase === undefined) delete process.env.VEGA_API_ROOT
    else process.env.VEGA_API_ROOT = savedBase
    if (savedFetch !== undefined) globalThis.fetch = savedFetch
    vi.unstubAllGlobals()
  })

  it('emits error "auth_url_rejected" and never a url event for a file:// verification_uri', async () => {
    stubDeviceCode('file:///etc/passwd')
    const events: { phase: string; error?: string }[] = []
    startOfficeVegaLogin((p) => events.push(p))
    await vi.waitFor(() => expect(events.at(-1)?.phase).toBe('error'))
    expect(events).toEqual([{ phase: 'error', error: 'auth_url_rejected' }])
  })

  it('opens a sibling-host verification_uri (auth.vega.chat) end-to-end', async () => {
    stubDeviceCode('https://auth.vega.chat/device?user_code=abc')
    const events: { phase: string; url?: string }[] = []
    startOfficeVegaLogin((p) => events.push(p))
    await vi.waitFor(() => expect(events.at(-1)?.phase).toBe('error')) // poll stub answers expired_token
    expect(events[0]).toEqual({
      phase: 'url',
      url: 'https://auth.vega.chat/device?user_code=abc',
      expiresInSec: 1,
      userCode: 'abc',
    })
  })
})
