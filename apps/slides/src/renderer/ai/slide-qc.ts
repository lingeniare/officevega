/**
 * Post-generation layout QC: each generated page gets one focused pass. Vision-capable
 * models receive screenshot + element inventory; text-only models receive deterministic
 * geometry evidence only. Runs in its own AgentLoop per page (fresh context, so the QC
 * cost doesn't ride on the main conversation), orchestrated by AiPanel.
 */
import {
  AgentLoop,
  type AgentImage,
  type AgentSkill,
  type AgentTransport,
} from '@genoffice/agent-core'
import {
  getProviderAdapter,
  modelLacksVision,
  type AiSettings,
} from '@genoffice/ai-provider/browser'
import { auditSlideLayout } from '@genoffice/pipelines/slides/layout-audit'
import type { RenderSlide } from '@genoffice/pptx-render'
import { createSlidesSkill, formatSlideDump, type DeckAccess } from './slides-skill'
import qcVisualPrompt from './prompts/qc-visual.md?raw'
import qcGeometryPrompt from './prompts/qc-geometry.md?raw'
import { redactionCount } from './redact-view'

/** Kill switch: localStorage 'ai-slides-qc' = '0' disables the automatic pass */
/**
 * Whether a rendered picture of this slide may go to the model.
 *
 * A screenshot is the one outbound path no text projection can reach: the
 * renderer tints a withheld run rather than replacing it, so the words are in
 * the bitmap. There is no mask for that — a picture has no spans to cover — so
 * a slide that withholds anything gets no picture at all.
 */
export function screenshotAllowed(slide: { nodes: unknown[] }): boolean {
  return redactionCount(slide as Parameters<typeof redactionCount>[0]) === 0
}

/**
 * What to say instead of attaching a picture.
 *
 * Said rather than omitted: a model told nothing assumes it is looking at the
 * rendering, and reasons about text it cannot see.
 */
export const NO_SCREENSHOT_NOTE =
  'No image of this slide: it contains text withheld from you, and a picture is not something the withholding can cover. Work from the element inventory.'

export function isQcEnabled(): boolean {
  return localStorage.getItem('ai-slides-qc') !== '0'
}

/** Cost ceiling per generation run — beyond this the tail pages are skipped (reported to the user) */
export const QC_MAX_PAGES = 20

/** Unknown providers are treated as text-only: omitting an image is safer than a user-visible 400. */
export function settingsSupportVision(
  settings: Pick<AiSettings, 'provider' | 'providers'>,
): boolean {
  try {
    if (!getProviderAdapter(settings.provider).capabilities.vision) return false
    return !modelLacksVision(settings.providers?.[settings.provider]?.model ?? '')
  } catch {
    return false
  }
}

/** Custom/OpenAI-compatible endpoints can still reject images despite optimistic metadata. */
export function isUnsupportedImageInputError(error: string): boolean {
  return /(?:does not support|doesn't support|unsupported).{0,40}(?:image|vision)|(?:image|vision).{0,40}(?:not supported|unsupported)/i.test(
    error,
  )
}

/**
 * Pages produced by a landGeneratedPages/regenerateSlide call, as 0-based indexes.
 * replace lands a whole new deck; append starts at appendedFrom; insert_at/replace_at touch one page.
 */
export function generatedPageRange(
  mode: 'replace' | 'append' | 'insert_at' | 'replace_at',
  r: { pages?: number; appendedFrom?: number; insertedIndex?: number },
): number[] {
  const total = r.pages ?? 0
  switch (mode) {
    case 'replace':
      return Array.from({ length: total }, (_, i) => i)
    case 'append': {
      const from = r.appendedFrom ?? 0
      return Array.from({ length: Math.max(0, total - from) }, (_, i) => from + i)
    }
    case 'insert_at':
    case 'replace_at':
      return typeof r.insertedIndex === 'number' ? [r.insertedIndex] : []
  }
}

/**
 * Fold one landing's pages into the run's pending-QC set.
 * replace discards earlier pendings (whole new deck); insert_at shifts pendings at/after
 * the insertion point before adding it, keeping indexes valid.
 */
export function mergeQcPages(
  prev: number[],
  mode: 'replace' | 'append' | 'insert_at' | 'replace_at',
  r: { pages?: number; appendedFrom?: number; insertedIndex?: number },
): number[] {
  const range = generatedPageRange(mode, r)
  const sortDedupe = (pages: number[]) => [...new Set(pages)].sort((a, b) => a - b)
  switch (mode) {
    case 'replace':
      return range
    case 'append':
    case 'replace_at':
      return sortDedupe([...prev, ...range])
    case 'insert_at': {
      const at = r.insertedIndex
      if (typeof at !== 'number') return prev
      return sortDedupe([...prev.map((p) => (p >= at ? p + 1 : p)), at])
    }
  }
}

/** Only the two tools the QC pass needs: fresh geometry reads + atomic layout scripts */
const QC_TOOL_ALLOWLIST = new Set(['read_slide', 'execute_slide_script'])

export interface QcPageResult {
  /** page still exists and the pass ran */
  ok: boolean
  /** at least one mutating tool call was applied */
  edited: boolean
  /** model's final one-liner ('OK' when clean) */
  reply: string
  /** deterministic audit issue counts before/after (rollback signal: after > before) */
  preIssues: number
  postIssues: number
  error?: string
}

export interface QcPageOptions {
  access: DeckAccess
  transport: AgentTransport
  pageIndex: number
  /** pixelRatio-1 PNG of the page's current rendering; null runs a geometry-only pass */
  screenshot: AgentImage | null
  systemSuffix?: () => string
  signal?: AbortSignal
}

/** Wrap createSlidesSkill with the appropriate QC prompt and two-tool allowlist (executor shared). */
export function createSlideFixSkill(access: DeckAccess, hasScreenshot = true): AgentSkill {
  const full = createSlidesSkill(access)
  return {
    id: 'slides-qc',
    systemPrompt: hasScreenshot ? qcVisualPrompt : qcGeometryPrompt,
    tools: full.tools.filter((tool) => QC_TOOL_ALLOWLIST.has(tool.name)),
    executeTool: full.executeTool,
  }
}

function buildQcInstruction(
  pageIndex: number,
  dump: string,
  issues: string[],
  hasScreenshot: boolean,
): string {
  const auditStr = issues.length
    ? hasScreenshot
      ? `Deterministic geometry audit already flags:\n${issues.map((s) => `- ${s}`).join('\n')}\n(These are hints — the screenshot is the ground truth; it may show more or reveal a flagged item is fine.)`
      : `Deterministic geometry audit flags:\n${issues.map((s) => `- ${s}`).join('\n')}\n(Only make changes supported by these findings and the inventory; no screenshot is available.)`
    : 'The deterministic geometry audit found nothing — trust the screenshot for visual defects it cannot measure (contrast, alignment, crowding).'
  const rendering = hasScreenshot
    ? 'The attached image is its current rendering.'
    : 'No image is attached; inspect only the inventory and deterministic audit.'
  const task = hasScreenshot
    ? 'Inspect the screenshot, fix objective layout defects first, then apply restrained professional polish when clearly beneficial.'
    : 'Fix only objective geometry defects established by the audit and inventory.'
  return `Slide ${pageIndex + 1} (slideIndex ${pageIndex}) was just auto-generated. ${rendering}

Element inventory:
${dump}

${auditStr}

${task}`
}

/**
 * One page, one focused QC run. The caller owns history batching (rollback via
 * aiSnapshotRestore) and deciding what to do with the result.
 */
export function qcSlidePage(opts: QcPageOptions): Promise<QcPageResult> {
  const { access, transport, pageIndex, screenshot, systemSuffix, signal } = opts
  const slide = access.getSlides()[pageIndex]
  if (!slide) {
    return Promise.resolve({
      ok: false,
      edited: false,
      reply: '',
      preIssues: 0,
      postIssues: 0,
      error: `slideIndex ${pageIndex} out of range`,
    })
  }
  const preIssues = auditSlideLayout(slide)
  // A text-only model has no additional evidence to inspect when the deterministic
  // audit is already clean. Avoid an unnecessary request and any chance of speculative edits.
  if (!screenshot && preIssues.length === 0) {
    return Promise.resolve({
      ok: true,
      edited: false,
      reply: 'OK',
      preIssues: 0,
      postIssues: 0,
    })
  }
  const instruction = buildQcInstruction(
    pageIndex,
    formatSlideDump(slide),
    preIssues,
    screenshot !== null,
  )

  return new Promise((resolve) => {
    let edited = false
    const finish = (r: { reply: string; error?: string }) => {
      const after = access.getSlides()[pageIndex]
      resolve({
        ok: true,
        edited,
        reply: r.reply.trim(),
        preIssues: preIssues.length,
        postIssues: after ? auditSlideLayout(after).length : 0,
        ...(r.error !== undefined ? { error: r.error } : {}),
      })
    }
    const loop = new AgentLoop({
      transport,
      skill: createSlideFixSkill(access, screenshot !== null),
      // audit feedback inside execute_slide_script output drives at most a couple of fix rounds
      maxTurns: 6,
      ...(systemSuffix ? { systemSuffix } : {}),
      events: {
        onToolExecuted: ({ execution }) => {
          if (execution.mutated) edited = true
        },
        onDone: ({ text }) => finish({ reply: text }),
        onError: (error) => finish({ reply: '', error }),
      },
    })
    const onAbort = () => loop.cancel()
    signal?.addEventListener('abort', onAbort, { once: true })
    loop.run(instruction, screenshot ? [screenshot] : undefined)
  })
}

// ── Parallel pass orchestration ─────────────────────────────────────────
// History batches are session-global and nested ends couple unrelated pages, so
// a QC pool cannot give each page its own batch. Instead the caller wraps the
// whole pass in ONE batch (the pass = one undo step) and per-page reverts go
// through main-process slide checkpoints (slides:qc-slide-checkpoint/restore).

/** Pages checked at once. localStorage 'ai-slides-qc-parallel' overrides (1-8). */
export const QC_PAGE_CONCURRENCY = 4

export function qcConcurrency(): number {
  const n = Number(localStorage.getItem('ai-slides-qc-parallel'))
  if (Number.isFinite(n) && n >= 1) return Math.min(8, Math.floor(n))
  return QC_PAGE_CONCURRENCY
}

export interface QcPageOutcome {
  /** 0-based slide index */
  page: number
  kind: 'ok' | 'fixed' | 'reverted' | 'skipped'
  /** model one-liner for 'fixed' */
  summary?: string
  /** rebuilt slide for 'reverted' — the caller applies it to the renderer deck */
  slide?: RenderSlide
  /** diagnostics for 'skipped' (provider/network error details) */
  error?: string
}

export interface QcRunHooks {
  /** pixelRatio-1 PNG of the page's current rendering; null → geometry-only page */
  captureShot: (pageIndex: number) => Promise<AgentImage | null>
  /** store a private copy of the slide in main for a possible page-level revert */
  checkpoint?: (pageIndex: number) => Promise<unknown>
  /** swap the checkpointed slide back in; returns the rebuilt slide (null on failure) */
  restore?: (pageIndex: number) => Promise<RenderSlide | null>
}

export interface QcRunOptions extends QcRunHooks {
  access: DeckAccess
  transport: AgentTransport
  /** ascending 0-based page indexes, already capped by the caller */
  pages: number[]
  /** whether the configured model accepts image input */
  visionCapable: boolean
  systemSuffix?: () => string
  signal?: AbortSignal
  concurrency?: number
  /** test seam — defaults to qcSlidePage */
  runPage?: (opts: QcPageOptions) => Promise<QcPageResult>
  /** called as each page settles; idx is the page's position in `pages` (stable ordering) */
  onPage?: (idx: number, outcome: QcPageOutcome) => void
}

/**
 * Run the per-page QC loops through a bounded worker pool. Returns outcomes in
 * `pages` order (sparse — aborted/unstarted pages stay undefined).
 */
export async function runQcPages(
  opts: QcRunOptions,
): Promise<Array<QcPageOutcome | undefined>> {
  const {
    access,
    transport,
    pages,
    visionCapable,
    systemSuffix,
    signal,
    captureShot,
    checkpoint,
    restore,
    onPage,
    concurrency = QC_PAGE_CONCURRENCY,
    runPage = qcSlidePage,
  } = opts
  const outcomes: Array<QcPageOutcome | undefined> = new Array(pages.length)
  let cursor = 0
  // A custom endpoint may claim generic OpenAI-compatible vision support but reject the
  // first image. Fall back for that page and keep the rest of this pass geometry-only.
  let forceGeometryOnly = false
  const settle = (i: number, o: QcPageOutcome) => {
    outcomes[i] = o
    onPage?.(i, o)
  }
  const worker = async () => {
    while (!signal?.aborted) {
      const i = cursor++
      if (i >= pages.length) return
      const page = pages[i]!
      try {
        const useShot = visionCapable && !forceGeometryOnly
        const shot = useShot ? await captureShot(page) : null
        if (useShot && !shot) {
          if (access.getSlides()[page]) settle(i, { page, kind: 'skipped' })
          continue
        }
        await checkpoint?.(page)
        let result = await runPage({
          access,
          transport,
          pageIndex: page,
          screenshot: shot,
          systemSuffix,
          signal,
        })
        if (shot && result.error && isUnsupportedImageInputError(result.error)) {
          forceGeometryOnly = true
          result = await runPage({
            access,
            transport,
            pageIndex: page,
            screenshot: null,
            systemSuffix,
            signal,
          })
        }
        // A mid-flight abort leaves the page's line empty — only the stop notice is added.
        if (signal?.aborted) return
        if (result.error) {
          settle(i, { page, kind: 'skipped', error: result.error })
        } else if (result.edited && result.postIssues > result.preIssues) {
          // The fix made the deterministic audit worse — swap this page's
          // checkpoint back in. Sibling pages' edits stay untouched.
          const slide = (await restore?.(page)) ?? null
          if (slide) {
            settle(i, { page, kind: 'reverted', slide })
          } else {
            console.warn(`[slides-qc] page ${page + 1}: revert failed, edits kept`)
            settle(i, { page, kind: 'fixed', summary: result.reply })
          }
        } else if (result.edited) {
          settle(i, { page, kind: 'fixed', summary: result.reply })
        } else {
          settle(i, { page, kind: 'ok' })
        }
      } catch (e) {
        // Infrastructure-level failure (IPC down, render crash): report the page,
        // keep the pool alive for the remaining ones.
        settle(i, { page, kind: 'skipped', error: e instanceof Error ? e.message : String(e) })
      }
    }
  }
  const n = Math.max(1, Math.min(Math.floor(concurrency), pages.length))
  await Promise.all(Array.from({ length: n }, worker))
  return outcomes
}
