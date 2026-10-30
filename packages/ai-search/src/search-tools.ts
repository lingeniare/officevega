/**
 * ai:web-search / ai:image-search for the editors' main processes: reads
 * ai-settings.json live and turns the search provider choice into
 * SearchOptions — VEGA runs first on its key (gsk stays the logged-in
 * fallback), a user Serper / Serply / Tavily / Parallel key runs alone, and the
 * account provider keeps the historic chain (gsk when signed in and cloud tools
 * are on, then env keys, then free Parallel MCP, then DuckDuckGo). Parallel uses
 * its free MCP when no key is saved.
 */

import {
  activeSearchProvider,
  vegaPiiHeaders,
  vegaSearchKey,
  VEGA_BASE_URL,
  type AiSearchProviderId,
  type AiSettings,
} from '@genoffice/ai-provider'
import { imageSearch, webSearch, type SearchOptions } from './index'
import { readAiSettingsFile } from './media-tools'

export function searchOptionsFromSettings(settings: AiSettings): SearchOptions {
  const provider = activeSearchProvider(settings)
  // VEGA first on its (possibly shared) key; a signed-in gsk stays the fallback
  if (provider === 'vega') {
    return { useGsk: true, vegaKey: vegaSearchKey(settings), prefer: 'vega' }
  }
  if (provider === 'genspark') return { useGsk: true }
  const key = settings.search!.providers?.[provider]?.apiKey?.trim() ?? ''
  if (provider === 'parallel') return { useGsk: false, parallelKey: key, prefer: 'parallel' }
  if (provider === 'serply') return { useGsk: false, serplyKey: key, prefer: 'serply' }
  if (provider === 'exa') return { useGsk: false, exaKey: key, prefer: 'exa' }
  if (provider === 'firecrawl') return { useGsk: false, firecrawlKey: key, prefer: 'firecrawl' }
  return provider === 'tavily'
    ? { useGsk: false, tavilyKey: key, prefer: 'tavily' }
    : { useGsk: false, serperKey: key }
}

export function webSearchTool(settingsPath: string, query: string, maxResults = 6) {
  return webSearch(query, maxResults, searchOptionsFromSettings(readAiSettingsFile(settingsPath)))
}

export function imageSearchTool(settingsPath: string, query: string, maxResults = 8) {
  return imageSearch(query, maxResults, searchOptionsFromSettings(readAiSettingsFile(settingsPath)))
}

/** settings-UI test: the selected backend (keyed or free) must answer one minimal query. */
export async function testSearchProvider(
  provider: AiSearchProviderId,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'genspark') return { ok: true }
  apiKey = apiKey.trim()
  if (!apiKey && provider !== 'parallel') return { ok: false, error: 'API key is empty' }
  if (provider === 'vega') {
    // /models is public; a bad key still gets 401 — a cheap credential check
    try {
      const resp = await fetch(`${VEGA_BASE_URL}/models?limit=1`, {
        headers: { Authorization: `Bearer ${apiKey}`, ...vegaPiiHeaders(VEGA_BASE_URL) },
        signal: AbortSignal.timeout(10_000),
      })
      return resp.ok ? { ok: true } : { ok: false, error: `HTTP ${resp.status}` }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
  const options: SearchOptions = {
    useGsk: false,
    serperKey: provider === 'serper' ? apiKey : '',
    serplyKey: provider === 'serply' ? apiKey : '',
    tavilyKey: provider === 'tavily' ? apiKey : '',
    parallelKey: provider === 'parallel' ? apiKey : '',
    exaKey: provider === 'exa' ? apiKey : '',
    firecrawlKey: provider === 'firecrawl' ? apiKey : '',
    prefer: provider,
  }
  const r = await webSearch('OfficeVega', 1, options)
  if (r.method === provider) return { ok: true }
  return {
    ok: false,
    error:
      r.method === 'error'
        ? (r.error ?? 'search failed')
        : `${provider} did not answer (service unavailable, key rejected or quota exhausted); fell back to ${r.method}`,
  }
}
