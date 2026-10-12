import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearGigachatTokens, gigachatAccessToken } from '../src/gigachat-auth'
import { errorResponse, jsonResponse } from './test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
  clearGigachatTokens()
})

function tokenResponse(token: string, expiresAt = Date.now() + 30 * 60_000): Response {
  return jsonResponse({ access_token: token, expires_at: expiresAt })
}

function sentInit(fetchMock: ReturnType<typeof vi.fn>, call = 0): RequestInit {
  return fetchMock.mock.calls[call]![1] as RequestInit
}

describe('gigachatAccessToken', () => {
  it('exchanges the authorization key for a token with Basic auth, RqUID and a scope body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse('access-1'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await gigachatAccessToken('auth-key')).toBe('access-1')
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe('https://ngw.devices.sberbank.ru:9443/api/v2/oauth')
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe('Basic auth-key')
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded')
    expect(headers.get('rquid')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(init.body).toBe('scope=GIGACHAT_API_PERS')
    expect(init.method).toBe('POST')
  })

  it('reuses the cached token while it is valid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse('access-1'))
    vi.stubGlobal('fetch', fetchMock)

    await gigachatAccessToken('auth-key')
    expect(await gigachatAccessToken('auth-key')).toBe('access-1')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('probes the scopes in order until one answers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(403, '{"error":"forbidden"}'))
      .mockResolvedValueOnce(tokenResponse('access-b2b'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await gigachatAccessToken('corp-key')).toBe('access-b2b')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentInit(fetchMock, 0).body).toBe('scope=GIGACHAT_API_PERS')
    expect(sentInit(fetchMock, 1).body).toBe('scope=GIGACHAT_API_B2B')
  })

  it('re-mints a token inside the re-mint margin instead of reusing it', async () => {
    // expires in 30s — inside the 60s margin — so the second call exchanges again
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('access-1', Date.now() + 30_000))
      .mockResolvedValueOnce(tokenResponse('access-2'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await gigachatAccessToken('auth-key')).toBe('access-1')
    expect(await gigachatAccessToken('auth-key')).toBe('access-2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws a scoped error when every scope rejects the key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(401, 'unauthorized')))
    await expect(gigachatAccessToken('bad-key')).rejects.toThrow(
      /GigaChat OAuth failed.*GIGACHAT_API_PERS.*GIGACHAT_API_B2B.*GIGACHAT_API_CORP/s,
    )
  })

  it('shares one inflight exchange between concurrent callers', async () => {
    let resolveToken!: (r: Response) => void
    const slow = new Promise<Response>((resolve) => {
      resolveToken = resolve
    })
    const fetchMock = vi.fn().mockReturnValue(slow)
    vi.stubGlobal('fetch', fetchMock)

    const first = gigachatAccessToken('auth-key')
    const second = gigachatAccessToken('auth-key')
    resolveToken(tokenResponse('access-1'))
    expect(await Promise.all([first, second])).toEqual(['access-1', 'access-1'])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects a missing key before touching the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(gigachatAccessToken('   ')).rejects.toThrow('authorization key')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
