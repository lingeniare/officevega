import { isVegaGatewayUrl } from './fetch'
import { resolveCustomEndpoints } from './custom-endpoints'
import { defaultAiMediaSettings, resolveAiMediaSettings } from './media'
import { defaultAiSearchSettings, resolveAiSearchSettings } from './search-settings'
import { isFreeProvider, isLicensed } from './license-gate'
import { issuedVegaKey } from './vega-key'
import type {
  AiProviderConfig,
  AiProviderId,
  AiProviderMeta,
  AiSettings,
  LegacyAiSettings,
} from './types'

/**
 * Genspark server-side LLM proxy endpoints. All three protocols share the
 * api_key from the gsk login; model ids follow the proxy's own naming scheme,
 * which differs from the official vendor ids.
 */
export const GENSPARK_LLM_BASE_URLS = {
  anthropic: 'https://www.genspark.ai/api/anthropic',
  openai: 'https://www.genspark.ai/api/llm_proxy/v1',
} as const

/**
 * Splits OfficeVega usage out of the proxy's default "Claw" billing bucket
 * (the backend attributes gsk-key traffic by X-Agent-Type). Only sent to the
 * Genspark proxy — never to direct vendor APIs. The value is registered
 * server-side as "genoffice" — a billing wire name, not the product name.
 */
export const GENSPARK_AGENT_TYPE = 'genoffice'

export function gensparkAttributionHeaders(baseUrl?: string): Record<string, string> {
  return baseUrl?.startsWith('https://www.genspark.ai')
    ? { 'X-Agent-Type': GENSPARK_AGENT_TYPE }
    : {}
}

/**
 * OpenCode Zen / Go route and cache per conversation and answer 400
 * MissingSessionID without this header (genoffice#331). The renderer's
 * transport id is stable for a chat; a one-shot call is its own conversation.
 */
export function opencodeSessionHeaders(
  baseUrl: string | undefined,
  sessionId?: string,
): Record<string, string> {
  return baseUrl?.startsWith('https://opencode.ai/')
    ? { 'x-opencode-session': sessionId || crypto.randomUUID() }
    : {}
}

/**
 * The VEGA gateway (api.vega.chat) keeps its PII token dictionary per session:
 * the same id on every turn of a chat keeps `#PERSON_1#` stable. The id is
 * the renderer's opaque transport uuid — never a name, path or document text.
 */
export function vegaSessionHeaders(
  baseUrl: string | undefined,
  sessionId?: string,
): Record<string, string> {
  return isVegaGatewayUrl(baseUrl)
    ? { 'X-Vega-Session': (sessionId || crypto.randomUUID()).slice(0, 200) }
    : {}
}

/**
 * True when the effective chat provider routes through api.vega.chat, whose
 * PII shield may mask personal data as #TYPE_N# tokens in what the model sees
 * (the shield engages per key name / guard URL server-side, so this is a
 * "may apply" predicate — enabling the token-aware prompt and the unresolved-
 * token guard under it is harmless when no masking actually happens).
 */
export function piiShieldMayApply(
  settings: Pick<AiSettings, 'provider' | 'providers' | 'piiShieldEnabled'> | null | undefined,
): boolean {
  // user opt-out: the gateway gets X-Vega-Pii: off at the fetch layer, so the
  // token guard and its prompt note would only chase tokens nobody generates
  if (settings?.piiShieldEnabled === false) return false
  if (!settings) return false
  const { provider, config } = requestProvider(settings)
  return provider === 'vega' || isVegaGatewayUrl(config?.baseUrl)
}

/** DeepSeek V4.1 Flash under the Genspark pool spelling, shared by the direct provider so the two lists read alike */
export const DEEPSEEK_V41_FLASH = 'deep-seek-v4.1-flash'

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: 'vega',
    label: 'VEGA',
    // Live catalog: GET {base}/models lists every OpenRouter-routed model
    // (~440 ids); the picker filters to text-capable ones. `openrouter/auto`
    // is the catalog's own router id and stays pickable; the default pins
    // GLM 5.3 Flash, with Luna as the fast-model default (2026-10).
    models: [],
    defaultModel: 'z-ai/glm-5.3-flash',
    // display name for the one statically listed id — the chip reads it before
    // the live catalog lands (the catalog name then takes over)
    modelNames: { 'z-ai/glm-5.3-flash': 'GLM 5.3 Flash' },
    defaultFastModel: 'openai/gpt-6-luna',
    keyPlaceholder: 'sk-apivega-...',
    liveCatalog: true,
  },
  {
    id: 'genspark',
    label: 'Account',
    // must stay within the proxy's served set (GET /api/llm_proxy/v1/models);
    // bare gpt-5.6 and the gemini family dropped off it (verified 2026-08-31).
    // DeepSeek goes by the proxy's hyphenated pool id; V4.1 Flash takes images
    // (live-verified 2026-09-15). gpt-6-astra: chat, tool call and image
    // input all live-verified through the proxy 2026-09-17; claude-opus-5-5,
    // gpt-6-sol and gpt-6-luna the same way 2026-09-24. Opus 4.7/4.8 dropped
    // 2026-10-09: 5.5 is cheaper and supersedes both.
    models: [
      'claude-opus-5-5',
      'claude-sonnet-4-6',
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
      DEEPSEEK_V41_FLASH,
    ],
    // display names spell the pool ids the way the VEGA/OpenRouter catalog does
    // (the LiteLLM proxy's /models lists bare ids without names)
    modelNames: {
      'claude-opus-5-5': 'Claude Opus 5.5',
      'claude-sonnet-4-6': 'Claude Sonnet 4.6',
      'gpt-6-astra': 'GPT-6 Astra',
      'gpt-6-sol': 'GPT-6 Sol',
      'gpt-6-luna': 'GPT-6 Luna',
      'gpt-5.6-terra': 'GPT-5.6 Terra',
      'gpt-5.6-luna': 'GPT-5.6 Luna',
      [DEEPSEEK_V41_FLASH]: 'DeepSeek V4.1 Flash',
    },
    defaultModel: 'claude-opus-5-5',
    keyPlaceholder: 'Not required - sign in to your account',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    // Populated at runtime from codex app-server model/list. Empty also lets
    // the CLI select the account's current default without a stale hardcode.
    models: [],
    defaultModel: '',
    keyPlaceholder: '',
    needsCliPath: true,
  },
  {
    id: 'anthropic',
    label: 'Claude',
    // current-generation ids per platform.claude.com models overview (2026-10-09).
    // Fable needs data retention enabled on the org, otherwise the API answers
    // model_not_available; every other id is served to any key.
    models: [
      'claude-opus-5-5',
      'claude-sonnet-5',
      'claude-fable-5-1',
      'claude-opus-5',
      'claude-fable-5',
      'claude-sonnet-4-6',
      'claude-haiku-5-5',
    ],
    defaultModel: 'claude-sonnet-5',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    // 3.x lineup per ai.google.dev/gemini-api/docs/models (2026-09-23). 3.8 Flash
    // is the current stable Flash Google recommends; 3.1 Pro is still preview-only.
    models: [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ],
    defaultModel: 'gemini-3.8-flash',
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    // GET api.deepseek.com/v1/models serves `deepseek-v4-pro` and
    // `deepseek-flash` (verified 2026-09-21); the latter is V4.1 Flash with
    // native vision. We list it under the Genspark pool spelling so both
    // providers show the same versioned name; the adapter maps it back to
    // the unversioned wire id (see DEEPSEEK_WIRE_IDS in registry.ts).
    models: ['deepseek-v4-pro', DEEPSEEK_V41_FLASH],
    defaultModel: 'deepseek-v4-pro',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    // GPT-5.6 naming: sol is the flagship (the bare `gpt-5.6` alias resolves to
    // it, but spell it out so the picker says which tier it is), terra balances
    // cost/intelligence, luna is the high-volume tier (2026-08). The GPT-6
    // family (astra, sol, luna) is deliberately absent: Chat Completions
    // supports its function calling only with reasoning_effort none, full
    // tool use needs the Responses API, which has no protocol here (2026-09-24)
    models: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    defaultModel: 'gpt-5.6-terra',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    models: ['kimi-k3'],
    defaultModel: 'kimi-k3',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'glm',
    label: 'GLM',
    // bigmodel.cn text-model lineup (2026-08); 5.3 and 5.2 share a base model.
    // 5.3-Flash is the first multimodal GLM-5 and the documented successor to
    // 5-Turbo, which Z.ai delisted from its price card in late August and
    // Tencent CloudBase retires on 2026-10-30 with migration advice pointing
    // here. 5.2 is marked deprecated on third-party catalogues but is still
    // sold pay-as-you-go, so it stays listed.
    models: ['glm-5.3', 'glm-5.3-flash', 'glm-5.2'],
    defaultModel: 'glm-5.3',
    keyPlaceholder: 'xxxxxxxx.xxxxxxxx',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    // Versioned DashScope ids: the bare qwen-max alias still points at a
    // Qwen2.5-era snapshot, so name the 3.x tiers explicitly (2026-08).
    // 3.8 ships as Max and Flash only — there is no 3.8-Plus tier, and
    // 3.7-Flash is still the listed high-volume option.
    models: ['qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus', 'qwen3.7-flash'],
    defaultModel: 'qwen3.8-max',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'doubao',
    label: 'Doubao',
    // Ark ids are dashed and date-pinned; it also accepts ep-... inference
    // endpoint ids in the model field
    models: ['doubao-seed-2-1-pro-260628', 'doubao-seed-2-1-turbo-260628'],
    defaultModel: 'doubao-seed-2-1-pro-260628',
    keyPlaceholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  },
  {
    id: 'mimo',
    label: 'MiMo',
    // Xiaomi's open-weight omni-modal pair (released 2026-09-22): Pro is the
    // trillion-parameter flagship, Flash the efficiency/cost tier. Both take
    // text, image, video and audio input; a -pro-ultraspeed tier also exists but
    // is the same weights behind a faster serving path, so it is not a
    // separate model to pick here.
    models: ['mimo-v2.6-pro', 'mimo-v2.6-flash'],
    defaultModel: 'mimo-v2.6-pro',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'hunyuan',
    label: 'Hunyuan',
    // Tencent's TokenHub chat models (docs 1823/132252, read 2026-09-30).
    // hy4-preview is the 1M-context flagship and has deep thinking on by
    // default; hy3 is the 256k balanced tier. Every other provider here
    // defaults to its flagship, so this does too.
    models: ['hy4-preview', 'hy3'],
    defaultModel: 'hy4-preview',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ling',
    label: 'Ling',
    // Ids as listed by developer.ant-ling.com (Ring = reasoning line); only
    // Ling-3.0-flash-VL takes images, see modelLacksVision()
    models: [
      'Ling-3.0-flash',
      'Ling-3.0-flash-VL',
      'Ling-3.0-tiny',
      'Ling-2.6-1T',
      'Ring-2.6-1T',
      'Ling-2.6-flash',
    ],
    defaultModel: 'Ling-3.0-flash',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'spark',
    label: 'Spark',
    // iFlytek MaaS: lower-case model id and ak- key prefix are the vendor's own spelling
    models: ['spark-x2.5'],
    defaultModel: 'spark-x2.5',
    keyPlaceholder: 'ak-...',
  },
  {
    id: 'longcat',
    label: 'LongCat',
    // 2.5-Preview is the multimodal tier; 2.0 stays default so a fresh config avoids a preview
    models: ['LongCat-2.5-Preview', 'LongCat-2.0'],
    defaultModel: 'LongCat-2.0',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    // M3 is the current agentic/tool-use model; M2.5 moved to the legacy tier
    models: ['MiniMax-M3', 'MiniMax-M2.7'],
    defaultModel: 'MiniMax-M3',
    keyPlaceholder: 'eyJ...',
  },
  {
    id: 'xai',
    label: 'Grok',
    // 4.7 (2026-09-21) is 2.1T / 500K context at 4.6's price. 4.6 stays the
    // default so a fresh config does not silently move to a model released
    // this month; say the word and the default follows the flagship like every
    // other provider here.
    models: ['grok-4.7', 'grok-4.6', 'grok-4.5'],
    defaultModel: 'grok-4.6',
    keyPlaceholder: 'xai-...',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    // `-latest` aliases track the newest GA snapshot. Medium 3.5 is Mistral's
    // agentic tier; codestral is a code-completion/FIM model, not an agent driver.
    models: ['mistral-medium-latest', 'mistral-large-latest', 'mistral-small-latest'],
    defaultModel: 'mistral-medium-latest',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    // vendor-prefixed slugs exactly as openrouter.ai/api/v1/models lists them —
    // there is no `openai/gpt-5.6` alias there, only the per-tier ids
    models: [
      'openrouter/auto',
      'anthropic/claude-opus-5.5',
      'anthropic/claude-sonnet-5',
      'openai/gpt-6-astra',
      'openai/gpt-6-sol',
      'openai/gpt-6-luna',
      'openai/gpt-5.6-sol',
      'moonshotai/kimi-k3',
    ],
    defaultModel: 'openrouter/auto',
    keyPlaceholder: 'sk-or-...',
    liveCatalog: true,
  },
  {
    id: 'requesty',
    label: 'Requesty',
    // Managed policy ids exactly as GET router.requesty.ai/v1/models/managed
    // lists them (2026-09-24): short stable names Requesty routes across
    // providers, used as-is in the model field. The full vendor-prefixed
    // catalog (GET /v1/models, e.g. openai/gpt-4o-mini) works too when typed
    // in. Ids ending "@eu" route through EU providers only.
    models: [
      'claude-sonnet-5',
      'claude-opus-5-5',
      'claude-opus-4-8',
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gemini-3.7-flash',
      'deepseek-v4-pro',
      'kimi-k3',
    ],
    defaultModel: 'claude-sonnet-5',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'opper',
    label: 'Opper',
    // Pool ids exactly as GET api.opper.ai/v3/models lists them (2026-09-14):
    // a bare name is an Opper pool, and Opper picks the serving provider and
    // region per request. The vendor-prefixed catalog (anthropic/claude-sonnet-4-6,
    // azure/gpt-5, …) pins one provider and works as-is when typed in.
    // Full list at opper.ai/models.
    models: [
      'claude-sonnet-4-6',
      'claude-opus-5',
      'gpt-5.5',
      'gpt-5.4-mini',
      'gemini-3.8-flash',
      'deepseek-v4-pro',
      'kimi-k3',
      'mistral-large-2512',
    ],
    defaultModel: 'claude-sonnet-4-6',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'cheaperinference',
    label: 'Cheaper Inference',
    // Bare model ids as GET api.cheaperinference.com/v1/models lists them (the
    // chat rows, type "text"): no vendor prefix, one key for every lab. Other
    // ids from that list work as-is when typed in. Full list at
    // cheaperinference.com/#models.
    models: ['gpt-5.4-mini', 'gpt-5.4', 'claude-sonnet-5', 'gemini-3.1-pro'],
    defaultModel: 'gpt-5.4-mini',
    keyPlaceholder: 'ci_live_...',
  },
  {
    id: 'atlascloud',
    label: 'Atlas Cloud',
    // Lab-namespaced ids exactly as GET api.atlascloud.ai/v1/models lists them
    // (2026-10-08, public endpoint, no key needed); the rest of the 117-model
    // catalog works as-is when typed in. Chat, temperature and — for the
    // multimodal ids — data-URI image input are live-verified. The text-only
    // ids (deepseek-v4-*, glm-5.3, both MiniMax) are listed in
    // modelLacksVision(); Atlas Cloud serves MiniMax M3 text-only even though
    // MiniMax's own API takes images.
    models: [
      'deepseek-ai/deepseek-v4-pro',
      'deepseek-ai/deepseek-v4-flash',
      'moonshotai/kimi-k3',
      'moonshotai/kimi-k2.6',
      'zai-org/glm-5.3',
      'zai-org/glm-5.3-flash',
      'qwen/qwen3.8-max',
      'qwen/qwen3.5-flash',
      'minimaxai/minimax-m3',
      'minimaxai/minimax-m2.5',
    ],
    defaultModel: 'deepseek-ai/deepseek-v4-pro',
    keyPlaceholder: 'apikey-...',
  },
  {
    id: 'opencode-zen',
    label: 'OpenCode Zen',
    // Pay-as-you-go gateway (opencode.ai/docs/zen); ids exactly as GET
    // /zen/v1/models lists them (2026-10-09). GPT-5.x/6, Grok and Muse Spark
    // are served only through the Responses API, which has no protocol here,
    // so they stay out until one exists.
    models: [
      'claude-sonnet-5',
      'claude-opus-5-5',
      'claude-opus-5',
      'claude-fable-5-1',
      'claude-haiku-5-5',
      'gemini-3.7-flash',
      'gemini-3.1-pro',
      'kimi-k3',
      'kimi-k2.7-code',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'glm-5.2',
      'minimax-m3',
      'qwen3.6-plus',
    ],
    defaultModel: 'claude-sonnet-5',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'opencode-go',
    label: 'OpenCode Go',
    // $10/month subscription to open-weight coding models (opencode.ai/docs/go),
    // same key as Zen; ids exactly as GET /zen/go/v1/models lists them
    // (re-read 2026-09-30). GPT-5.6 Luna, Grok and Muse Spark are
    // Responses-only and left out for the same reason as above.
    models: [
      'kimi-k2.7-code',
      'kimi-k3',
      'kimi-k2.6',
      'glm-5.3',
      'glm-5.3-flash',
      'glm-5.2',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'deepseek-v4.1-flash',
      'qwen3.8-max',
      'qwen3.8-flash',
      'minimax-m3',
      'minimax-m2.7',
      'mimo-v2.5-pro',
      'mimo-v2.6-pro',
      'mimo-v2.6-flash',
      'longcat-2.0',
      'longcat-2.5-preview-free',
      'hy4-preview',
      'hy3',
    ],
    defaultModel: 'kimi-k2.7-code',
    keyPlaceholder: 'API Key',
  },
  {
    id: 'sber',
    label: 'Sber GigaChat',
    // GET api.giga.chat/v1/models serves the live catalog; the Bearer it needs
    // is a short-lived access token minted from the stored authorization key
    // (gigachat-auth.ts), so the ids below are only the offline fallback.
    // GigaChat-2 is the 128k lineup; 3-Ultra is the freemium personal tier.
    models: ['GigaChat-2-Max', 'GigaChat-2-Pro', 'GigaChat-2', 'GigaChat-3-Ultra'],
    defaultModel: 'GigaChat-2-Max',
    keyPlaceholder: 'Authorization key',
    liveCatalog: true,
  },
  {
    id: 'yandex',
    label: 'Yandex',
    // Yandex addresses models by URI — gpt://<folder-id>/<model>[/<version>] —
    // so the cloud folder id rides inside the model string: pick a template
    // and edit <folder-id> in place (lite = Lite 5, latest = Pro 5, rc = 5.1,
    // aliceai-llm = the AI Studio flagship). The OpenAI-compatible endpoint at
    // llm.api.cloud.yandex.net/v1 serves both API keys and IAM tokens as Bearer.
    models: [
      'gpt://<folder-id>/yandexgpt-lite',
      'gpt://<folder-id>/yandexgpt/latest',
      'gpt://<folder-id>/yandexgpt/rc',
      'gpt://<folder-id>/aliceai-llm',
    ],
    defaultModel: 'gpt://<folder-id>/yandexgpt-lite',
    keyPlaceholder: 'AQVN... or IAM token',
    liveCatalog: true,
  },
  {
    id: 'custom',
    label: 'Custom',
    models: [],
    defaultModel: '',
    keyPlaceholder: 'API Key',
    needsBaseUrl: true,
  },
]

/**
 * Fresh settings with every provider's default model and an empty key,
 * except providers listed in `defaultApiKeys` (e.g. an app-specific
 * preconfigured Anthropic key). Callers own that policy; this package
 * has no hardcoded keys.
 */
export function defaultAiSettings(
  defaultApiKeys?: Partial<Record<AiProviderId, string>>,
): AiSettings {
  const providers = {} as AiSettings['providers']
  for (const meta of AI_PROVIDERS) {
    providers[meta.id] = {
      apiKey: defaultApiKeys?.[meta.id] ?? '',
      model: meta.defaultModel,
      fastModel: meta.defaultFastModel,
      baseUrl: meta.needsBaseUrl ? '' : undefined,
      cliPath: meta.needsCliPath ? '' : undefined,
    }
  }
  return {
    provider: 'vega',
    providers,
    vegaToolsEnabled: true,
    piiShieldEnabled: true,
    media: defaultAiMediaSettings(),
    search: defaultAiSearchSettings(),
  }
}

// lives in media.ts (media/search both consult it; providers.ts already imports media)
export { cloudToolsEnabled } from './media'

/**
 * The stored provider selection is honored only when its config is usable
 * (api-key providers need a key and a model id; custom also needs a base URL).
 * Codex can auto-discover its executable. Anything else — including unknown
 * ids from a hand-edited
 * settings file — falls back to genspark, so a half-filled setup degrades
 * to the signed-in default instead of silently disabling AI.
 */
export function activeProvider(settings: AiSettings): AiProviderId {
  // no licence: any non-VEGA pick degrades to the signed-in default
  const provider: AiProviderId =
    isFreeProvider(settings.provider) || isLicensed() ? settings.provider : 'genspark'
  if (provider === 'genspark') {
    // Legacy sign-in pick: a VEGA credential (the app's login flow now issues
    // VEGA keys) silently upgrades it — VEGA is the default; without one the
    // pick stays genspark, the signed-in gsk state or the login prompt.
    const vega = settings.providers?.vega
    if (vega?.model?.trim() && (vega.apiKey?.trim() || issuedVegaKey())) return 'vega'
    return 'genspark'
  }
  const meta = AI_PROVIDERS.find((m) => m.id === provider)
  const config = settings.providers?.[provider]
  if (!meta || !config) return 'genspark'
  if (meta.needsCliPath) return provider
  // Trim-aware: in-memory settings bypass the trimConfigs applied to
  // persisted files, and a whitespace-only key/URL/model is a 401, not a config.
  if (!config.model?.trim()) return 'genspark'
  if (meta.needsBaseUrl) {
    // Custom OpenAI-compatible endpoints (Ollama, LM Studio, vLLM) accept
    // anonymous requests: base URL + model suffice, the key stays optional.
    if (!config.baseUrl?.trim()) return 'genspark'
    return provider
  }
  // VEGA also accepts the sign-in-issued key — it never enters the settings file
  if (!config.apiKey?.trim() && !(provider === 'vega' && issuedVegaKey())) return 'genspark'
  return provider
}

/**
 * Request-time companion to activeProvider() for stream/chat handlers. A
 * renderer caches the resolved provider per tab, so a snapshot taken before
 * VEGA sign-in keeps asking for 'genspark' even though the issued key now
 * exists — re-apply the same legacy-genspark upgrade or that tab stays
 * signed-out until reload. Every other pick passes through untouched:
 * re-resolving the stored choice would break the settings dialog's
 * test-connection on a stored-but-keyless BYOK pick. The returned vega config
 * carries the effective credential (its own key, else the issued one).
 */
export function requestProvider(settings: {
  provider: string
  providers?: Record<string, AiProviderConfig | undefined>
}): {
  provider: AiProviderId
  config: AiProviderConfig | undefined
} {
  // no licence: any non-VEGA pick is served through the signed-in default
  const provider = (
    isFreeProvider(settings.provider) || isLicensed() ? settings.provider : 'genspark'
  ) as AiProviderId
  const config = settings.providers?.[provider]
  if (provider !== 'genspark') return { provider, config }
  const vega = settings.providers?.vega
  const vegaKey = vega?.apiKey?.trim() || issuedVegaKey()
  if (vega?.model?.trim() && vegaKey) {
    return { provider: 'vega', config: { ...vega, apiKey: vegaKey } }
  }
  return { provider, config }
}

/**
 * Model ids a vendor has stopped serving, mapped to their replacement. A
 * stored selection outlives the provider list, so without this remap an old
 * settings file keeps sending an id the API now rejects.
 */
const RETIRED_MODELS: Partial<Record<AiProviderId, Record<string, string>>> = {
  // chat/reasoner retired 2026-07-24 (thinking became a request parameter);
  // V4 Flash and V4 Flash Vision Exp retired 2026-09-10 in favour of V4.1
  // Flash, which carries vision natively. The vendor's own `deepseek-flash`
  // id is folded in as well so the stored value matches the listed one.
  deepseek: {
    'deepseek-chat': DEEPSEEK_V41_FLASH,
    'deepseek-reasoner': DEEPSEEK_V41_FLASH,
    'deepseek-v4-flash': DEEPSEEK_V41_FLASH,
    'deepseek-v4-flash-vision-exp': DEEPSEEK_V41_FLASH,
    'deepseek-flash': DEEPSEEK_V41_FLASH,
  },
  // proxy stopped serving bare gpt-5.6 (400) and removed the gemini route
  // entirely (405), verified 2026-08-31; gemini selections fall back to the
  // provider default since no gemini id is served at all
  // 5-Turbo left the Z.ai price card late 2026-08; 5.3 Flash is the cheap tier now
  glm: { 'glm-5-turbo': 'glm-5.3-flash' },
  genspark: {
    'gpt-5.6': 'gpt-5.6-terra',
    'gemini-3.1-pro-preview': 'claude-opus-5-5',
    'gemini-3-flash-preview': 'claude-opus-5-5',
    'gemini-3.7-flash': 'claude-opus-5-5',
    'claude-opus-4-7': 'claude-opus-5-5',
    'claude-opus-4-8': 'claude-opus-5-5',
  },
}

/**
 * Per-turn output cap applied when the settings carry none. The historic 8192
 * was the budget a reasoning model burns on thinking before it writes any prose,
 * and too small for a large sheet DSL or long-form generation in one turn. Models
 * whose own ceiling is lower reject this and are retried at that ceiling
 * (see output-cap.ts).
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 32768
/** bounds accepted for AiSettings.maxOutputTokens: below the first a short answer cannot even finish, above the second one turn risks the whole context window */
export const MIN_MAX_OUTPUT_TOKENS = 1024
export const MAX_MAX_OUTPUT_TOKENS = 131072

/** Out-of-range or non-finite input falls back to a bound / the default (a mistyped settings field must not kill AI features) */
export function clampMaxOutputTokens(value: unknown): number {
  const n = typeof value === 'number' ? Math.floor(value) : Number.NaN
  if (!Number.isFinite(n)) return DEFAULT_MAX_OUTPUT_TOKENS
  return Math.min(MAX_MAX_OUTPUT_TOKENS, Math.max(MIN_MAX_OUTPUT_TOKENS, n))
}

/** The effective per-turn output cap of a settings object (clamped; absent → default) */
export function maxOutputTokensOf(
  settings: Pick<AiSettings, 'maxOutputTokens'> | null | undefined,
): number {
  return settings?.maxOutputTokens === undefined
    ? DEFAULT_MAX_OUTPUT_TOKENS
    : clampMaxOutputTokens(settings.maxOutputTokens)
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeProviderConfigs(
  defaults: AiSettings['providers'],
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults }
  for (const [id, config] of Object.entries(stored)) {
    if (isRecord(config)) merged[id] = config
  }
  return merged
}

/** pasted keys/URLs/model ids often carry stray whitespace, which turns into a 401 with a valid key */
function trimConfigs(providers: Record<string, unknown>): AiSettings['providers'] {
  const trimmed: Record<string, unknown> = {}
  for (const [id, config] of Object.entries(providers)) {
    if (!isRecord(config)) continue
    trimmed[id] = {
      ...config,
      apiKey: str(config.apiKey),
      model: str(config.model),
      ...(config.fastModel !== undefined ? { fastModel: str(config.fastModel) || undefined } : {}),
      ...(config.baseUrl !== undefined ? { baseUrl: str(config.baseUrl) } : {}),
      ...(config.cliPath !== undefined ? { cliPath: str(config.cliPath) } : {}),
    }
  }
  return trimmed as AiSettings['providers']
}

function migrateRetiredModels(providers: AiSettings['providers']): AiSettings['providers'] {
  const migrated = { ...providers }
  for (const [id, replacements] of Object.entries(RETIRED_MODELS)) {
    const config = migrated[id as AiProviderId]
    if (!config) continue
    const replacement = config.model ? replacements[config.model] : undefined
    const fastReplacement = config.fastModel ? replacements[config.fastModel] : undefined
    if (replacement || fastReplacement) {
      migrated[id as AiProviderId] = {
        ...config,
        ...(replacement ? { model: replacement } : {}),
        ...(fastReplacement ? { fastModel: fastReplacement } : {}),
      }
    }
  }
  return migrated
}

/**
 * Settings view for background helper calls (suggested follow-up questions):
 * every provider config that names a `fastModel` serves it in place of `model`,
 * so whichever slot the request layer resolves (including the genspark→vega
 * upgrade) already carries the cheap model. No fast model configured = the
 * main model runs the helper call too.
 */
export function withFastModel(settings: AiSettings): AiSettings {
  let changed = false
  const providers = {} as AiSettings['providers']
  for (const [id, config] of Object.entries(settings.providers)) {
    const fast = config.fastModel?.trim()
    if (fast) {
      providers[id as AiProviderId] = { ...config, model: fast }
      changed = true
    } else {
      providers[id as AiProviderId] = config
    }
  }
  return changed ? { ...settings, providers } : settings
}

/**
 * Merge on-disk settings over freshly computed defaults, migrating the
 * pre-provider shape (a single OpenAI-compatible endpoint) into the
 * "custom" provider slot. `stored` is whatever the caller read from its
 * settings file (already JSON-parsed); this function does no file I/O.
 */
export function resolveAiSettings(stored: unknown, defaults: AiSettings): AiSettings {
  const settings = (isRecord(stored) ? stored : {}) as Partial<AiSettings> & LegacyAiSettings
  const storedProviders = isRecord(settings.providers) ? settings.providers : undefined
  if (!storedProviders) {
    if (settings.apiKey) {
      defaults.providers.custom = {
        apiKey: str(settings.apiKey),
        model: str(settings.model),
        baseUrl: str(settings.baseUrl) || 'https://api.openai.com/v1',
      }
    }
    const tools = settings.vegaToolsEnabled ?? settings.gskToolsEnabled
    const pii = settings.piiShieldEnabled
    const base = tools === undefined ? defaults : { ...defaults, vegaToolsEnabled: tools }
    return resolveCustomEndpoints(pii === undefined ? base : { ...base, piiShieldEnabled: pii })
  }
  return resolveCustomEndpoints({
    provider: settings.provider ?? defaults.provider,
    customEndpoints: settings.customEndpoints,
    customEndpoint: settings.customEndpoint,
    // Trim before migrating: a pasted " deepseek-reasoner " must still hit
    // the retired-id remap instead of being sent to the API verbatim.
    providers: migrateRetiredModels(
      trimConfigs(mergeProviderConfigs(defaults.providers, storedProviders)),
    ),
    // legacy files carry gskToolsEnabled — the same opt-out now applies to VEGA
    vegaToolsEnabled:
      settings.vegaToolsEnabled ?? settings.gskToolsEnabled ?? defaults.vegaToolsEnabled ?? true,
    piiShieldEnabled: settings.piiShieldEnabled ?? defaults.piiShieldEnabled ?? true,
    media: resolveAiMediaSettings(settings.media ?? defaults.media),
    search: resolveAiSearchSettings(settings.search ?? defaults.search),
    // clamped on read: a hand-edited settings file with an absurd cap must not be
    // forwarded to the endpoint verbatim
    ...(settings.maxOutputTokens !== undefined || defaults.maxOutputTokens !== undefined
      ? {
          maxOutputTokens: clampMaxOutputTokens(
            settings.maxOutputTokens ?? defaults.maxOutputTokens,
          ),
        }
      : {}),
  })
}
