import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
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
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    view: 'preview' as const,
    onView: vi.fn(),
    canInsert: true,
    onInsert: vi.fn(),
    canvasMode: 'edit' as const,
    onPresent: vi.fn(),
  }
  act(() => root.render(createElement(Ribbon, props)))
  cleanups.push(() => {
    act(() => root.unmount())
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
    expect(file!.textContent).toBe('文件')
    const next = file!.parentElement!.nextElementSibling
    expect(next?.classList.contains('qa-btn')).toBe(true)
  })

  it('opens a dropdown whose items call the file handlers', () => {
    const { container, onOpen, onExport } = renderRibbon()
    act(() => fileButton(container)!.click())
    const menu = container.querySelector('.file-menu')
    expect(menu).not.toBeNull()
    const items = [...menu!.querySelectorAll('button')]
    expect(items[0]!.textContent).toContain('打开')
    act(() => items[0]!.click())
    expect(onOpen).toHaveBeenCalledOnce()
    expect(container.querySelector('.file-menu')).toBeNull()

    act(() => fileButton(container)!.click())
    const pdfItem = [...container.querySelectorAll('.file-menu button')].find((b) =>
      b.textContent!.includes('PDF'),
    )!
    act(() => pdfItem.click())
    expect(onExport).toHaveBeenCalledWith('pdf')
  })
})
