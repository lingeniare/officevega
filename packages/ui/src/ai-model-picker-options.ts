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
 * Credential state the picker gates account groups on (carries the same
 * fields ai:gsk-status reports):
 * - `accountLoggedIn` — the app's own account is signed in (an issued VEGA
 *   key exists); the account slot exists only while this is true
 * - `gskUsable` — a shared gsk CLI credential can serve the legacy genspark
 *   pool; without it that pool is a dead list
 * A bare boolean keeps old call sites working: true = both flags on.
 */
export interface AiPickerAuth {
  readonly accountLoggedIn?: boolean | undefined
  readonly gskUsable?: boolean | undefined
  /** any-credential bit from ai:gsk-status — the fallback when the finer flags are absent */
  readonly loggedIn?: boolean | undefined
}

function normalizePickerAuth(auth: boolean | AiPickerAuth | null | undefined): {
  accountLoggedIn: boolean
  gskUsable: boolean
} {
  if (typeof auth === 'boolean') return { accountLoggedIn: auth, gskUsable: auth }
  return {
    accountLoggedIn: auth?.accountLoggedIn ?? auth?.loggedIn ?? false,
    gskUsable: auth?.gskUsable ?? auth?.loggedIn ?? false,
  }
}

/**
 * Providers the composer chip may switch to: the account slot while signed
 * into VEGA (the legacy genspark pool only when its shared gsk credential can
 * actually serve it), every other vendor once its settings pass the same
 * usability test the chat path applies (`activeProvider`), so picking a row
 * never lands on a 401. A model typed into the settings page that is not in
 * the catalog is listed first.
 */
export function aiModelPickerGroups(
  input: AiSettings,
  auth: boolean | AiPickerAuth | null | undefined,
): AiModelPickerGroup[] {
  const { accountLoggedIn, gskUsable } = normalizePickerAuth(auth)
  const settings = resolveCustomEndpoints(input)
  const groups: AiModelPickerGroup[] = []
  for (const meta of AI_PROVIDERS) {
    if (meta.id === 'custom') {
      for (const ep of settings.customEndpoints ?? []) {
        if (!ep.baseUrl || !ep.model) continue
        // Declared models come before a server probe's answer: a profile entry
        // is the user's own list, which outranks what the server advertised
        // (a server that no longer serves an id the user pinned keeps it
        // selectable). The configured model is pinned to the top, as before.
        const ids = [ep.model, ...(ep.modelProfiles ?? []).map((m) => m.id), ...(ep.models ?? [])]
        const seen = new Set<string>()
        const models = ids.filter((m) => {
          if (!m || seen.has(m)) return false
          seen.add(m)
          return true
        })
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
      accountLoggedIn && settings.provider === 'vega' && !settings.providers?.vega?.apiKey?.trim()
    // CLI vendors pass activeProvider unconfigured (the binary auto-discovers);
    // list them only once the settings page holds a model or a path
    const usable =
      meta.id === 'genspark'
        ? // the genspark pool is a leftover shared-CLI credential, not the
          // app's account — show it only while signed into VEGA (a signed-out
          // user must not see a "Модели ИИ" group they never configured) and
          // only when the gsk key can actually serve it
          accountLoggedIn && gskUsable && !accountIsVega
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

/**
 * VEGA's authenticated catalog is account-scoped (~a dozen ids): a stored id
 * outside it — picked from the anonymous public catalog before sign-in, or
 * hand-edited — cannot be served on the sign-in key, so the selection heals to
 * the provider default (an off-catalog fastModel drops to "same as main").
 * Returns null when nothing needs fixing. Only meaningful for 'vega': every
 * other live catalog is vendor-wide, where an off-list id may still resolve.
 */
export function healVegaModelSelection(
  input: AiSettings,
  liveIds: readonly string[],
): AiSettings | null {
  const settings = resolveCustomEndpoints(input)
  const meta = AI_PROVIDERS.find((m) => m.id === 'vega')
  const config = settings.providers?.vega
  if (!meta?.defaultModel || !config) return null
  const model = config.model?.trim() ?? ''
  const fast = config.fastModel?.trim() ?? ''
  const modelBad = !!model && model !== meta.defaultModel && !liveIds.includes(model)
  const fastBad = !!fast && fast !== meta.defaultFastModel && !liveIds.includes(fast)
  if (!modelBad && !fastBad) return null
  return {
    ...settings,
    providers: {
      ...settings.providers,
      vega: {
        ...config,
        ...(modelBad ? { model: meta.defaultModel } : {}),
        ...(fastBad ? { fastModel: undefined } : {}),
      },
    },
  }
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
