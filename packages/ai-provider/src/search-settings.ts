import { cloudToolsEnabled } from './media'
import type {
  AiSearchProviderId,
  AiSearchProviderMeta,
  AiSearchSettings,
  AiSettings,
} from './types'

export const AI_SEARCH_PROVIDERS: AiSearchProviderMeta[] = [
  {
    id: 'vega',
    label: 'VEGA',
    keyPlaceholder: 'sk-apivega-...',
    // web search rides chat/completions + the `web` plugin; there is no image endpoint
    imageSearch: false,
  },
  {
    id: 'genspark',
    label: 'Genspark',
    keyPlaceholder: 'Not required - sign in to Genspark',
    imageSearch: true,
  },
  { id: 'serper', label: 'Serper', keyPlaceholder: 'Serper API key', imageSearch: true },
  { id: 'tavily', label: 'Tavily', keyPlaceholder: 'tvly-...', imageSearch: false },
]

export function defaultAiSearchSettings(): AiSearchSettings {
  return {
    provider: 'vega',
    providers: { vega: { apiKey: '' }, serper: { apiKey: '' }, tavily: { apiKey: '' } },
  }
}

export function resolveAiSearchSettings(
  stored: Partial<AiSearchSettings> | undefined,
): AiSearchSettings {
  const defaults = defaultAiSearchSettings()
  if (!stored) return defaults
  const providers = { ...defaults.providers }
  for (const id of ['vega', 'serper', 'tavily'] as const) {
    const key = stored.providers?.[id]?.apiKey
    if (typeof key === 'string') providers[id] = { apiKey: key.trim() }
  }
  return { provider: stored.provider ?? defaults.provider, providers }
}

/** the VEGA key a search slot may use: its own, else the AI Model provider's */
export function vegaSearchKey(settings: Partial<Pick<AiSettings, 'search' | 'providers'>>): string {
  return (
    settings.search?.providers?.vega?.apiKey?.trim() ||
    settings.providers?.vega?.apiKey?.trim() ||
    ''
  )
}

/**
 * The stored search provider, honored only with a key (VEGA may share the AI
 * Model key) and — for VEGA — while the "VEGA cloud tools" switch is on;
 * anything else falls back to genspark (gsk + free chain).
 */
export function activeSearchProvider(
  settings: Partial<
    Pick<AiSettings, 'search' | 'providers' | 'vegaToolsEnabled' | 'gskToolsEnabled'>
  >,
): AiSearchProviderId {
  const search = settings.search
  if (!search || search.provider === 'genspark') return 'genspark'
  if (!AI_SEARCH_PROVIDERS.some((m) => m.id === search.provider)) return 'genspark'
  if (search.provider === 'vega') {
    if (!cloudToolsEnabled(settings)) return 'genspark'
    return vegaSearchKey(settings) ? 'vega' : 'genspark'
  }
  // Trim-aware: a whitespace-only key from in-memory settings falls back
  // instead of sending `Bearer    ` to the search backend.
  return search.providers?.[search.provider]?.apiKey?.trim() ? search.provider : 'genspark'
}
