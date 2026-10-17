// Signed out of VEGA with no usable BYOK provider, the panel must not pretend
// to work: starters go inert, the composer is disabled, and the empty state
// offers the localized Connect call-to-action that runs the VEGA sign-in.
// A configured BYOK key (or a sign-in) lifts the gate.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/renderer/editor/extensions'
import { AiPanel } from '../src/renderer/ai/AiPanel'
import { AI_PROVIDERS, type AiSettings } from '../src/shared/ipc'
import { defaultAiSettings } from '@genoffice/ai-provider'

type ChunkListener = (chunk: { requestId: string; type: string; error?: string }) => void

/** what main resolves when nobody is signed in and nothing is configured */
const signedOutSettings = (): AiSettings =>
  ({ ...defaultAiSettings(), provider: 'genspark' }) as AiSettings

/** one BYOK pick with a stored key — the panel stays fully usable */
const byokSettings = (): AiSettings => {
  const s = signedOutSettings()
  const anthropic = AI_PROVIDERS.find((p) => p.id === 'anthropic')!
  s.providers.anthropic = { apiKey: 'k', model: anthropic.defaultModel }
  return s
}

function createEditor(): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: editorExtensions,
    content: { type: 'doc', content: [{ type: 'docParagraph', attrs: { docxIndex: 0 } }] },
  })
}

function mount(element: React.ReactElement): {
  container: HTMLElement
  root: Root
  cleanup: () => void
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    root,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

function mockDesktop(settings: AiSettings, loggedIn: boolean) {
  const aiGskLogin = vi.fn(async () => {})
  ;(window as unknown as Record<string, unknown>).desktop = {
    getAiSettings: vi.fn(async () => settings),
    setAiSettings: vi.fn(async () => {}),
    onAiSettingsChanged: () => () => {},
    onAiAuthChanged: () => () => {},
    aiGskStatus: vi.fn(async () => ({ loggedIn })),
    aiGskLogin,
    openAiModelSettings: vi.fn(async () => {}),
    getProviderModels: vi.fn(async () => ({ models: [], names: {} })),
    onAiStream: (_l: ChunkListener) => () => {},
    aiStream: vi.fn(async () => {}),
    aiStreamCancel: vi.fn(async () => {}),
  }
  return { aiGskLogin }
}

beforeAll(() => {
  // jsdom's opaque origin has no localStorage; the panel reads it at mount
  let store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        store = {}
      },
    },
  })
  Element.prototype.scrollTo ??= () => {}
})

describe('AI panel signed-out gate', () => {
  it('mutes starters + composer and offers the VEGA connect button', async () => {
    const editor = createEditor()
    try {
      const { aiGskLogin } = mockDesktop(signedOutSettings(), false)
      const mounted = mount(
        createElement(AiPanel, {
          editor,
          blocks: [],
          settings: signedOutSettings(),
          open: true,
          onExpand: () => {},
          onCollapse: () => {},
        }),
      )
      const { container } = mounted
      await act(async () => {
        await flush()
        await flush()
      })

      const starters = container.querySelectorAll<HTMLButtonElement>('.ai-starter')
      expect(starters.length).toBeGreaterThan(0)
      for (const b of starters) expect(b.disabled).toBe(true)

      const connect = container.querySelector<HTMLElement>('.ai-connect')
      expect(connect).not.toBeNull()
      const login = connect!.querySelector<HTMLButtonElement>('.ai-login-btn')!
      expect(login.dataset.tip).toBe('Sign in with VEGA')

      const textarea = container.querySelector<HTMLTextAreaElement>('.ai-input-box textarea')!
      expect(textarea.disabled).toBe(true)

      await act(async () => {
        login.click()
        await flush()
      })
      expect(aiGskLogin).toHaveBeenCalled()
      act(() => mounted.root.unmount())
    } finally {
      editor.destroy()
      delete (window as unknown as Record<string, unknown>).desktop
    }
  })

  it('stays fully usable when a BYOK provider is configured', async () => {
    const editor = createEditor()
    try {
      mockDesktop(byokSettings(), false)
      const mounted = mount(
        createElement(AiPanel, {
          editor,
          blocks: [],
          settings: byokSettings(),
          open: true,
          onExpand: () => {},
          onCollapse: () => {},
        }),
      )
      const { container } = mounted
      await act(async () => {
        await flush()
        await flush()
      })

      expect(container.querySelector('.ai-connect')).toBeNull()
      for (const b of container.querySelectorAll<HTMLButtonElement>('.ai-starter')) {
        expect(b.disabled).toBe(false)
      }
      const textarea = container.querySelector<HTMLTextAreaElement>('.ai-input-box textarea')!
      expect(textarea.disabled).toBe(false)
      act(() => mounted.root.unmount())
    } finally {
      editor.destroy()
      delete (window as unknown as Record<string, unknown>).desktop
    }
  })
})
