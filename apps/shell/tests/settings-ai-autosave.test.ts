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

/** a pane footer action whose label is exactly 'Save' — the removed button */
function saveButton(): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.set-pane-footer button')).find(
    (b) => b.textContent?.trim() === 'Save',
  )
}

const initialSettings = {
  provider: 'openai',
  providers: {
    openai: { apiKey: 'sk-old', model: 'gpt-5.2' },
    vega: { apiKey: '', model: '' },
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

function installAiOffice(setAiSettings: HomeApi['setAiSettings']) {
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
        id: 'openai',
        label: 'OpenAI',
        models: ['gpt-5.2'],
        defaultModel: 'gpt-5.2',
        keyPlaceholder: 'sk-…',
        defaultBaseUrl: 'https://api.openai.com/v1',
      },
      {
        id: 'vega',
        label: 'VEGA',
        models: [],
        defaultModel: '',
        keyPlaceholder: '',
        defaultBaseUrl: 'https://api.vega.chat/v1',
        liveCatalog: true,
      },
    ],
    getAiSettings: async () => initialSettings,
    setAiSettings,
    getAiMediaProviders: () => [
      {
        id: 'vega',
        label: 'VEGA',
        description: 'via api.vega.chat',
        keyPlaceholder: '',
        defaultBaseUrl: 'https://api.vega.chat/v1',
        imageProtocol: 'openai-images',
        imageModels: ['img-1'],
        defaultImageModel: 'img-1',
        analysisProtocol: 'openai-chat',
        analysisModels: ['an-1'],
        defaultAnalysisModel: 'an-1',
        videoAnalysis: true,
      },
    ],
    getAiSearchProviders: () => [
      { id: 'vega', label: 'VEGA', keyPlaceholder: '', imageSearch: true },
      { id: 'serper', label: 'Serper', keyPlaceholder: 'key', imageSearch: true },
    ],
    getProviderModels: async () => ({ models: [], defaultModel: '' }),
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

describe('Settings AI autosave', () => {
  it('persists AI Model edits after a debounce — no Save button', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings)
    await renderModal()

    await click(navItem('AI Model'))
    // the loaded snapshot is confirmed, not echoed back as a write
    expect(setAiSettings).not.toHaveBeenCalled()
    expect(saveButton()).toBeUndefined()

    const toolsSwitch = host.querySelector<HTMLButtonElement>(
      '.set-switch[aria-label="VEGA cloud tools"]',
    )!
    await click(toolsSwitch)
    // still inside the debounce window — nothing written yet
    expect(setAiSettings).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    expect(setAiSettings).toHaveBeenCalledTimes(1)
    expect(setAiSettings.mock.calls[0]![0]).toMatchObject({ vegaToolsEnabled: false })
    expect(host.querySelector('.set-ai-status')?.textContent).toContain('Saved')
  })

  it('flushes pending AI Model edits when the pane unmounts', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings)
    await renderModal()
    await click(navItem('AI Model'))

    const keyInput = host.querySelector<HTMLInputElement>('#set-ai-key')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(keyInput, 'sk-new')
      keyInput.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
    expect(setAiSettings).not.toHaveBeenCalled()

    // switching sections unmounts the pane and flushes the tail immediately
    await click(navItem('General'))
    expect(setAiSettings).toHaveBeenCalledTimes(1)
    const written = setAiSettings.mock.calls[0]![0]
    expect(written.providers.openai?.apiKey).toBe('sk-new')
  })

  it('persists AI Media provider picks after a debounce — no Save button', async () => {
    vi.useFakeTimers()
    const setAiSettings = vi.fn<HomeApi['setAiSettings']>(async () => {})
    installAiOffice(setAiSettings)
    await renderModal()
    await click(navItem('AI Media'))
    expect(setAiSettings).not.toHaveBeenCalled()
    expect(saveButton()).toBeUndefined()

    // open the web-search provider dropdown and pick Serper
    await click(host.querySelector<HTMLButtonElement>('[aria-label="Web search"]')!)
    const serper = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (o) => o.textContent === 'Serper',
    )!
    await click(serper)
    expect(setAiSettings).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    expect(setAiSettings).toHaveBeenCalledTimes(1)
    const written = setAiSettings.mock.calls[0]![0]
    expect(written.search?.provider).toBe('serper')
  })
})
