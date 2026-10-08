import { afterEach, describe, expect, it } from 'vitest'
import { defaultAiSettings, piiShieldMayApply, setLicenseGetter } from '../src/index'

afterEach(() => setLicenseGetter(() => true))

describe('piiShieldMayApply', () => {
  it('is true for the VEGA provider', () => {
    expect(piiShieldMayApply(defaultAiSettings())).toBe(true)
  })

  it('is true when a custom endpoint still routes through the VEGA gateway', () => {
    setLicenseGetter(() => true)
    const s = defaultAiSettings()
    s.provider = 'custom'
    s.providers.custom = {
      ...s.providers.custom!,
      apiKey: 'sk-custom',
      baseUrl: 'https://api.vega.chat/api/v1',
      model: 'some-model',
    }
    expect(piiShieldMayApply(s)).toBe(true)
  })

  it('follows the request-time upgrade: a genspark pick backed by a vega key routes to vega', () => {
    setLicenseGetter(() => false)
    const s = defaultAiSettings()
    s.provider = 'genspark'
    s.providers.vega = { ...s.providers.vega!, apiKey: 'sk-apivega-test', model: 'm' }
    expect(piiShieldMayApply(s)).toBe(true)
  })

  it('is false for third-party providers and gateways', () => {
    setLicenseGetter(() => true)
    const s = defaultAiSettings()
    s.provider = 'openai'
    s.providers.openai = { ...s.providers.openai!, apiKey: 'sk-test', model: 'gpt-x' }
    expect(piiShieldMayApply(s)).toBe(false)

    s.provider = 'custom'
    s.providers.custom = {
      ...s.providers.custom!,
      apiKey: 'sk-custom',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'some-model',
    }
    expect(piiShieldMayApply(s)).toBe(false)
  })

  it('is false while the user turned the shield off — even on the VEGA route', () => {
    const s = defaultAiSettings()
    s.piiShieldEnabled = false
    expect(piiShieldMayApply(s)).toBe(false)
    // the opt-out wins over a custom endpoint pointing at the gateway too
    setLicenseGetter(() => true)
    s.provider = 'custom'
    s.providers.custom = {
      ...s.providers.custom!,
      apiKey: 'sk-custom',
      baseUrl: 'https://api.vega.chat/api/v1',
      model: 'some-model',
    }
    expect(piiShieldMayApply(s)).toBe(false)
  })

  it('is false without settings', () => {
    expect(piiShieldMayApply(null)).toBe(false)
    expect(piiShieldMayApply(undefined)).toBe(false)
  })
})
