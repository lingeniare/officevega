/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSettings } from '@genoffice/ai-provider'
import type { HomeApi } from '../src/shared/home-api'
import { LocaleProvider } from '../src/renderer/src/locale'
import { SettingsModal } from '../src/renderer/src/SettingsModal'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click()
    await Promise.resolve()
  })
}

function navItem(label: string): HTMLButtonElement {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.set-nav-item')).find((b) =>
    b.textContent?.includes(label),
  )!
}

const baseSettings = {
  provider: 'vega',
  providers: {
    vega: { apiKey: 'sk-vega', model: 'main-model' },
    openai: { apiKey: 'sk-oai', model: 'gpt-5.6-terra' },
  },
  vegaToolsEnabled: true,
  media: {
    imageProvider: 'vega',
    analysisProvider: 'vega',
    videoAnalysisProvider: 'vega',
    providers: { vega: { apiKey: '', imageModel: 'img-1', analysisModel: 'an-1' } },
  },
  search: {
    provider: 'vega',
    providers: { vega: { apiKey: '' }, serper: { apiKey: '' }, tavily: { apiKey: '' } },
  },
} as unknown as AiSettings

function installAiOffice(
  setAiSettings: HomeApi['setAiSettings'],
  liveModels: { id: string; name: string }[],
  settings: AiSettings = baseSettings,
) {
  window.aiOffice = {
    getTheme: async () => 'system',
    getDefaultSaveDir: async () => '',
    getAiPanelPrefs: async () => ({
      fontSize: 'default',
      customFontSize: 14,
      spellcheck: true,
      side: 'right',
    }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    getLicenseStatus: async () => ({
      licensed: true,
      state: 'active',
      holderEmail: '',
      accountType: '',
      expiresAt: '',
      graceUntil: '',
      keyHint: '',
    }),
    onLicenseChanged: () => () => {},
    getAiProviders: () => [
      {
        id: 'vega',
        label: 'VEGA',
        models: [],
        defaultModel: 'main-model',
        keyPlaceholder: '',
        defaultBaseUrl: 'https://api.vega.chat/v1',
        liveCatalog: true,
      },
      {
        id: 'openai',
        label: 'OpenAI',
        models: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'],
        defaultModel: 'gpt-5.6-terra',
        keyPlaceholder: 'sk-…',
      },
    ],
    getAiSettings: async () => settings,
    setAiSettings,
    getAiMediaProviders: () => [],
    getAiSearchProviders: () => [
      { id: 'vega', label: 'VEGA', keyPlaceholder: '', imageSearch: true },
    ],
    getProviderModels: vi.fn(async () => ({ models: liveModels, defaultModel: 'main-model' })),
  } as unknown as HomeApi
}

async function renderModal() {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'en' },
        createElement(SettingsModal, {
          status: null,
          loggingOut: false,
          loginWaiting: false,
          deviceCode: null,
          onClose: vi.fn(),
          onLogin: vi.fn(),
          onLogout: vi.fn(),
        }),
      ),
    )
    await Promise.resolve()
  })
}

function fastCombo() {
  const input = host.querySelector<HTMLInputElement>('#set-ai-fast-model')!
  return { input, wrap: input.closest('.gs-combo')! }
}

async function openFastList() {
  const { wrap } = fastCombo()
  await click(wrap.querySelector<HTMLButtonElement>('.gs-combo-toggle')!)
  return Array.from(wrap.querySelectorAll<HTMLElement>('[role="option"]'))
}

describe('fast model picker', () => {
  it('writes fastModel without touching model', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings, [
      { id: 'main-model', name: 'Main Model' },
      { id: 'fast-model', name: 'Fast Model' },
      { id: 'other-model', name: 'Other Model' },
    ])
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const mainInput = host.querySelector<HTMLInputElement>('#set-ai-model')!
    // unset fastModel reads as the explicit "same as main" row, not a bare id
    expect(fastCombo().input.value).toBe('Same as main model')

    const options = await openFastList()
    const fastOpt = options.find((o) => o.dataset.value === 'fast-model')!
    await click(fastOpt)

    expect(fastCombo().input.value).toBe('Fast Model')
    expect(mainInput.value).toBe('Main Model')

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    const written = setAiSettings.mock.calls.at(-1)?.[0]
    expect(written?.providers?.vega?.fastModel).toBe('fast-model')
    expect(written?.providers?.vega?.model).toBe('main-model')
  })

  it('still offers "same as main" and pinned ids when the live catalog is empty', async () => {
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings, [])
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const options = await openFastList()
    const values = options.map((o) => o.dataset.value)
    // never an empty popover: the same-as-main row plus the pinned default/current ids
    expect(values).toContain('')
    expect(values).toContain('main-model')
    expect(options.find((o) => o.dataset.value === '')?.textContent).toBe('Same as main model')
  })

  it('reverts to the main model by picking the "same as main" row', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    const withFast = {
      ...baseSettings,
      providers: { ...baseSettings.providers, vega: { apiKey: 'sk', model: 'main-model', fastModel: 'fast-model' } },
    } as unknown as AiSettings
    installAiOffice(setAiSettings, [
      { id: 'main-model', name: 'Main Model' },
      { id: 'fast-model', name: 'Fast Model' },
    ], withFast)
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fastCombo().input.value).toBe('Fast Model')
    const options = await openFastList()
    await click(options.find((o) => o.dataset.value === '')!)

    expect(fastCombo().input.value).toBe('Same as main model')
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    const written = setAiSettings.mock.calls.at(-1)?.[0]
    expect(written?.providers?.vega?.fastModel).toBeUndefined()
    expect(written?.providers?.vega?.model).toBe('main-model')
  })

  it('keeps an off-catalog fastModel visible and pickable', async () => {
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    const withFast = {
      ...baseSettings,
      providers: { ...baseSettings.providers, vega: { apiKey: 'sk', model: 'main-model', fastModel: 'custom-fast' } },
    } as unknown as AiSettings
    installAiOffice(setAiSettings, [
      { id: 'main-model', name: 'Main Model' },
    ], withFast)
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fastCombo().input.value).toBe('custom-fast')
    const values = (await openFastList()).map((o) => o.dataset.value)
    expect(values).toContain('custom-fast')
  })

  it('requests the chat catalog with image generators excluded', async () => {
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings, [{ id: 'main-model', name: 'Main Model' }])
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // text+image generators (gemini-*-image, gpt-*-image) carry 'text' in
    // output_modalities — output:'text' alone would let them into the pickers
    expect(window.aiOffice.getProviderModels).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'vega', output: 'text', excludeOutput: ['image'] }),
    )
  })

  it('static-list providers pick a fast model through the dropdown', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    const onOpenai = { ...baseSettings, provider: 'openai' } as unknown as AiSettings
    installAiOffice(setAiSettings, [], onOpenai)
    await renderModal()
    await click(navItem('AI Model'))
    await act(async () => {
      await Promise.resolve()
    })

    // non-liveCatalog provider: the fast picker is a Dropdown whose first row
    // is "Same as main model"
    const fastField = Array.from(host.querySelectorAll<HTMLElement>('.set-field')).find((f) =>
      f.textContent?.includes('Fast model'),
    )!
    const fastDd = fastField.querySelector<HTMLElement>('.gs-dd-btn')!
    expect(fastDd.textContent).toContain('Same as main model')
    await click(fastDd)
    const luna = Array.from(host.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (o) => o.dataset.value === 'gpt-5.6-luna',
    )!
    await click(luna)

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    const written = setAiSettings.mock.calls.at(-1)?.[0]
    expect(written?.providers?.openai?.fastModel).toBe('gpt-5.6-luna')
    expect(written?.providers?.openai?.model).toBe('gpt-5.6-terra')
  })
})
