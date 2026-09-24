/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})

function mockApi(overrides: Partial<HomeApi> = {}): HomeApi {
  return {
    getTheme: async () => 'system',
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
    getAiPanelPrefs: async () => ({ side: 'right', fontSize: 'medium', spellcheck: true }),
    getUpdateChannel: async () => 'stable',
    getAppVersion: async () => '1.0.0',
    githubStars: async () => null,
    getDisplayName: async () => '',
    setDisplayName: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as HomeApi
}

async function renderModal(api: HomeApi, status: Parameters<typeof SettingsModal>[0]['status']) {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'en' },
        createElement(SettingsModal, {
          status,
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

describe('Settings display name', () => {
  it('loads the saved name into an input above the email field', async () => {
    window.aiOffice = mockApi({ getDisplayName: async () => 'Moss' })
    await renderModal(window.aiOffice, { loggedIn: true, email: 'mossinno@vega.chat' })

    const input = host.querySelector<HTMLInputElement>('#set-display-name')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('Moss')

    // the name field sits above the email row inside the account pane
    const fields = Array.from(host.querySelectorAll('.set-pane .set-field'))
    const nameField = fields.findIndex((f) => f.contains(input))
    const emailField = fields.findIndex((f) => f.textContent?.includes('Email'))
    expect(nameField).toBeGreaterThanOrEqual(0)
    expect(emailField).toBeGreaterThan(nameField)
  })

  it('falls back to the email prefix as the placeholder', async () => {
    window.aiOffice = mockApi()
    await renderModal(window.aiOffice, { loggedIn: true, email: 'mossinno@vega.chat' })

    const input = host.querySelector<HTMLInputElement>('#set-display-name')!
    expect(input.value).toBe('')
    expect(input.placeholder).toBe('mossinno')
  })

  it('persists each edit through setDisplayName', async () => {
    const api = mockApi()
    window.aiOffice = api
    await renderModal(api, { loggedIn: true, email: 'mossinno@vega.chat' })

    const input = host.querySelector<HTMLInputElement>('#set-display-name')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(input, 'Innokenty')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })

    expect(api.setDisplayName).toHaveBeenCalledWith('Innokenty')
    expect(input.value).toBe('Innokenty')
  })
})
