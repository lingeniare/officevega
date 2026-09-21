/**
 * Staged deck generation (detail:"draft" + upgrade_deck) verification:
 * - the internally-planned outline is shown to the user in a confirmation card
 *   (proposeOutline) and generation pauses until the verdict;
 * - the draft fast path skips style/image stages and emits labeled visual slots;
 * - upgrade_deck regenerates pages in place, resolving placeholders to real
 *   imagery and/or applying a unified Style Skill.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createSlidesSkill,
  type DeckAccess,
  type OutlineProposal,
  type OutlineProposalResult,
} from '../src/renderer/ai/slides-skill'
import type { RenderNode, RenderSlide, ShapeRenderNode } from '@genoffice/pptx-render'
import type { AgentToolCall } from '../src/shared/ipc'

/** Minimal text node carrying `text` lines (the slot scan reads node text). */
function textNode(id: string, text: string): ShapeRenderNode {
  return {
    id,
    sourceId: id,
    type: 'text',
    box: { x: 10, y: 10, w: 300, h: 30, rotationDeg: 0, flipH: false, flipV: false, centerX: 160, centerY: 25 },
    fill: { kind: 'none' },
    text: {
      lines: text.split('\n').map((line, i) => ({
        runs: [
          {
            text: line,
            x: 0,
            baselineY: 12,
            fontFamily: 'Arial',
            fontSizePx: 16,
            color: '#000000',
            bold: false,
            italic: false,
            underline: false,
            widthPx: 50,
          },
        ],
        top: i * 20,
        height: 20,
      })),
      insets: { l: 0, t: 0, r: 0, b: 0 },
      anchor: 'top',
      fontScale: 1,
      contentHeight: 20,
      wrap: true,
    },
  }
}

const slideWith = (texts: string[]): RenderSlide => ({
  widthPx: 1280,
  heightPx: 720,
  scale: 1,
  background: { kind: 'solid', color: '#FFFFFF' },
  nodes: texts.map((t, i) => textNode(`n${i}`, t)) as RenderNode[],
})

type DraftArgs = NonNullable<Parameters<NonNullable<DeckAccess['generateDraftPages']>>[0]>

function makeAccess(opts?: {
  slides?: RenderSlide[]
  planImageQueries?: string[]
  cloudEnabled?: boolean
  imageGenAvailable?: boolean
  generateImageOk?: boolean
  upgradeGenFails?: number[] // 1-based page indexes whose upgrade generation keeps failing
  regenFails?: number[] // 0-based slide indexes whose in-place landing fails
  draftPageDelayMs?: number
}) {
  const outlineCalls: OutlineProposal[] = []
  const draftCalls: DraftArgs[] = []
  const styleCalls: string[] = []
  const imageGenCalls: string[] = []
  const imageSearchCalls: string[] = []
  const localPageCalls: { pageIndex: number; brief: string; style: string }[] = []
  const regenCalls: number[] = []
  const landed: string[] = []
  let draftInFlight = 0
  let draftMaxInFlight = 0
  // Resolvers the test flips to drive the outline card verdict
  let outlineVerdict: OutlineProposalResult = { status: 'approved' }
  let manualOutline: ((r: OutlineProposalResult) => void) | null = null

  const access: DeckAccess = {
    getSlides: () => opts?.slides ?? ([] as RenderSlide[]),
    getCurrent: () => 0,
    getSelectedIds: () => [],
    applySlide: () => {},
    applyDeck: () => {},
    fitWidthPx: 1280,
    retryBackoffMs: 0,
    landGeneratedPages: async (markers) => {
      landed.push(...markers)
      return { ok: true, pages: landed.length }
    },
    regenerateSlide: async (slideIndex, marker) => {
      if (opts?.regenFails?.includes(slideIndex)) return { ok: false, error: 'mock land fail' }
      regenCalls.push(slideIndex)
      landed.push(marker)
      return { ok: true }
    },
    isCloudPageGenEnabled: async () => opts?.cloudEnabled === true,
    generatePageCloud: async (args) => ({
      ok: true,
      marker: `cloudpptx:PAGE${args.pageIndex}:${args.title}`,
    }),
    generatePageLocal: async (args) => {
      localPageCalls.push({ pageIndex: args.pageIndex, brief: args.brief, style: args.style })
      if (opts?.upgradeGenFails?.includes(args.pageIndex))
        return { ok: false, error: 'mock gen fail' }
      return { ok: true, marker: `localpptx:PAGE${args.pageIndex}:${args.title}` }
    },
    generateDraftPages: async (args) => {
      draftCalls.push(args)
      draftInFlight += 1
      draftMaxInFlight = Math.max(draftMaxInFlight, draftInFlight)
      try {
        if (opts?.draftPageDelayMs)
          await new Promise((r) => setTimeout(r, opts.draftPageDelayMs))
        return {
          ok: true,
          markers: args.pages.map((p) => `draftpptx:PAGE${p.pageIndex}:${p.title}`),
        }
      } finally {
        draftInFlight -= 1
      }
    },
    planDeckOutline: async (a) => ({
      ok: true,
      outline: {
        core_hook: 'CH:' + a.topic,
        pages: Array.from({ length: a.count }, (_, i) => ({
          title: `Planned page ${a.startPage + i}`,
          brief: `b${a.startPage + i}`,
          layout: 'data',
          image_queries: opts?.planImageQueries ? [...opts.planImageQueries] : [],
        })),
      },
    }),
    proposeOutline: async (proposal) => {
      outlineCalls.push(proposal)
      if (manualOutline) return new Promise<OutlineProposalResult>((res) => (manualOutline = res))
      return outlineVerdict
    },
    generateStyleSkill: async (a) => {
      styleCalls.push(a.topic)
      return { ok: true, styleSkill: 'STYLE_SKILL_FOR:' + a.topic }
    },
    imageGenAvailable: () => opts?.imageGenAvailable !== false,
    generateImage: async (a) => {
      imageGenCalls.push(a.prompt)
      if (opts?.generateImageOk === false) return { ok: false, error: 'no image' }
      return { ok: true, url: `https://gen.img/${imageGenCalls.length}.png` }
    },
    searchImages: async (query) => {
      imageSearchCalls.push(query)
      return [`https://stock.img/${encodeURIComponent(query)}.jpg`]
    },
  }
  return {
    access,
    outlineCalls,
    draftCalls,
    styleCalls,
    imageGenCalls,
    imageSearchCalls,
    localPageCalls,
    regenCalls,
    landed,
    setOutlineVerdict: (v: OutlineProposalResult) => (outlineVerdict = v),
    armManualOutline: () => (manualOutline = () => {}),
    resolveOutline: (r: OutlineProposalResult) => manualOutline?.(r),
    getDraftMaxInFlight: () => draftMaxInFlight,
  }
}

const draftCall = (topic: string, approx: number): AgentToolCall => ({
  id: 'c-draft',
  name: 'generate_deck',
  input: { topic, approx_pages: approx, detail: 'draft', context: 'real material' },
})

describe('staged flow: outline confirmation card', () => {
  it('shows the outline after planning and waits for the user verdict before generating', async () => {
    const { access, outlineCalls, draftCalls, armManualOutline, resolveOutline } = makeAccess()
    armManualOutline()
    const skill = createSlidesSkill(access)
    const pending = skill.executeTool(draftCall('City Guide', 3))
    await vi.waitFor(() => expect(outlineCalls.length).toBe(1))
    // The card carries every planned page (title/brief/layout/visual count)
    expect(outlineCalls[0]!.pages.length).toBe(3)
    expect(outlineCalls[0]!.pages[0]!.title).toBe('Planned page 1')
    expect(outlineCalls[0]!.coreHook).toBe('CH:City Guide')
    // Still waiting — no draft generation started while the card is open
    expect(draftCalls.length).toBe(0)
    resolveOutline({ status: 'approved' })
    const res = (await pending) as { output: string; mutated?: boolean }
    expect(res.mutated).toBe(true)
    expect(draftCalls.length).toBeGreaterThan(0)
  })

  it('cancelled card → nothing is generated', async () => {
    const { access, draftCalls, setOutlineVerdict } = makeAccess()
    setOutlineVerdict({ status: 'cancelled' })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as {
      output: string
      mutated?: boolean
    }
    expect(res.mutated).toBe(false)
    expect(res.output).toContain('cancelled')
    expect(draftCalls.length).toBe(0)
  })

  it('revise verdict → feedback returned for re-planning, nothing generated', async () => {
    const { access, draftCalls, setOutlineVerdict } = makeAccess()
    setOutlineVerdict({ status: 'revise', feedback: 'merge pages 3 and 4' })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as {
      output: string
      mutated?: boolean
    }
    expect(res.mutated).toBe(false)
    expect(res.output).toContain('merge pages 3 and 4')
    expect(res.output).toContain('call generate_deck again')
    expect(draftCalls.length).toBe(0)
  })

  it('approved with removals → removed pages never reach generation', async () => {
    const { access, outlineCalls, draftCalls, armManualOutline, resolveOutline } = makeAccess()
    armManualOutline()
    const skill = createSlidesSkill(access)
    const pending = skill.executeTool(draftCall('City Guide', 4))
    await vi.waitFor(() => expect(outlineCalls.length).toBe(1))
    resolveOutline({
      status: 'approved',
      removed: [1],
      titles: ['Cover Retitled', 'x', 'x', 'x'],
    })
    await pending
    const generated = draftCalls.flatMap((c) => c.pages.map((p) => p.title))
    expect(generated.length).toBe(3)
    expect(generated).toContain('Cover Retitled')
    expect(generated).not.toContain('Planned page 2')
  })
})

describe('staged flow: draft generation', () => {
  it('skips style + image stages entirely and hands visual slots to the draft generator', async () => {
    const { access, styleCalls, imageGenCalls, imageSearchCalls, draftCalls, localPageCalls } =
      makeAccess({ planImageQueries: ['city skyline'] })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as { output: string }
    expect(styleCalls.length).toBe(0)
    expect(imageGenCalls.length).toBe(0)
    expect(imageSearchCalls.length).toBe(0)
    expect(draftCalls.length).toBe(1) // 3 pages → one batch
    expect(localPageCalls.length).toBe(0) // batch path, not the per-page fallback
    // Visual slots travel to the generator as labeled placeholder descriptions
    expect(draftCalls[0]!.pages.every((p) => p.imageSlots.includes('city skyline'))).toBe(true)
    expect(res.output).toContain('upgrade_deck')
  })

  it('runs two batch waves concurrently', async () => {
    const { access, getDraftMaxInFlight, draftCalls } = makeAccess({ draftPageDelayMs: 10 })
    const skill = createSlidesSkill(access)
    await skill.executeTool(draftCall('Big Deck', 10)) // 10 pages → 2 chunks of 5
    expect(draftCalls.length).toBe(2)
    expect(getDraftMaxInFlight()).toBe(2)
  })

  it('a page that keeps failing to build does not block the rest of the deck', async () => {
    const { access, landed } = makeAccess()
    const orig = access.generateDraftPages!
    // Page 2's spec never builds — in the batch AND in the single-page retry
    access.generateDraftPages = async (args) => {
      const r = await orig(args)
      if (r.ok && r.markers) {
        const i = args.pages.findIndex((p) => p.pageIndex === 2)
        if (i >= 0) r.markers[i] = null
      }
      return r
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as { output: string }
    expect(landed.length).toBe(2)
    expect(res.output).toContain('2/3')
    expect(res.output).toContain('page 2')
  })

  it('a page that fails in the batch gets one single-page retry and lands', async () => {
    const { access, landed, draftCalls } = makeAccess()
    const orig = access.generateDraftPages!
    // Page 2 fails only inside the multi-page batch; the single-page retry succeeds
    access.generateDraftPages = async (args) => {
      const r = await orig(args)
      if (r.ok && r.markers && args.pages.length > 1) {
        const i = args.pages.findIndex((p) => p.pageIndex === 2)
        if (i >= 0) r.markers[i] = null
      }
      return r
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as { output: string }
    expect(landed.length).toBe(3)
    expect(res.output).toContain('3/3')
    // The retry round made one extra single-page call for page 2
    expect(draftCalls.some((c) => c.pages.length === 1 && c.pages[0]!.pageIndex === 2)).toBe(true)
  })

  it('without the batch capability falls back to per-page local generation with placeholder instructions', async () => {
    const { access, localPageCalls, styleCalls } = makeAccess({
      planImageQueries: ['city skyline'],
    })
    delete (access as { generateDraftPages?: unknown }).generateDraftPages
    const skill = createSlidesSkill(access)
    await skill.executeTool(draftCall('City Guide', 3))
    expect(styleCalls.length).toBe(0)
    expect(localPageCalls.length).toBe(3)
    // The fallback brief instructs the local builder to draw labeled placeholders
    expect(localPageCalls.every((c) => c.brief.includes('IMAGE: city skyline'))).toBe(true)
  })

  it('marks the deck as a draft in the next-turn context', async () => {
    const { access } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool(draftCall('City Guide', 3))
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('DRAFT')
    expect(ctx).toContain('upgrade_deck')
  })
})

describe('upgrade_deck', () => {
  const draftSlides = () => [
    slideWith(['City Guide', 'IMAGE: city skyline aerial photo']),
    slideWith(['Food', 'CHART: prices by district']),
  ]

  const upgradeCall = (stage: string, extra?: Record<string, unknown>): AgentToolCall => ({
    id: 'c-up',
    name: 'upgrade_deck',
    input: { stage, ...extra },
  })

  it('stage:"visuals" resolves labeled slots via image generation and regenerates pages in place', async () => {
    const { access, imageGenCalls, regenCalls, localPageCalls } = makeAccess({
      slides: draftSlides(),
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(upgradeCall('visuals'))) as { output: string }
    // Both slots were resolved by the image generator (generation first, search fallback)
    expect(imageGenCalls).toEqual(['city skyline aerial photo', 'prices by district'])
    // Every page regenerated in place (0-based slide indexes)
    expect(regenCalls.sort()).toEqual([0, 1])
    // The brief keeps the existing text verbatim and carries the resolved URL
    expect(localPageCalls[0]!.brief).toContain('City Guide')
    expect(localPageCalls[0]!.brief).toContain('https://gen.img/1.png')
    expect(localPageCalls[0]!.brief).toContain('Keep ALL existing text')
    expect(res.output).toContain('2/2')
  })

  it('stage:"style" generates a Style Skill and regenerates pages keeping their placeholders', async () => {
    const { access, styleCalls, imageGenCalls, regenCalls, localPageCalls } = makeAccess({
      slides: draftSlides(),
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(upgradeCall('style'))) as { output: string }
    expect(styleCalls.length).toBe(1)
    expect(imageGenCalls.length).toBe(0) // style stage resolves no imagery
    expect(regenCalls.sort()).toEqual([0, 1])
    // Placeholders are preserved under the new style, not filled
    expect(localPageCalls[0]!.brief).toContain('intentional visual placeholders')
    expect(localPageCalls[0]!.style).toContain('STYLE_SKILL_FOR')
    expect(res.output).toContain('2/2')
  })

  it('stage:"full" resolves imagery AND applies a style', async () => {
    const { access, styleCalls, imageGenCalls, regenCalls, localPageCalls } = makeAccess({
      slides: draftSlides(),
    })
    const skill = createSlidesSkill(access)
    await skill.executeTool(upgradeCall('full'))
    expect(styleCalls.length).toBe(1)
    expect(imageGenCalls.length).toBe(2)
    expect(regenCalls.sort()).toEqual([0, 1])
    expect(localPageCalls[0]!.style).toContain('STYLE_SKILL_FOR')
    expect(localPageCalls[0]!.brief).toContain('https://gen.img/1.png')
  })

  it('pages:[2] upgrades only that page', async () => {
    const { access, regenCalls } = makeAccess({ slides: draftSlides() })
    const skill = createSlidesSkill(access)
    await skill.executeTool(upgradeCall('visuals', { pages: [2] }))
    expect(regenCalls).toEqual([1])
  })

  it('a failing page does not block the others; the output names it for retry', async () => {
    const { access, regenCalls } = makeAccess({
      slides: draftSlides(),
      upgradeGenFails: [1],
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(upgradeCall('visuals'))) as { output: string }
    expect(regenCalls).toEqual([1]) // only page 2 landed
    expect(res.output).toContain('1/2')
    expect(res.output).toContain('page 1')
    expect(res.output).toContain('failed')
  })

  it('falls back to image search when generation is unavailable', async () => {
    const { access, imageGenCalls, imageSearchCalls, localPageCalls } = makeAccess({
      slides: draftSlides(),
      imageGenAvailable: false,
    })
    const skill = createSlidesSkill(access)
    await skill.executeTool(upgradeCall('visuals'))
    expect(imageGenCalls.length).toBe(0)
    expect(imageSearchCalls.length).toBe(2)
    expect(localPageCalls[0]!.brief).toContain('https://stock.img/')
  })

  it('rejects an invalid stage and an empty deck', async () => {
    const { access } = makeAccess({ slides: draftSlides() })
    const skill = createSlidesSkill(access)
    const bad = (await skill.executeTool(upgradeCall('bogus'))) as { isError?: boolean }
    expect(bad.isError).toBe(true)
    const empty = makeAccess({ slides: [] })
    const r2 = (await createSlidesSkill(empty.access).executeTool(upgradeCall('visuals'))) as {
      isError?: boolean
      output?: string
    }
    expect(r2.isError).toBe(true)
    expect(r2.output).toContain('empty')
  })
})
