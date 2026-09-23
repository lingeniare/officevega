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
import type {
  PictureRenderNode,
  RenderNode,
  RenderSlide,
  ShapeRenderNode,
} from '@genoffice/pptx-render'
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
  const upgradeOffers: { visuals: boolean; style: boolean }[] = []
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
    onUpgradeOffer: (pending) => {
      upgradeOffers.push(pending)
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
    upgradeOffers,
    setOutlineVerdict: (v: OutlineProposalResult) => (outlineVerdict = v),
    armManualOutline: () => (manualOutline = () => {}),
    resolveOutline: (r: OutlineProposalResult) => manualOutline?.(r),
    getDraftMaxInFlight: () => draftMaxInFlight,
  }
}

const draftCall = (topic: string, approx: number, extra?: Record<string, unknown>): AgentToolCall => ({
  id: 'c-draft',
  name: 'generate_deck',
  input: { topic, approx_pages: approx, detail: 'draft', context: 'real material', ...extra },
})

const upgradeCall = (stage: string, extra?: Record<string, unknown>): AgentToolCall => ({
  id: 'c-up',
  name: 'upgrade_deck',
  input: { stage, ...extra },
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

  it('approved with brief edits → edited briefs reach page generation aligned to kept pages', async () => {
    const { access, outlineCalls, draftCalls, armManualOutline, resolveOutline } = makeAccess()
    armManualOutline()
    const skill = createSlidesSkill(access)
    const pending = skill.executeTool(draftCall('City Guide', 4))
    await vi.waitFor(() => expect(outlineCalls.length).toBe(1))
    // The card sends titles/briefs already filtered to the KEPT rows (unchanged
    // rows included verbatim) — they apply to the post-splice page list, so
    // indexes stay aligned after removals.
    resolveOutline({
      status: 'approved',
      removed: [1],
      titles: ['Cover Retitled', 'Planned page 3', 'Fourth Retitled'],
      briefs: ['custom brief for the cover', 'b3', 'edited fourth brief'],
    })
    await pending
    const generated = draftCalls.flatMap((c) => c.pages)
    expect(generated.length).toBe(3)
    expect(generated[0]!.title).toBe('Cover Retitled')
    expect(generated[0]!.brief).toBe('custom brief for the cover')
    expect(generated[1]!.title).toBe('Planned page 3')
    expect(generated[1]!.brief).toBe('b3')
    expect(generated[2]!.title).toBe('Fourth Retitled')
    expect(generated[2]!.brief).toBe('edited fourth brief')
  })
})

describe('staged flow: draft is the default for a new deck', () => {
  it('omitting detail → draft path (no style, no images) with the outline card', async () => {
    const { access, outlineCalls, styleCalls, imageGenCalls, draftCalls } = makeAccess({
      planImageQueries: ['city skyline'],
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool({
      id: 'c-omit',
      name: 'generate_deck',
      input: { topic: 'City Guide', approx_pages: 3, context: 'real material' },
    } as AgentToolCall)) as { output: string }
    expect(outlineCalls.length).toBe(1)
    expect(styleCalls.length).toBe(0)
    expect(imageGenCalls.length).toBe(0)
    expect(draftCalls.length).toBeGreaterThan(0)
    expect(res.output).toContain('upgrade_deck')
  })

  it('explicit detail:"full" → the complete designed pipeline (style + imagery)', async () => {
    const { access, styleCalls, imageGenCalls, localPageCalls } = makeAccess({
      planImageQueries: ['city skyline'],
      cloudEnabled: false,
    })
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-full',
      name: 'generate_deck',
      input: { topic: 'City Guide', approx_pages: 3, context: 'real material', detail: 'full' },
    } as AgentToolCall)
    expect(styleCalls.length).toBe(1)
    expect(imageGenCalls.length).toBeGreaterThan(0)
    expect(localPageCalls.length).toBe(3)
  })

  it('explicit pages for a new deck still go through the outline card and the draft path', async () => {
    const { access, outlineCalls, styleCalls, draftCalls } = makeAccess()
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool({
      id: 'c-explicit',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        pages: [
          { title: 'P1', brief: 'b1', layout: 'data', image_queries: [] },
          { title: 'P2', brief: 'b2', layout: 'content', image_queries: [] },
        ],
      },
    } as AgentToolCall)) as { output: string }
    // The model hand-wrote pages — the user still confirms the structure first
    expect(outlineCalls.length).toBe(1)
    expect(outlineCalls[0]!.pages.map((p) => p.title)).toEqual(['P1', 'P2'])
    // And the deck is a draft, not a designed full run
    expect(styleCalls.length).toBe(0)
    expect(draftCalls.length).toBe(1)
    expect(res.output).toContain('upgrade_deck')
  })

  it('append mode stays on the full path even without detail (new pages match the deck)', async () => {
    const { access, styleCalls, outlineCalls } = makeAccess({ cloudEnabled: false })
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-append',
      name: 'generate_deck',
      input: {
        insert_mode: 'append',
        core_hook: 'h',
        style: 's',
        pages: [{ title: 'Extra', brief: 'b', layout: 'data', image_queries: [] }],
      },
    } as AgentToolCall)
    // Explicit pages were passed — no internal planning, so no outline card
    expect(outlineCalls.length).toBe(0)
    expect(styleCalls.length).toBe(0) // style was passed explicitly
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
    await skill.executeTool(draftCall('Big Deck', 10)) // 10 pages → 4 chunks of 3
    expect(draftCalls.length).toBe(4)
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

  it('a whole batch coming back empty is retried per page and still lands', async () => {
    const { access, landed, draftCalls } = makeAccess()
    const orig = access.generateDraftPages!
    let batchAttempts = 0
    // The multi-page call returns the empty-stream failure the user hit; the
    // single-page retries must recover every page of that batch.
    access.generateDraftPages = async (args) => {
      if (args.pages.length > 1 && batchAttempts++ === 0) return { ok: false, error: 'Empty output' }
      return orig(args)
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as { output: string }
    expect(landed.length).toBe(3)
    expect(res.output).toContain('3/3')
    expect(draftCalls.filter((c) => c.pages.length === 1).length).toBe(3)
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

describe('staged flow: upgrade offer callback', () => {
  it('fires after the draft lands (both stages pending), then re-fires with only style pending', async () => {
    const { access, upgradeOffers, outlineCalls } = makeAccess()
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(draftCall('City Guide', 3))) as { mutated?: boolean }
    expect(res.mutated).toBe(true)
    expect(outlineCalls.length).toBe(1)
    // Draft landed → the UI card offers visuals + style
    expect(upgradeOffers).toEqual([{ visuals: true, style: true }])

    // Upgrading a deck that was never a draft does not fire the offer at all
    const up = makeAccess({ slides: [slideWith(['Title', 'IMAGE: x'])] })
    await createSlidesSkill(up.access).executeTool(upgradeCall('visuals'))
    expect(up.upgradeOffers.length).toBe(0)
  })

  it('after upgrade_deck(visuals) on a draft deck the card offers only style', async () => {
    // getSlides serves the draft deck (with the placeholder labels still on it)
    const slides = [
      slideWith(['Title 1', 'IMAGE: skyline']),
      slideWith(['Title 2', 'CHART: growth']),
    ]
    const { access, upgradeOffers } = makeAccess({ slides })
    const skill = createSlidesSkill(access)
    // generate_deck lands the draft and sets state.draftDeck
    await skill.executeTool(draftCall('X', 2))
    upgradeOffers.length = 0
    const res = (await skill.executeTool(upgradeCall('visuals'))) as { output: string }
    expect(res.output).toContain('2/2')
    expect(upgradeOffers[upgradeOffers.length - 1]).toEqual({ visuals: false, style: true })
    // And once the style stage lands, the card is hidden ({false,false})
    const res2 = (await skill.executeTool(upgradeCall('style'))) as { output: string }
    expect(res2.output).toContain('2/2')
    expect(upgradeOffers[upgradeOffers.length - 1]).toEqual({ visuals: false, style: false })
  })
})

describe('upgrade_deck: imagery survives the style stage', () => {
  const pictureNode = (id: string, dataUrl: string): PictureRenderNode => ({
    id,
    sourceId: id,
    type: 'picture',
    dataUrl,
    box: {
      x: 400,
      y: 100,
      w: 600,
      h: 400,
      rotationDeg: 0,
      flipH: false,
      flipV: false,
      centerX: 700,
      centerY: 300,
    },
  })

  it('visuals→style re-feeds the generated image URLs instead of resurrecting placeholder boxes', async () => {
    // A draft deck mid-flow: labeled placeholder still on the canvas, matching
    // the planned slot descriptions.
    const slides = [
      slideWith(['City Guide', 'IMAGE: skyline aerial']),
      slideWith(['Food', 'CHART: prices by district']),
    ]
    const { access, localPageCalls, imageGenCalls } = makeAccess({
      slides,
      planImageQueries: ['skyline aerial', 'prices by district'],
    })
    const skill = createSlidesSkill(access)
    // The draft run sets state.draftDeck + draftImageSlots
    await skill.executeTool(draftCall('X', 2))
    // Visuals pass: both slots resolve to generated URLs and pages regenerate
    await skill.executeTool(upgradeCall('visuals'))
    expect(imageGenCalls.length).toBeGreaterThan(0)
    // The canvas now shows the upgraded pages: real visuals, labels consumed
    ;(access as { getSlides: () => RenderSlide[] }).getSlides = () => [
      slideWith(['City Guide']),
      slideWith(['Food']),
    ]
    localPageCalls.length = 0
    const res = (await skill.executeTool(upgradeCall('style'))) as { output: string }
    expect(res.output).toContain('2/2')
    // The style brief reuses the exact generated URLs…
    expect(localPageCalls[0]!.brief).toContain('https://gen.img/1.png')
    expect(localPageCalls[0]!.brief).toContain('reuse these exact images')
    // …and does NOT tell the model to bring the placeholder boxes back
    expect(localPageCalls[0]!.brief).not.toContain('intentional visual placeholders')
    expect(localPageCalls[0]!.brief).not.toContain('IMAGE:')
  })

  it('no remembered URLs: canvas pictures are materialized to the image store and re-fed (local path)', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg='
    const slide: RenderSlide = {
      ...slideWith(['Report']),
      nodes: [textNode('t', 'Report'), pictureNode('p', dataUrl)] as RenderNode[],
    }
    const { access, localPageCalls } = makeAccess({ slides: [slide] })
    const stored: string[] = []
    access.storeImageData = async (d: string) => {
      stored.push(d)
      return { ok: true, url: 'file:///vegaoffice-ai-images/x.png' }
    }
    const skill = createSlidesSkill(access)
    // No draft state — a foreign/imported deck; stage:'style' must keep its imagery
    await skill.executeTool(upgradeCall('style'))
    expect(stored).toEqual([dataUrl])
    expect(localPageCalls[0]!.brief).toContain('file:///vegaoffice-ai-images/x.png')
    expect(localPageCalls[0]!.brief).toContain('reuse these exact images')
  })

  it('materialized URLs are remembered per page and reused on the next restyle', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg='
    const slide: RenderSlide = {
      ...slideWith(['Report']),
      nodes: [textNode('t', 'Report'), pictureNode('p', dataUrl)] as RenderNode[],
    }
    const { access, localPageCalls } = makeAccess({ slides: [slide] })
    let calls = 0
    access.storeImageData = async () => {
      calls++
      return { ok: true, url: 'file:///vegaoffice-ai-images/x.png' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(upgradeCall('style'))
    expect(calls).toBe(1)
    localPageCalls.length = 0
    // Second restyle: the remembered file:// URL is fed again — no rematerialization
    await skill.executeTool(upgradeCall('style'))
    expect(calls).toBe(1)
    expect(localPageCalls[0]!.brief).toContain('file:///vegaoffice-ai-images/x.png')
  })

  it('append mode: appended pages keep their own slots; earlier pages keep their own imagery', async () => {
    // An existing page with an already-placed picture, then generate_deck
    // (insert_mode:"append") adds a page whose visual slot resolves during the
    // full run. draftImageSlots indexes only the APPENDED pages — a later style
    // upgrade must not wire the appended page's imagery onto the earlier page.
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg='
    const oldPage: RenderSlide = {
      ...slideWith(['Intro']),
      nodes: [textNode('t', 'Intro'), pictureNode('p', dataUrl)] as RenderNode[],
    }
    const { access, localPageCalls } = makeAccess({
      slides: [oldPage],
      planImageQueries: ['appended visual'],
    })
    const stored: string[] = []
    access.storeImageData = async (d: string) => {
      stored.push(d)
      return { ok: true, url: 'file:///vegaoffice-ai-images/old.png' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(
      draftCall('Deck', 1, { detail: 'full', insert_mode: 'append' }),
    )
    // The appended page has landed; the deck is now old page + appended page.
    ;(access as { getSlides: () => RenderSlide[] }).getSlides = () => [
      oldPage,
      slideWith(['New chapter']),
    ]
    localPageCalls.length = 0
    const res = (await skill.executeTool(upgradeCall('style'))) as { output: string }
    expect(res.output).toContain('2/2')
    // Calls land in completion order — address them by pageIndex.
    const briefFor = (page: number) =>
      localPageCalls.find((c) => c.pageIndex === page)!.brief
    // Page 1 (pre-existing): no slot of its own — its own picture is materialized
    // and re-fed; it must NOT inherit the appended page's image.
    expect(stored).toEqual([dataUrl])
    expect(briefFor(1)).toContain('file:///vegaoffice-ai-images/old.png')
    expect(briefFor(1)).not.toContain('https://gen.img/')
    // Page 2 (appended): keeps the exact image its own generation resolved.
    expect(briefFor(2)).toContain('https://gen.img/')
    expect(briefFor(2)).toContain('reuse these exact images')
  })

  it("a new deck in the same session does not inherit the previous deck's imagery", async () => {
    // Deck A goes through the staged journey — its visuals resolve and are
    // recorded in state.draftResolvedSlots/draftPageImages.
    const { access, localPageCalls } = makeAccess({
      slides: [slideWith(['Alpha cover', 'IMAGE: skyline aerial'])],
      planImageQueries: ['skyline aerial'],
    })
    const skill = createSlidesSkill(access)
    await skill.executeTool(draftCall('Alpha', 1))
    await skill.executeTool(upgradeCall('visuals'))
    // Deck B replaces it. Same slot wording — but the remembered imagery belongs
    // to deck A and must not leak into deck B's restyle briefs.
    ;(access as { getSlides: () => RenderSlide[] }).getSlides = () => [
      slideWith(['Beta cover']),
    ]
    await skill.executeTool(draftCall('Beta', 1))
    localPageCalls.length = 0
    await skill.executeTool(upgradeCall('style'))
    const brief = localPageCalls.find((c) => c.pageIndex === 1)!.brief
    expect(brief).not.toContain('https://gen.img/')
  })

  it('cloud restyle never ships local file:// imagery (or raw bytes) to the remote generator', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg='
    const slide: RenderSlide = {
      ...slideWith(['Report']),
      nodes: [textNode('t', 'Report'), pictureNode('p', dataUrl)] as RenderNode[],
    }
    const { access } = makeAccess({ slides: [slide], cloudEnabled: false })
    access.storeImageData = async () => ({ ok: true, url: 'file:///store/x.png' })
    const cloudArgs: { brief: string; images: string[] }[] = []
    const origCloud = access.generatePageCloud!
    access.generatePageCloud = async (a) => {
      cloudArgs.push({ brief: a.brief, images: [...(a.images ?? [])] })
      return origCloud(a)
    }
    const skill = createSlidesSkill(access)
    // Local restyle first: the canvas picture materializes to a file:// URL that
    // the session remembers for this page.
    await skill.executeTool(upgradeCall('style'))
    // Cloud becomes available for the second restyle: the remote generator cannot
    // reach the local store — the URL must be filtered out, not shipped, and no
    // materialization may run for it.
    access.isCloudPageGenEnabled = async () => true
    let extraStores = 0
    access.storeImageData = async () => {
      extraStores++
      return { ok: true, url: 'file:///store/y.png' }
    }
    await skill.executeTool(upgradeCall('style'))
    expect(cloudArgs.length).toBe(1)
    expect(extraStores).toBe(0)
    expect(cloudArgs[0]!.images).toEqual([])
    expect(cloudArgs[0]!.brief).not.toContain('file://')
  })
})

describe('use case: the full staged journey end-to-end', () => {
  it('user reviews/edits the outline → draft → visuals → styled restyle keeps imagery and text', async () => {
    // Canvas after the draft lands: labeled placeholders where visuals go.
    const draft = [
      slideWith(['City Guide 2025', 'IMAGE: skyline aerial']),
      slideWith(['Food', 'CHART: prices by district']),
      slideWith(['Closing']),
    ]
    const {
      access,
      outlineCalls,
      draftCalls,
      upgradeOffers,
      localPageCalls,
      imageGenCalls,
      armManualOutline,
      resolveOutline,
    } = makeAccess({ slides: draft, planImageQueries: ['skyline aerial'] })
    const styleSkills: { topic: string; styleHint?: string }[] = []
    const origStyle = access.generateStyleSkill!
    access.generateStyleSkill = async (a) => {
      styleSkills.push({ topic: a.topic, styleHint: a.styleHint })
      return origStyle(a)
    }
    const skill = createSlidesSkill(access)

    // ── 1. User asks for a deck → the outline card opens BEFORE any page generates
    armManualOutline()
    const pending = skill.executeTool(draftCall('City Guide', 4))
    await vi.waitFor(() => expect(outlineCalls.length).toBe(1))
    expect(outlineCalls[0]!.pages.length).toBe(4)
    expect(draftCalls.length).toBe(0) // nothing generated while the card is up

    // ── 2. User drops page 2, retitles the cover, edits the closing page's brief
    resolveOutline({
      status: 'approved',
      removed: [1],
      titles: ['City Guide 2025', 'Planned page 3', 'Planned page 4'],
      briefs: ['cover brief edited by user', 'b3', 'closing brief edited by user'],
    })
    const res = (await pending) as { output: string; mutated?: boolean }
    expect(res.mutated).toBe(true)
    const genPages = draftCalls.flatMap((c) => c.pages)
    expect(genPages.length).toBe(3)
    expect(genPages[0]!.title).toBe('City Guide 2025')
    expect(genPages[0]!.brief).toBe('cover brief edited by user')
    expect(genPages[1]!.brief).toBe('b3')
    expect(genPages[2]!.brief).toBe('closing brief edited by user')
    // The UI now offers the two remaining stages
    expect(upgradeOffers[upgradeOffers.length - 1]).toEqual({ visuals: true, style: true })

    // ── 3. User asks for imagery: every labeled slot resolves via generation first
    const vres = (await skill.executeTool(upgradeCall('visuals'))) as { output: string }
    expect(vres.output).toContain('3/3')
    expect(imageGenCalls.length).toBeGreaterThan(0)

    // ── 4. Canvas now shows upgraded pages (labels consumed by real visuals);
    //       user applies a design with a chosen preset direction
    ;(access as { getSlides: () => RenderSlide[] }).getSlides = () => [
      slideWith(['City Guide 2025']),
      slideWith(['Food']),
      slideWith(['Closing']),
    ]
    localPageCalls.length = 0
    const sres = (await skill.executeTool(
      upgradeCall('style', { style_hint: 'swiss international style — strict grid, one accent' }),
    )) as { output: string }
    expect(sres.output).toContain('3/3')
    // The preset direction reached the Style Skill generator
    expect(styleSkills[0]!.styleHint).toContain('swiss')
    // Every page kept its approved text verbatim…
    expect(localPageCalls[0]!.brief).toContain('City Guide 2025')
    expect(localPageCalls[0]!.brief).toContain('Keep ALL existing text')
    // …and re-fed the imagery the user already paid to generate — no placeholder boxes
    expect(localPageCalls[0]!.brief).toContain('https://gen.img/1.png')
    expect(localPageCalls[0]!.brief).toContain('reuse these exact images')
    expect(localPageCalls[0]!.brief).not.toContain('intentional visual placeholders')
    // Journey complete: no upgrade stages left to offer
    expect(upgradeOffers[upgradeOffers.length - 1]).toEqual({ visuals: false, style: false })
  })
})
