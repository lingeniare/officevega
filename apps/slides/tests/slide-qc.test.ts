/**
 * Post-generation layout QC helpers:
 *  - generatedPageRange / mergeQcPages: which pages a landing marks for QC (incl. insert_at shifting)
 *  - createSlideFixSkill: tool allowlist wraps the full slides skill without losing the executor
 */
import { describe, it, expect } from 'vitest'
import type { AgentStreamRequest, AgentTransport } from '@genoffice/agent-core'
import type { RenderSlide } from '@genoffice/pptx-render'
import {
  generatedPageRange,
  mergeQcPages,
  createSlideFixSkill,
  isUnsupportedImageInputError,
  isQcEnabled,
  qcConcurrency,
  qcSlidePage,
  QC_PAGE_CONCURRENCY,
  runQcPages,
  settingsSupportVision,
  type QcPageOptions,
  type QcPageResult,
} from '../src/renderer/ai/slide-qc'
import { defaultAiSettings, type AiProviderId } from '@genoffice/ai-provider'
import type { DeckAccess } from '../src/renderer/ai/slides-skill'

const access: DeckAccess = {
  getSlides: () => [],
  getCurrent: () => 0,
  getSelectedIds: () => [],
  applySlide: () => {},
  applyDeck: () => {},
  fitWidthPx: 1280,
}

describe('generatedPageRange', () => {
  it('replace covers the whole deck', () => {
    expect(generatedPageRange('replace', { pages: 3 })).toEqual([0, 1, 2])
  })

  it('append covers only the new tail', () => {
    expect(generatedPageRange('append', { pages: 5, appendedFrom: 3 })).toEqual([3, 4])
  })

  it('replace_at / insert_at cover the single touched page', () => {
    expect(generatedPageRange('replace_at', { pages: 5, insertedIndex: 2 })).toEqual([2])
    expect(generatedPageRange('insert_at', { pages: 5, insertedIndex: 0 })).toEqual([0])
  })

  it('missing insertedIndex yields nothing', () => {
    expect(generatedPageRange('insert_at', { pages: 5 })).toEqual([])
  })
})

describe('mergeQcPages', () => {
  it('replace discards earlier pendings', () => {
    expect(mergeQcPages([7, 8], 'replace', { pages: 2 })).toEqual([0, 1])
  })

  it('append unions and dedupes', () => {
    expect(mergeQcPages([1, 3], 'append', { pages: 5, appendedFrom: 3 })).toEqual([1, 3, 4])
  })

  it('insert_at shifts pendings at/after the insertion point', () => {
    expect(mergeQcPages([1, 3], 'insert_at', { pages: 5, insertedIndex: 2 })).toEqual([1, 2, 4])
  })

  it('replace_at adds the page without shifting', () => {
    expect(mergeQcPages([1], 'replace_at', { pages: 5, insertedIndex: 3 })).toEqual([1, 3])
  })
})

describe('createSlideFixSkill', () => {
  it('exposes only read_slide and execute_slide_script', () => {
    const skill = createSlideFixSkill(access)
    expect(skill.tools.map((t) => t.name).sort()).toEqual(['execute_slide_script', 'read_slide'])
  })

  it('delegates execution to the slides executor (read_slide works)', async () => {
    const one: DeckAccess = {
      ...access,
      getSlides: () => [
        {
          widthPx: 1280,
          heightPx: 720,
          nodes: [],
        } as never,
      ],
    }
    const skill = createSlideFixSkill(one)
    const r = await skill.executeTool({ id: 't1', name: 'read_slide', input: { slideIndex: 0 } })
    expect(r.isError).toBeFalsy()
    expect(r.output).toContain('Canvas 1280×720px')
  })

  it('uses a geometry-only prompt when no screenshot can be sent', () => {
    const skill = createSlideFixSkill(access, false)
    expect(skill.systemPrompt).toContain('NO rendered screenshot is attached')
    expect(skill.systemPrompt).toContain('DO NOT judge or change contrast')
  })
})

describe('isQcEnabled', () => {
  it("localStorage 'ai-slides-qc'='0' is the kill switch", () => {
    localStorage.removeItem('ai-slides-qc')
    expect(isQcEnabled()).toBe(true)
    localStorage.setItem('ai-slides-qc', '0')
    expect(isQcEnabled()).toBe(false)
    localStorage.removeItem('ai-slides-qc')
  })
})

describe('vision capability fallback', () => {
  it('sends MiniMax-M3 screenshots while keeping MiniMax-M2.7 text-only', () => {
    const settings = { ...defaultAiSettings(), provider: 'minimax' as const }
    settings.providers.minimax.model = 'MiniMax-M3'
    expect(settingsSupportVision(settings)).toBe(true)
    settings.providers.minimax.model = 'MiniMax-M2.7'
    expect(settingsSupportVision(settings)).toBe(false)
  })

  it('uses the selected model when a provider mixes text and vision models', () => {
    const withProvider = (provider: AiProviderId) => ({ ...defaultAiSettings(), provider })
    const deepseek = withProvider('deepseek')
    expect(settingsSupportVision(deepseek)).toBe(false)
    deepseek.providers.deepseek.model = 'deep-seek-v4.1-flash'
    expect(settingsSupportVision(deepseek)).toBe(true)
    expect(settingsSupportVision(withProvider('glm'))).toBe(false)
    expect(settingsSupportVision(withProvider('gemini'))).toBe(true)
  })

  it('does not send screenshots to text-only models under a vision-capable provider', () => {
    const settings = defaultAiSettings()
    settings.provider = 'genspark'
    settings.providers.genspark.model = 'deep-seek-v4-flash'
    expect(settingsSupportVision(settings)).toBe(false)
    settings.providers.genspark.model = 'claude-opus-4-7'
    expect(settingsSupportVision(settings)).toBe(true)
  })

  it('recognizes image-capability errors from optimistic custom endpoints', () => {
    expect(isUnsupportedImageInputError('This model does not support image')).toBe(true)
    expect(isUnsupportedImageInputError('Vision input is not supported by this model')).toBe(true)
    expect(isUnsupportedImageInputError('HTTP 500: temporary provider failure')).toBe(false)
  })

  it('skips the model entirely when a geometry-only page passes the deterministic audit', async () => {
    let streamed = false
    const transport: AgentTransport = {
      stream: () => {
        streamed = true
        return { cancel: () => {} }
      },
    }
    const one: DeckAccess = {
      ...access,
      getSlides: () => [
        {
          widthPx: 1280,
          heightPx: 720,
          scale: 1,
          nodes: [],
        } as never,
      ],
    }
    const result = await qcSlidePage({
      access: one,
      transport,
      pageIndex: 0,
      screenshot: null,
    })
    expect(result).toMatchObject({ ok: true, edited: false, reply: 'OK' })
    expect(streamed).toBe(false)
  })

  it('runs an audited geometry issue without attaching an image', async () => {
    let request: AgentStreamRequest | undefined
    const transport: AgentTransport = {
      stream: (next, callbacks) => {
        request = next
        queueMicrotask(() => {
          callbacks.onDelta('OK')
          callbacks.onDone()
        })
        return { cancel: () => {} }
      },
    }
    const one: DeckAccess = {
      ...access,
      getSlides: () => [
        {
          widthPx: 1280,
          heightPx: 720,
          scale: 1,
          nodes: [
            {
              type: 'picture',
              sourceId: 'picture-1',
              box: { x: 1270, y: 20, w: 100, h: 100, rotationDeg: 0 },
            },
          ],
        } as never,
      ],
    }
    const result = await qcSlidePage({
      access: one,
      transport,
      pageIndex: 0,
      screenshot: null,
    })
    expect(result.error).toBeUndefined()
    const message = request?.messages[0]
    expect(message).toMatchObject({ role: 'user' })
    expect(message).not.toHaveProperty('images')
    expect(request?.system).toContain('NO rendered screenshot is attached')
    expect(message?.role === 'user' ? message.text : '').toContain('No image is attached')
  })
})

describe('runQcPages', () => {
  const noopTransport: AgentTransport = {
    stream: () => ({ cancel: () => {} }),
  }
  const slideStub = () =>
    ({ widthPx: 1280, heightPx: 720, scale: 1, nodes: [] }) as never
  const okResult: QcPageResult = { ok: true, edited: false, reply: 'OK', preIssues: 0, postIssues: 0 }

  it('checks pages through a bounded pool and settles them by position', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const finished: number[] = []
    const runPage = (o: QcPageOptions) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      // Later pages resolve sooner — completion order differs from page order on purpose.
      return new Promise<QcPageResult>((resolve) =>
        setTimeout(() => {
          inFlight -= 1
          finished.push(o.pageIndex)
          resolve({ ...okResult, edited: true, reply: 'aligned', postIssues: 0 })
        }, 30 - o.pageIndex * 3),
      )
    }
    const settled: number[] = []
    const outcomes = await runQcPages({
      access,
      transport: noopTransport,
      pages: [0, 1, 2, 3, 4, 5, 6, 7],
      visionCapable: false,
      captureShot: async () => null,
      concurrency: 3,
      runPage,
      onPage: (i) => settled.push(i),
    })
    expect(maxInFlight).toBe(3)
    expect(outcomes.map((o) => o?.kind)).toEqual(new Array(8).fill('fixed'))
    // onPage idx is the position in `pages`, letting the caller order lines by page.
    expect(settled).toHaveLength(8)
    expect([...settled].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(finished).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('reverts only the page whose audit worsened — siblings keep their edits', async () => {
    const checkpointed: number[] = []
    const restored: number[] = []
    const rebuilt = { widthPx: 1280 } as unknown as RenderSlide
    const runPage = (o: QcPageOptions): Promise<QcPageResult> =>
      Promise.resolve(
        o.pageIndex === 1
          ? { ok: true, edited: true, reply: 'moved columns', preIssues: 0, postIssues: 3 }
          : { ok: true, edited: true, reply: 'fixed spacing', preIssues: 1, postIssues: 0 },
      )
    const outcomes = await runQcPages({
      access: { ...access, getSlides: () => [slideStub(), slideStub(), slideStub()] },
      transport: noopTransport,
      pages: [0, 1, 2],
      visionCapable: false,
      captureShot: async () => null,
      checkpoint: async (p) => {
        checkpointed.push(p)
      },
      restore: async (p) => {
        restored.push(p)
        return rebuilt
      },
      concurrency: 3,
      runPage,
    })
    expect(checkpointed.sort((a, b) => a - b)).toEqual([0, 1, 2])
    expect(restored).toEqual([1])
    expect(outcomes[0]?.kind).toBe('fixed')
    expect(outcomes[1]).toMatchObject({ kind: 'reverted', page: 1, slide: rebuilt })
    expect(outcomes[2]?.kind).toBe('fixed')
  })

  it('keeps the edits and reports fixed when the checkpointed revert fails', async () => {
    const outcomes = await runQcPages({
      access: { ...access, getSlides: () => [slideStub()] },
      transport: noopTransport,
      pages: [0],
      visionCapable: false,
      captureShot: async () => null,
      checkpoint: async () => {},
      restore: async () => null,
      concurrency: 1,
      runPage: () =>
        Promise.resolve({ ok: true, edited: true, reply: 'x', preIssues: 0, postIssues: 2 }),
    })
    expect(outcomes[0]?.kind).toBe('fixed')
  })

  it('drops to geometry-only for the rest of the pass after an image rejection', async () => {
    const calls: Array<{ page: number; shot: boolean }> = []
    const shotsTaken: number[] = []
    const runPage = (o: QcPageOptions): Promise<QcPageResult> => {
      calls.push({ page: o.pageIndex, shot: o.screenshot !== null })
      return Promise.resolve(
        o.screenshot
          ? { ...okResult, error: 'This model does not support image input' }
          : okResult,
      )
    }
    const outcomes = await runQcPages({
      access: { ...access, getSlides: () => [slideStub(), slideStub(), slideStub()] },
      transport: noopTransport,
      pages: [0, 1, 2],
      visionCapable: true,
      captureShot: async (p) => {
        shotsTaken.push(p)
        return { base64: 'x', mime: 'image/png' }
      },
      concurrency: 1,
      runPage,
    })
    // Page 0 retries geometry-only; pages 1-2 never capture a shot at all.
    expect(calls).toEqual([
      { page: 0, shot: true },
      { page: 0, shot: false },
      { page: 1, shot: false },
      { page: 2, shot: false },
    ])
    expect(shotsTaken).toEqual([0])
    expect(outcomes.map((o) => o?.kind)).toEqual(['ok', 'ok', 'ok'])
  })

  it('skips a page whose screenshot could not be captured', async () => {
    const runPageCalls: number[] = []
    const outcomes = await runQcPages({
      access: { ...access, getSlides: () => [slideStub(), slideStub()] },
      transport: noopTransport,
      pages: [0, 1],
      visionCapable: true,
      captureShot: async (p) => (p === 0 ? null : { base64: 'x', mime: 'image/png' }),
      concurrency: 1,
      runPage: (o) => {
        runPageCalls.push(o.pageIndex)
        return Promise.resolve(okResult)
      },
    })
    expect(runPageCalls).toEqual([1])
    expect(outcomes[0]?.kind).toBe('skipped')
    expect(outcomes[1]?.kind).toBe('ok')
  })

  it('abort stops the pool: in-flight pages leave no line, queued pages never start', async () => {
    const ac = new AbortController()
    const started: number[] = []
    const runPage = (o: QcPageOptions) => {
      started.push(o.pageIndex)
      return new Promise<QcPageResult>((resolve) => {
        o.signal?.addEventListener(
          'abort',
          () => resolve({ ...okResult, error: 'aborted' }),
          { once: true },
        )
      })
    }
    const pending = runQcPages({
      access: { ...access, getSlides: () => [slideStub(), slideStub(), slideStub(), slideStub()] },
      transport: noopTransport,
      pages: [0, 1, 2, 3],
      visionCapable: false,
      captureShot: async () => null,
      concurrency: 2,
      runPage,
      signal: ac.signal,
    })
    await new Promise((r) => setTimeout(r, 0))
    ac.abort()
    const outcomes = await pending
    expect(started).toEqual([0, 1])
    expect(outcomes.every((o) => o === undefined)).toBe(true)
  })

  it('reads the pool size from localStorage, clamped to 1-8', () => {
    localStorage.removeItem('ai-slides-qc-parallel')
    expect(qcConcurrency()).toBe(QC_PAGE_CONCURRENCY)
    localStorage.setItem('ai-slides-qc-parallel', '6')
    expect(qcConcurrency()).toBe(6)
    localStorage.setItem('ai-slides-qc-parallel', '99')
    expect(qcConcurrency()).toBe(8)
    localStorage.setItem('ai-slides-qc-parallel', 'abc')
    expect(qcConcurrency()).toBe(QC_PAGE_CONCURRENCY)
    localStorage.removeItem('ai-slides-qc-parallel')
  })
})
