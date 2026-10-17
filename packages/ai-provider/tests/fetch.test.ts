import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_DEFAULT_USER_AGENT,
  aiFetch,
  openRouterSafeHeaders,
  setAiUserAgent,
  setRescueFetch,
} from '../src/fetch'

afterEach(() => {
  vi.unstubAllGlobals()
  setRescueFetch(null)
  setAiUserAgent(AI_DEFAULT_USER_AGENT)
})

function sentHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  return new Headers(init.headers)
}

describe('aiFetch', () => {
  it('identifies the client to gateways that flag anonymous traffic', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)
    await aiFetch('https://x/', { headers: { Authorization: 'Bearer k' } })
    const headers = sentHeaders(fetchMock)
    expect(headers.get('user-agent')).toBe('OfficeVega')
    expect(headers.get('authorization')).toBe('Bearer k')
  })

  it('lets the host refine the user agent and never overrides an explicit one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)
    setAiUserAgent('OfficeVega/1.2.3')
    await aiFetch('https://x/', {})
    expect(sentHeaders(fetchMock).get('user-agent')).toBe('OfficeVega/1.2.3')

    fetchMock.mockClear()
    await aiFetch('https://x/', { headers: { 'User-Agent': 'custom/9' } })
    expect(sentHeaders(fetchMock).get('user-agent')).toBe('custom/9')
  })

  it('passes the same identified request to the rescue fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const rescue = vi.fn().mockResolvedValue(new Response('rescued'))
    setRescueFetch(rescue)
    await aiFetch('https://x/', {})
    expect(sentHeaders(rescue).get('user-agent')).toBe('OfficeVega')
  })

  it('keeps a vega-bearing user agent off openrouter.ai and identifies via attribution headers', async () => {
    // openrouter.ai's edge 403s any User-Agent containing "vega" (any case):
    // the product UA must stay home on this host or every OpenRouter request —
    // catalog, chat, media — dies at the edge before the key is even read
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)
    setAiUserAgent('OfficeVega/1.2.3')
    await aiFetch('https://openrouter.ai/api/v1/models', {})
    let headers = sentHeaders(fetchMock)
    // pinned neutral UA — not absent: a stack that re-derives a default UA
    // from the app name would put the blocked token right back
    expect(headers.get('user-agent')).toBe('node')
    expect(headers.get('http-referer')).toBe('https://officevega.com')
    expect(headers.get('x-title')).toBe('OfficeVega')

    fetchMock.mockClear()
    await aiFetch('https://openrouter.ai/api/v1/models', {
      headers: { 'User-Agent': 'custom/9' },
    })
    headers = sentHeaders(fetchMock)
    expect(headers.get('user-agent')).toBe('custom/9')
    expect(headers.get('x-title')).toBe('OfficeVega')

    fetchMock.mockClear()
    await aiFetch('https://openrouter.ai/api/v1/models', {
      headers: { 'User-Agent': 'x-officevega/9', 'HTTP-Referer': 'https://other.example' },
    })
    headers = sentHeaders(fetchMock)
    expect(headers.get('user-agent')).toBe('node')
    expect(headers.get('http-referer')).toBe('https://other.example')

    // subdomains ride the same edge; every other host keeps the product UA
    fetchMock.mockClear()
    await aiFetch('https://staging.openrouter.ai/api/v1/models', {})
    expect(sentHeaders(fetchMock).get('user-agent')).toBe('node')

    fetchMock.mockClear()
    await aiFetch('https://api.openai.com/v1/models', {})
    expect(sentHeaders(fetchMock).get('user-agent')).toBe('OfficeVega/1.2.3')
  })

  it('sanitizes wire headers for stacks that cannot set User-Agent themselves', () => {
    // the session webRequest hook feeds Chromium's requestHeaders record
    // through openRouterSafeHeaders: a renderer fetch cannot carry
    // User-Agent (forbidden name), net.fetch re-derives the app UA — the
    // vega token must not reach the wire through either
    expect(
      openRouterSafeHeaders('https://openrouter.ai/api/alpha/decisions', {
        'User-Agent': 'OfficeVega/1.2.3 Chrome/130.0.0.0 Electron/43.0.0',
        Authorization: 'Bearer k',
      }),
    ).toEqual({
      'User-Agent': 'node',
      Authorization: 'Bearer k',
      'HTTP-Referer': 'https://officevega.com',
      'X-Title': 'OfficeVega',
    })

    // a foreign UA survives; attribution is filled in but never clobbered
    expect(
      openRouterSafeHeaders('https://api.openrouter.ai/v1/models', {
        'user-agent': 'my-client/2',
        'x-title': 'My App',
      }),
    ).toEqual({
      'user-agent': 'my-client/2',
      'x-title': 'My App',
      'HTTP-Referer': 'https://officevega.com',
    })

    // every other host keeps its headers byte-for-byte
    const headers = { 'User-Agent': 'OfficeVega/1.2.3', Authorization: 'Bearer k' }
    expect(openRouterSafeHeaders('https://api.vega.chat/api/v1/chat', headers)).toEqual(headers)
  })

  it('returns the primary response without touching the rescue path', async () => {
    const ok = new Response('ok')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok))
    const rescue = vi.fn()
    setRescueFetch(rescue)
    expect(await aiFetch('https://x/', {})).toBe(ok)
    expect(rescue).not.toHaveBeenCalled()
  })

  it('retries over the rescue fetch when the primary fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const ok = new Response('rescued')
    const rescue = vi.fn().mockResolvedValue(ok)
    setRescueFetch(rescue)
    expect(await aiFetch('https://x/', {})).toBe(ok)
    expect(rescue).toHaveBeenCalledOnce()
  })

  it('throws the primary error when no rescue fetch is set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    await expect(aiFetch('https://x/', {})).rejects.toThrow('ECONNRESET')
  })

  it('throws the primary error when the rescue fetch also fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('primary down')))
    setRescueFetch(vi.fn().mockRejectedValue(new Error('rescue down')))
    await expect(aiFetch('https://x/', {})).rejects.toThrow('primary down')
  })

  it('retries a 403 HTML block page over the rescue fetch', async () => {
    const blocked = () =>
      new Response('<!doctype html><title>Just a moment...</title>', {
        status: 403,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(blocked()))
    const ok = new Response('{}', { headers: { 'content-type': 'application/json' } })
    const rescue = vi.fn().mockResolvedValue(ok)
    setRescueFetch(rescue)
    expect(await aiFetch('https://www.genspark.ai/api/x', { method: 'POST', body: '{}' })).toBe(ok)
    expect(rescue).toHaveBeenCalledOnce()

    // still blocked on the rescue path: the primary answer stands
    const primary = blocked()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(primary))
    setRescueFetch(vi.fn().mockResolvedValue(blocked()))
    expect(await aiFetch('https://www.genspark.ai/api/x', { body: '{}' })).toBe(primary)
  })

  it('does not treat an API 403 or a stream body as a block page', async () => {
    const denied = new Response('{"error":"forbidden"}', {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(denied))
    const rescue = vi.fn()
    setRescueFetch(rescue)
    expect(await aiFetch('https://x/', { body: '{}' })).toBe(denied)
    expect(rescue).not.toHaveBeenCalled()

    const html = new Response('<html>', { status: 403, headers: { 'content-type': 'text/html' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(html))
    expect(await aiFetch('https://x/', { body: new ReadableStream() })).toBe(html)
    expect(rescue).not.toHaveBeenCalled()
  })

  it('does not retry an aborted request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('aborted')))
    const rescue = vi.fn()
    setRescueFetch(rescue)
    const controller = new AbortController()
    controller.abort()
    await expect(aiFetch('https://x/', { signal: controller.signal })).rejects.toThrow('aborted')
    expect(rescue).not.toHaveBeenCalled()
  })
})
