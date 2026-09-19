/**
 * ai:web-search / ai:image-search for the editors' main processes: reads
 * ai-settings.json live and turns the search provider choice into
 * SearchOptions — VEGA runs first on its key (gsk stays the logged-in
 * fallback), a user Serper / Tavily key runs alone, and Genspark keeps the
 * historic chain (gsk when signed in, then env keys, then DuckDuckGo).
 */

import {
  activeSearchProvider,
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
  const key = settings.search!.providers[provider].apiKey
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

/** settings-UI test: the backend must accept the given key without billing a search */
export async function testSearchProvider(
  provider: AiSearchProviderId,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'genspark') return { ok: true }
  if (!apiKey) return { ok: false, error: 'API key is empty' }
  if (provider === 'vega') {
    // /models is public; a bad key still gets 401 — a cheap credential check
    try {
      const resp = await fetch(`${VEGA_BASE_URL}/models?limit=1`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      })
      return resp.ok ? { ok: true } : { ok: false, error: `HTTP ${resp.status}` }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
  const options: SearchOptions =
    provider === 'tavily'
      ? { useGsk: false, tavilyKey: apiKey, serperKey: '', prefer: 'tavily' }
      : { useGsk: false, serperKey: apiKey, tavilyKey: '' }
  const r = await webSearch('VegaOffice', 1, options)
  if (r.method === provider) return { ok: true }
  return {
    ok: false,
    error:
      r.method === 'error'
        ? (r.error ?? 'search failed')
        : `${provider} did not answer (key rejected or quota exhausted); fell back to ${r.method}`,
  }
}
