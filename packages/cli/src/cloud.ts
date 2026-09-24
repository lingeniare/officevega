import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { setGskProxyUrl } from '@genoffice/ai-search'
import { legacyUserDataDir, officeVegaUserDataDir } from './gui'
import { packagedResourcesDir } from './resources'

/**
 * The cloud commands (search / image / media) reuse the editors' provider
 * routing: Genspark when signed in (~/.officevega/auth.json) and cloud tools
 * are on, otherwise the BYOK provider chosen in the app's AI settings. That
 * settings file lives in the shell's Electron userData directory, which officevega
 * has to locate without Electron.
 */
export function aiSettingsPath(env: NodeJS.ProcessEnv): string {
  const override = env.OFFICEVEGA_AI_SETTINGS || env.VEGAOFFICE_AI_SETTINGS
  if (override) return override
  const primary = join(officeVegaUserDataDir(env), 'ai-settings.json')
  if (existsSync(primary)) return primary
  // a pre-rename install's settings still feed the cloud commands until the
  // app runs once and migrates its userData
  const legacy = join(legacyUserDataDir(env), 'ai-settings.json')
  return existsSync(legacy) ? legacy : primary
}

/** First http(s) proxy in the usual environment variables, as the app's main process reads them. */
export function proxyUrlFromEnv(env: NodeJS.ProcessEnv): string | null {
  return (
    [
      env.HTTPS_PROXY,
      env.https_proxy,
      env.HTTP_PROXY,
      env.http_proxy,
      env.ALL_PROXY,
      env.all_proxy,
    ].find((v) => v && /^https?:\/\//.test(v)) ?? null
  )
}

let prepared = false

/** Once per process: proxy for fetch and the gsk children, and the packaged gsk CLI location. */
export async function prepareCloud(env: NodeJS.ProcessEnv): Promise<void> {
  if (prepared) return
  prepared = true
  const proxy = proxyUrlFromEnv(env)
  if (proxy) {
    setGskProxyUrl(proxy)
    const { ProxyAgent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new ProxyAgent(proxy))
  }
  const packaged = packagedResourcesDir()
  if (packaged && !env.GSK_CLI_PATH) {
    const entry = join(packaged, 'gsk', 'node_modules', '@genspark', 'cli', 'dist', 'index.js')
    if (existsSync(entry)) process.env.GSK_CLI_PATH = entry
  }
}
