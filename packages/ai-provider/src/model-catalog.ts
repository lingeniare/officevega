/**
 * Live model catalog for OpenRouter-style gateways (VEGA, OpenRouter):
 * GET {base}/models pages by `offset` until `total_count` is covered; every
 * entry carries architecture.input_modalities / output_modalities, which the
 * server filters via query params — the client-side check below still guards
 * gateways that ignore them.
 */
import { aiFetch } from './fetch'
import { AI_PROVIDERS } from './providers'
import { getProviderAdapter } from './registry'
import type { AiProviderConfig, AiProviderId } from './types'

/** {models, defaultModel} — the same shape Codex app-server's model/list returns */
export interface ProviderModelCatalog {
  models: string[]
  defaultModel: string
}

export interface ModelFilter {
  /** each model's input_modalities must include this ('text', 'image', 'video', …) */
  input?: string
  /** each model's output_modalities must include this ('text', 'image') */
  output?: string
}

const PAGE_LIMIT = 200
/** safety net against a gateway that never reports progress */
const MAX_PAGES = 20
const PAGE_TIMEOUT_MS = 15_000

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function modalities(entry: unknown, field: 'input_modalities' | 'output_modalities'): string[] {
  const list = asRecord(asRecord(entry).architecture)[field]
  return Array.isArray(list) ? list.filter((m): m is string => typeof m === 'string') : []
}

export async function listGatewayModels(
  baseUrl: string,
  apiKey: string | undefined,
  filter: ModelFilter = {},
): Promise<string[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const models: string[] = []
  const seen = new Set<string>()
  let offset = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${base}/models`)
    url.searchParams.set('limit', String(PAGE_LIMIT))
    url.searchParams.set('offset', String(offset))
    if (filter.input) url.searchParams.set('input_modalities', filter.input)
    if (filter.output) url.searchParams.set('output_modalities', filter.output)
    const resp = await aiFetch(url.toString(), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    })
    if (!resp.ok) break
    const json = asRecord(await resp.json())
    const data = Array.isArray(json.data) ? json.data : []
    const total = typeof json.total_count === 'number' ? json.total_count : 0
    for (const raw of data) {
      const id = typeof asRecord(raw).id === 'string' ? (asRecord(raw).id as string) : ''
      if (!id || seen.has(id)) continue
      if (filter.input && !modalities(raw, 'input_modalities').includes(filter.input)) continue
      if (filter.output && !modalities(raw, 'output_modalities').includes(filter.output)) continue
      seen.add(id)
      models.push(id)
    }
    offset += data.length
    if (data.length === 0 || (total > 0 && offset >= total)) break
  }
  return models
}

/**
 * The live catalog for providers flagged `liveCatalog` (VEGA, OpenRouter).
 * Anything else — or a fetch failure — answers with the static meta list so
 * the settings UI always has something to show.
 */
export async function listProviderModels(
  provider: AiProviderId,
  config: AiProviderConfig | undefined,
  filter: ModelFilter = {},
): Promise<ProviderModelCatalog> {
  const meta = AI_PROVIDERS.find((m) => m.id === provider)
  const fallback = { models: meta?.models ?? [], defaultModel: meta?.defaultModel ?? '' }
  if (!meta?.liveCatalog) return fallback
  try {
    const endpoint = getProviderAdapter(provider).resolveEndpoint(
      config ?? { apiKey: '', model: '' },
    )
    const models = await listGatewayModels(endpoint.baseUrl, config?.apiKey, filter)
    return models.length ? { models, defaultModel: meta.defaultModel } : fallback
  } catch {
    return fallback
  }
}
