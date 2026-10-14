import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from '@tiptap/core'
import { buildExtensions } from '../src/renderer/editor/extensions'
import { Ribbon } from '../src/renderer/components/Ribbon'

// The assistant is unrelated to quick-access file actions.
vi.mock('../src/renderer/ai/AiPanel', () => ({ VegaMark: () => null }))

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

function renderRibbon() {
  const editor = new Editor({
    extensions: buildExtensions({
      slashController: { onOpen() {}, onUpdate() {}, onKeyDown: () => false, onClose() {} },
      slashItems: () => [],
    }),
    content: '<p>Doc</p>',
  })
  const handlers = {
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onOpen: vi.fn(),
    onExport: vi.fn(),
    onPrint: vi.fn(),
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = {
    disabled: false,
    dirty: true,
    ...handlers,
    onFind: vi.fn(),
    autoSave: false,
    onToggleAutoSave: vi.fn(),
    aiOpen: false,
    onToggleAi: vi.fn(),
    onAiPreset: vi.fn(),
    editor,
    imageEnabled: true,
    onInsertImage: vi.fn(),
    onImageHost: vi.fn(),
    frontmatterOpen: false,
    onToggleFrontmatter: vi.fn(),
    sourceViewOpen: false,
    onToggleSource: vi.fn(),
    outlineOpen: false,
    onToggleOutline: vi.fn(),
    hasOutline: false,
    spellcheck: false,
    onToggleSpellcheck: vi.fn(),
    redactEnabled: false,
    onToggleRedact: vi.fn(),
  }
  act(() => root.render(createElement(Ribbon, props)))
  cleanups.push(() => {
    act(() => root.unmount())
    editor.destroy()
    container.remove()
  })
  return { container, ...handlers }
}

const fileButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.ribbon-tab-file')

describe('File menu in the quick-access row', () => {
  it('renders the accent File button immediately left of Save', () => {
    const { container } = renderRibbon()
    const file = fileButton(container)
    expect(file, 'File button must sit at the left of the quick-access row').not.toBeNull()
    expect(file!.textContent).toBe('File')
    // DOM order: File, then the Save quick-access icon right after the wrap
    const next = file!.parentElement!.nextElementSibling
    expect(next?.classList.contains('qa-btn')).toBe(true)
  })

  it('opens a dropdown whose items call the file handlers', () => {
    const { container, onOpen, onSave } = renderRibbon()
    act(() => fileButton(container)!.click())
    const menu = container.querySelector('.file-menu')
    expect(menu).not.toBeNull()
    const items = [...menu!.querySelectorAll('button')]
    expect(items[0]!.textContent).toContain('Open')
    act(() => items[0]!.click())
    expect(onOpen).toHaveBeenCalledOnce()
    // menu closes after picking an item
    expect(container.querySelector('.file-menu')).toBeNull()

    act(() => fileButton(container)!.click())
    const saveItem = [...container.querySelectorAll<HTMLButtonElement>('.file-menu button')].find(
      (b) => b.textContent!.includes('Save'),
    )!
    act(() => saveItem.click())
    expect(onSave).toHaveBeenCalledOnce()
  })
})
