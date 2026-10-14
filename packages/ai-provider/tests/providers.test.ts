import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDERS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  activeProvider,
  clampMaxOutputTokens,
  cloudToolsEnabled,
  defaultAiSettings,
  maxOutputTokensOf,
  requestProvider,
  resolveAiSettings,
  withFastModel,
} from '../src/providers'
import { setIssuedVegaKeyGetter } from '../src/vega-key'
import type { AiProviderId } from '../src/types'

describe('defaultAiSettings', () => {
  it('gives every provider its default model and an empty key by default', () => {
    const settings = defaultAiSettings()
    expect(settings.provider).toBe('vega')
    for (const meta of AI_PROVIDERS) {
      expect(settings.providers[meta.id].apiKey).toBe('')
      expect(settings.providers[meta.id].model).toBe(meta.defaultModel)
    }
    expect(settings.providers.custom.baseUrl).toBe('')
    expect(settings.providers.codex.cliPath).toBe('')
    expect(settings.providers.codex.model).toBe('')
    expect(settings.providers.anthropic.baseUrl).toBeUndefined()
  })

  it('applies caller-supplied default keys only to the listed providers', () => {
    const settings = defaultAiSettings({ anthropic: 'sk-ant-preset' })
    expect(settings.providers.anthropic.apiKey).toBe('sk-ant-preset')
    expect(settings.providers.gemini.apiKey).toBe('')
  })
})

describe('provider model catalog', () => {
  it('serves DeepSeek V4.1 Flash through the Genspark proxy under its hyphenated pool id', () => {
    const genspark = AI_PROVIDERS.find((provider) => provider.id === 'genspark')!
    expect(genspark.models).toContain('deep-seek-v4.1-flash')
    expect(genspark.models).not.toContain('deep-seek-v4-pro')
  })

  it('keeps Responses-only models out of the OpenCode tiers (no such protocol yet)', () => {
    for (const id of ['opencode-zen', 'opencode-go'] as const) {
      const meta = AI_PROVIDERS.find((provider) => provider.id === id)!
      expect(meta.models).toContain(meta.defaultModel)
      expect(meta.needsBaseUrl).toBeUndefined()
      for (const model of meta.models) {
        expect(model).not.toMatch(/^(gpt-|grok-|muse-spark-)/)
      }
    }
  })

  it('seeds Atlas Cloud with lab-namespaced model ids', () => {
    const atlas = AI_PROVIDERS.find((provider) => provider.id === 'atlascloud')!
    expect(atlas.models).toContain(atlas.defaultModel)
    expect(atlas.needsBaseUrl).toBeUndefined()
    for (const model of atlas.models) {
      expect(model).toMatch(/^[a-z0-9-]+\/[A-Za-z0-9._-]+$/)
    }
  })

  it('seeds Sber with the current GigaChat lineup and a live catalog', () => {
    const sber = AI_PROVIDERS.find((provider) => provider.id === 'sber')!
    expect(sber.models).toContain(sber.defaultModel)
    expect(sber.liveCatalog).toBe(true)
    for (const model of sber.models) {
      expect(model).toMatch(/^GigaChat-\d/)
    }
  })

  it('seeds Yandex with folder-scoped gpt:// model URIs', () => {
    const yandex = AI_PROVIDERS.find((provider) => provider.id === 'yandex')!
    expect(yandex.models).toContain(yandex.defaultModel)
    // the folder id rides inside the model URI, so the picker must stay editable
    expect(yandex.liveCatalog).toBe(true)
    for (const model of yandex.models) {
      expect(model).toMatch(/^gpt:\/\//)
    }
  })
})

describe('resolveAiSettings', () => {
  it('returns fresh defaults when nothing is stored', () => {
    const defaults = defaultAiSettings({ anthropic: 'sk-ant-preset' })
    expect(resolveAiSettings({}, defaults)).toEqual(defaults)
  })

  it('falls back to defaults for null and non-object settings roots', () => {
    for (const stored of [null, 'settings', 7, true, []]) {
      const defaults = defaultAiSettings()
      expect(resolveAiSettings(stored, defaults)).toEqual(defaults)
    }
  })

  it('falls back to defaults for null and non-object provider maps', () => {
    for (const providers of [null, 'providers', 7, true, []]) {
      const defaults = defaultAiSettings()
      expect(resolveAiSettings({ providers } as never, defaults)).toEqual(defaults)
    }
  })

  it('ignores null and non-object provider entries', () => {
    for (const entry of [null, 'provider', 7, true, []]) {
      const defaults = defaultAiSettings()
      const resolved = resolveAiSettings(
        { provider: 'anthropic', providers: { anthropic: entry } } as never,
        defaults,
      )
      expect(resolved.providers.anthropic).toEqual(defaults.providers.anthropic)
      expect(activeProvider(resolved)).toBe('genspark')
    }
  })

  it('migrates the pre-provider single-endpoint shape into the custom provider', () => {
    const defaults = defaultAiSettings()
    const resolved = resolveAiSettings(
      { apiKey: 'legacy-key', model: 'legacy-model', baseUrl: 'https://legacy.example.com/v1' },
      defaults,
    )
    expect(resolved.providers.custom).toEqual({
      apiKey: 'legacy-key',
      model: 'legacy-model',
      baseUrl: 'https://legacy.example.com/v1',
    })
    // untouched providers keep their defaults
    expect(resolved.providers.anthropic).toEqual(defaults.providers.anthropic)
  })

  it('defaults the legacy base URL to the OpenAI endpoint when omitted', () => {
    const resolved = resolveAiSettings({ apiKey: 'legacy-key' }, defaultAiSettings())
    expect(resolved.providers.custom.baseUrl).toBe('https://api.openai.com/v1')
  })

  it('merges stored multi-provider settings over the defaults, provider by provider', () => {
    const defaults = defaultAiSettings({ anthropic: 'preset-key' })
    const resolved = resolveAiSettings(
      {
        provider: 'gemini',
        providers: {
          gemini: { apiKey: 'stored-gemini-key', model: 'gemini-2.5-pro' },
        } as never,
      },
      defaults,
    )
    expect(resolved.provider).toBe('gemini')
    expect(resolved.providers.gemini).toEqual({
      apiKey: 'stored-gemini-key',
      model: 'gemini-2.5-pro',
    })
    // provider not mentioned in stored.providers keeps the computed default
    expect(resolved.providers.anthropic.apiKey).toBe('preset-key')
  })

  it('rewrites a stored model id the vendor has retired', () => {
    const resolved = resolveAiSettings(
      {
        providers: {
          genspark: { apiKey: 'sk-user', model: 'claude-opus-4-8' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.genspark).toEqual({
      apiKey: 'sk-user',
      model: 'claude-opus-5-5',
    })
  })

  it('rewrites genspark model ids the proxy no longer serves', () => {
    const resolved = resolveAiSettings(
      {
        providers: {
          genspark: { apiKey: '', model: 'gemini-3.7-flash' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.genspark.model).toBe('claude-opus-5-5')

    const gpt = resolveAiSettings(
      {
        providers: {
          genspark: { apiKey: '', model: 'gpt-5.6' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(gpt.providers.genspark.model).toBe('gpt-5.6-terra')
  })

  it('leaves a still-supported model id alone', () => {
    const resolved = resolveAiSettings(
      {
        providers: {
          openai: { apiKey: 'sk-user', model: 'gpt-5.6-terra' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.openai.model).toBe('gpt-5.6-terra')
  })

  it('trims whitespace pasted around stored keys and base URLs', () => {
    const resolved = resolveAiSettings(
      {
        providers: {
          openai: { apiKey: ' sk-user\n', model: ' gpt-5.6-terra ' },
          custom: { apiKey: 'k', model: ' m ', baseUrl: ' http://localhost:1234/v1 ' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.openai.apiKey).toBe('sk-user')
    expect(resolved.providers.openai.model).toBe('gpt-5.6-terra')
    expect(resolved.providers.openai.baseUrl).toBeUndefined()
    expect(resolved.providers.custom.model).toBe('m')
    expect(resolved.providers.custom.baseUrl).toBe('http://localhost:1234/v1')
  })

  it('still remaps retired model ids padded with whitespace', () => {
    const resolved = resolveAiSettings(
      {
        providers: {
          genspark: { apiKey: 'sk-user', model: ' gpt-5.6 ' },
        } as never,
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.genspark.model).toBe('gpt-5.6-terra')
  })

  it('trims the legacy single-endpoint key and base URL too', () => {
    const resolved = resolveAiSettings(
      {
        apiKey: ' legacy-key ',
        model: ' legacy-model ',
        baseUrl: ' https://legacy.example.com/v1 ',
      },
      defaultAiSettings(),
    )
    expect(resolved.providers.custom.apiKey).toBe('legacy-key')
    expect(resolved.providers.custom.model).toBe('legacy-model')
    expect(resolved.providers.custom.baseUrl).toBe('https://legacy.example.com/v1')
  })

  it('carries a stored output cap and clamps a hand-edited one', () => {
    // a multi-provider file (the legacy single-endpoint shape returns defaults wholesale)
    const stored = { providers: {} as never }
    expect(
      resolveAiSettings({ ...stored, maxOutputTokens: 32768 }, defaultAiSettings()).maxOutputTokens,
    ).toBe(32768)
    // a settings file edited by hand must not forward an absurd budget to the endpoint
    expect(
      resolveAiSettings({ ...stored, maxOutputTokens: 1 }, defaultAiSettings()).maxOutputTokens,
    ).toBe(MIN_MAX_OUTPUT_TOKENS)
    expect(
      resolveAiSettings({ ...stored, maxOutputTokens: 1e9 }, defaultAiSettings()).maxOutputTokens,
    ).toBe(MAX_MAX_OUTPUT_TOKENS)
    // absent stays absent: pre-existing settings files keep the default behaviour
    expect('maxOutputTokens' in resolveAiSettings(stored, defaultAiSettings())).toBe(false)
  })
})

describe('maxOutputTokensOf', () => {
  it('falls back to the default when the setting is absent or unusable', () => {
    expect(maxOutputTokensOf({})).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
    expect(maxOutputTokensOf(undefined)).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
    expect(maxOutputTokensOf({ maxOutputTokens: Number.NaN })).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
    expect(maxOutputTokensOf({ maxOutputTokens: '8192' as unknown as number })).toBe(
      DEFAULT_MAX_OUTPUT_TOKENS,
    )
  })

  it('honors a stored cap inside the bounds', () => {
    expect(maxOutputTokensOf({ maxOutputTokens: 16384 })).toBe(16384)
    expect(maxOutputTokensOf({ maxOutputTokens: 3.7 })).toBe(MIN_MAX_OUTPUT_TOKENS)
    expect(maxOutputTokensOf({ maxOutputTokens: 20000 })).toBe(20000)
  })
})

describe('clampMaxOutputTokens', () => {
  it('floors, bounds and defaults whatever the settings field or the input box held', () => {
    expect(clampMaxOutputTokens(16384.9)).toBe(16384)
    expect(clampMaxOutputTokens(0)).toBe(MIN_MAX_OUTPUT_TOKENS)
    expect(clampMaxOutputTokens(5e6)).toBe(MAX_MAX_OUTPUT_TOKENS)
    expect(clampMaxOutputTokens(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
    expect(clampMaxOutputTokens(undefined)).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
  })
})

describe('activeProvider', () => {
  it('honors a configured BYOK provider and falls back to genspark otherwise', () => {
    const settings = defaultAiSettings()
    expect(activeProvider(settings)).toBe('genspark')

    settings.provider = 'xai'
    expect(activeProvider(settings)).toBe('genspark') // no key yet
    settings.providers.xai.apiKey = 'sk-user'
    expect(activeProvider(settings)).toBe('xai')
  })

  it('requires a base URL for providers that declare needsBaseUrl', () => {
    const settings = defaultAiSettings()
    settings.provider = 'custom'
    settings.providers.custom.apiKey = 'k'
    expect(activeProvider(settings)).toBe('genspark')
    settings.providers.custom.baseUrl = 'http://localhost:1234/v1'
    expect(activeProvider(settings)).toBe('genspark') // custom's default model is empty
    settings.providers.custom.model = 'my-model'
    expect(activeProvider(settings)).toBe('custom')
  })

  it('allows keyless custom endpoints for local servers', () => {
    const settings = defaultAiSettings()
    settings.provider = 'custom'
    settings.providers.custom.apiKey = ''
    settings.providers.custom.baseUrl = 'http://localhost:11434/v1'
    settings.providers.custom.model = 'llama3'
    expect(activeProvider(settings)).toBe('custom')
  })

  it('auto-discovers Codex without an API key and preserves an optional override', () => {
    const settings = defaultAiSettings()
    settings.provider = 'codex'
    expect(activeProvider(settings)).toBe('codex')
    settings.providers.codex.cliPath = ' C:\\Tools\\codex.exe '
    expect(activeProvider(settings)).toBe('codex')

    const resolved = resolveAiSettings(
      { providers: { codex: settings.providers.codex } as never },
      defaultAiSettings(),
    )
    expect(resolved.providers.codex.cliPath).toBe('C:\\Tools\\codex.exe')
    expect(resolved.providers.codex.apiKey).toBe('')
  })

  it('treats whitespace-only keys, URLs, and models as unconfigured', () => {
    const settings = defaultAiSettings()
    settings.provider = 'xai'
    settings.providers.xai.apiKey = '   '
    expect(activeProvider(settings)).toBe('genspark')
    settings.providers.xai.apiKey = 'sk-user'
    settings.providers.xai.model = '  '
    expect(activeProvider(settings)).toBe('genspark')
    settings.providers.xai.model = 'grok-4.6'
    expect(activeProvider(settings)).toBe('xai')

    const custom = defaultAiSettings()
    custom.provider = 'custom'
    custom.providers.custom.baseUrl = '   '
    custom.providers.custom.model = 'my-model'
    expect(activeProvider(custom)).toBe('genspark')
  })

  it('falls back to genspark for unknown ids from a hand-edited settings file', () => {
    const settings = defaultAiSettings()
    settings.provider = 'nonsense' as AiProviderId
    expect(activeProvider(settings)).toBe('genspark')
  })

  it('genspark never requires a key (injected from the gsk login at request time)', () => {
    const settings = defaultAiSettings()
    settings.provider = 'genspark'
    expect(activeProvider(settings)).toBe('genspark')
  })

  it('stored vega without a key routes to genspark but keeps the stored pick', () => {
    const settings = defaultAiSettings()
    expect(settings.provider).toBe('vega')
    expect(activeProvider(settings)).toBe('genspark') // no VEGA key yet
    settings.providers.vega.apiKey = 'sk-apivega-test'
    expect(activeProvider(settings)).toBe('vega')
    expect(settings.provider).toBe('vega') // stored pick untouched
  })

  it('a stored genspark pick upgrades to vega once a VEGA credential exists', () => {
    // legacy installs carry provider:'genspark' from when it was the default;
    // a VEGA sign-in (issued key, simulated here by the stored slot) is the
    // new default and wins over it
    const settings = defaultAiSettings()
    settings.provider = 'genspark'
    expect(activeProvider(settings)).toBe('genspark')
    settings.providers.vega.apiKey = 'sk-apivega-test'
    expect(activeProvider(settings)).toBe('vega')
  })
})

describe('requestProvider', () => {
  it('passes a non-genspark pick through untouched, keyless BYOK included', () => {
    // the settings dialog's test-connection sends a stored-but-keyless pick;
    // re-resolving it here would silently test the fallback provider instead
    const settings = defaultAiSettings()
    settings.provider = 'xai'
    const { provider, config } = requestProvider(settings)
    expect(provider).toBe('xai')
    expect(config).toBe(settings.providers.xai)
  })

  it('keeps a stored vega pick as-is (the handler injects the issued key)', () => {
    const settings = defaultAiSettings()
    expect(settings.provider).toBe('vega')
    const { provider, config } = requestProvider(settings)
    expect(provider).toBe('vega')
    expect(config).toBe(settings.providers.vega)
  })

  it('keeps genspark while no VEGA credential exists', () => {
    const settings = defaultAiSettings()
    settings.provider = 'genspark'
    const { provider, config } = requestProvider(settings)
    expect(provider).toBe('genspark')
    expect(config).toBe(settings.providers.genspark)
  })

  it('upgrades a stale genspark snapshot to vega on a stored VEGA key', () => {
    const settings = defaultAiSettings()
    settings.provider = 'genspark'
    settings.providers.vega.apiKey = 'sk-apivega-stored'
    const { provider, config } = requestProvider(settings)
    expect(provider).toBe('vega')
    expect(config?.apiKey).toBe('sk-apivega-stored')
  })

  it('upgrades a stale genspark snapshot on the sign-in-issued key', () => {
    // a renderer's pre-login settings snapshot keeps provider:'genspark'
    // (ai:get-settings resolved it before the key existed); the issued key
    // lives in auth.json, not in the snapshot — the getter supplies it here
    setIssuedVegaKeyGetter(() => 'sk-apivega-issued')
    try {
      const settings = defaultAiSettings()
      settings.provider = 'genspark'
      const { provider, config } = requestProvider(settings)
      expect(provider).toBe('vega')
      expect(config?.apiKey).toBe('sk-apivega-issued')
      // the stored slot is not mutated — the issued key rides on the copy
      expect(settings.providers.vega.apiKey).toBe('')
    } finally {
      setIssuedVegaKeyGetter(() => '')
    }
  })
})

describe('vegaToolsEnabled', () => {
  it('defaults on, survives resolveAiSettings, and only an explicit false turns it off', () => {
    expect(cloudToolsEnabled(defaultAiSettings())).toBe(true)
    // pre-toggle settings file (field absent) stays on
    const legacy = resolveAiSettings({ providers: {} as never }, defaultAiSettings())
    expect(cloudToolsEnabled(legacy)).toBe(true)
    const off = resolveAiSettings(
      { providers: {} as never, vegaToolsEnabled: false },
      defaultAiSettings(),
    )
    expect(off.vegaToolsEnabled).toBe(false)
    expect(cloudToolsEnabled(off)).toBe(false)
    // the legacy gskToolsEnabled field carries the opt-out into the new name
    const migrated = resolveAiSettings(
      { providers: {} as never, gskToolsEnabled: false },
      defaultAiSettings(),
    )
    expect(migrated.vegaToolsEnabled).toBe(false)
    expect(cloudToolsEnabled(migrated)).toBe(false)
    // an explicit new value wins over a contradictory legacy field
    const on = resolveAiSettings(
      { providers: {} as never, vegaToolsEnabled: true, gskToolsEnabled: false },
      defaultAiSettings(),
    )
    expect(cloudToolsEnabled(on)).toBe(true)
    // legacy single-endpoint files migrate the flag too
    const slim = resolveAiSettings({ apiKey: 'k', gskToolsEnabled: false }, defaultAiSettings())
    expect(slim.vegaToolsEnabled).toBe(false)
  })
})

describe('piiShieldEnabled', () => {
  it('defaults on, survives resolveAiSettings, and only an explicit false turns it off', () => {
    expect(defaultAiSettings().piiShieldEnabled).toBe(true)
    // pre-toggle settings file (field absent) keeps masking
    const legacy = resolveAiSettings({ providers: {} as never }, defaultAiSettings())
    expect(legacy.piiShieldEnabled).toBe(true)
    const off = resolveAiSettings(
      { providers: {} as never, piiShieldEnabled: false },
      defaultAiSettings(),
    )
    expect(off.piiShieldEnabled).toBe(false)
    const on = resolveAiSettings(
      { providers: {} as never, piiShieldEnabled: true },
      defaultAiSettings(),
    )
    expect(on.piiShieldEnabled).toBe(true)
    // legacy single-endpoint files keep the opt-out too
    const slim = resolveAiSettings({ apiKey: 'k', piiShieldEnabled: false }, defaultAiSettings())
    expect(slim.piiShieldEnabled).toBe(false)
  })
})

describe('withFastModel', () => {
  it('swaps fastModel into model on every provider that defines one', () => {
    const settings = defaultAiSettings()
    settings.providers.anthropic = {
      ...settings.providers.anthropic,
      apiKey: 'k',
      fastModel: 'claude-haiku-4-5-20251001',
    }
    settings.provider = 'anthropic'
    const fast = withFastModel(settings)
    expect(fast.providers.anthropic.model).toBe('claude-haiku-4-5-20251001')
    // the shipped vega fast tier swaps in too
    expect(fast.providers.vega.model).toBe('openai/gpt-6-luna')
    // untouched providers keep their own model — including the stored config
    expect(settings.providers.anthropic.model).toBe('claude-sonnet-5')
    expect(fast.providers.gemini.model).toBe('gemini-3.8-flash')
  })

  it('returns the same object when no provider configures a fast model', () => {
    const settings = defaultAiSettings()
    // vega ships a default fast tier — clear it so no provider has one
    settings.providers.vega = { ...settings.providers.vega, fastModel: undefined }
    expect(withFastModel(settings)).toBe(settings)
  })

  it('ignores a blank fastModel', () => {
    const settings = defaultAiSettings()
    settings.providers.openai = { ...settings.providers.openai, fastModel: '   ' }
    expect(withFastModel(settings).providers.openai.model).toBe('gpt-5.6-terra')
  })
})

describe('fastModel settings plumbing', () => {
  it('resolveAiSettings trims a stored fastModel and drops an empty one', () => {
    const stored = defaultAiSettings()
    stored.providers.anthropic = {
      ...stored.providers.anthropic,
      fastModel: '  claude-haiku-4-5-20251001  ',
    }
    stored.providers.openai = { ...stored.providers.openai, fastModel: '' }
    const resolved = resolveAiSettings(stored, defaultAiSettings())
    expect(resolved.providers.anthropic.fastModel).toBe('claude-haiku-4-5-20251001')
    expect(resolved.providers.openai.fastModel).toBeUndefined()
  })

  it('migrateRetiredModels remaps a retired fastModel too', () => {
    const stored = defaultAiSettings()
    stored.providers.genspark = {
      ...stored.providers.genspark,
      model: 'claude-opus-4-8',
      fastModel: 'claude-opus-4-7',
    }
    const resolved = resolveAiSettings(stored, defaultAiSettings())
    expect(resolved.providers.genspark.model).toBe('claude-opus-5-5')
    expect(resolved.providers.genspark.fastModel).toBe('claude-opus-5-5')
  })
})
