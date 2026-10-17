import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Ribbon } from '../src/renderer/components/Ribbon'

// The assistant is unrelated to the ribbon's disabled state.
vi.mock('../src/renderer/ai/AiPanel', () => ({ VegaMark: () => null }))

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.unstubAllGlobals()
})

function renderRibbon(docEmpty: boolean) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = {
    disabled: false,
    dirty: false,
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onOpen: vi.fn(),
    onExport: vi.fn(),
    onPrint: vi.fn(),
    onFind: vi.fn(),
    autoSave: false,
    onToggleAutoSave: vi.fn(),
    aiOpen: false,
    onToggleAi: vi.fn(),
    onAiPreset: vi.fn(),
    docEmpty,
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    view: 'preview' as const,
    onView: vi.fn(),
    canInsert: true,
    onInsert: vi.fn(),
    onInsertSkeleton: vi.fn(),
    canInsertSkeleton: false,
    canvasMode: 'edit' as const,
    onPresent: vi.fn(),
  }
  act(() => root.render(createElement(Ribbon, props)))
  cleanups.push(() => {
    act(() => root.unmount())
    container.remove()
  })
  return container
}

const aiButtons = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLButtonElement>('.rb-big.ai-entry')]

describe('AI ribbon entries on an empty document', () => {
  it('disables the one-click presets but keeps the panel toggle', () => {
    const container = renderRibbon(true)
    const [toggle, ...presets] = aiButtons(container)
    expect(toggle!.disabled).toBe(false)
    expect(presets.length).toBeGreaterThan(0)
    for (const btn of presets) expect(btn.disabled).toBe(true)
  })

  it('enables every entry once the page has content', () => {
    const container = renderRibbon(false)
    expect(aiButtons(container).length).toBeGreaterThan(0)
    for (const btn of aiButtons(container)) expect(btn.disabled).toBe(false)
  })
})
