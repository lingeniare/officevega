/** Browser-safe settings surface. Keep Node-backed transports out of renderer bundles. */
export type {
  AiCustomEndpoint,
  AiProviderConfig,
  AiProviderId,
  AiProviderMeta,
  AiSettings,
  CodexModelCatalog,
} from './types'
export {
  AI_PROVIDERS,
  activeProvider,
  cloudToolsEnabled,
  DEFAULT_MAX_OUTPUT_TOKENS,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  clampMaxOutputTokens,
  maxOutputTokensOf,
  piiShieldMayApply,
  withFastModel,
} from './providers'
export { isOutputCapRejection } from './output-cap'
export {
  activeCustomEndpoint,
  customEndpointLabel,
  newCustomEndpointId,
  removeCustomEndpoint,
  resolveCustomEndpoints,
  selectCustomEndpoint,
  upsertCustomEndpoint,
} from './custom-endpoints'
export { getProviderAdapter, modelLacksVision } from './registry'
export {
  AI_MEDIA_PROVIDERS,
  imageGenerationAvailable,
  mediaAnalysisAvailable,
  VEGA_BASE_URL,
} from './media'
export { AI_SEARCH_PROVIDERS, vegaSearchKey } from './search-settings'
export type { ModelFilter, ProviderModel, ProviderModelCatalog } from './model-catalog'
