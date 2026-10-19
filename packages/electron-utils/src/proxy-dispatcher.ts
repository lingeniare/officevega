/**
 * Main-process fetch proxying. A plain undici `ProxyAgent` routes *every* request through the
 * proxy and ignores `NO_PROXY`, so a custom endpoint on 127.0.0.1 (local LLM server, dev stack)
 * dies at the proxy with a 400 instead of connecting directly. `EnvHttpProxyAgent` honors
 * `NO_PROXY`; on top of the user's list we always bypass loopback, because a proxy can never
 * reach this machine anyway.
 */

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1']

/** The process's NO_PROXY plus an unconditional loopback bypass, comma-separated */
export function noProxyListWithLoopback(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.NO_PROXY ?? env.no_proxy ?? ''
  if (raw.trim() === '*') return '*'
  const entries = new Set(
    raw
      .split(/[,\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
  for (const host of LOOPBACK_HOSTS) entries.add(host)
  return [...entries].join(',')
}

/**
 * Route the global fetch dispatcher through `proxyUrl` while honoring NO_PROXY; loopback
 * stays direct. The same URL feeds both scheme slots — the previous ProxyAgent behaved as one
 * proxy for everything.
 */
export async function installFetchProxy(proxyUrl: string): Promise<void> {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(
    new EnvHttpProxyAgent({
      httpProxy: proxyUrl,
      httpsProxy: proxyUrl,
      noProxy: noProxyListWithLoopback(),
    }),
  )
}
