import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { installFetchProxy, noProxyListWithLoopback } from '../src/proxy-dispatcher'

describe('noProxyListWithLoopback', () => {
  const env = (over: Record<string, string | undefined>): NodeJS.ProcessEnv =>
    over as NodeJS.ProcessEnv

  it('adds loopback entries to an empty NO_PROXY', () => {
    const list = noProxyListWithLoopback(env({})).split(',')
    for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) {
      expect(list).toContain(host)
    }
  })

  it("keeps the user's NO_PROXY entries and appends loopback", () => {
    const list = noProxyListWithLoopback(env({ NO_PROXY: 'corp.internal, .lan' })).split(',')
    expect(list).toEqual(expect.arrayContaining(['corp.internal', '.lan', '127.0.0.1']))
  })

  it('accepts the lower-case variable too and leaves a bare * alone', () => {
    expect(noProxyListWithLoopback(env({ no_proxy: 'a.b' }))).toContain('a.b')
    expect(noProxyListWithLoopback(env({ NO_PROXY: '*' }))).toBe('*')
  })
})

describe('installFetchProxy', () => {
  let server: Server | undefined
  const dispatcher = () => import('undici').then((u) => u.getGlobalDispatcher())

  afterEach(async () => {
    server?.close()
    server = undefined
    const { Agent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new Agent())
  })

  it('reaches a loopback server directly while a dead proxy is installed', async () => {
    // Claim a port and close it again so the "proxy" address refuses connections
    const probe = createServer()
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const deadPort = (probe.address() as AddressInfo).port
    await new Promise<void>((resolve, reject) =>
      probe.close((err) => (err ? reject(err) : resolve())),
    )

    server = createServer((_req, res) => res.end('ok'))
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port

    await installFetchProxy(`http://127.0.0.1:${deadPort}`)
    // A local endpoint must not be pushed through the proxy (#2084)
    expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toBe('ok')
    // While a remote host still goes through the proxy and fails fast
    await expect(fetch('http://genoffice.invalid/')).rejects.toThrow()
    expect((await dispatcher()).constructor.name).toBe('EnvHttpProxyAgent')
  })
})
