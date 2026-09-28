/**
 * Search utilities (main process) — gsk (Genspark CLI) first, then Serper Google API,
 * then Serply, Tavily and Parallel, whose free Search MCP answers keyless before the DuckDuckGo last resort. Runs in the main process
 * (Node fetch / child process) to avoid renderer CORS; the Serper key reuses SERPER_API_KEY,
 * the Serply key reuses SERPLY_API_KEY, the Tavily key reuses TAVILY_API_KEY and Parallel uses PARALLEL_API_KEY.
 * For gsk auth see ./gsk.ts (`gsk login` or GSK_API_KEY).
 */

import {
  VEGA_BASE_URL,
  setIssuedVegaKeyGetter,
  setLegacyGskKeyGetter,
} from '@genoffice/ai-provider'
import {
  asRecord,
  isCopyrightHost,
  safeHost,
  type ImageSearchResult,
  type WebSearchResult,
} from './shared'
import { gskImageSearch, gskWebSearch, gskApiKey, hasGskAuth } from './gsk'
import { parallelMcpSearch } from './parallel-mcp'
import { officeVegaApiKey } from './officevega-auth'

// The sign-in credentials feed provider/media/search resolution in
// @genoffice/ai-provider (it can't import this package — the registry is its
// side of the boundary). Importing ai-search in a main process is enough.
setIssuedVegaKeyGetter(officeVegaApiKey)
setLegacyGskKeyGetter(gskApiKey)

export type { ImageSearchResult, WebSearchResult } from './shared'
export * from './gsk'
export * from './officevega-auth'
export * from './media-tools'
export * from './search-tools'

const SERPER_KEY = () => process.env.SERPER_API_KEY ?? ''
const SERPLY_KEY = () => process.env.SERPLY_API_KEY ?? ''
const TAVILY_KEY = () => process.env.TAVILY_API_KEY ?? ''
const PARALLEL_KEY = () => process.env.PARALLEL_API_KEY ?? ''

/**
 * Backend selection for one search. Keys default to the SERPER_API_KEY /
 * SERPLY_API_KEY / TAVILY_API_KEY / PARALLEL_API_KEY env vars; settings-driven callers (search-tools.ts) pass the
 * user's key and turn gsk off so the chosen backend runs first.
 */
export interface SearchOptions {
  /** false = skip the Genspark backend (a BYOK search provider that opts out is active) */
  useGsk?: boolean
  /** VEGA key — web search rides api.vega.chat chat/completions + the `web` plugin */
  vegaKey?: string
  serperKey?: string
  serplyKey?: string
  tavilyKey?: string
  parallelKey?: string
  /** which backend to try first (default serper); selecting parallel also enables its free MCP */
  prefer?: 'vega' | 'serper' | 'serply' | 'tavily' | 'parallel'
}

function normalizeOptions(opts: boolean | SearchOptions | undefined): Required<SearchOptions> {
  const o = typeof opts === 'boolean' ? { useGsk: opts } : (opts ?? {})
  return {
    useGsk: o.useGsk ?? true,
    vegaKey: o.vegaKey ?? '',
    serperKey: o.serperKey ?? SERPER_KEY(),
    serplyKey: o.serplyKey ?? SERPLY_KEY(),
    tavilyKey: o.tavilyKey ?? TAVILY_KEY(),
    parallelKey: o.parallelKey ?? PARALLEL_KEY(),
    prefer: o.prefer ?? 'serper',
  }
}

type WebSearchResponse = {
  results: WebSearchResult[]
  answer?: string
  method: string
  error?: string
}

/** Serper Google web search; null when the key is empty, the call fails, or nothing comes back */
async function serperWebSearch(
  key: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse | null> {
  if (!key) return null
  try {
    return await fetchWithTimeout(
      'https://google.serper.dev/search',
      {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: maxResults, gl: 'us', hl: 'en' }),
      },
      async (resp) => {
        if (!resp.ok) return null
        const data = asRecord(await resp.json())
        const organic: unknown[] = Array.isArray(data.organic) ? data.organic : []
        const results: WebSearchResult[] = organic.slice(0, maxResults).map((item) => {
          const o = asRecord(item)
          return {
            title: String(o.title ?? ''),
            url: String(o.link ?? ''),
            snippet: String(o.snippet ?? ''),
          }
        })
        const answerBox = asRecord(data.answerBox)
        const answerRaw =
          answerBox.answer || answerBox.snippet || asRecord(data.knowledgeGraph).description
        const answer = typeof answerRaw === 'string' && answerRaw ? answerRaw : undefined
        if (!results.length) return null
        return answer !== undefined
          ? { results, answer, method: 'serper' }
          : { results, method: 'serper' }
      },
    )
  } catch {
    return null
  }
}

/** Serply's Google results API authenticates with X-Api-Key on a GET query string. */
const SERPLY_HEADERS = (key: string) => ({ 'X-Api-Key': key, 'User-Agent': 'officevega' })

/** Serply Google web search; null when the key is empty, the call fails, or nothing comes back */
async function serplyWebSearch(
  key: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse | null> {
  if (!key) return null
  try {
    const params = new URLSearchParams({ q: query, num: String(maxResults) })
    return await fetchWithTimeout(
      `https://api.serply.io/v1/search?${params}`,
      { headers: SERPLY_HEADERS(key) },
      async (resp) => {
        if (!resp.ok) return null
        const data = asRecord(await resp.json())
        const raw: unknown[] = Array.isArray(data.results) ? data.results : []
        const results: WebSearchResult[] = []
        for (const item of raw) {
          const o = asRecord(item)
          if (typeof o.link !== 'string' || !/^https?:\/\//i.test(o.link)) continue
          results.push({
            title: String(o.title ?? ''),
            url: o.link,
            snippet: String(o.description ?? ''),
          })
          if (results.length >= maxResults) break
        }
        return results.length ? { results, method: 'serply' } : null
      },
    )
  } catch {
    return null
  }
}

async function tavilyWebSearch(
  key: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse | null> {
  if (!key) return null
  try {
    return await fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query,
          max_results: maxResults,
          include_answer: true,
        }),
      },
      async (resp) => {
        if (!resp.ok) return null
        const data = asRecord(await resp.json())
        const raw: unknown[] = Array.isArray(data.results) ? data.results : []
        const results: WebSearchResult[] = raw.slice(0, maxResults).map((item) => {
          const o = asRecord(item)
          return {
            title: String(o.title ?? ''),
            url: String(o.url ?? ''),
            snippet: String(o.content ?? ''),
          }
        })
        const answerRaw = data.answer
        const answer = typeof answerRaw === 'string' && answerRaw ? answerRaw : undefined
        if (!results.length) return null
        return answer !== undefined
          ? { results, answer, method: 'tavily' }
          : { results, method: 'tavily' }
      },
    )
  } catch {
    return null
  }
}

/**
 * VEGA web search — the OpenRouter `web` plugin answers a chat completion
 * with url_citation annotations. A cheap synthesis model suffices: the
 * plugin (not the model) does the retrieval. Retrieval runs on the Parallel
 * engine; a failed/empty answer is retried on Exa before the caller's own
 * fallback chain takes over.
 */
const VEGA_SEARCH_MODEL = 'openai/gpt-6-luna'
const VEGA_SEARCH_ENGINES = ['parallel', 'exa'] as const

async function vegaWebSearchOnce(
  key: string,
  query: string,
  maxResults: number,
  engine: (typeof VEGA_SEARCH_ENGINES)[number],
): Promise<WebSearchResponse | null> {
  try {
    const data = await fetchWithTimeout(
      `${VEGA_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: VEGA_SEARCH_MODEL,
          plugins: [{ id: 'web', engine, max_results: maxResults }],
          messages: [{ role: 'user', content: query }],
        }),
      },
      async (resp) => (resp.ok ? asRecord(await resp.json()) : null),
    )
    if (!data) return null
    const choice = asRecord((data.choices as unknown[] | undefined)?.[0])
    const message = asRecord(choice.message)
    const results: WebSearchResult[] = []
    for (const raw of Array.isArray(message.annotations) ? message.annotations : []) {
      const ann = asRecord(raw)
      if (ann.type !== 'url_citation') continue
      const cite = asRecord(ann.url_citation)
      const url = String(cite.url ?? '')
      if (!url) continue
      results.push({
        title: String(cite.title ?? url),
        url,
        snippet: String(cite.content ?? '').slice(0, 500),
      })
      if (results.length >= maxResults) break
    }
    const content = message.content
    const answer =
      typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((c) => asRecord(c).text)
              .filter((t): t is string => typeof t === 'string')
              .join('')
              .trim()
          : ''
    if (!results.length && !answer) return null
    return answer ? { results, answer, method: 'vega' } : { results, method: 'vega' }
  } catch {
    return null
  }
}

/**
 * Parallel's API and free Search MCP return source excerpts, not a synthesized
 * answer. Without a key the anonymous MCP runs, so an unconfigured install
 * still gets real results before the DuckDuckGo scrape.
 */
async function parallelWebSearch(
  key: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse | null> {
  key = key.trim()
  try {
    let data: Record<string, unknown>
    if (key) {
      const responseData = await fetchWithTimeout(
        'https://api.parallel.ai/v1/search',
        {
          method: 'POST',
          headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ search_queries: [query], mode: 'fast' }),
        },
        async (resp) => (resp.ok ? asRecord(await resp.json()) : null),
      )
      if (!responseData) return null
      data = responseData
    } else {
      data = asRecord(await parallelMcpSearch(query))
    }
    const raw: unknown[] = Array.isArray(data.results) ? data.results : []
    const results: WebSearchResult[] = []
    for (const item of raw) {
      // v1 search has no result-count parameter, so OfficeVega's limit is applied
      // here. Cut the loop off once the list is full instead of slicing the source
      // first: the URL check below drops entries, and slicing first would both
      // concatenate excerpts for results that are then thrown away and under-fill
      // the list whenever the leading items are unusable.
      if (results.length >= maxResults) break
      const result = asRecord(item)
      if (typeof result.url !== 'string' || !/^https?:\/\//i.test(result.url)) continue
      const excerpts: unknown[] = Array.isArray(result.excerpts) ? result.excerpts : []
      results.push({
        title: typeof result.title === 'string' && result.title ? result.title : result.url,
        url: result.url,
        snippet: excerpts
          .filter((excerpt): excerpt is string => typeof excerpt === 'string')
          .join('\n'),
      })
    }
    // v1 search has no result-count parameter; apply the limit locally.
    const limited = results.slice(0, maxResults)
    return limited.length ? { results: limited, method: 'parallel' } : null
  } catch {
    return null
  }
}

async function vegaWebSearch(
  key: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse | null> {
  if (!key) return null
  for (const engine of VEGA_SEARCH_ENGINES) {
    const r = await vegaWebSearchOnce(key, query, maxResults, engine)
    if (r) return r
  }
  return null
}

// ── Web search ──────────────────────────────────────────────────────

/**
 * Model-driven search args arrive unvalidated: clamp the result count to a
 * finite 1..20 and truncate the query so a wild maxResults cannot inflate
 * backend cost/loops and a megabyte query cannot flood request bodies.
 */
function normalizeSearchArgs(
  query: string,
  maxResults: number,
  fallback: number,
): { query: string; max: number } {
  const max = Number.isFinite(maxResults)
    ? Math.min(Math.max(1, Math.floor(maxResults)), 20)
    : fallback
  return { query: typeof query === 'string' ? query.slice(0, 500) : '', max }
}

export async function webSearch(
  query: string,
  maxResults = 6,
  options: boolean | SearchOptions = true,
): Promise<WebSearchResponse> {
  const o = normalizeOptions(options)
  const { query: q, max } = normalizeSearchArgs(query, maxResults, 6)
  // an explicit provider pick runs first: VEGA before the gsk fallback so the
  // chosen key — not the ambient sign-in — answers when configured
  if (o.prefer === 'vega' && o.vegaKey) {
    const r = await vegaWebSearch(o.vegaKey, q, max)
    if (r) return r
  }
  // useGsk=false: the user turned cloud tools off or picked their own
  // search key — skip straight to the keyed/free backends
  if (o.useGsk && hasGskAuth()) {
    try {
      const r = await gskWebSearch(q, max)
      if (r.results.length) return { ...r, method: 'gsk' }
    } catch {
      /* fall back to Serper/Serply/Tavily/Parallel/DuckDuckGo */
    }
  }
  const keyed: Record<string, () => Promise<WebSearchResponse | null>> = {
    serper: () => serperWebSearch(o.serperKey, q, max),
    serply: () => serplyWebSearch(o.serplyKey, q, max),
    tavily: () => tavilyWebSearch(o.tavilyKey, q, max),
    parallel: () => parallelWebSearch(o.parallelKey, q, max),
  }
  // VEGA already ran (or had no key) when preferred — try it here only when a
  // key exists but another backend was preferred; it stays the last keyed
  // attempt before DuckDuckGo
  if (o.prefer !== 'vega' && o.vegaKey) {
    keyed.vega = () => vegaWebSearch(o.vegaKey, q, max)
  }
  const order = [
    o.prefer,
    ...(['serper', 'serply', 'tavily', 'parallel', 'vega'] as const).filter(
      (id) => id !== o.prefer,
    ),
  ]
  for (const id of order) {
    const attempt = keyed[id]
    if (!attempt) continue
    const r = await attempt()
    if (r) return r
  }
  try {
    return { results: await duckWebSearch(q, max), method: 'duckduckgo' }
  } catch (err) {
    // an unreachable backend must not read as an empty result set
    return { results: [], method: 'error', error: `duckduckgo: ${String(err)}` }
  }
}

// ── Image search ────────────────────────────────────────────────────

export async function imageSearch(
  query: string,
  maxResults = 8,
  options: boolean | SearchOptions = true,
): Promise<{
  images: ImageSearchResult[]
  method: string
  error?: string
}> {
  const o = normalizeOptions(options)
  const { query: q, max } = normalizeSearchArgs(query, maxResults, 8)
  if (o.useGsk && hasGskAuth()) {
    try {
      const images = await gskImageSearch(q, max)
      if (images.length) return { images, method: 'gsk' }
    } catch {
      /* fall back to Serper/Serply/DuckDuckGo */
    }
  }
  // Tavily and Parallel have no image endpoint; Serper and Serply are the keyed image backends
  const keyed = [
    () => serperImageSearch(o.serperKey, q, max),
    () => serplyImageSearch(o.serplyKey, q, max),
  ]
  if (o.prefer === 'serply') keyed.reverse()
  for (const run of keyed) {
    const r = await run()
    if (r) return r
  }
  try {
    return { images: await duckImageSearch(q, max), method: 'duckduckgo' }
  } catch (err) {
    // an unreachable backend must not read as an empty gallery
    return { images: [], method: 'error', error: `duckduckgo: ${String(err)}` }
  }
}

async function serperImageSearch(
  key: string,
  q: string,
  max: number,
): Promise<{ images: ImageSearchResult[]; method: string } | null> {
  if (!key) return null
  try {
    const data = await fetchWithTimeout(
      'https://google.serper.dev/images',
      {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: Math.min(max, 10), gl: 'us', hl: 'en' }),
      },
      async (resp) => (resp.ok ? asRecord(await resp.json()) : null),
    )
    if (!data) return null
    const raw: unknown[] = Array.isArray(data.images) ? data.images : []
    const images: ImageSearchResult[] = []
    for (const item of raw) {
      const img = asRecord(item)
      const imageUrl = String(img.imageUrl ?? img.original ?? '')
      if (!imageUrl) continue
      if (isCopyrightHost(imageUrl)) continue
      const entry: ImageSearchResult = {
        title: String(img.title ?? ''),
        imageUrl,
        sourceUrl: String(img.link ?? ''),
        source: String(img.source ?? safeHost(img.link)),
      }
      if (typeof img.imageWidth === 'number') entry.width = img.imageWidth
      if (typeof img.imageHeight === 'number') entry.height = img.imageHeight
      images.push(entry)
      if (images.length >= max) break
    }
    return images.length ? { images, method: 'serper' } : null
  } catch {
    return null
  }
}

/** Serply returns a fixed page of 20 images, so the limit is applied locally. */
async function serplyImageSearch(
  key: string,
  q: string,
  max: number,
): Promise<{ images: ImageSearchResult[]; method: string } | null> {
  if (!key) return null
  try {
    const data = await fetchWithTimeout(
      `https://api.serply.io/v1/image?${new URLSearchParams({ q })}`,
      { headers: SERPLY_HEADERS(key) },
      async (resp) => (resp.ok ? asRecord(await resp.json()) : null),
    )
    if (!data) return null
    const raw: unknown[] = Array.isArray(data.image_results) ? data.image_results : []
    const images: ImageSearchResult[] = []
    for (const item of raw) {
      const result = asRecord(item)
      const original = asRecord(result.original_image)
      const thumb = asRecord(result.image)
      const link = asRecord(result.link)
      const imageUrl = String(original.src ?? thumb.src ?? '')
      if (!/^https?:\/\//i.test(imageUrl) || isCopyrightHost(imageUrl)) continue
      const entry: ImageSearchResult = {
        title: String(link.title ?? thumb.alt ?? ''),
        imageUrl,
        sourceUrl: String(link.href ?? ''),
        source: String(link.domain ?? safeHost(link.href)),
      }
      // dimensions arrive as strings ("330")
      const width = Number(original.width)
      const height = Number(original.height)
      if (Number.isFinite(width) && width > 0) entry.width = width
      if (Number.isFinite(height) && height > 0) entry.height = height
      images.push(entry)
      if (images.length >= max) break
    }
    return images.length ? { images, method: 'serply' } : null
  } catch {
    return null
  }
}

// ── DuckDuckGo fallback (no key / quota exhausted) ──────────────────
// These throw on network/HTTP failure so the caller can distinguish
// "backend unreachable" from a genuinely empty result set.

// short timeout: an unreachable backend should fail fast so the next one gets its turn
const FALLBACK_TIMEOUT_MS = 5000

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function duckWebSearch(query: string, maxResults: number): Promise<WebSearchResult[]> {
  // DuckDuckGo HTML endpoint (lightweight, no key needed)
  const html = await fetchWithTimeout(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: BROWSER_HEADERS, timeoutMs: FALLBACK_TIMEOUT_MS },
    async (resp) => {
      if (!resp.ok) throw new Error(`http ${resp.status}`)
      return await resp.text()
    },
  )
  const results: WebSearchResult[] = []
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && results.length < maxResults) {
    const url = decodeDuckUrl(m[1]!)
    const title = stripTags(m[2]!)
    if (url && title) results.push({ title, url, snippet: '' })
  }
  return results
}

async function duckImageSearch(query: string, maxResults: number): Promise<ImageSearchResult[]> {
  // DuckDuckGo i.js needs a vqd token, so it takes two steps
  const tokenHtml = await fetchWithTimeout(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    { headers: BROWSER_HEADERS, timeoutMs: FALLBACK_TIMEOUT_MS },
    async (resp) => {
      if (!resp.ok) throw new Error(`http ${resp.status}`)
      return await resp.text()
    },
  )
  const vqd = /vqd=["']?([\d-]+)["']?/.exec(tokenHtml)?.[1]
  if (!vqd) throw new Error('no vqd token')
  const data = await fetchWithTimeout(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
    {
      headers: { ...BROWSER_HEADERS, Referer: 'https://duckduckgo.com/' },
      timeoutMs: FALLBACK_TIMEOUT_MS,
    },
    async (resp) => {
      if (!resp.ok) throw new Error(`http ${resp.status}`)
      return asRecord(await resp.json())
    },
  )
  const list: unknown[] = Array.isArray(data.results) ? data.results : []
  const out: ImageSearchResult[] = []
  for (const item of list.slice(0, maxResults)) {
    const img = asRecord(item)
    const imageUrl = String(img.image ?? '')
    if (!imageUrl || isCopyrightHost(imageUrl)) continue
    const entry: ImageSearchResult = {
      title: String(img.title ?? ''),
      imageUrl,
      sourceUrl: String(img.url ?? ''),
      source: safeHost(img.url),
    }
    if (typeof img.width === 'number') entry.width = img.width
    if (typeof img.height === 'number') entry.height = img.height
    out.push(entry)
  }
  return out
}

// ── utils ───────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number },
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return await consume(response)
  } finally {
    clearTimeout(timer)
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

function decodeDuckUrl(href: string): string {
  // DuckDuckGo result links are often /l/?uddg=<encoded>
  const m = /[?&]uddg=([^&]+)/.exec(href)
  if (m) return decodeURIComponent(m[1]!)
  return href.startsWith('http') ? href : ''
}
