// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensurePrintWorkbookLoaded,
  handleExportPdf,
  type PageLayoutContext,
} from '../src/renderer/page-layout-actions'
import { createEditJournal } from '../src/renderer/edit-journal'
import { setModuleLang } from '../src/renderer/i18n/locale'
import type { LazyWorkbookState, UniverRuntime } from '../src/renderer/univer-state'
import { preloadEntireWorkbook } from '../src/renderer/univer-sync'

vi.mock('../src/renderer/univer-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/renderer/univer-sync')>()
  return {
    ...actual,
    preloadEntireWorkbook: vi.fn(),
  }
})

describe('print and PDF workbook readiness coordination', () => {
  let messages: string[] = []
  let exportPdfMock: ReturnType<typeof vi.fn>

  const PRINT_MESSAGES = {
    notLoaded: 'The workbook is still loading — try again in a moment.',
    failed: 'Unable to print.',
  } as const

  beforeEach(() => {
    vi.clearAllMocks()
    setModuleLang('en')
    messages = []
    exportPdfMock = vi.fn().mockResolvedValue({ canceled: false, path: 'D:/test.pdf' })

    vi.stubGlobal('window', {
      desktopApi: {
        exportPdf: exportPdfMock,
      },
    })
  })

  function createMockState(overrides?: Partial<LazyWorkbookState>): LazyWorkbookState {
    return {
      file: {
        name: 'test.xlsx',
        sessionId: 'session-123',
        sheets: [{ id: 'sheet-1', name: 'Sheet1', rowCount: 10, columnCount: 10 }],
        visuals: [],
      },
      flags: {
        preloadComplete: false,
        preloadRunning: false,
        ...overrides?.flags,
      },
      editJournal: createEditJournal(),
      sheetPageBreaks: new Map(),
      sheetFilePageSetups: new Map(),
      ...overrides,
    } as unknown as LazyWorkbookState
  }

  function createMockContext(
    state: LazyWorkbookState | null,
    worksheetOverrides?: Record<string, unknown>,
  ): PageLayoutContext {
    const worksheet = {
      getSheetId: () => 'sheet-1',
      getSheetName: () => 'Sheet1',
      getLastRow: () => 1,
      getLastColumn: () => 1,
      getRowHeight: () => 20,
      getColumnWidth: () => 100,
      getMergedRanges: () => [],
      getRange: () => ({
        getValues: () => [['A1']],
        getDisplayValues: () => [['A1']],
        getCellStyleData: () => null,
      }),
      getMaxRows: () => 10,
      getMaxColumns: () => 10,
      ...worksheetOverrides,
    }

    const workbook = {
      getActiveSheet: () => worksheet,
      getSheetBySheetId: (_id: string) => worksheet,
    }

    const runtime: UniverRuntime = {
      univerAPI: {
        getActiveWorkbook: () => workbook,
      },
    } as unknown as UniverRuntime

    return {
      univerRef: { current: runtime },
      lazyWorkbookRef: { current: state },
      setMessage: (msg: string) => {
        messages.push(msg)
      },
      setPendingEdits: vi.fn(),
      requestVisualInstall: vi.fn(),
      runOps: vi.fn(),
    }
  }

  it('UPSTREAM-01: streamed workbook automatically triggers preload and reports ready', async () => {
    const state = createMockState({ flags: { preloadComplete: false, preloadRunning: false } })
    const ctx = createMockContext(state)

    vi.mocked(preloadEntireWorkbook).mockImplementation(async (_runtime, ref) => {
      if (ref.current) {
        ref.current.flags.preloadRunning = true
        await new Promise((resolve) => setTimeout(resolve, 10))
        ref.current.flags.preloadComplete = true
        ref.current.flags.preloadRunning = false
      }
    })

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(true)
    expect(preloadEntireWorkbook).toHaveBeenCalledTimes(1)
  })

  it('UPSTREAM-02: streamed workbook triggers preload and successfully exports PDF', async () => {
    const state = createMockState({ flags: { preloadComplete: false, preloadRunning: false } })
    const ctx = createMockContext(state)

    vi.mocked(preloadEntireWorkbook).mockImplementation(async (_runtime, ref) => {
      if (ref.current) {
        ref.current.flags.preloadRunning = true
        await new Promise((resolve) => setTimeout(resolve, 10))
        ref.current.flags.preloadComplete = true
        ref.current.flags.preloadRunning = false
      }
    })

    const result = await handleExportPdf(ctx)
    expect(result).toBe(true)
    expect(exportPdfMock).toHaveBeenCalledTimes(1)
    expect(messages).toContain('Exported D:/test.pdf.')
  })

  it('UPSTREAM-03: already running preload is awaited without triggering a second preload', async () => {
    const state = createMockState({ flags: { preloadComplete: false, preloadRunning: true } })
    const ctx = createMockContext(state)

    setTimeout(() => {
      state.flags.preloadComplete = true
      state.flags.preloadRunning = false
    }, 20)

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(true)
    expect(preloadEntireWorkbook).not.toHaveBeenCalled()
  })

  it('UPSTREAM-04: preload failure safely cancels and notifies user', async () => {
    const state = createMockState({ flags: { preloadComplete: false, preloadRunning: false } })
    const ctx = createMockContext(state)

    vi.mocked(preloadEntireWorkbook).mockRejectedValueOnce(new Error('Preload disk error'))

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(false)
    expect(messages).toContain('Unable to print.')
  })

  it('UPSTREAM-05: workbook exceeding FULL_LOAD_MAX_CELLS is safely rejected without preloading', async () => {
    const state = createMockState({
      file: {
        name: 'huge.xlsx',
        sessionId: 'session-huge',
        sheets: [{ id: 'sheet-1', name: 'Sheet1', rowCount: 20_000, columnCount: 100 }],
        visuals: [],
      } as unknown as LazyWorkbookState['file'],
      flags: { preloadComplete: false, preloadRunning: false },
    })
    const ctx = createMockContext(state)

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(false)
    expect(preloadEntireWorkbook).not.toHaveBeenCalled()
    expect(messages).toContain(
      'The print range is too large — set a smaller print area on the Page Layout tab.',
    )
  })

  it('UPSTREAM-06: workbook with invalid dimensions fails safely', async () => {
    const state = createMockState({
      file: {
        name: 'corrupt.xlsx',
        sessionId: 'session-corrupt',
        sheets: [{ id: 'sheet-1', name: 'Sheet1', rowCount: -5, columnCount: 10 }],
        visuals: [],
      } as unknown as LazyWorkbookState['file'],
      flags: { preloadComplete: false, preloadRunning: false },
    })
    const ctx = createMockContext(state)

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(false)
    expect(messages).toContain('Unable to print.')
  })

  it('UPSTREAM-07: switching workbook while preloading aborts safely', async () => {
    const stateA = createMockState()
    const stateB = createMockState({
      file: { name: 'other.xlsx', sessionId: 's2', sheets: [], visuals: [] } as unknown as LazyWorkbookState['file'],
    })
    const ctx = createMockContext(stateA)

    vi.mocked(preloadEntireWorkbook).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      ctx.lazyWorkbookRef.current = stateB
      stateA.flags.preloadComplete = true
    })

    const result = await ensurePrintWorkbookLoaded(ctx, stateA, PRINT_MESSAGES)
    expect(result).toBe(false)
  })

  it('UPSTREAM-08: untitled/demo workbook with null lazyWorkbookRef skips the gate', async () => {
    const ctx = createMockContext(null)

    const result = await handleExportPdf(ctx)
    expect(result).toBe(true)
    expect(exportPdfMock).toHaveBeenCalledTimes(1)
  })

  it('UPSTREAM-09: a fully loaded workbook skips preloading', async () => {
    const state = createMockState({ flags: { preloadComplete: true, preloadRunning: false } })
    const ctx = createMockContext(state)

    const result = await ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES)
    expect(result).toBe(true)
    expect(preloadEntireWorkbook).not.toHaveBeenCalled()
  })

  it('UPSTREAM-10: concurrent readiness checks share single physical preload invocation', async () => {
    const state = createMockState({ flags: { preloadComplete: false, preloadRunning: false } })
    const ctx = createMockContext(state)

    let calls = 0
    vi.mocked(preloadEntireWorkbook).mockImplementation(async (_runtime, ref) => {
      calls++
      if (ref.current) {
        ref.current.flags.preloadRunning = true
        await new Promise((resolve) => setTimeout(resolve, 30))
        ref.current.flags.preloadComplete = true
        ref.current.flags.preloadRunning = false
      }
    })

    const [a, b] = await Promise.all([
      ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES),
      ensurePrintWorkbookLoaded(ctx, state, PRINT_MESSAGES),
    ])
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(calls).toBe(1)
  })
})
