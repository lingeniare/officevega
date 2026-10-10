/**
 * Live model catalog for OpenRouter-style gateways (VEGA, OpenRouter):
 * GET {base}/models pages by `offset` until `total_count` is covered; every
 * entry carries architecture.input_modalities / output_modalities, which the
 * server filters via query params — the client-side check below still guards
 * gateways that ignore them.
 */
import { aiFetch } from './fetch'
import { listCustomModels } from './custom-models'
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
  /** drop models whose output_modalities include any of these ('image' keeps image generators out of text pickers — `output` alone only requires text to be present) */
  excludeOutput?: readonly string[]
  /** drop ids starting with any of these ('~' marks alias rows on the VEGA catalog) */
  excludePrefixes?: readonly string[]
  /** drop ids ending with any of these (':free' duplicates, '-latest' aliases, 'meta') */
  excludeSuffixes?: readonly string[]
}

const PAGE_LIMIT = 200
/** safety net against a gateway that never reports progress */
const MAX_PAGES = 20
const PAGE_TIMEOUT_MS = 15_000

/**
 * Catalog cache: the settings panes (Модель / Быстрая модель / Генерация
 * изображений) each trigger a fetch on open — without it every opening
 * re-pages the whole /models catalog (up to 20×200 rows), which is the
 * "очень долгий поиск" on repeat visits. Keyed by endpoint+filter (not the
 * key — the catalog doesn't depend on it), TTL 5 min, concurrent callers
 * share one inflight request.
 */
const CATALOG_TTL_MS = 5 * 60_000
const catalogCache = new Map<string, { at: number; models: ProviderModel[] }>()
const catalogInflight = new Map<string, Promise<ProviderModel[]>>()

function catalogKey(baseUrl: string, filter: ModelFilter): string {
  return `${baseUrl.replace(/\/+$/, '')}|${JSON.stringify(filter)}`
}

/** test seam: drop cached pages / inflight shares between isolated cases */
export function clearModelCatalogCache(): void {
  catalogCache.clear()
  catalogInflight.clear()
}

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
  const vendor = split?.[1]
  const rest = split?.[2]
  return vendor && rest && vendor.trim().toLowerCase() === id.split('/')[0]?.toLowerCase()
    ? rest.trim()
    : n
}

export async function listGatewayModels(
  baseUrl: string,
  apiKey: string | undefined,
  filter: ModelFilter = {},
): Promise<ProviderModel[]> {
  const key = catalogKey(baseUrl, filter)
  const cached = catalogCache.get(key)
  if (cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.models
  const inflight = catalogInflight.get(key)
  if (inflight) return inflight
  const run = pageGatewayModels(baseUrl, apiKey, filter)
    .then((models) => {
      catalogCache.set(key, { at: Date.now(), models })
      catalogInflight.delete(key)
      return models
    })
    .catch((error) => {
      catalogInflight.delete(key)
      throw error
    })
  catalogInflight.set(key, run)
  return run
}

async function fetchModelsPage(
  base: string,
  apiKey: string | undefined,
  filter: ModelFilter,
  offset: number,
): Promise<{ data: unknown[]; total: number } | null> {
  const url = new URL(`${base}/models`)
  url.searchParams.set('limit', String(PAGE_LIMIT))
  url.searchParams.set('offset', String(offset))
  if (filter.input) url.searchParams.set('input_modalities', filter.input)
  if (filter.output) url.searchParams.set('output_modalities', filter.output)
  const resp = await aiFetch(url.toString(), {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  })
  if (!resp.ok) return null
  const json = asRecord(await resp.json())
  const data = Array.isArray(json.data) ? json.data : []
  const total = typeof json.total_count === 'number' ? json.total_count : 0
  return { data, total }
}

/** remaining pages ride in parallel — the catalog is ~440 ids and paging it
 * strictly sequentially stacks 3+ round-trips on every cold settings open */
const PAGE_PARALLELISM = 4

async function pageGatewayModels(
  baseUrl: string,
  apiKey: string | undefined,
  filter: ModelFilter = {},
): Promise<ProviderModel[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const first = await fetchModelsPage(base, apiKey, filter, 0)
  if (!first) return []
  const pages: unknown[][] = [first.data]
  if (first.data.length > 0 && first.total > first.data.length) {
    const offsets: number[] = []
    for (let off = first.data.length; off < first.total; off += PAGE_LIMIT) {
      if (1 + offsets.length >= MAX_PAGES) break
      offsets.push(off)
    }
    for (let i = 0; i < offsets.length; i += PAGE_PARALLELISM) {
      const batch = await Promise.all(
        offsets
          .slice(i, i + PAGE_PARALLELISM)
          .map((off) => fetchModelsPage(base, apiKey, filter, off)),
      )
      let done = false
      for (const page of batch) {
        if (!page || page.data.length === 0) {
          done = true
          break
        }
        pages.push(page.data)
      }
      if (done) break
    }
  } else if (first.total <= 0) {
    // the gateway reports no total — keep the old sequential walk until an
    // empty page, still bounded by the safety net
    let offset = first.data.length
    for (let page = 1; page < MAX_PAGES; page++) {
      const next = await fetchModelsPage(base, apiKey, filter, offset)
      if (!next || next.data.length === 0) break
      pages.push(next.data)
      offset += next.data.length
    }
  }
  return collectModels(pages, filter)
}

function collectModels(pages: unknown[][], filter: ModelFilter): ProviderModel[] {
  const excludePrefixes = filter.excludePrefixes ?? []
  const excludeSuffixes = filter.excludeSuffixes ?? []
  const models: ProviderModel[] = []
  const seen = new Set<string>()
  for (const data of pages) {
    for (const raw of data) {
      const entry = asRecord(raw)
      const id = typeof entry.id === 'string' ? entry.id : ''
      if (!id || seen.has(id)) continue
      if (excludePrefixes.some((p) => id.startsWith(p))) continue
      if (excludeSuffixes.some((s) => id.endsWith(s))) continue
      if (filter.input && !modalities(raw, 'input_modalities').includes(filter.input)) continue
      if (filter.output && !modalities(raw, 'output_modalities').includes(filter.output)) continue
      if (filter.excludeOutput?.some((m) => modalities(raw, 'output_modalities').includes(m)))
        continue
      seen.add(id)
      models.push({ id, name: displayName(id, entry.name) })
    }
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
  // user-hosted OpenAI-compatible endpoints ('custom'): the same GET
  // {baseUrl}/models probe the settings pane uses — a plain ids list with no
  // modality metadata, so the chat filter is not applied
  if (meta?.needsBaseUrl) {
    const baseUrl = config?.baseUrl?.trim() ?? ''
    if (!baseUrl) return fallback
    const cat = await listCustomModels(baseUrl, config?.apiKey)
    return {
      models: cat.models.map((id) => ({ id, name: id })),
      defaultModel: '',
    }
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
