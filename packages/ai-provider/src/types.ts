import type { AgentMessage, AgentToolCall, AgentToolDef } from '@genoffice/agent-core'

export type AiProviderId =
  | 'genspark'
  | 'vega'
  | 'codex'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'openai'
  | 'kimi'
  | 'glm'
  | 'qwen'
  | 'doubao'
  | 'minimax'
  | 'xai'
  | 'mistral'
  | 'openrouter'
  | 'requesty'
  | 'opper'
  | 'opencode-zen'
  | 'opencode-go'
  | 'custom'

/** Cloud account status: the VEGA sign-in (issued sk-apivega key) is primary, the shared gsk CLI login a fallback */
export interface GenSparkAccountStatus {
  loggedIn: boolean
  email?: string
}

export interface AiProviderConfig {
  apiKey: string
  model: string
  /**
   * Optional cheaper/faster model id for background helper calls (suggested
   * follow-up questions). Empty/absent = the main `model` serves those too.
   */
  fastModel?: string | undefined
  /** required for custom; for other direct providers it overrides the default endpoint (regional mirrors) */
  baseUrl?: string | undefined
  /** optional Codex CLI override; empty means auto-detect the current authenticated install */
  cliPath?: string | undefined
}

/** Live picker data returned by Codex app-server's model/list method. */
export interface CodexModelCatalog {
  models: string[]
  defaultModel: string
}

export interface AiProviderMeta {
  id: AiProviderId
  label: string
  models: string[]
  defaultModel: string
  /** optional fast/cheap tier shipped in fresh configs (absent = same as `defaultModel`) */
  defaultFastModel?: string
  keyPlaceholder: string
  needsBaseUrl?: boolean
  needsCliPath?: boolean
  /** model list is fetched live from {base}/models (OpenRouter-style catalog); `models` holds fallback ids only */
  liveCatalog?: boolean
}

/** Image generation / media analysis backends (separate from the chat provider) */
export type AiMediaProviderId =
  | 'genspark'
  | 'vega'
  | 'openai'
  | 'gemini'
  | 'doubao'
  | 'glm'
  | 'xai'
  | 'qwen'
  | 'minimax'
  | 'deepseek'
  | 'custom'

/** wire shape of the image endpoint */
export type AiImageProtocol = 'openai-images' | 'gemini' | 'dashscope' | 'minimax'
/** wire shape of the understanding endpoint */
export type AiAnalysisProtocol = 'openai-chat' | 'gemini'

/** media picker list entry: a bare model id, or an id paired with its catalog display name */
export type AiMediaModelEntry = string | { id: string; name: string }

export interface AiMediaProviderConfig {
  apiKey: string
  /** required for custom; for the others it overrides the official endpoint (regional mirrors) */
  baseUrl?: string | undefined
  /** image generation model (empty = the provider default) */
  imageModel: string
  /** image/video understanding model (empty = the provider default) */
  analysisModel: string
}

export interface AiMediaProviderMeta {
  id: AiMediaProviderId
  label: string
  /** one-line English blurb shown on the provider card */
  description: string
  keyPlaceholder: string
  needsBaseUrl?: boolean
  /** '' for genspark (gsk login) and custom (user-supplied) */
  defaultBaseUrl: string
  /** absent = the provider does not generate images */
  imageProtocol?: AiImageProtocol
  imageModels: AiMediaModelEntry[]
  defaultImageModel: string
  /** absent = the provider does not analyze media */
  analysisProtocol?: AiAnalysisProtocol
  analysisModels: AiMediaModelEntry[]
  defaultAnalysisModel: string
  /** fixed slot for video/audio payloads when it differs from `defaultAnalysisModel` (absent = same model) */
  defaultVideoAnalysisModel?: string
  /** the analysis model accepts video input (Gemini natively; OpenAI-compatible vendors via a video_url part) */
  videoAnalysis: boolean
  /** model pickers are refreshed live from {base}/models; the static lists are the offline fallback */
  liveCatalog?: boolean
}

export interface AiMediaSettings {
  /** provider behind generate_image */
  imageProvider: AiMediaProviderId
  /** provider behind analyze_media for images */
  analysisProvider: AiMediaProviderId
  /** provider behind analyze_media when the input has video/audio (only video-capable vendors qualify) */
  videoAnalysisProvider: AiMediaProviderId
  providers: Record<AiMediaProviderId, AiMediaProviderConfig>
  /** pre-catalog shape (one provider for both); migrated by resolveAiMediaSettings */
  provider?: AiMediaProviderId | undefined
}

/** web/image search backends: VEGA, account sign-in (gsk), or a user key for Serper / Serply / Tavily / Parallel (Parallel also runs keyless) */
export type AiSearchProviderId =
  | 'genspark'
  | 'vega'
  | 'serper'
  | 'serply'
  | 'tavily'
  | 'parallel'

export interface AiSearchProviderMeta {
  id: AiSearchProviderId
  label: string
  keyPlaceholder: string
  /** the backend also serves image search (otherwise image search falls back to free sources) */
  imageSearch: boolean
}

export interface AiSearchSettings {
  provider: AiSearchProviderId
  providers: Record<Exclude<AiSearchProviderId, 'genspark'>, { apiKey: string }>
}

export interface AiSettings {
  provider: AiProviderId
  /**
   * Transport-only hint from ai:get-settings: the stored provider pick when it
   * differs from `provider` (which get-settings reports as the *effective* one —
   * a half-configured BYOK selection falls back to genspark at request time).
   * The settings UI shows the stored pick so a save can't clobber it; main
   * strips it before persisting.
   */
  storedProvider?: AiProviderId
  providers: Record<AiProviderId, AiProviderConfig>
  /**
   * Provider for generate_image / analyze_media. Absent (pre-media settings
   * files) means Genspark, i.e. the gsk login + gskToolsEnabled gate.
   */
  media?: AiMediaSettings | undefined
  /** web/image search backend; absent means Genspark (gsk when signed in, then the free chain) */
  search?: AiSearchSettings | undefined
  /**
   * VEGA cloud tools (web search, image generation and media analysis routed
   * through api.vega.chat). Default true; false makes the vega provider
   * unavailable for those tools — they fall back to the Genspark sign-in or
   * free sources. The chat provider is unaffected.
   */
  vegaToolsEnabled?: boolean
  /**
   * Legacy name of vegaToolsEnabled (the switch used to gate the Genspark
   * backend). Read as a fallback during settings resolution; never written.
   */
  gskToolsEnabled?: boolean
  /**
   * Output-token cap for ONE model turn of agent runs (default
   * DEFAULT_MAX_OUTPUT_TOKENS). Reasoning models bill their thinking against
   * this same budget, so a heavy edit turn can consume all of it and close with
   * finish_reason=length and no prose at all — raising it is the user's lever
   * (absent = the default, so pre-existing settings files keep working).
   */
  maxOutputTokens?: number | undefined
}

/** pre-provider settings shape (single OpenAI-compatible endpoint); migrated into "custom" */
export interface LegacyAiSettings {
  baseUrl?: string
  apiKey?: string
  model?: string
}

export interface AiChatRequest {
  settings: AiSettings
  system: string
  user: string
}

export interface AiChatResponse {
  ok: boolean
  content?: string
  error?: string
}

export interface AiStreamRequest {
  requestId: string
  /** Stable renderer transport id used to retain native provider sessions. */
  sessionId?: string
  settings: AiSettings
  system: string
  messages: AgentMessage[]
  tools?: AgentToolDef[]
  maxTokens?: number
}

export interface AiStreamChunk {
  requestId: string
  /** 'ping' = wire-level keepalive so the renderer can tell a live stream from a dead one;
   * 'reasoning' = model thinking delta (text carries it), stored for interleaved-thinking echo */
  type: 'delta' | 'reasoning' | 'tool-call' | 'done' | 'error' | 'ping'
  text?: string
  /** complete parsed tool call (emitted once its arguments finish streaming) */
  toolCall?: AgentToolCall
  error?: string
  /** machine-readable error cause ('timeout', exhausted 'credits', 'network' connectivity failure, 'overloaded' capacity/rate limit); lets the renderer localize the message */
  errorCode?: 'timeout' | 'credits' | 'network' | 'overloaded'
  /** normalized stop reason carried on 'done' ('max_tokens' = output cut off by the token limit) */
  stopReason?: string
}
