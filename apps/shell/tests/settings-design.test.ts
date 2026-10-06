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
  document.documentElement.removeAttribute('data-design')
})

function mockApi(overrides: Partial<HomeApi> = {}): HomeApi {
  return {
    getTheme: async () => 'system',
    getDesign: async () => 'standard',
    setDesign: vi.fn<(design: 'standard' | 'retro' | 'digital') => Promise<void>>().mockResolvedValue(undefined),
    getDefaultSaveDir: async () => '',
    getAutoSaveDefault: async () => ({ on: false, updatedAt: 0 }),
    getAiPanelPrefs: async () => ({ side: 'right', fontSize: 'medium', spellcheck: true }),
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
    getDisplayName: async () => '',
    setDisplayName: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as HomeApi
}

async function renderModal(api: HomeApi) {
  await act(async () => {
    root.render(
      createElement(
        LocaleProvider,
        { initial: 'en' },
        createElement(SettingsModal, {
          status: { loggedIn: false, email: '' },
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

/** open the General section (4th nav entry: account, aiModel, aiMedia, general, …) */
async function openGeneral() {
  const nav = host.querySelectorAll('.set-nav-item')
  expect(nav.length).toBeGreaterThanOrEqual(6)
  await act(async () => {
    nav[3]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

function designTrigger(): HTMLButtonElement {
  const trigger = host.querySelector<HTMLButtonElement>('.gs-dd-btn[aria-label="Design"]')
  expect(trigger).not.toBeNull()
  return trigger!
}

describe('Settings design picker', () => {
  it('shows the saved design in General, under the Theme row', async () => {
    window.aiOffice = mockApi({ getDesign: async () => 'retro' })
    await renderModal(window.aiOffice)
    await openGeneral()

    const trigger = designTrigger()
    expect(trigger.querySelector('.gs-dd-value')?.textContent).toBe('Retro VEGA')

    // the Design row sits right below Theme inside the same pane
    const fields = Array.from(host.querySelectorAll('.set-pane .set-field'))
    const themeRow = fields.findIndex((f) => f.querySelector('[aria-label="Theme"]'))
    const designRow = fields.findIndex((f) => f.querySelector('[aria-label="Design"]'))
    expect(themeRow).toBeGreaterThanOrEqual(0)
    expect(designRow).toBe(themeRow + 1)
  })

  it('persists the pick and stamps data-design on <html>', async () => {
    const api = mockApi()
    window.aiOffice = api
    await renderModal(api)
    await openGeneral()

    await act(async () => {
      designTrigger().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    const option = host.querySelector<HTMLButtonElement>('.gs-dd-item[data-value="retro"]')
    expect(option).not.toBeNull()
    expect(option!.textContent).toBe('Retro VEGA')
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(api.setDesign).toHaveBeenCalledWith('retro')
    expect(document.documentElement.getAttribute('data-design')).toBe('retro')
    expect(designTrigger().querySelector('.gs-dd-value')?.textContent).toBe('Retro VEGA')
  })

  it('removes data-design when Standard is picked', async () => {
    document.documentElement.setAttribute('data-design', 'retro')
    const api = mockApi({ getDesign: async () => 'retro' })
    window.aiOffice = api
    await renderModal(api)
    await openGeneral()

    await act(async () => {
      designTrigger().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    const option = host.querySelector<HTMLButtonElement>('.gs-dd-item[data-value="standard"]')!
    await act(async () => {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(api.setDesign).toHaveBeenCalledWith('standard')
    expect(document.documentElement.hasAttribute('data-design')).toBe(false)
  })

  it('lists all three designs and applies Цифровая ВЕГА', async () => {
    const api = mockApi()
    window.aiOffice = api
    await renderModal(api)
    await openGeneral()

    await act(async () => {
      designTrigger().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    const items = Array.from(host.querySelectorAll<HTMLButtonElement>('.gs-dd-item'))
    expect(items.map((i) => i.dataset.value)).toEqual(['standard', 'retro', 'digital'])

    const option = host.querySelector<HTMLButtonElement>('.gs-dd-item[data-value="digital"]')!
    expect(option.textContent).toBe('Digital VEGA')
    await act(async () => {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(api.setDesign).toHaveBeenCalledWith('digital')
    expect(document.documentElement.getAttribute('data-design')).toBe('digital')
  })
})
