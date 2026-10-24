/**
 * generate_deck self-driving pipeline verification:
 * the AI calls generate_deck once with the whole plan; the tool's internal code loops page by page,
 * calling the LLM to design each page and landing it. Page count is guaranteed by the for loop -> cures
 * "planned N pages but only 1 remains" for good.
 */
import { describe, it, expect } from 'vitest'
import {
  createSlidesSkill,
  MAX_APPROX_PAGES,
  type DeckAccess,
} from '../src/renderer/ai/slides-skill'
import type { RenderSlide } from '@genoffice/pptx-render'
import type { AgentToolCall } from '../src/shared/ipc'

function makeAccess(opts?: {
  failPages?: number[]
  failAttempts?: Record<number, number>
  localImageFails?: Record<number, string[]>
  landFailOnce?: number[]
  searchImagesFail?: boolean
  searchImagesMulti?: number
  planImageQueries?: string[]
  styleTemplates?: Record<string, { topic: string; styleSkill: string; createdAt: string }>
}) {
  const failPages = new Set(opts?.failPages ?? [])
  const failAttempts = { ...(opts?.failAttempts ?? {}) } // pageIndex -> how many more times to fail
  const landFailOnce = new Set(opts?.landFailOnce ?? []) // these pages fail their first "landing" once (simulated conversion failure)
  let pages = 0
  const genPageCalls: number[] = [] // records each generatePageLocal call's pageIndex
  const stylesSeen: string[] = [] // records the style each page received (verifies styleSkill reached single pages)
  const landOrder: string[] = [] // records the landing order
  const imageSearchCalls: string[] = [] // records the queries searchImages was called with
  const imagesSeen: string[][] = [] // records the images each generatePageCloud call received
  const imageAspectsSeen: (Record<string, string> | undefined)[] = [] // records each page request's declared slot aspects
  const sidecarSaves: Array<{ topic: string; styleSkill: string; createdAt: string }> = []
  const savedTemplates: Record<
    string,
    { name: string; topic: string; styleSkill: string; createdAt: string }
  > = {
    ...(opts?.styleTemplates
      ? Object.fromEntries(
          Object.entries(opts.styleTemplates).map(([k, v]) => [k, { name: k, ...v }]),
        )
      : {}),
  }
  const access: DeckAccess = {
    getSlides: () => [] as RenderSlide[],
    getCurrent: () => 0,
    getSelectedIds: () => [],
    applySlide: () => {},
    applyDeck: () => {},
    fitWidthPx: 1280,
    retryBackoffMs: 0,
    landGeneratedPages: async (
      markers,
      mode = 'replace',
      _deckName?: string,
      insertAt?: number,
    ) => {
      const failNo = [...landFailOnce].find((n) => markers[0]?.includes(`PAGE${n}:`))
      if (failNo !== undefined) {
        landFailOnce.delete(failNo)
        return { ok: false, error: 'mock land fail' }
      }
      if (mode === 'insert_at') {
        pages += 1
        landOrder.push(`insert@${insertAt}:` + markers[0])
        return { ok: true, pages, insertedIndex: insertAt }
      }
      if (mode === 'append') {
        const from = pages
        pages += markers.length
        landOrder.push('append:' + markers[0])
        return { ok: true, pages, appendedFrom: from }
      }
      pages = markers.length
      landOrder.push('replace:' + markers[0])
      return { ok: true, pages }
    },
    isCloudPageGenEnabled: async () => opts?.cloudEnabled !== false,
    generatePageCloud: async (args) => {
      genPageCalls.push(args.pageIndex)
      stylesSeen.push(args.style)
      imagesSeen.push([...args.images])
      imageAspectsSeen.push(args.imageAspects ? { ...args.imageAspects } : undefined)
      if (opts?.cloudDown)
        return {
          ok: false,
          error: 'tool_cli /slide_generate failed: the Genspark CLI requires a paid plan',
        }
      if (failPages.has(args.pageIndex)) return { ok: false, error: 'mock fail' }
      if (failAttempts[args.pageIndex] && failAttempts[args.pageIndex] > 0) {
        failAttempts[args.pageIndex] -= 1
        return { ok: false, error: 'transient' }
      }
      // Return an identifiable marker (with page order); the mock landing treats it like the real cloudpptx: marker
      return {
        ok: true,
        marker: `<!doctype html><html><body>PAGE${args.pageIndex}:${args.title}</body></html>`,
      }
    },
    generatePageLocal: async (args) => {
      genPageCalls.push(args.pageIndex)
      stylesSeen.push(args.style)
      imagesSeen.push([...args.images])
      imageAspectsSeen.push(args.imageAspects ? { ...args.imageAspects } : undefined)
      if (failPages.has(args.pageIndex)) return { ok: false, error: 'mock fail' }
      if (failAttempts[args.pageIndex] && failAttempts[args.pageIndex] > 0) {
        failAttempts[args.pageIndex] -= 1
        return { ok: false, error: 'transient' }
      }
      // Identifiable marker (with page order); the mock landing treats it like the real genpptx: marker
      const fails = opts?.localImageFails?.[args.pageIndex]
      return {
        ok: true,
        marker: `genpptx:PAGE${args.pageIndex}:${args.title}`,
        ...(fails?.length ? { imageFailures: [...fails] } : {}),
      }
    },
    generateStyleSkill: async (a) => {
      return { ok: true, styleSkill: 'STYLE_SKILL_FOR:' + a.topic }
    },
    planDeckOutline: async (a) => {
      // In-tool planning: emit pages per count, titles carry the page order, core_hook given in the first batch (style no longer produced here)
      const pagesOut = Array.from({ length: a.count }, (_, i) => ({
        title: `Planned page ${a.startPage + i}`,
        brief: `b${a.startPage + i}`,
        layout: 'data',
        image_queries: opts?.planImageQueries ? [...opts.planImageQueries] : [],
      }))
      return { ok: true, outline: { core_hook: 'CH:' + a.topic, pages: pagesOut } }
    },
    searchImages: async (query: string, maxResults: number) => {
      imageSearchCalls.push(query)
      if (opts?.searchImagesFail) return []
      if (opts?.searchImagesMulti) {
        const n = Math.min(opts.searchImagesMulti, maxResults)
        return Array.from(
          { length: n },
          (_, i) => `https://mock.img/${encodeURIComponent(query)}-${i + 1}.jpg`,
        )
      }
      return [`https://mock.img/${encodeURIComponent(query)}.jpg`]
    },
    saveSidecar: async (data) => {
      sidecarSaves.push(data)
    },
    saveStyleTemplate: async (name, data) => {
      savedTemplates[name] = { name, ...data }
      return { ok: true }
    },
    listStyleTemplates: async () =>
      Object.values(savedTemplates).map(({ name, topic, createdAt }) => ({
        name,
        topic,
        createdAt,
      })),
    loadStyleTemplate: async (name) => {
      const t = savedTemplates[name]
      if (!t) return { ok: false, error: `Template "${name}" not found` }
      return { ok: true, styleSkill: t.styleSkill, topic: t.topic }
    },
  }
  return {
    access,
    genPageCalls,
    stylesSeen,
    landOrder,
    imageSearchCalls,
    imagesSeen,
    imageAspectsSeen,
    sidecarSaves,
    savedTemplates,
    getPages: () => pages,
  }
}

const deckCall = (n: number, insertMode?: 'replace' | 'append'): AgentToolCall => ({
  id: 'c-deck',
  name: 'generate_deck',
  input: {
    core_hook: 'Doubled in a decade',
    style: 'Deep navy + gold',
    detail: 'full',
    ...(insertMode ? { insert_mode: insertMode } : {}),
    pages: Array.from({ length: n }, (_, i) => ({
      title: `Page ${i + 1} Title`,
      brief: `brief${i + 1}`,
      layout: 'data',
      image_queries: i === 0 ? ['https://example.com/a.jpg'] : [],
    })),
  },
})

describe('generate_deck self-driven page-by-page generation', () => {
  it('plans 5 pages → tool loop calls the LLM 5 times to write pages → lands 5 pages → progress complete', async () => {
    const { access, genPageCalls, getPages } = makeAccess()
    const skill = createSlidesSkill(access)

    const res = (await skill.executeTool(deckCall(5))) as { output: string; summary: string }

    // The tool internally calls generatePageLocal once per each of the 5 pages (the AI never touches per-page work)
    expect(genPageCalls.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    // All 5 pages landed
    expect(getPages()).toBe(5)
    expect(res.summary).toContain('5/5')
    expect(res.output).toContain('Self-driven generation produced 5/5 pages')

    // Each round's context shows everything generated; no more nagging
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('all generated')
    expect(ctx).not.toContain('still missing')
  })

  it('landing order strictly follows page order (first page replace, rest append, no mutual overwrites)', async () => {
    const { access, landOrder } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool(deckCall(3))
    // First page replace, next two append, and content is in PAGE1/2/3 order
    expect(landOrder[0]).toBe('replace:genpptx:PAGE1:Page 1 Title')
    expect(landOrder[1]).toContain('append:')
    expect(landOrder[1]).toContain('PAGE2')
    expect(landOrder[2]).toContain('PAGE3')
  })

  it('LLM fails on one page → other pages land + tool result names the failed page to prompt a fix', async () => {
    const { access, getPages } = makeAccess({ failPages: [3] })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(5))) as { output: string }

    // Page 3 failed; the other 4 pages landed
    expect(getPages()).toBe(4)
    expect(res.output).toContain('page 3 (mock fail) still failed after retry')
    expect(res.output).toContain('append')
    // Progress reflects 4/5 and still reports the shortfall
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('4 generated')
  })

  it('neither pages nor topic → errors out without executing', async () => {
    const { access } = makeAccess()
    const skill = createSlidesSkill(access)
    const bad = (await skill.executeTool({ id: 'x', name: 'generate_deck', input: {} })) as {
      isError?: boolean
    }
    expect(bad.isError).toBe(true)
  })
})

describe('generate_deck page generation retries', () => {
  it('page failing both inline attempts gets another generation in the retry round and lands at its original position', async () => {
    const { access, genPageCalls, landOrder, getPages } = makeAccess({
      failAttempts: { 2: 2 },
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(3))) as { output: string }
    expect(getPages()).toBe(3)
    // page 2: two attempts inside genOne (both fail) + the retry round's third
    expect(genPageCalls.filter((p) => p === 2)).toHaveLength(3)
    expect(res.output).toContain('3/3')
    expect(landOrder[2]).toContain('insert@1:')
    expect(landOrder[2]).toContain('PAGE2')
  })

  it("local image download failures surface in the tool output with the page's number", async () => {
    const { access, getPages } = makeAccess({
      localImageFails: { 2: ['https://img.example/broken.jpg'] },
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(3))) as { output: string }
    expect(getPages()).toBe(3)
    expect(res.output).toContain('Missing images')
    expect(res.output).toContain('page 2')
    expect(res.output).toContain('https://img.example/broken.jpg')
  })

  it('no page generation pipeline available → fails fast', async () => {
    const { access } = makeAccess()
    delete (access as { generatePageLocal?: unknown }).generatePageLocal
    const skill = createSlidesSkill(access)
    const r = (await skill.executeTool(deckCall(2))) as { isError?: boolean }
    expect(r.isError).toBe(true)
  })
})

describe('generate_deck batched planning (topic mode)', () => {
  const topicCall = (topic: string, approx: number): AgentToolCall => ({
    id: 'c-topic',
    name: 'generate_deck',
    input: { topic, approx_pages: approx, context: 'real source material', detail: 'full' },
  })

  it('topic+approx_pages only → plans the outline internally → generates every page one by one', async () => {
    const { access, genPageCalls, getPages } = makeAccess()
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(topicCall('Jinan Travel Guide', 5))) as { output: string }
    // Internal planning produced 5 pages -> generated page by page
    expect(genPageCalls.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(getPages()).toBe(5)
    expect(res.output).toContain('5/5')
  })

  it('over 12 pages → recursive batched planning (no single huge JSON) → all pages generated', async () => {
    const { access, getPages } = makeAccess()
    const skill = createSlidesSkill(access)
    // 20 pages -> PLAN_BATCH=12 -> should plan in 2 batches (12+8)
    const res = (await skill.executeTool(topicCall('Annual Report', 20))) as { output: string }
    expect(getPages()).toBe(20)
    expect(res.output).toContain('20/20')
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('all generated')
  })

  it('clamps an absurd approx_pages to MAX_APPROX_PAGES planner work (genoffice#1100)', async () => {
    const { access, getPages } = makeAccess()
    let planCalls = 0
    const plan = access.planDeckOutline!
    access.planDeckOutline = async (a) => {
      planCalls++
      return plan(a)
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall('Everything', 100000))
    expect(getPages()).toBe(MAX_APPROX_PAGES)
    expect(planCalls).toBeLessThanOrEqual(Math.ceil(MAX_APPROX_PAGES / 12))
    const schema = skill.tools.find((t) => t.name === 'generate_deck')!.inputSchema as {
      properties: { approx_pages: { maximum?: number } }
    }
    expect(schema.properties.approx_pages.maximum).toBe(MAX_APPROX_PAGES)
  })

  it('style generated independently → the same styleSkill is passed to every page (consistent across pages)', async () => {
    const { access, stylesSeen } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall('Jinan Travel Guide', 4))
    // The style each page received is the independently generated styleSkill, and all are identical
    expect(stylesSeen.length).toBe(4)
    expect(stylesSeen.every((s) => s === 'STYLE_SKILL_FOR:Jinan Travel Guide')).toBe(true)
  })
})

describe('generate_deck lands pages while generating + retries', () => {
  const deckCall = (n: number): AgentToolCall => ({
    id: 'c',
    name: 'generate_deck',
    input: {
      core_hook: 'h',
      style: 's',
      detail: 'full',
      pages: Array.from({ length: n }, (_, i) => ({
        title: `T${i + 1}`,
        brief: 'b',
        layout: 'data',
        image_queries: [],
      })),
    },
  })

  it('a page fails once but retry succeeds → all pages still land', async () => {
    // Page 2 fails once at first; the second (retry) attempt succeeds
    const { access, getPages } = makeAccess({ failAttempts: { 2: 1 } })
    const skill = createSlidesSkill(access)
    await skill.executeTool(deckCall(3))
    expect(getPages()).toBe(3) // retry as safety net, no missing pages
  })

  it('a page keeps failing (beyond retries) → other pages still land in page order, no blocking', async () => {
    const { access, getPages, landOrder } = makeAccess({ failPages: [2] })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(4))) as { output: string }
    // Page 2 hangs; 1/3/4 land (later pages not blocked by page 2)
    expect(getPages()).toBe(3)
    expect(res.output).toContain('page 2 (mock fail) still failed after retry')
    // Landed content doesn't contain PAGE2
    expect(landOrder.some((l) => l.includes('T1'))).toBe(true)
    expect(landOrder.some((l) => l.includes('T3'))).toBe(true)
    expect(landOrder.some((l) => l.includes('T2'))).toBe(false)
    // The progress checklist names pages precisely: page 2 is missing (not misattributed to the last page)
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('page 2 "T2"')
  })

  it('a page failing every attempt → two inline attempts + two in the retry round, then skipped', async () => {
    const { access, getPages, genPageCalls } = makeAccess({ failPages: [2] })
    const skill = createSlidesSkill(access)
    await skill.executeTool(deckCall(3))
    expect(getPages()).toBe(2)
    expect(genPageCalls.filter((n) => n === 2).length).toBe(4)
  })

  it('all pages fail to land initially (zero landed) → retry round still inserts: first page via insertMode, rest via insert_at', async () => {
    const { access, getPages, landOrder } = makeAccess({ landFailOnce: [1, 2] })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(2))) as { output: string }
    expect(getPages()).toBe(2)
    expect(res.output).toContain('2/2')
    expect(landOrder.some((l) => l.startsWith('replace:') && l.includes('PAGE1'))).toBe(true)
    expect(landOrder.some((l) => l.startsWith('insert@1:') && l.includes('PAGE2'))).toBe(true)
  })

  it('pages that failed to land → after retry inserted back at their original position via insert_at', async () => {
    // Page 2's HTML generates fine but the first landing (conversion) fails once
    const { access, getPages, landOrder } = makeAccess({ landFailOnce: [2] })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(deckCall(3))) as { output: string }
    // All three pages end up present; page 2 is inserted back at index=1 via insert_at (after page 1)
    expect(getPages()).toBe(3)
    expect(landOrder.some((l) => l.startsWith('insert@1:') && l.includes('PAGE2'))).toBe(true)
    expect(res.output).toContain('3/3')
    const ctx = skill.buildContext?.() ?? ''
    expect(ctx).toContain('all generated')
  })
})

describe('generate_deck in-tool image search', () => {
  it('image_queries → searched images → real URLs passed to generatePageCloud (fallback path: no generator)', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    const skill = createSlidesSkill(access)
    const call: AgentToolCall = {
      id: 'c-img',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          {
            title: 'Cover',
            brief: 'b',
            layout: 'cover',
            image_queries: ['summer palace kunming lake'],
          },
          { title: 'Body', brief: 'b', layout: 'content', image_queries: [] },
        ],
      },
    }
    await skill.executeTool(call)
    // searchImages should be called once (a keyword only, not a URL)
    expect(imageSearchCalls).toEqual(['summer palace kunming lake'])
    // Page 1 (pageIndex=1) should receive the real searched URL
    expect(imagesSeen[0]).toEqual(['https://mock.img/summer%20palace%20kunming%20lake.jpg'])
    // Page 2 has no image slot
    expect(imagesSeen[1]).toEqual([])
  })

  it('image_queries already http(s) URLs → used directly without re-searching', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    const skill = createSlidesSkill(access)
    const existingUrl = 'https://example.com/preloaded.jpg'
    const call: AgentToolCall = {
      id: 'c-url',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [{ title: 'P1', brief: 'b', layout: 'content', image_queries: [existingUrl] }],
      },
    }
    await skill.executeTool(call)
    // Already a URL; searchImages should not be called
    expect(imageSearchCalls).toEqual([])
    // generatePageLocal should receive the original URL
    expect(imagesSeen[0]).toEqual([existingUrl])
  })

  it('same keyword across pages → searched once per deck, each page gets a different candidate image (deduped across pages)', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess({ searchImagesMulti: 5 })
    const skill = createSlidesSkill(access)
    const call: AgentToolCall = {
      id: 'c-dedup',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          { title: 'P1', brief: 'b', layout: 'content', image_queries: ['beijing hutong'] },
          { title: 'P2', brief: 'b', layout: 'content', image_queries: ['Beijing  Hutong'] }, // case/whitespace differences count as the same keyword
          { title: 'P3', brief: 'b', layout: 'content', image_queries: ['beijing hutong'] },
        ],
      },
    }
    await skill.executeTool(call)
    // Three pages sharing one keyword trigger only one search
    expect(imageSearchCalls).toEqual(['beijing hutong'])
    // Each of the three pages gets one image, all distinct
    const firstImages = imagesSeen.map((a) => a[0]).filter(Boolean)
    expect(firstImages.length).toBe(3)
    expect(new Set(firstImages).size).toBe(3)
  })

  it('not enough candidate images to go around → falls back to reusing the first one (an image beats no image)', async () => {
    const { access, imagesSeen } = makeAccess({ searchImagesMulti: 1 })
    const skill = createSlidesSkill(access)
    const call: AgentToolCall = {
      id: 'c-fallback',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          { title: 'P1', brief: 'b', layout: 'content', image_queries: ['great wall'] },
          { title: 'P2', brief: 'b', layout: 'content', image_queries: ['great wall'] },
        ],
      },
    }
    await skill.executeTool(call)
    // Only 1 candidate; both pages get an image (reuse fallback)
    expect(imagesSeen.every((a) => a.length === 1)).toBe(true)
  })

  it('topic mode: planned keywords → internal image search end to end → every page prompt receives real URLs', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess({
      searchImagesMulti: 5,
      planImageQueries: ['city skyline night'],
    })
    const skill = createSlidesSkill(access)
    const call: AgentToolCall = {
      id: 'c-topic-img',
      name: 'generate_deck',
      input: { topic: 'City Nightscape', approx_pages: 3, context: 'real source material', detail: 'full' },
    }
    await skill.executeTool(call)
    // Three pages planned with the same keyword -> searched only once
    expect(imageSearchCalls).toEqual(['city skyline night'])
    // Every page receives a real URL, all distinct
    const firstImages = imagesSeen.map((a) => a[0]).filter(Boolean)
    expect(firstImages.length).toBe(3)
    expect(new Set(firstImages).size).toBe(3)
    expect(firstImages.every((u) => u!.startsWith('https://mock.img/'))).toBe(true)
  })

  it('image search fails → fail-open, that image slot stays empty, generation completes normally', async () => {
    const { access, getPages } = makeAccess({ searchImagesFail: true })
    const skill = createSlidesSkill(access)
    const call: AgentToolCall = {
      id: 'c-fail',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [{ title: 'P1', brief: 'b', layout: 'content', image_queries: ['beijing hutong'] }],
      },
    }
    const res = (await skill.executeTool(call)) as { output: string; isError?: boolean }
    // Image-search failure doesn't affect the main chain: pages still land
    expect(res.isError).toBeFalsy()
    expect(getPages()).toBe(1)
  })

  it('outline planning fails → plan progress marked error (no longer stuck at running)', async () => {
    const { access } = makeAccess()
    const events: Array<{ stage: string; status?: string }> = []
    access.planDeckOutline = async () => ({
      ok: false,
      error: "outline JSON parse failed: Expected ','",
    })
    access.onProgress = (e) => {
      events.push({ stage: e.stage, status: 'status' in e ? e.status : undefined })
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool({
      id: 'c-plan-fail',
      name: 'generate_deck',
      input: { topic: 'Test Topic', approx_pages: 10, detail: 'full' },
    })) as { output: string; isError?: boolean }
    expect(res.isError).toBeTruthy()
    expect(res.output).toContain('Planning failed')
    const planEvents = events.filter((e) => e.stage === 'plan')
    expect(planEvents.some((e) => e.status === 'running')).toBe(true)
    expect(planEvents.some((e) => e.status === 'error')).toBe(true)
    expect(planEvents.at(-1)?.status).toBe('error')
  })
})

describe('generate_deck Style Skill template persistence', () => {
  const topicCall = (topic: string, opts?: { style_template?: string }): AgentToolCall => ({
    id: 'c-tpl',
    name: 'generate_deck',
    input: {
      topic,
      approx_pages: 2,
      detail: 'full',
      ...(opts?.style_template ? { style_template: opts.style_template } : {}),
    },
  })

  it('saveSidecar is called after generate_deck completes, with styleSkill and topic', async () => {
    const { access, sidecarSaves } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall('Beijing Travel'))
    expect(sidecarSaves.length).toBe(1)
    expect(sidecarSaves[0]!.styleSkill).toBe('STYLE_SKILL_FOR:Beijing Travel')
    expect(sidecarSaves[0]!.topic).toBe('Beijing Travel')
    expect(sidecarSaves[0]!.createdAt).toBeTruthy()
  })

  it('saveSidecar is not called when all pages fail to generate', async () => {
    const { access, sidecarSaves } = makeAccess({ failPages: [1, 2] })
    const doneEvents: Array<{ total: number; outcome?: string }> = []
    access.onProgress = (e) => {
      if (e.stage === 'done') doneEvents.push({ total: e.total, outcome: e.outcome })
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(topicCall('Shanghai Travel'))) as { isError?: boolean }
    expect(res.isError).toBe(true)
    // landedPages=0 -> no sidecar written
    expect(sidecarSaves.length).toBe(0)
    // the terminal progress event says failed; the card must not read it as "done, 0 slides"
    expect(doneEvents).toEqual([{ total: 0, outcome: 'failed' }])
  })

  it('state.lastStyleSkill is recorded after generate_deck and usable by save_style_template', async () => {
    const { access, savedTemplates } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall('Chengdu Cuisine'))
    // Then call save_style_template
    const saveCall: AgentToolCall = {
      id: 'c-save',
      name: 'save_style_template',
      input: { name: 'Chengdu Style' },
    }
    const res = (await skill.executeTool(saveCall)) as { output: string; isError?: boolean }
    expect(res.isError).toBeFalsy()
    expect(res.output).toContain('Chengdu Style')
    expect(savedTemplates['Chengdu Style']?.styleSkill).toBe('STYLE_SKILL_FOR:Chengdu Cuisine')
  })

  it('save_style_template without a prior generate_deck → errors', async () => {
    const { access } = makeAccess()
    const skill = createSlidesSkill(access)
    const saveCall: AgentToolCall = {
      id: 'c-save2',
      name: 'save_style_template',
      input: { name: 'invalid' },
    }
    const res = (await skill.executeTool(saveCall)) as { isError?: boolean }
    expect(res.isError).toBe(true)
  })

  it('list_style_templates lists saved templates', async () => {
    const { access } = makeAccess({
      styleTemplates: {
        'Minimal Blue White': {
          topic: 'Tech',
          styleSkill: 'SK1',
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool({
      id: 'c-list',
      name: 'list_style_templates',
      input: {},
    })) as { output: string }
    expect(res.output).toContain('Minimal Blue White')
    expect(res.output).toContain('Tech')
  })

  it('generate_deck with style_template → skips generateStyleSkill and uses the template styleSkill directly', async () => {
    const { access, stylesSeen } = makeAccess({
      styleTemplates: {
        'Minimal Blue White': {
          topic: 'Tech',
          styleSkill: 'TEMPLATE_SKILL',
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    })
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall('AI Product', { style_template: 'Minimal Blue White' }))
    // The style each page receives should be the template's styleSkill (not generateStyleSkill output)
    expect(stylesSeen.every((s) => s === 'TEMPLATE_SKILL')).toBe(true)
  })

  it('style_template not found → fail-open, degrades to normal generation (no error)', async () => {
    const { access, stylesSeen, getPages } = makeAccess()
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(
      topicCall('Urban Planning', { style_template: 'nonexistent-template' }),
    )) as { isError?: boolean; output: string }
    // Fail-open when missing: degrade to normal generation without isError
    expect(res.isError).toBeFalsy()
    expect(getPages()).toBe(2)
    // After degrading, uses the style produced by generateStyleSkill
    expect(stylesSeen.every((s) => s === 'STYLE_SKILL_FOR:Urban Planning')).toBe(true)
  })
})

describe('generate_deck attachment gate', () => {
  const topicCall: AgentToolCall = {
    id: 'c-gate',
    name: 'generate_deck',
    input: { topic: 'Weekly Sales Report', approx_pages: 3, context: 'real source material', detail: 'full' },
  }

  it('unread text attachments present → generate_deck refuses and names them', async () => {
    const { access, getPages } = makeAccess()
    access.unreadTextAttachments = () => ['weekly-report-jordan-jul20-24.docx']
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(topicCall)) as { isError?: boolean; output: string }
    expect(res.isError).toBe(true)
    expect(res.output).toContain('weekly-report-jordan-jul20-24.docx')
    expect(res.output).toContain('read_attachment')
    // Nothing was generated or landed
    expect(getPages()).toBe(0)
  })

  it('all text attachments read (or none attached) → generate_deck proceeds', async () => {
    const { access, getPages } = makeAccess()
    access.unreadTextAttachments = () => []
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(topicCall)) as { isError?: boolean }
    expect(res.isError).toBeFalsy()
    expect(getPages()).toBe(3)
  })
})

describe('generate_deck internal research', () => {
  it('research queries run internally in parallel with style; the digest reaches planning and per-page context', async () => {
    const { access, getPages } = makeAccess()
    const order: string[] = []
    access.generateStyleSkill = async (a) => {
      order.push('style:start')
      await new Promise((r) => setTimeout(r, 30))
      order.push('style:end')
      return { ok: true, styleSkill: 'STYLE:' + a.topic }
    }
    access.searchWeb = async (_q) => {
      order.push('research:start')
      await new Promise((r) => setTimeout(r, 10))
      order.push('research:end')
      return {
        ok: true,
        results: [{ title: 'T', url: 'https://x.example', snippet: 'REALFACT42 data' }],
        answer: 'ans',
      }
    }
    const planContexts: (string | undefined)[] = []
    const pageContexts: (string | undefined)[] = []
    const origPlan = access.planDeckOutline!
    access.planDeckOutline = async (a) => {
      planContexts.push(a.context)
      return origPlan(a)
    }
    const origCloud = access.generatePageCloud!
    access.generatePageCloud = async (a) => {
      pageContexts.push(a.context)
      return origCloud(a)
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-research',
      name: 'generate_deck',
      input: {
        topic: 'Space Tourism',
        approx_pages: 2,
        detail: 'full',
        research: ['space tourism market size'],
      },
    } as AgentToolCall)
    expect(getPages()).toBe(2)
    // Style and research overlapped in wall-clock time: both started before either ended
    const si = order.indexOf('style:start')
    const ri = order.indexOf('research:start')
    const se = order.indexOf('style:end')
    const re = order.indexOf('research:end')
    expect(si).toBeGreaterThanOrEqual(0)
    expect(ri).toBeGreaterThanOrEqual(0)
    expect(Math.max(si, ri)).toBeLessThan(Math.min(se, re))
    // The digest reached both the planner and every page request
    expect(planContexts).toHaveLength(1)
    expect(planContexts[0]).toContain('REALFACT42')
    expect(pageContexts).toHaveLength(2)
    expect(pageContexts.every((c) => c?.includes('REALFACT42'))).toBe(true)
  })

  it('bare topic without context triggers one auto-research query (the topic itself), once per conversation', async () => {
    const { access } = makeAccess()
    const queries: string[] = []
    access.searchWeb = async (q) => {
      queries.push(q)
      return { ok: true, results: [] }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-auto',
      name: 'generate_deck',
      input: { topic: 'Tibet Travel', approx_pages: 2, detail: 'full' },
    } as AgentToolCall)
    expect(queries).toEqual(['Tibet Travel'])
    // A second deck in the same conversation does not re-search (webSearched latched)
    await skill.executeTool({
      id: 'c-auto2',
      name: 'generate_deck',
      input: { topic: 'Nepal Trekking', approx_pages: 2, detail: 'full' },
    } as AgentToolCall)
    expect(queries).toEqual(['Tibet Travel'])
  })

  it('no auto-research when context material is supplied, and research failures are fail-open', async () => {
    const { access, getPages } = makeAccess()
    let called = 0
    access.searchWeb = async () => {
      called++
      return { ok: false, error: 'search down' }
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool({
      id: 'c-ctx',
      name: 'generate_deck',
      input: { topic: 'X', approx_pages: 2, context: 'real material', detail: 'full' },
    } as AgentToolCall)) as { isError?: boolean }
    expect(res.isError).toBeFalsy()
    expect(getPages()).toBe(2)
    expect(called).toBe(0) // context present → no auto-query
    // Explicit research that fails still lets the deck generate
    const res2 = (await skill.executeTool({
      id: 'c-rfail',
      name: 'generate_deck',
      input: { topic: 'Y', approx_pages: 2, research: ['anything'], detail: 'full' },
    } as AgentToolCall)) as { isError?: boolean }
    expect(res2.isError).toBeFalsy()
    expect(getPages()).toBe(2) // replace mode: the second deck's 2 pages
    expect(called).toBe(1)
  })

  it('dataSource:"search" is satisfied by internal research; without any search it is still blocked', async () => {
    const figured = (extra: Record<string, unknown>): AgentToolCall => ({
      id: 'c-gate',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        dataSource: 'search',
        pages: [
          { title: 'T1', brief: 'Sales grew 45% to $1.2B', layout: 'data', image_queries: [] },
          { title: 'T2', brief: 'Share rose 12.5% in one year', layout: 'data', image_queries: [] },
        ],
        ...extra,
      },
    })
    // With research queries provided the gate passes and the deck generates
    const { access, getPages } = makeAccess()
    access.searchWeb = async () => ({
      ok: true,
      results: [{ title: 'T', url: 'https://x', snippet: 'real figures' }],
    })
    const skill = createSlidesSkill(access)
    const ok = (await skill.executeTool(figured({ research: ['ev market statistics'] }))) as {
      isError?: boolean
    }
    expect(ok.isError).toBeFalsy()
    expect(getPages()).toBe(2)
    // No research, no prior web_search → the gate still blocks invented numbers
    const { access: access2, getPages: pages2 } = makeAccess()
    const skill2 = createSlidesSkill(access2)
    const blocked = (await skill2.executeTool(figured({}))) as {
      isError?: boolean
      output: string
    }
    expect(blocked.isError).toBe(true)
    expect(blocked.output).toContain('web_search')
    expect(pages2()).toBe(0)
  })
})

describe('generate_deck AI image generation (generation-first imagery)', () => {
  const promptsCall = (prompts: string[], extra: Record<string, unknown> = {}): AgentToolCall => ({
    id: 'c-prompts',
    name: 'generate_deck',
    input: {
      core_hook: 'h',
      style: 's',
      detail: 'full',
      pages: [
        { title: 'Cover', brief: 'b', layout: 'cover', image_prompts: prompts },
        { title: 'Body', brief: 'b', layout: 'content', image_queries: [] },
      ],
      ...extra,
    },
  })

  it('image_prompts are generated internally; the real URL reaches the page request', async () => {
    const { access, imagesSeen, imageSearchCalls } = makeAccess()
    const prompts: string[] = []
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      prompts.push(prompt)
      return { ok: true, url: `https://gen.img/${encodeURIComponent(prompt)}.png` }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['neon city skyline hero']))
    expect(prompts).toEqual(['neon city skyline hero'])
    expect(imageSearchCalls).toEqual([]) // no search needed for a generated slot
    expect(imagesSeen[0]).toEqual(['https://gen.img/neon%20city%20skyline%20hero.png'])
    expect(imagesSeen[1]).toEqual([])
  })

  it('a slot aspect tag drives the generation ratio and reaches the page request as imageAspects', async () => {
    const { access, imagesSeen, imageAspectsSeen } = makeAccess()
    const seen: { prompt: string; aspectRatio?: string }[] = []
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt, aspectRatio }) => {
      seen.push({ prompt, aspectRatio })
      return { ok: true, url: `https://gen.img/${encodeURIComponent(prompt)}.png` }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(
      promptsCall(['neon city skyline hero [9:16]', 'wide harbor panorama']),
    )
    // The tag is stripped from the prompt and drives aspectRatio; untagged = 16:9
    expect(seen).toEqual([
      { prompt: 'neon city skyline hero', aspectRatio: '9:16' },
      { prompt: 'wide harbor panorama', aspectRatio: '16:9' },
    ])
    expect(imageAspectsSeen[0]).toEqual({
      'https://gen.img/neon%20city%20skyline%20hero.png': '9:16',
      'https://gen.img/wide%20harbor%20panorama.png': '16:9',
    })
    expect(imagesSeen[0]).toHaveLength(2)
  })

  it('a tagged explicit URL is passed clean, with its declared aspect', async () => {
    const { access, imagesSeen, imageAspectsSeen } = makeAccess()
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-tagged',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          {
            title: 'P1',
            brief: 'b',
            layout: 'content',
            image_queries: ['https://cdn.example/pic.png [3:4]'],
          },
        ],
      },
    } as AgentToolCall)
    expect(imagesSeen[0]).toEqual(['https://cdn.example/pic.png'])
    expect(imageAspectsSeen[0]).toEqual({ 'https://cdn.example/pic.png': '3:4' })
  })

  it('a failed generation falls back to searching the prompt text', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => true
    access.generateImage = async () => ({ ok: false, error: 'quota exhausted' })
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['aurora borealis hero']))
    expect(imageSearchCalls).toEqual(['aurora borealis hero'])
    expect(imagesSeen[0][0]).toContain('https://mock.img/')
  })

  it('generation unavailable → prompts degrade to plain image searches', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => false
    access.generateImage = async () => ({ ok: true, url: 'https://must-not-be-used/x.png' })
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['abstract gradient bg']))
    expect(imageSearchCalls).toEqual(['abstract gradient bg'])
    expect(imagesSeen[0][0]).toContain('https://mock.img/')
  })

  it('image generation runs concurrently (default pool of 8) across prompts', async () => {
    const { access } = makeAccess()
    let concurrent = 0
    let maxConcurrent = 0
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 15))
      concurrent--
      return { ok: true, url: `https://gen.img/${prompt}.png` }
    }
    const skill = createSlidesSkill(access)
    // 10 pages × 1 unique slot: the eager pool caps at 8 in flight
    await skill.executeTool({
      id: 'c-pool',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: Array.from({ length: 10 }, (_, i) => ({
          title: `P${i + 1}`,
          brief: 'b',
          layout: 'content',
          image_prompts: [`p${i + 1}`],
        })),
      },
    } as AgentToolCall)
    expect(maxConcurrent).toBe(8)
  })

  it('DeckAccess.imageGenConcurrency overrides the image pool size', async () => {
    const { access } = makeAccess()
    access.imageGenConcurrency = 3
    let concurrent = 0
    let maxConcurrent = 0
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 15))
      concurrent--
      return { ok: true, url: `https://gen.img/${prompt}.png` }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['p1', 'p2', 'p3', 'p4', 'p5'], {}))
    expect(maxConcurrent).toBe(3)
  })

  it('a failed generation is retried once before falling back to search', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => true
    let calls = 0
    access.generateImage = async () => {
      calls++
      return calls === 1
        ? { ok: false, error: 'rate limited' }
        : { ok: true, url: 'https://gen.img/recovered.png' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['flaky slot']))
    expect(calls).toBe(2) // initial try + one retry
    expect(imageSearchCalls).toEqual([]) // recovered — no search fallback needed
    expect(imagesSeen[0]).toEqual(['https://gen.img/recovered.png'])
  })

  it('a slot failing both attempts falls back to image search', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => true
    let calls = 0
    access.generateImage = async () => {
      calls++
      return { ok: false, error: 'down' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(promptsCall(['hopeless slot']))
    expect(calls).toBe(2) // initial try + one retry
    expect(imageSearchCalls).toEqual(['hopeless slot'])
    expect(imagesSeen[0][0]).toContain('https://mock.img/')
  })

  it('an unresolved image slot is reported in the tool output (never silently blank)', async () => {
    const { access } = makeAccess({ searchImagesFail: true })
    access.imageGenAvailable = () => true
    access.generateImage = async () => ({ ok: false, error: 'down' })
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(promptsCall(['unfindable thing']))) as {
      output: string
    }
    expect(res.output).toContain('Unresolved image slots')
    expect(res.output).toContain('unfindable thing')
  })

  it('file:// image URLs reach the local page builder but are filtered out of cloud requests', async () => {
    const page = {
      title: 'P1',
      brief: 'b',
      layout: 'content',
      image_queries: ['file:///gen-store/a.png'],
    }
    // Local path (BYOK): file:// URLs are kept — the generated-image store resolves them
    const local = makeAccess({ cloudEnabled: false })
    const skillLocal = createSlidesSkill(local.access)
    await skillLocal.executeTool({
      id: 'c-local',
      name: 'generate_deck',
      input: { core_hook: 'h', style: 's', detail: 'full', pages: [page] },
    } as AgentToolCall)
    expect(local.imagesSeen[0]).toEqual(['file:///gen-store/a.png'])
    // Cloud path: the remote service cannot reach the local store → filtered out
    const cloud = makeAccess()
    const skillCloud = createSlidesSkill(cloud.access)
    await skillCloud.executeTool({
      id: 'c-cloud',
      name: 'generate_deck',
      input: { core_hook: 'h', style: 's', detail: 'full', pages: [page] },
    } as AgentToolCall)
    expect(cloud.imagesSeen[0]).toEqual([])
  })

  it('image_queries slots are AI-generated first when generation is available (search untouched)', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    const prompts: string[] = []
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      prompts.push(prompt)
      return { ok: true, url: `https://gen.img/${encodeURIComponent(prompt)}.png` }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-genq',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          {
            title: 'P1',
            brief: 'b',
            layout: 'content',
            image_queries: ['summer palace kunming lake'],
          },
        ],
      },
    } as AgentToolCall)
    expect(prompts).toEqual(['summer palace kunming lake'])
    expect(imageSearchCalls).toEqual([]) // search is only a fallback — never called here
    expect(imagesSeen[0]).toEqual(['https://gen.img/summer%20palace%20kunming%20lake.png'])
  })

  it('an image_queries slot falls back to image search only when its generation fails', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => true
    access.generateImage = async () => ({ ok: false, error: 'quota exhausted' })
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-genq2',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          { title: 'P1', brief: 'b', layout: 'content', image_queries: ['great wall sunrise'] },
        ],
      },
    } as AgentToolCall)
    expect(imageSearchCalls).toEqual(['great wall sunrise'])
    expect(imagesSeen[0][0]).toContain('https://mock.img/')
  })

  it('the same slot text in image_queries and image_prompts is generated once and shared', async () => {
    const { access, imagesSeen } = makeAccess()
    const prompts: string[] = []
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      prompts.push(prompt)
      return { ok: true, url: 'https://gen.img/shared.png' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-dup',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          {
            title: 'P1',
            brief: 'b',
            layout: 'content',
            image_queries: ['mountain lake'],
            image_prompts: ['Mountain  Lake'], // normalized → same slot
          },
        ],
      },
    } as AgentToolCall)
    expect(prompts).toEqual(['mountain lake']) // one generation for both fields
    expect(imagesSeen[0]).toEqual(['https://gen.img/shared.png', 'https://gen.img/shared.png'])
  })
})

describe('generate_deck parallelism', () => {
  const topicCall = (n: number): AgentToolCall => ({
    id: 'c-par',
    name: 'generate_deck',
    input: { topic: 'Big Deck', approx_pages: n, detail: 'full' },
  })

  it('plan batches beyond the first run in parallel, applied in page order', async () => {
    const { access, landOrder } = makeAccess()
    let concurrent = 0
    let maxConcurrent = 0
    const calls: Array<{ startPage: number; continueFrom?: { coreHook: string } }> = []
    const orig = access.planDeckOutline!
    access.planDeckOutline = async (a) => {
      calls.push({ startPage: a.startPage, continueFrom: a.continueFrom })
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      // The later batch resolves FIRST — application order must still be by startPage
      await new Promise((r) => setTimeout(r, a.startPage === 13 ? 30 : 0))
      concurrent--
      return orig(a)
    }
    const skill = createSlidesSkill(access)
    // 25 pages → 12 + 12 + 1 → batches at startPage 1, 13, 25; the last two overlap
    await skill.executeTool(topicCall(25))
    expect(calls.map((c) => c.startPage)).toEqual([1, 13, 25])
    expect(maxConcurrent).toBe(2)
    // Later batches continue from the first batch's Core Hook
    expect(calls[1]!.continueFrom?.coreHook).toBe('CH:Big Deck')
    expect(calls[2]!.continueFrom?.coreHook).toBe('CH:Big Deck')
    // Despite batch-13 finishing after batch-25, page order stayed: "Planned page 25" is page 25
    expect(landOrder.some((l) => l.includes('PAGE25:Planned page 25'))).toBe(true)
    expect(landOrder.some((l) => l.includes('PAGE13:Planned page 25'))).toBe(false)
  })

  it('cloud page generation runs up to 8 pages concurrently per batch', async () => {
    const { access } = makeAccess()
    let concurrent = 0
    let maxConcurrent = 0
    const orig = access.generatePageCloud!
    access.generatePageCloud = async (a) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 15))
      concurrent--
      return orig(a)
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall(10))
    expect(maxConcurrent).toBe(8)
  })

  it('local page generation keeps a narrower pool of 4 (proxy stability)', async () => {
    const { access } = makeAccess({ cloudEnabled: false })
    let concurrent = 0
    let maxConcurrent = 0
    const orig = access.generatePageLocal!
    access.generatePageLocal = async (a) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 15))
      concurrent--
      return orig(a)
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(topicCall(6))
    expect(maxConcurrent).toBe(4)
  })
})

describe('generate_deck style choice card (Q1)', () => {
  const variants = [
    { name: 'Quiet Boardroom', concept: 'restrained paper neutral', palette: 'bg #FFFFFF', fonts: 'Georgia + Arial', motif: 'hairline rules' },
    { name: 'Bold Signal', concept: 'dark stage with orange accent', palette: 'bg #111111', fonts: 'Arial Black + Arial', motif: 'oversized numeral' },
    { name: 'Night Editorial', concept: 'cinematic serif duotone', palette: 'bg #0F0F0F', fonts: 'Georgia + Courier', motif: 'gradient orb' },
  ]
  const styleCall = (): AgentToolCall => ({
    id: 'c-style',
    name: 'generate_deck',
    input: { topic: 'Coffee Pitch', approx_pages: 2, detail: 'full' },
  })

  it('the user pick steers the full Style Skill via styleHint', async () => {
    const { access, getPages } = makeAccess()
    const hints: (string | undefined)[] = []
    const asked: { id: string; options: string[] }[] = []
    access.generateStyleVariants = async () => ({ ok: true, variants })
    access.askClarification = async (questions) => {
      asked.push({ id: questions[0]!.id, options: questions[0]!.options })
      return { answers: 'style: Bold Signal' }
    }
    const orig = access.generateStyleSkill!
    access.generateStyleSkill = async (a) => {
      hints.push(a.styleHint)
      return orig(a)
    }
    const skill = createSlidesSkill(access)
    const res = (await skill.executeTool(styleCall())) as { summary: string }
    expect(asked).toHaveLength(1)
    expect(asked[0]!.options).toHaveLength(3)
    expect(hints[0]).toContain('Bold Signal')
    expect(hints[0]).toContain('User-picked direction')
    expect(getPages()).toBe(2)
    expect(res.summary).toContain('2/2')
  })

  it('dismissing the card falls back to the single-style path (deck still generates)', async () => {
    const { access, getPages } = makeAccess()
    const hints: (string | undefined)[] = []
    access.generateStyleVariants = async () => ({ ok: true, variants })
    access.askClarification = async () => ({ answers: '', cancelled: true })
    const orig = access.generateStyleSkill!
    access.generateStyleSkill = async (a) => {
      hints.push(a.styleHint)
      return orig(a)
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(styleCall())
    expect(hints[0] ?? '').not.toContain('User-picked direction')
    expect(getPages()).toBe(2)
  })

  it('no variants support → no card, single-style path unchanged', async () => {
    const { access, getPages } = makeAccess()
    let asked = 0
    access.askClarification = async () => {
      asked++
      return { answers: '' }
    }
    const skill = createSlidesSkill(access)
    await skill.executeTool(styleCall())
    expect(asked).toBe(0) // generateStyleVariants absent → card never shows
    expect(getPages()).toBe(2)
  })
})

describe('generate_deck pipelined imagery (S1)', () => {
  it('a slot shared across chunk boundaries is generated once and reaches both pages', async () => {
    const { access, imagesSeen } = makeAccess()
    const prompts: string[] = []
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      prompts.push(prompt)
      return { ok: true, url: 'https://gen.img/shared.png' }
    }
    const skill = createSlidesSkill(access)
    // 6 pages on the cloud path → GEN_BATCH chunks [1-4],[5-6]; the shared slot
    // sits in chunk 1 (page 1) and chunk 2 (page 6)
    await skill.executeTool({
      id: 'c-pipe',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: Array.from({ length: 6 }, (_, i) => ({
          title: `P${i + 1}`,
          brief: 'b',
          layout: 'content',
          image_queries: i === 0 || i === 5 ? ['shared harbor view'] : [],
        })),
      },
    } as AgentToolCall)
    expect(prompts).toEqual(['shared harbor view']) // resolved once, shared caches dedup
    expect(imagesSeen[0]).toEqual(['https://gen.img/shared.png'])
    expect(imagesSeen[5]).toEqual(['https://gen.img/shared.png'])
  })

  it('a mid-deck generation miss falls back to search immediately for that chunk', async () => {
    const { access, imageSearchCalls, imagesSeen } = makeAccess()
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) =>
      prompt === 'unlucky slot'
        ? { ok: false, error: 'quota exhausted' }
        : { ok: true, url: `https://gen.img/${encodeURIComponent(prompt)}.png` }
    const skill = createSlidesSkill(access)
    await skill.executeTool({
      id: 'c-pipe2',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: [
          { title: 'P1', brief: 'b', layout: 'content', image_queries: ['lucky slot'] },
          { title: 'P2', brief: 'b', layout: 'content', image_queries: ['unlucky slot'] },
        ],
      },
    } as AgentToolCall)
    expect(imageSearchCalls).toEqual(['unlucky slot'])
    expect(imagesSeen[0]).toEqual(['https://gen.img/lucky%20slot.png'])
    expect(imagesSeen[1][0]).toContain('https://mock.img/')
  })

  it('slots beyond the first chunk start resolving immediately (eager pool overlaps page generation)', async () => {
    const { access } = makeAccess()
    let concurrent = 0
    let maxConcurrent = 0
    access.imageGenAvailable = () => true
    access.generateImage = async ({ prompt }) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 15))
      concurrent--
      return { ok: true, url: `https://gen.img/${prompt}.png` }
    }
    const skill = createSlidesSkill(access)
    // 6 pages × 1 unique slot across two GEN_BATCH chunks: the old per-chunk
    // pool (3) could not start chunk 2's slots until chunk 1's pages generated —
    // the eager pool puts all 6 in flight at once.
    await skill.executeTool({
      id: 'c-eager',
      name: 'generate_deck',
      input: {
        core_hook: 'h',
        style: 's',
        detail: 'full',
        pages: Array.from({ length: 6 }, (_, i) => ({
          title: `P${i + 1}`,
          brief: 'b',
          layout: 'content',
          image_queries: [`slot ${i + 1}`],
        })),
      },
    } as AgentToolCall)
    expect(maxConcurrent).toBe(6)
  })
})
