import {
  AI_PROVIDERS,
  activeProvider,
  customEndpointLabel,
  resolveCustomEndpoints,
  upsertCustomEndpoint,
  type AiProviderId,
  type AiSettings,
} from '@genoffice/ai-provider/browser'

export interface AiModelPickerGroup {
  readonly id: AiProviderId
  /** set on custom groups: one group per saved endpoint */
  readonly endpoint?: string | undefined
  readonly label: string
  readonly models: readonly string[]
  /** static id → display name map (genspark's curated pool); live catalog names merge over it */
  readonly names?: Readonly<Record<string, string>> | undefined
  /** the provider serves an OpenRouter-style {base}/models catalog with real display names */
  readonly liveCatalog?: boolean | undefined
  /** ids that stay pickable on top when the live catalog list lands (stored + default), same pin rule as the settings pane */
  readonly pinned?: readonly string[] | undefined
  /** this group is the signed-in account slot — the picker heads it with the localized "AI models" label */
  readonly account?: boolean | undefined
}

export interface AiModelPickerSelection {
  readonly provider: AiProviderId
  readonly endpoint?: string | undefined
  readonly model: string
}

/**
 * Providers the composer chip may switch to: Genspark while signed in, every
 * other vendor once its settings pass the same usability test the chat path
 * applies (`activeProvider`), so picking a row never lands on a 401. A model
 * typed into the settings page that is not in the catalog is listed first.
 */
export function aiModelPickerGroups(input: AiSettings, gskLoggedIn: boolean): AiModelPickerGroup[] {
  const settings = resolveCustomEndpoints(input)
  const groups: AiModelPickerGroup[] = []
  for (const meta of AI_PROVIDERS) {
    if (meta.id === 'custom') {
      for (const ep of settings.customEndpoints ?? []) {
        if (!ep.baseUrl || !ep.model) continue
        const models = [ep.model, ...(ep.models ?? []).filter((m) => m !== ep.model)]
        groups.push({
          id: meta.id,
          endpoint: ep.id,
          label: customEndpointLabel(ep, meta.label),
          models,
          ...(ep.model ? { pinned: [ep.model] } : {}),
        })
      }
      continue
    }
    const config = settings.providers?.[meta.id]
    const stored = config?.model?.trim() ?? ''
    // The sign-in issues a VEGA key that only the main process can see — when
    // it resolved the effective provider to 'vega' with no user-stored key,
    // the account IS VEGA: the legacy genspark pool group must not show (its
    // static ids are not on the api.vega.chat catalog), and the vega group
    // stands in as the account slot.
    const accountIsVega =
      gskLoggedIn && settings.provider === 'vega' && !settings.providers?.vega?.apiKey?.trim()
    // CLI vendors pass activeProvider unconfigured (the binary auto-discovers);
    // list them only once the settings page holds a model or a path
    const usable =
      meta.id === 'genspark'
        ? gskLoggedIn && !accountIsVega
        : meta.needsCliPath
          ? Boolean(stored || config?.cliPath?.trim())
          : // `settings.provider` is already main-resolved: it proves a
            // credential the renderer can't see (the issued VEGA key)
            settings.provider === meta.id ||
            activeProvider({ ...settings, provider: meta.id }) === meta.id
    if (!usable) continue
    const models = stored && !meta.models.includes(stored) ? [stored, ...meta.models] : meta.models
    // a live-catalog provider with no stored model still lists its default so
    // the group exists while the catalog fetch fills in the rest
    const listed = models.length ? models : meta.defaultModel ? [meta.defaultModel] : []
    if (listed.length === 0 && !meta.needsCliPath) continue
    groups.push({
      id: meta.id,
      label: meta.label,
      models: listed,
      pinned: [...new Set([stored, meta.defaultModel])].filter((m): m is string => !!m),
      ...(meta.id === 'genspark' || (meta.id === 'vega' && accountIsVega)
        ? { account: true }
        : {}),
      ...(meta.modelNames ? { names: meta.modelNames } : {}),
      ...(meta.liveCatalog ? { liveCatalog: true } : {}),
    })
  }
  return groups
}

export function aiModelPickerSelection(input: AiSettings): AiModelPickerSelection {
  const settings = resolveCustomEndpoints(input)
  let provider = activeProvider(settings)
  // renderer-side issuedVegaKey() is always '': a main-resolved 'vega' pick
  // downgrades to 'genspark' here only because the issued key is invisible —
  // trust the stored (main-resolved) route instead
  if (provider === 'genspark' && settings.provider === 'vega') provider = 'vega'
  const meta = AI_PROVIDERS.find((m) => m.id === provider)
  const model = settings.providers?.[provider]?.model?.trim() || meta?.defaultModel || ''
  if (provider === 'custom' && settings.customEndpoint) {
    return { provider, endpoint: settings.customEndpoint, model }
  }
  return { provider, model }
}

export function withAiModelSelection(input: AiSettings, pick: AiModelPickerSelection): AiSettings {
  const settings = resolveCustomEndpoints(input)
  if (pick.provider === 'custom' && pick.endpoint) {
    const ep = settings.customEndpoints?.find((e) => e.id === pick.endpoint)
    if (ep) {
      return {
        ...upsertCustomEndpoint(settings, { ...ep, model: pick.model }, true),
        provider: 'custom',
      }
    }
  }
  const config = settings.providers[pick.provider] ?? { apiKey: '', model: '' }
  return {
    ...settings,
    provider: pick.provider,
    providers: { ...settings.providers, [pick.provider]: { ...config, model: pick.model } },
  }
}
