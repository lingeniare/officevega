import { describe, expect, it } from 'vitest'
import { AI_PROVIDERS, defaultAiSettings } from '@genoffice/ai-provider'
import {
  aiModelPickerGroups,
  aiModelPickerSelection,
  withAiModelSelection,
} from '../src/ai-model-picker-options'

const anthropicModels = AI_PROVIDERS.find((m) => m.id === 'anthropic')!.models

describe('aiModelPickerGroups', () => {
  // a main-resolved 'genspark' pick is what the signed-out settings read looks
  // like today: the default 'vega' pick only survives resolution when a VEGA
  // credential (stored key or issued sign-in key) exists
  const signedOutSettings = () => ({ ...defaultAiSettings(), provider: 'genspark' as const })

  it('lists nothing while signed out with no keys', () => {
    expect(aiModelPickerGroups(signedOutSettings(), false)).toEqual([])
  })

  it('lists the VEGA account group once signed in', () => {
    const groups = aiModelPickerGroups(defaultAiSettings(), true)
    expect(groups.map((g) => g.id)).toEqual(['vega'])
    expect(groups[0]!.account).toBe(true)
  })

  it('lists Genspark only for a legacy genspark pick while signed in', () => {
    const ids = aiModelPickerGroups(signedOutSettings(), true).map((g) => g.id)
    expect(ids).toEqual(['genspark'])
  })

  it('carries the Genspark pool display names', () => {
    const g = aiModelPickerGroups(signedOutSettings(), true).find((x) => x.id === 'genspark')
    expect(g?.names?.['gpt-6-astra']).toBe('GPT-6 Astra')
    expect(g?.names?.['claude-opus-5-5']).toBe('Claude Opus 5.5')
  })

  it('adds a vendor once its key is set and puts an off-catalog model first', () => {
    const settings = signedOutSettings()
    settings.providers.anthropic = { apiKey: 'k', model: 'claude-next' }
    const groups = aiModelPickerGroups(settings, false)
    expect(groups.map((g) => g.id)).toEqual(['anthropic'])
    expect(groups[0]!.models).toEqual(['claude-next', ...anthropicModels])
  })

  it('needs a base URL for custom endpoints', () => {
    const settings = signedOutSettings()
    settings.providers.custom = { apiKey: '', model: 'llama', baseUrl: '' }
    expect(aiModelPickerGroups(settings, false)).toEqual([])
    settings.providers.custom = { apiKey: '', model: 'llama', baseUrl: 'http://localhost:11434/v1' }
    expect(aiModelPickerGroups(settings, false).map((g) => g.id)).toEqual(['custom'])
  })
})

describe('selection round trip', () => {
  it('switches provider and model in one write and reads back', () => {
    const settings = defaultAiSettings()
    settings.providers.anthropic = { apiKey: 'k', model: anthropicModels[0]! }
    const next = withAiModelSelection(settings, {
      provider: 'anthropic',
      model: anthropicModels[1]!,
    })
    expect(next.provider).toBe('anthropic')
    expect(next.providers.anthropic.apiKey).toBe('k')
    expect(aiModelPickerSelection(next)).toEqual({
      provider: 'anthropic',
      model: anthropicModels[1],
    })
    expect(settings.providers.anthropic.model).toBe(anthropicModels[0])
  })

  it('falls back to Genspark when the stored provider is unusable', () => {
    const settings = defaultAiSettings()
    settings.provider = 'anthropic'
    expect(aiModelPickerSelection(settings).provider).toBe('genspark')
  })
})

describe('CLI vendors', () => {
  it('lists Codex only after the settings page stored a path or model', () => {
    const settings = { ...defaultAiSettings(), provider: 'genspark' as const }
    expect(aiModelPickerGroups(settings, false)).toEqual([])
    settings.providers.codex = { apiKey: '', model: '', cliPath: '/usr/local/bin/codex' }
    expect(aiModelPickerGroups(settings, false)).toEqual([
      { id: 'codex', label: 'Codex CLI', models: [], pinned: [] },
    ])
  })
})

describe('custom endpoints', () => {
  const settings = () => ({
    ...defaultAiSettings(),
    provider: 'genspark' as const,
    customEndpoints: [
      {
        id: 'a',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: '',
        model: 'llama3',
      },
      {
        id: 'b',
        name: '',
        baseUrl: 'https://gw.example.com/v1',
        apiKey: 'k',
        model: 'gpt-x',
        models: ['gpt-y'],
      },
      { id: 'c', name: 'Empty', baseUrl: '', apiKey: '', model: 'm' },
    ],
    customEndpoint: 'a',
  })

  it('lists one group per configured endpoint with its cached models', () => {
    const groups = aiModelPickerGroups(settings(), false)
    expect(groups).toEqual([
      { id: 'custom', endpoint: 'a', label: 'Ollama', models: ['llama3'], pinned: ['llama3'] },
      {
        id: 'custom',
        endpoint: 'b',
        label: 'gw.example.com',
        models: ['gpt-x', 'gpt-y'],
        pinned: ['gpt-x'],
      },
    ])
  })

  it('picking a model on another endpoint activates that endpoint', () => {
    const start = { ...settings(), provider: 'custom' as const }
    expect(aiModelPickerSelection(start)).toEqual({
      provider: 'custom',
      endpoint: 'a',
      model: 'llama3',
    })
    const next = withAiModelSelection(start, { provider: 'custom', endpoint: 'b', model: 'gpt-y' })
    expect(aiModelPickerSelection(next)).toEqual({
      provider: 'custom',
      endpoint: 'b',
      model: 'gpt-y',
    })
    expect(next.providers.custom).toEqual({
      apiKey: 'k',
      model: 'gpt-y',
      baseUrl: 'https://gw.example.com/v1',
    })
    expect(next.customEndpoints!.find((e) => e.id === 'a')!.model).toBe('llama3')
  })
})
