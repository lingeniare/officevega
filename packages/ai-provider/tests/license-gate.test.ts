import { afterEach, describe, expect, it } from 'vitest'
import {
  activeMediaProvider,
  activeProvider,
  activeSearchProvider,
  defaultAiSettings,
  requestProvider,
  setLicenseGetter,
} from '../src/index'

const openai = () => {
  const s = defaultAiSettings()
  s.provider = 'openai'
  s.providers.openai = { ...s.providers.openai!, apiKey: 'sk-test', model: 'gpt-x' }
  return s
}

afterEach(() => setLicenseGetter(() => true))

describe('license gate on the chat provider', () => {
  it('without a license a BYOK pick degrades to the signed-in default', () => {
    setLicenseGetter(() => false)
    expect(activeProvider(openai())).toBe('genspark')
    expect(requestProvider(openai()).provider).toBe('genspark')
  })

  it('without a license VEGA stays available', () => {
    setLicenseGetter(() => false)
    const s = defaultAiSettings()
    s.providers.vega = { ...s.providers.vega!, apiKey: 'sk-apivega-test' }
    expect(activeProvider(s)).toBe('vega')
  })

  it('with a license the BYOK pick is honored', () => {
    setLicenseGetter(() => true)
    expect(activeProvider(openai())).toBe('openai')
    expect(requestProvider(openai()).provider).toBe('openai')
  })
})

describe('license gate on media and search providers', () => {
  const byokMedia = () => {
    const s = defaultAiSettings()
    s.media!.imageProvider = 'gemini'
    s.media!.analysisProvider = 'openai'
    s.media!.videoAnalysisProvider = 'doubao'
    s.media!.providers.gemini!.apiKey = 'k'
    s.media!.providers.openai!.apiKey = 'k'
    s.media!.providers.doubao!.apiKey = 'k'
    return s
  }

  it('without a license every media capability falls off its BYOK pick', () => {
    setLicenseGetter(() => false)
    const s = byokMedia()
    expect(activeMediaProvider(s, 'image')).toBe('genspark')
    expect(activeMediaProvider(s, 'analysis')).toBe('genspark')
    expect(activeMediaProvider(s, 'video')).toBe('genspark')
  })

  it('without a license VEGA media picks stay', () => {
    setLicenseGetter(() => false)
    const s = byokMedia()
    s.media!.imageProvider = 'vega'
    s.media!.providers.vega!.apiKey = 'sk-apivega-test'
    expect(activeMediaProvider(s, 'image')).toBe('vega')
  })

  it('with a license the media picks are honored', () => {
    setLicenseGetter(() => true)
    const s = byokMedia()
    expect(activeMediaProvider(s, 'image')).toBe('gemini')
    expect(activeMediaProvider(s, 'analysis')).toBe('openai')
    expect(activeMediaProvider(s, 'video')).toBe('doubao')
  })

  it('without a license a BYOK search pick degrades, keyless parallel included', () => {
    setLicenseGetter(() => false)
    const s = defaultAiSettings()
    s.search!.provider = 'tavily'
    s.search!.providers.tavily = { apiKey: 'tvly-x' }
    expect(activeSearchProvider(s)).toBe('genspark')
    s.search!.provider = 'parallel'
    expect(activeSearchProvider(s)).toBe('genspark')
  })

  it('with a license the search pick is honored', () => {
    setLicenseGetter(() => true)
    const s = defaultAiSettings()
    s.search!.provider = 'tavily'
    s.search!.providers.tavily = { apiKey: 'tvly-x' }
    expect(activeSearchProvider(s)).toBe('tavily')
    s.search!.provider = 'vega'
    s.search!.providers.vega = { apiKey: 'sk-apivega-test' }
    expect(activeSearchProvider(s)).toBe('vega')
  })
})
