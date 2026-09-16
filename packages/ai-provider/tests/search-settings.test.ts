import { describe, expect, it } from 'vitest'
import { defaultAiSettings, resolveAiSettings } from '../src/providers'
import {
  activeSearchProvider,
  defaultAiSearchSettings,
  resolveAiSearchSettings,
  vegaSearchKey,
} from '../src/search-settings'

const emptyKeys = {
  vega: { apiKey: '' },
  serper: { apiKey: '' },
  tavily: { apiKey: '' },
}

describe('search settings', () => {
  it('defaults to vega with empty keys and rides along in defaultAiSettings', () => {
    expect(defaultAiSearchSettings()).toEqual({
      provider: 'vega',
      providers: emptyKeys,
    })
    expect(defaultAiSettings().search?.provider).toBe('vega')
    const resolved = resolveAiSettings(
      { provider: 'genspark', providers: {} as never },
      defaultAiSettings(),
    )
    expect(resolved.search).toEqual(defaultAiSearchSettings())
  })

  it('merges and trims stored keys', () => {
    const s = resolveAiSearchSettings({
      provider: 'tavily',
      providers: { tavily: { apiKey: ' tvly-1 ' } } as never,
    })
    expect(s.provider).toBe('tavily')
    expect(s.providers.tavily.apiKey).toBe('tvly-1')
    expect(s.providers.serper.apiKey).toBe('')
    expect(s.providers.vega.apiKey).toBe('')
  })

  it('activates a BYOK search provider only with a key', () => {
    expect(activeSearchProvider({ search: undefined })).toBe('genspark')
    expect(
      activeSearchProvider({
        search: { provider: 'serper', providers: emptyKeys },
      }),
    ).toBe('genspark')
    expect(
      activeSearchProvider({
        search: {
          provider: 'serper',
          providers: { ...emptyKeys, serper: { apiKey: 'k' } },
        },
      }),
    ).toBe('serper')
    expect(
      activeSearchProvider({
        search: {
          provider: 'serper',
          providers: { ...emptyKeys, serper: { apiKey: '   ' } },
        },
      }),
    ).toBe('genspark')
    expect(activeSearchProvider({ search: { provider: 'bing', providers: {} } as never })).toBe(
      'genspark',
    )
  })

  it('activates vega with its own or the shared AI Model key, gated by the tools switch', () => {
    const search = { provider: 'vega' as const, providers: emptyKeys }
    // no key anywhere → genspark fallback
    expect(activeSearchProvider({ search })).toBe('genspark')
    // its own slot key
    expect(
      activeSearchProvider({
        search: { provider: 'vega', providers: { ...emptyKeys, vega: { apiKey: 'k' } } },
      }),
    ).toBe('vega')
    // the AI Model provider's key is shared with the keyless vega slot
    expect(
      activeSearchProvider({
        search,
        providers: { vega: { apiKey: 'sk-apivega-x' } } as never,
      }),
    ).toBe('vega')
    expect(
      vegaSearchKey({
        search,
        providers: { vega: { apiKey: 'sk-apivega-x' } } as never,
      }),
    ).toBe('sk-apivega-x')
    // the slot's own key wins over the shared one
    expect(
      vegaSearchKey({
        search: { provider: 'vega', providers: { ...emptyKeys, vega: { apiKey: 'own' } } },
        providers: { vega: { apiKey: 'shared' } } as never,
      }),
    ).toBe('own')
    // the VEGA cloud-tools switch off → genspark even with a key
    expect(
      activeSearchProvider({
        search: { provider: 'vega', providers: { ...emptyKeys, vega: { apiKey: 'k' } } },
        vegaToolsEnabled: false,
      }),
    ).toBe('genspark')
    // the legacy flag name carries the same opt-out
    expect(
      activeSearchProvider({
        search: { provider: 'vega', providers: { ...emptyKeys, vega: { apiKey: 'k' } } },
        gskToolsEnabled: false,
      }),
    ).toBe('genspark')
  })
})
