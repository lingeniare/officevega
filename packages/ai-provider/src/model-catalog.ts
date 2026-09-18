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

export interface ProviderModel {
  id: string
  /** catalog display name minus the vendor prefix ('DeepSeek V4.1 Flash'); falls back to id */
  name: string
}

/** {models, defaultModel} — the same shape Codex app-server's model/list returns */
export interface ProviderModelCatalog {
  models: ProviderModel[]
  defaultModel: string
}

export interface ModelFilter {
  /** each model's input_modalities must include this ('text', 'image', 'video', …) */
  input?: string
  /** each model's output_modalities must include this ('text', 'image') */
  output?: string
  /** drop ids starting with any of these ('~' marks alias rows on the VEGA catalog) */
  excludePrefixes?: readonly string[]
  /** drop ids ending with any of these (':free' duplicates, '-latest' aliases, 'meta') */
  excludeSuffixes?: readonly string[]
  /** keep only entries created on/after this unix-seconds timestamp (missing `created` is kept) */
  createdAfter?: number
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

/** 'DeepSeek: DeepSeek V4.1 Flash' → 'DeepSeek V4.1 Flash' when the prefix repeats the id's vendor */
function displayName(id: string, name: unknown): string {
  const n = typeof name === 'string' ? name.trim() : ''
  if (!n) return id
  const split = /^([^:]+):\s*(.+)$/.exec(n)
  return split && split[1].trim().toLowerCase() === id.split('/')[0]?.toLowerCase()
    ? split[2].trim()
    : n
}

export async function listGatewayModels(
  baseUrl: string,
  apiKey: string | undefined,
  filter: ModelFilter = {},
): Promise<ProviderModel[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const excludePrefixes = filter.excludePrefixes ?? []
  const excludeSuffixes = filter.excludeSuffixes ?? []
  const models: ProviderModel[] = []
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
      const entry = asRecord(raw)
      const id = typeof entry.id === 'string' ? entry.id : ''
      if (!id || seen.has(id)) continue
      if (excludePrefixes.some((p) => id.startsWith(p))) continue
      if (excludeSuffixes.some((s) => id.endsWith(s))) continue
      if (
        filter.createdAfter !== undefined &&
        typeof entry.created === 'number' &&
        entry.created < filter.createdAfter
      )
        continue
      if (filter.input && !modalities(raw, 'input_modalities').includes(filter.input)) continue
      if (filter.output && !modalities(raw, 'output_modalities').includes(filter.output)) continue
      seen.add(id)
      models.push({ id, name: displayName(id, entry.name) })
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
  const fallback = {
    models: (meta?.models ?? []).map((id) => ({ id, name: id })),
    defaultModel: meta?.defaultModel ?? '',
  }
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
