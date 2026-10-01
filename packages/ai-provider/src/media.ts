import { isFreeProvider, isLicensed } from './license-gate'
import { issuedVegaKey } from './vega-key'
import type {
  AiMediaProviderConfig,
  AiMediaProviderId,
  AiMediaProviderMeta,
  AiMediaSettings,
  AiSettings,
} from './types'

/**
 * The "VEGA cloud tools" switch: false only on an explicit opt-out; absent
 * (pre-toggle settings files) means on. The legacy `gskToolsEnabled` field
 * doubles as the opt-out carried over from when the switch gated Genspark.
 * Lives here (not providers.ts) so media/search can use it without a cycle.
 */
export function cloudToolsEnabled(
  settings: Partial<Pick<AiSettings, 'vegaToolsEnabled' | 'gskToolsEnabled'>>,
): boolean {
  return (settings.vegaToolsEnabled ?? settings.gskToolsEnabled) !== false
}

export const OPENAI_IMAGES_BASE_URL = 'https://api.openai.com/v1'
/**
 * VEGA (api.vega.chat) — an OpenRouter-compatible BYOK gateway: the same
 * /models catalog, chat/completions (web-search plugin, multimodal parts)
 * and /images endpoints, keyed by a sk-apivega-… token.
 */
export const VEGA_BASE_URL = 'https://api.vega.chat/api/v1'
export const GEMINI_MEDIA_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
export const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
export const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
export const XAI_BASE_URL = 'https://api.x.ai/v1'
/** DashScope root: images ride /api/v1/services/aigc/..., understanding rides /compatible-mode/v1 */
export const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com'
export const MINIMAX_BASE_URL = 'https://api.minimax.io/v1'
/** DeepSeek's OpenAI-compatible root; the Vision + Files API live at https://api.deepseek.com */
export const DEEPSEEK_MEDIA_BASE_URL = 'https://api.deepseek.com/v1'

// Model ids verified against vendor docs 2026-09; keep chat-capable analysis
// models in step with the chat catalog in providers.ts.
export const AI_MEDIA_PROVIDERS: AiMediaProviderMeta[] = [
  {
    id: 'genspark',
    label: 'Account',
    description: 'Image generation, media analysis and search through your account sign-in',
    keyPlaceholder: 'Not required - sign in to your account',
    defaultBaseUrl: '',
    imageProtocol: 'openai-images',
    imageModels: [],
    defaultImageModel: '',
    analysisProtocol: 'openai-chat',
    analysisModels: [],
    defaultAnalysisModel: '',
    videoAnalysis: true,
  },
  {
    id: 'vega',
    label: 'VEGA',
    description:
      'Генерация изображений и анализ фото/видео идет через ВЕГА провайдер.',
    keyPlaceholder: 'sk-apivega-...',
    defaultBaseUrl: VEGA_BASE_URL,
    liveCatalog: true,
    imageProtocol: 'openai-images',
    // ids verified against GET /models?input_modalities=image&output_modalities=image
    // (image-to-image capable, 2026-09); the settings picker refreshes live with
    // the same filter — this list with its display names is the offline fallback
    imageModels: [
      { id: 'openai/gpt-image-2.5-sunburst', name: 'OpenAI: GPT Image 2.5 Sunburst' },
      { id: 'x-ai/grok-imagine-image-2.0', name: 'xAI: Grok Imagine Image 2.0' },
      { id: 'google/gemini-3.1-flash-image', name: 'Nano Banana 2 (Gemini 3.1 Flash Image)' },
      { id: 'openai/gpt-image-2', name: 'GPT Image 2' },
      { id: 'openai/gpt-image-1-mini', name: 'GPT Image 1 Mini' },
      { id: 'bytedance-seed/seedream-5-0-lite', name: 'ByteDance Seed: Seedream 5.0 Lite' },
      { id: 'black-forest-labs/flux.2-pro', name: 'Black Forest Labs: FLUX.2 Pro' },
      { id: 'qwen/qwen-image-3', name: 'Qwen Image 3' },
      { id: 'recraft/recraft-v4', name: 'Recraft V4' },
    ],
    defaultImageModel: 'openai/gpt-image-2.5-sunburst',
    analysisProtocol: 'openai-chat',
    // fixed slots — the proxy may still route them; `openai/gpt-6-luna` covers
    // image input, video/audio payloads go to a video-capable model
    // (per GET /models?input_modalities=video)
    analysisModels: [
      'openai/gpt-6-luna',
      'google/gemini-3.5-flash-lite',
      'google/gemini-3.8-flash',
      'qwen/qwen3.8-flash',
      'moonshotai/kimi-k3',
      'google/gemini-2.5-flash',
    ],
    defaultAnalysisModel: 'openai/gpt-6-luna',
    defaultVideoAnalysisModel: 'google/gemini-3.5-flash-lite',
    videoAnalysis: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT Image for generation and editing; GPT chat models for image analysis',
    keyPlaceholder: 'sk-...',
    defaultBaseUrl: OPENAI_IMAGES_BASE_URL,
    imageProtocol: 'openai-images',
    // GPT Image 2.5 (sunburst = quality, flare = fast) per the OpenAI models page
    // 2026-09-24, same token rates as GPT Image 2, both on generations and edits.
    // GPT-6 reads images over Chat Completions; the tool-call caveat that keeps
    // it off the chat provider does not apply to analysis.
    imageModels: [
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-flare',
      'gpt-image-2',
      'gpt-image-1.5',
      'gpt-image-1',
      'gpt-image-1-mini',
    ],
    defaultImageModel: 'gpt-image-2',
    analysisProtocol: 'openai-chat',
    analysisModels: [
      'gpt-6-sol',
      'gpt-6-luna',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
      'gpt-5.5',
      'gpt-5.4-mini',
    ],
    defaultAnalysisModel: 'gpt-5.6-luna',
    videoAnalysis: false,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description:
      'Gemini native image output (Nano Banana) and Imagen; Gemini reads images, video and audio',
    keyPlaceholder: 'AIza...',
    defaultBaseUrl: GEMINI_MEDIA_BASE_URL,
    imageProtocol: 'gemini',
    imageModels: [
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gemini-3.1-flash-lite-image',
      'gemini-2.5-flash-image',
    ],
    defaultImageModel: 'gemini-3.1-flash-image',
    analysisProtocol: 'gemini',
    analysisModels: [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.6-flash',
    ],
    defaultAnalysisModel: 'gemini-3.8-flash',
    videoAnalysis: true,
  },
  {
    id: 'doubao',
    label: 'Doubao (Volcengine Ark)',
    description: 'Seedream image generation and editing; Doubao Seed reads images and video',
    keyPlaceholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    defaultBaseUrl: ARK_BASE_URL,
    imageProtocol: 'openai-images',
    imageModels: [
      'doubao-seedream-5-0-260128',
      'doubao-seedream-4-5-251128',
      'doubao-seedream-4-0-250828',
    ],
    defaultImageModel: 'doubao-seedream-5-0-260128',
    analysisProtocol: 'openai-chat',
    analysisModels: ['doubao-seed-2-1-pro-260628', 'doubao-seed-2-1-turbo-260628'],
    defaultAnalysisModel: 'doubao-seed-2-1-pro-260628',
    videoAnalysis: true,
  },
  {
    id: 'glm',
    label: 'GLM (Zhipu)',
    description: 'CogView image generation; GLM-V reads images and video',
    keyPlaceholder: 'xxxxxxxx.xxxxxxxx',
    defaultBaseUrl: ZHIPU_BASE_URL,
    imageProtocol: 'openai-images',
    imageModels: ['cogview-4-250304', 'cogview-3-flash'],
    defaultImageModel: 'cogview-4-250304',
    analysisProtocol: 'openai-chat',
    analysisModels: ['glm-4.6v', 'glm-4.6v-flash'],
    defaultAnalysisModel: 'glm-4.6v',
    videoAnalysis: true,
  },
  {
    id: 'xai',
    label: 'Grok (xAI)',
    description: 'Grok Imagine image generation; Grok reads images',
    keyPlaceholder: 'xai-...',
    defaultBaseUrl: XAI_BASE_URL,
    imageProtocol: 'openai-images',
    imageModels: ['grok-imagine-image-2.0', 'grok-2-image-1212'],
    defaultImageModel: 'grok-imagine-image-2.0',
    analysisProtocol: 'openai-chat',
    analysisModels: ['grok-4.6', 'grok-4.5'],
    defaultAnalysisModel: 'grok-4.6',
    videoAnalysis: false,
  },
  {
    id: 'qwen',
    label: 'Qwen (Alibaba Cloud)',
    description: 'Qwen-Image generation; Qwen-VL reads images and video (DashScope)',
    keyPlaceholder: 'sk-...',
    defaultBaseUrl: DASHSCOPE_BASE_URL,
    imageProtocol: 'dashscope',
    imageModels: ['qwen-image-plus', 'qwen-image'],
    defaultImageModel: 'qwen-image-plus',
    analysisProtocol: 'openai-chat',
    analysisModels: ['qwen3-vl-plus', 'qwen3-vl-flash', 'qwen3.8-max', 'qwen3.7-plus'],
    defaultAnalysisModel: 'qwen3-vl-plus',
    videoAnalysis: true,
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    description:
      'image-01 image generation (api.minimax.io; use api.minimaxi.com/v1 for the CN region)',
    keyPlaceholder: 'eyJ...',
    defaultBaseUrl: MINIMAX_BASE_URL,
    imageProtocol: 'minimax',
    imageModels: ['image-01'],
    defaultImageModel: 'image-01',
    analysisModels: [],
    defaultAnalysisModel: '',
    videoAnalysis: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    // native multimodal (V4.1 Flash = wire id deepseek-flash): reads JPEG/PNG/GIF/WebP,
    // no image generation and no video/audio, so it only appears for image analysis
    description: 'DeepSeek V4.1 Flash reads images (native multimodal); no image generation',
    keyPlaceholder: 'sk-...',
    defaultBaseUrl: DEEPSEEK_MEDIA_BASE_URL,
    imageModels: [],
    defaultImageModel: '',
    analysisProtocol: 'openai-chat',
    analysisModels: ['deepseek-flash'],
    defaultAnalysisModel: 'deepseek-flash',
    videoAnalysis: false,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Any OpenAI-compatible endpoint: /images/generations and /chat/completions',
    keyPlaceholder: 'API Key',
    needsBaseUrl: true,
    defaultBaseUrl: '',
    imageProtocol: 'openai-images',
    imageModels: [],
    defaultImageModel: '',
    analysisProtocol: 'openai-chat',
    analysisModels: [],
    defaultAnalysisModel: '',
    videoAnalysis: false,
  },
]

export type MediaCapability = 'image' | 'analysis' | 'video'

export function getMediaProviderMeta(id: AiMediaProviderId): AiMediaProviderMeta | undefined {
  return AI_MEDIA_PROVIDERS.find((m) => m.id === id)
}

export function providerHasCapability(
  meta: AiMediaProviderMeta,
  capability: MediaCapability,
): boolean {
  if (capability === 'image') return !!meta.imageProtocol
  if (capability === 'video') return !!meta.analysisProtocol && meta.videoAnalysis
  return !!meta.analysisProtocol
}

export function defaultAiMediaSettings(): AiMediaSettings {
  const providers = {} as AiMediaSettings['providers']
  for (const meta of AI_MEDIA_PROVIDERS) {
    providers[meta.id] = {
      apiKey: '',
      imageModel: meta.defaultImageModel,
      analysisModel: meta.defaultAnalysisModel,
      baseUrl: meta.needsBaseUrl ? '' : undefined,
    }
  }
  return {
    imageProvider: 'vega',
    analysisProvider: 'vega',
    videoAnalysisProvider: 'vega',
    providers,
  }
}

/**
 * Merge a stored media block over defaults, trimming pasted whitespace. The
 * pre-catalog `provider` field (one choice for both tools) seeds both
 * per-capability choices. Unknown provider ids are kept and simply never activate.
 */
export function resolveAiMediaSettings(
  stored: Partial<AiMediaSettings> | undefined,
): AiMediaSettings {
  const defaults = defaultAiMediaSettings()
  if (!stored) return defaults
  const providers = { ...defaults.providers }
  for (const [id, config] of Object.entries(stored.providers ?? {})) {
    if (!config || typeof config !== 'object') continue
    // Hand-edited settings files can carry non-string values: trim only
    // strings (like the search-settings guard) instead of crashing.
    const str = (v: unknown, fallback: string): string =>
      typeof v === 'string' ? v.trim() : fallback
    const base = providers[id as AiMediaProviderId]
    providers[id as AiMediaProviderId] = {
      apiKey: str(config.apiKey, base?.apiKey ?? ''),
      imageModel: str(config.imageModel, base?.imageModel ?? ''),
      analysisModel: str(config.analysisModel, base?.analysisModel ?? ''),
      ...(config.baseUrl !== undefined
        ? { baseUrl: str(config.baseUrl, base?.baseUrl ?? '') }
        : base?.baseUrl !== undefined
          ? { baseUrl: base.baseUrl }
          : {}),
    }
  }
  const legacy = stored.provider
  const analysisProvider = stored.analysisProvider ?? legacy ?? defaults.analysisProvider
  return {
    imageProvider: stored.imageProvider ?? legacy ?? defaults.imageProvider,
    analysisProvider,
    // a pre-split file used one vendor for all media analysis
    videoAnalysisProvider: stored.videoAnalysisProvider ?? analysisProvider,
    providers,
  }
}

/** The chat provider's own VEGA key — shared by the media/search slots when theirs is empty; falls back to the sign-in-issued key */
function vegaSharedKey(
  settings: Partial<Pick<AiSettings, 'providers'>> | null | undefined,
): string {
  return settings?.providers?.vega?.apiKey?.trim() || issuedVegaKey()
}

/** Key (or base URL for custom) present — the minimum for a BYOK media provider to be honored */
export function mediaConfigUsable(
  meta: AiMediaProviderMeta,
  config: AiMediaProviderConfig | undefined,
  settings?: Partial<Pick<AiSettings, 'providers'>> | null,
): boolean {
  if (!config) return false
  // Trim-aware like activeProvider: whitespace-only survivors of in-memory
  // settings are not usable configs.
  if (meta.needsBaseUrl) return !!config.baseUrl?.trim()
  if (config.apiKey?.trim()) return true
  // an empty VEGA slot inherits the AI Model provider's key
  return meta.id === 'vega' && !!vegaSharedKey(settings)
}

type MediaSettingsSlice = Partial<
  Pick<AiSettings, 'media' | 'providers' | 'vegaToolsEnabled' | 'gskToolsEnabled'>
>

/**
 * The stored provider for one capability, honored only when it exists, has
 * that capability and is usable; anything else falls back to genspark so a
 * half-filled setup degrades to the signed-in default. VEGA additionally
 * requires the "VEGA cloud tools" switch to be on.
 */
export function activeMediaProvider(
  settings: MediaSettingsSlice,
  capability: MediaCapability,
): AiMediaProviderId {
  const media = settings.media
  if (!media) return 'genspark'
  const id =
    capability === 'image'
      ? media.imageProvider
      : capability === 'video'
        ? media.videoAnalysisProvider
        : media.analysisProvider
  if (!id || id === 'genspark') return 'genspark'
  // no licence: every media capability sticks to VEGA (or the signed-in default)
  if (!isFreeProvider(id) && !isLicensed()) return 'genspark'
  const meta = getMediaProviderMeta(id)
  if (!meta || !providerHasCapability(meta, capability)) return 'genspark'
  if (id === 'vega' && !cloudToolsEnabled(settings)) return 'genspark'
  if (!mediaConfigUsable(meta, media.providers?.[id], settings)) return 'genspark'
  return id
}

/** the active BYOK config for one capability, or null when it runs through Genspark */
export function activeMediaConfig(
  settings: MediaSettingsSlice,
  capability: MediaCapability,
): { provider: Exclude<AiMediaProviderId, 'genspark'>; config: AiMediaProviderConfig } | null {
  const provider = activeMediaProvider(settings, capability)
  if (provider === 'genspark') return null
  const config = settings.media!.providers[provider]
  // VEGA slots may share the AI Model key — the merged config carries the effective credential
  if (provider === 'vega' && !config.apiKey?.trim()) {
    const shared = vegaSharedKey(settings)
    if (shared) return { provider, config: { ...config, apiKey: shared } }
  }
  return { provider, config }
}

function byokModel(settings: MediaSettingsSlice, capability: MediaCapability): string | null {
  const active = activeMediaConfig(settings, capability)
  if (!active) return null
  const meta = getMediaProviderMeta(active.provider)!
  // VEGA analysis models are still picked server-side (the settings UI has no
  // picker for them) — only its image model is user-pickable. Video/audio
  // payloads ride their own slot when the provider defines one.
  if (active.provider === 'vega' && capability !== 'image') {
    return capability === 'video'
      ? (meta.defaultVideoAnalysisModel ?? meta.defaultAnalysisModel)
      : meta.defaultAnalysisModel
  }
  return capability === 'image'
    ? active.config.imageModel || meta.defaultImageModel
    : active.config.analysisModel || meta.defaultAnalysisModel
}

function capabilityAvailable(
  settings: MediaSettingsSlice | null | undefined,
  gskLoggedIn: boolean,
  capability: MediaCapability,
): boolean {
  if (!settings) return gskLoggedIn
  const model = byokModel(settings, capability)
  if (model !== null) return model !== ''
  // the Genspark route is opted into by the provider choice itself — the
  // cloud-tools switch gates VEGA only
  return gskLoggedIn
}

/** live predicate for the generate_image tool: BYOK image model configured, or gsk login */
export function imageGenerationAvailable(
  settings: MediaSettingsSlice | null | undefined,
  gskLoggedIn: boolean,
): boolean {
  return capabilityAvailable(settings, gskLoggedIn, 'image')
}

/** live predicate for the analyze_media tool: image analysis or video analysis reachable */
export function mediaAnalysisAvailable(
  settings: MediaSettingsSlice | null | undefined,
  gskLoggedIn: boolean,
): boolean {
  return (
    capabilityAvailable(settings, gskLoggedIn, 'analysis') ||
    capabilityAvailable(settings, gskLoggedIn, 'video')
  )
}

export function videoAnalysisAvailable(
  settings: MediaSettingsSlice | null | undefined,
  gskLoggedIn: boolean,
): boolean {
  return capabilityAvailable(settings, gskLoggedIn, 'video')
}
