import type { AgentSkill, AgentToolCall, AgentToolDef, ToolExecution } from '@genoffice/agent-core'
import type { WebSearchResult } from '../../shared/ipc'
import { t } from '../i18n/locale'
import type { ElementEntry, ParseMap } from '../document/parse-map'
import type { HtmlOp, OpError } from '../document/ops'
import { lineOf } from '../document/match'
import { buildProjection, type RedactionProjection } from './redact'
import { redactGuardForOps } from './redact-guard'
import {
  briefPinEdit,
  briefSummary,
  injectBrief,
  parseBrief,
  type Brief,
  type BriefStyle,
} from '../document/brief'
import type { PageWriteResult, PageWriteSpec } from './page-writer'
import type { BriefPlanResult, BriefPlanSpec } from './brief-writer'

export const CONTEXT_MAX_CHARS = 8000
export const OUTLINE_MAX_LINES = 80
export const READ_PAGE_CHARS = 12000
export const SELECTION_MAX_CHARS = 4000
const PREVIEW_CHARS = 60
/** head + start of body handed to the brief writer for restyle / extract */
const PAGE_HEAD_CHARS = 8000

/** What the skill needs from the app; every getter reads live state. */
export interface HtmlDocAccess {
  getText(): string
  getVersion(): number
  getMap(): ParseMap
  /** version of the last edit that did not come from the AI (typing, ribbon) */
  getLastManualVersion(): number
  getFilePath(): string | null
  /** element the user selected in the preview / source, if any */
  getSelectedSid(): number | null
  /** compile + apply atomically; returns the applied patch ranges (post-edit offsets) or errors */
  applyOps(
    ops: HtmlOp[],
    label: string,
  ): { ok: true; ranges: Array<[number, number]> } | { ok: false; errors: OpError[] }
  replaceAll(html: string, label: string): void
  /** questionnaire card; resolves with the user's answers or cancelled when skipped */
  askClarification?(questions: ClarifyQuestion[]): Promise<{ answers: string; cancelled?: boolean }>
  /** brief drafting as its own streamed request (see brief-writer.ts); resolves with the raw JSON object */
  planBrief?(spec: BriefPlanSpec, signal?: AbortSignal): Promise<BriefPlanResult>
  /** brief card; resolves with the confirmed (possibly edited) brief, a request for another one, or cancelled */
  confirmBrief?(brief: Brief): Promise<BriefDecision>
  /** whole-page generation as its own streamed request (see page-writer.ts); the app previews the draft and asks about partial pages */
  writePage?(spec: PageWriteSpec, signal?: AbortSignal): Promise<PageWriteResult>
  /** the instruction of the current run, handed to the page writer (which never sees the conversation) */
  getInstruction?(): string
  /** turn an `attachment://<file name>` reference into a usable src (assets/ path or data URL) */
  resolveAttachmentSrc?(
    ref: string,
  ): Promise<{ ok: true; src: string } | { ok: false; error: string }>
  /** names of the attachments the model can reference; lets refs to names with spaces or parentheses match whole */
  listAttachmentNames?(): string[]
  /** web research run while a card waits on the user — the `search` queries of ask_clarification */
  webSearch?(query: string, maxResults?: number): Promise<WebSearchResult>
  /** one generated image for a `data-img` slot; the returned URL is https or a generated-store file:// */
  generateImage?(op: {
    prompt: string
    aspectRatio?: string
  }): Promise<{ url?: string; error?: string }>
  /** real-photo fallback for an image slot → candidate image URLs */
  searchImages?(query: string, maxResults?: number): Promise<string[]>
  /** turn a resolved image URL into an authored src: an assets/ path, the remote URL itself, or a data: URL when nothing else works */
  persistImage?(url: string): Promise<string | null>
}

export type PlanMode = 'new' | 'redesign' | 'restyle' | 'extract'

export interface ClarifyQuestion {
  id: string
  label: string
  description?: string
  /** ≤5 options; the card appends "decide for me" and a free-text "other" itself */
  options: string[]
  multi?: boolean
}

export type BriefDecision =
  { kind: 'confirmed'; brief: Brief } | { kind: 'redo'; note: string } | { kind: 'cancelled' }

const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v))

function coerceStyle(raw: unknown): BriefStyle | null {
  const style = (raw ?? {}) as Record<string, unknown>
  if (typeof style !== 'object' || !String(style.tone ?? '').trim()) return null
  const palette = (style.palette ?? {}) as Record<string, unknown>
  const typography = (style.typography ?? {}) as Record<string, unknown>
  const tokens = (style.tokens ?? {}) as Record<string, unknown>
  return {
    name: str(style.name)?.trim() || undefined,
    tone: String(style.tone).trim(),
    palette: {
      primary: str(palette.primary),
      accent: str(palette.accent),
      bg: str(palette.bg),
      surface: str(palette.surface),
      text: str(palette.text),
    },
    typography: {
      heading: str(typography.heading),
      body: str(typography.body),
      scale: str(typography.scale),
    },
    tokens: {
      radius: str(tokens.radius),
      spacing: str(tokens.spacing),
      shadow: str(tokens.shadow),
    },
    layout: str(style.layout),
    density: str(style.density),
    docx_friendly: Boolean(style.docx_friendly),
  }
}

/** the writer may emit the reference material as an object or list; the page writer reads text */
function contextText(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 1)
}

const MAX_ALTERNATIVES = 2

/** a missing/unknown mode is read from the document: empty → new page, otherwise only pin the brief */
function planMode(raw: unknown, text: string): PlanMode {
  if (raw === 'new' || raw === 'redesign' || raw === 'restyle' || raw === 'extract') return raw
  return text.trim() ? 'extract' : 'new'
}

function coerceBrief(input: Record<string, unknown>): Brief | string {
  const coreHook = String(input.core_hook ?? '').trim()
  const sections = Array.isArray(input.sections) ? input.sections : []
  if (!coreHook) return 'core_hook is required'
  const style = coerceStyle(input.style)
  if (!style) return 'style.tone is required'
  if (sections.length === 0) return 'sections must be non-empty'
  const alternatives = (Array.isArray(input.alternatives) ? input.alternatives : [])
    .map(coerceStyle)
    .filter((s): s is BriefStyle => s !== null)
    .slice(0, MAX_ALTERNATIVES)
  const meta = (input.meta ?? {}) as Record<string, unknown>
  return {
    core_hook: coreHook,
    style,
    alternatives: alternatives.length ? alternatives : undefined,
    sections: sections.map((raw) => {
      const sec = (raw ?? {}) as Record<string, unknown>
      return {
        title: String(sec.title ?? '').trim() || 'Untitled',
        type: str(sec.type),
        brief: String(sec.brief ?? '').trim(),
        layout: str(sec.layout),
        image_queries: Array.isArray(sec.image_queries) ? sec.image_queries.map(String) : undefined,
      }
    }),
    meta: {
      title: str(meta.title),
      language: str(meta.language),
      audience: str(meta.audience),
      length: str(meta.length),
    },
    version: 1,
  }
}

/** Skip structural/no-content elements in the outline; the model can still address them via read_source */
const OUTLINE_SKIP = new Set([
  'html',
  'head',
  'body',
  'meta',
  'link',
  'script',
  'style',
  'br',
  'wbr',
  'template',
  'noscript',
])

function textPreview(proj: RedactionProjection, e: ElementEntry): string {
  const inner = proj
    .projectRange(e.inner[0], e.inner[1])
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return inner.length > PREVIEW_CHARS ? `${inner.slice(0, PREVIEW_CHARS)}…` : inner
}

/**
 * A start tag with its withheld attribute values already replaced — `src` and
 * `href` are exactly where a key or a signed URL tends to live, and the outline
 * prints them.
 */
function attrsPreview(proj: RedactionProjection, e: ElementEntry): string {
  const tag = proj.projectRange(e.startTag[0], e.startTag[1])
  const id = /\sid\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
  const cls = /\sclass\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
  const src = /\s(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
  const parts: string[] = []
  if (id) parts.push(`#${id}`)
  if (cls) parts.push(`.${cls.trim().split(/\s+/).slice(0, 3).join('.')}`)
  if (src && (e.tag === 'img' || e.tag === 'a' || e.tag === 'source'))
    parts.push(`(${src.slice(0, 40)})`)
  return parts.join('')
}

/**
 * The projection is required rather than optional on purpose: a call site that
 * forgot it would print the reader's secrets into the outline, and nothing in
 * the type would say so. Line numbers are the *view's*, because that is the text
 * the model is shown and the numbering it will read.
 */
export function buildOutline(
  proj: RedactionProjection,
  map: ParseMap,
  opts: { depth?: number; fromSid?: number; maxLines?: number } = {},
): string {
  const depthLimit = opts.depth ?? 3
  const root = opts.fromSid !== undefined ? map.bySid.get(opts.fromSid) : undefined
  const maxLines = opts.maxLines ?? OUTLINE_MAX_LINES
  const lines: string[] = []
  let skipped = 0
  const baseDepth = root ? root.depth : 0
  for (const e of map.elements) {
    if (root && !(e.range[0] >= root.range[0] && e.range[1] <= root.range[1])) continue
    if (OUTLINE_SKIP.has(e.tag) && e.tag !== 'style' && e.tag !== 'script') continue
    if (e.tag === 'style' || e.tag === 'script') {
      // keep one line for each so the model knows they exist
    }
    const rel = e.depth - baseDepth
    if (rel > depthLimit) {
      skipped++
      continue
    }
    if (lines.length >= maxLines) {
      skipped++
      continue
    }
    const l1 = lineOf(proj.view, proj.toViewOffset(e.range[0]))
    const l2 = lineOf(proj.view, proj.toViewOffset(Math.max(e.range[0], e.range[1] - 1)))
    const where = l1 === l2 ? `L${l1}` : `L${l1}-L${l2}`
    const indent = '  '.repeat(Math.max(0, rel - 1))
    const preview = OUTLINE_SKIP.has(e.tag) ? '' : textPreview(proj, e)
    lines.push(
      `${where.padEnd(11)} sid=${String(e.sid).padEnd(4)} ${indent}${e.tag}${attrsPreview(proj, e)}${preview ? `  "${preview}"` : ''}`,
    )
  }
  if (skipped > 0)
    lines.push(`… (${skipped} more elements; use read_source or get_outline with from_sid / depth)`)
  return lines.join('\n')
}

function numbered(text: string, fromLine: number): string {
  return text
    .split('\n')
    .map((l, i) => `${String(fromLine + i).padStart(5)}| ${l}`)
    .join('\n')
}

export const AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'get_outline',
    description:
      'Structural outline of the document: one line per element with its line range, stable element id (sid), tag, id/class and a text preview. Use it to find where to read or edit. Narrow with from_sid / depth for large documents.',
    inputSchema: {
      type: 'object',
      properties: {
        depth: { type: 'integer', description: 'Nesting depth to show (default 3)' },
        from_sid: { type: 'integer', description: 'Only this element and its subtree' },
      },
    },
  },
  {
    name: 'read_source',
    description:
      'Read a slice of the HTML source with line numbers. Address by line range, or by sid to read one element. Long results are paged (page starts at 0).',
    inputSchema: {
      type: 'object',
      properties: {
        start_line: { type: 'integer' },
        end_line: { type: 'integer' },
        sid: { type: 'integer' },
        page: { type: 'integer' },
      },
    },
  },
  {
    name: 'apply_ops',
    description:
      'Apply a batch of edits to the HTML source atomically: every op is validated first and either all are applied or none. Ops: ' +
      '`str_replace {old, new, sid?, replace_all?}` exact search-and-replace (old must match once; scope with sid when markup repeats); ' +
      '`replace_element {sid, html}` swap the whole element; `set_inner_html {sid, html}`; `set_text {sid, text}` (text is escaped for you); ' +
      '`insert_html {sid, position: before|after|prepend|append, html}`; `remove {sid}`; `move {sid, position: before|after, ref_sid}`; ' +
      '`set_attr {sid, name, value|null}`; `set_style {sid, styles: {prop: value|null}}` merges inline style. ' +
      'Prefer sid-addressed ops for single elements and str_replace for scattered text or CSS/JS edits. Keep unrelated markup, indentation and attribute order untouched. ' +
      'To place an attached image, write `attachment://<file name>` (the exact name from the attachment list) wherever a src/url value goes — set_attr value, an <img src> inside html, or a CSS url(); the app substitutes the real file itself. Never type base64 or data: URLs into ops, and never ask the user to paste base64.',
    inputSchema: {
      type: 'object',
      required: ['ops'],
      properties: {
        ops: {
          type: 'array',
          minItems: 1,
          maxItems: 40,
          items: {
            type: 'object',
            required: ['op'],
            properties: {
              op: {
                type: 'string',
                enum: [
                  'str_replace',
                  'replace_element',
                  'set_inner_html',
                  'set_text',
                  'insert_html',
                  'remove',
                  'move',
                  'set_attr',
                  'set_style',
                ],
              },
              old: { type: 'string' },
              new: { type: 'string' },
              replace_all: { type: 'boolean' },
              sid: { type: 'integer' },
              ref_sid: { type: 'integer' },
              html: { type: 'string' },
              text: { type: 'string' },
              position: { type: 'string', enum: ['before', 'after', 'prepend', 'append'] },
              name: { type: 'string' },
              value: { type: ['string', 'null'] },
              styles: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
            },
          },
        },
        summary: { type: 'string', description: 'One short sentence shown to the user' },
      },
    },
  },
  {
    name: 'ask_clarification',
    description:
      '[Before creating a new page] Show a questionnaire card so the user makes the key choices: for a new page the FIRST question offers 2–3 complete section structures as options (e.g. "Hero → Features → Pricing → Contacts" vs "Hero → Gallery → About → Contacts"); the card itself adds a free-text option for the user\'s own structure. Add further questions only for real trade-offs (audience, scenario, tone, focus, length), ≤5 options each; the card adds "decide for me". Skip the card when the request already answers these. When the topic needs current information, pass research queries in `search` — they run while the user answers and their findings come back with the answers. Wait for the answers, then call plan_page. Do not repeat the questions in your reply.',
    inputSchema: {
      type: 'object',
      required: ['questions'],
      properties: {
        questions: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            required: ['id', 'label', 'options'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              options: { type: 'array', items: { type: 'string' }, maxItems: 5 },
              multi: { type: 'boolean' },
            },
          },
        },
        search: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 4,
          description:
            "Web research queries run in parallel while the user answers the card. The findings land in this tool's result and feed the brief — use instead of a separate web_search turn when a questionnaire is going out anyway.",
        },
      },
    },
  },
  {
    name: 'plan_page',
    description:
      '[Always before generating a new page or a full redesign, and when the user asks to restyle or "extract the brief" of an existing page] The system drafts the brief from this conversation (it reads the questionnaire answers, web_search findings, attachments and the page) and shows it to the user as style tiles with editable fields; pass only the mode and short notes. With mode "new" or "redesign" the confirmed brief is written into a page by the system right away (you do not write HTML yourself). Do not describe the brief in your reply.',
    inputSchema: {
      type: 'object',
      required: ['mode'],
      properties: {
        mode: {
          type: 'string',
          enum: ['new', 'redesign', 'restyle', 'extract'],
          description:
            'new = empty document, the page is generated after confirmation; redesign = the user asked to rebuild the whole page, generated after confirmation; restyle = keep the structure, you update --brief-* variables with apply_ops afterwards; extract = only pin the inferred brief',
        },
        notes: {
          type: 'string',
          description:
            'At most three sentences the brief must honor: the choices the user made, a redo note, a direction hint. No facts or copy here; the writer reads the conversation.',
        },
      },
    },
  },
  {
    name: 'fill_images',
    description:
      "[After a generated page landed with image slots] Offer to fill the page's <img data-img> placeholders with real imagery: the tool asks the user first, then resolves each slot (AI generation first, photo search as fallback) and writes the resolved src in one edit batch. Call it when the freshly written page contains data-img slots; never for a page without them, and not again after the user declined.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'write_document',
    description:
      '[Content-first documents only: the user wants text written (article, guide, memo, announcement), not a designed page] Hands a plan to the system document writer, which writes the whole document as a clean single-column page. Give the title, a plan (outline, key points, length, voice) and the reference material in context. Everything else — new designed pages and full redesigns — goes through plan_page; single edits use apply_ops.',
    inputSchema: {
      type: 'object',
      required: ['plan'],
      properties: {
        title: { type: 'string' },
        plan: {
          type: 'string',
          description: 'outline and key points the document must cover, length, voice',
        },
        context: {
          type: 'string',
          description: 'facts, figures and source text the document must draw on',
        },
      },
    },
  },
]

const STALE_MESSAGE =
  'The document changed since you last looked at it (the user edited it). Call get_outline or read_source again and re-plan before editing.'

const ATTACHMENT_SCHEME = 'attachment://'
/** fallback token shape when no known attachment name follows the scheme */
const ATTACHMENT_REF_RE = /^[^\s"'<>()]+/
/** a known name only matches when the reference ends right after it */
const ATTACHMENT_REF_END_RE = /^(?:$|[\s"'<>),;])/

function safeDecode(name: string): string {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

interface AttachmentRef {
  start: number
  end: number
  /** attachment name to resolve (decoded) */
  name: string
}

/**
 * Every `attachment://…` occurrence in a string. The token is the longest known
 * attachment name (raw or URL-encoded, case-insensitive) that follows the
 * scheme, so names with spaces or parentheses match whole; otherwise it runs to
 * the next delimiter.
 */
function findAttachmentRefs(value: string, names: readonly string[]): AttachmentRef[] {
  const refs: AttachmentRef[] = []
  let at = value.indexOf(ATTACHMENT_SCHEME)
  while (at >= 0) {
    const from = at + ATTACHMENT_SCHEME.length
    const rest = value.slice(from)
    const restLower = rest.toLowerCase()
    let best: { token: string; name: string } | null = null
    for (const name of names) {
      for (const form of [name, encodeURI(name), encodeURIComponent(name)]) {
        if (
          restLower.startsWith(form.toLowerCase()) &&
          ATTACHMENT_REF_END_RE.test(rest.slice(form.length)) &&
          (!best || form.length > best.token.length)
        )
          best = { token: rest.slice(0, form.length), name }
      }
    }
    if (!best) {
      const token = ATTACHMENT_REF_RE.exec(rest)?.[0] ?? ''
      best = { token, name: safeDecode(token) }
    }
    const end = from + best.token.length
    if (best.token) refs.push({ start: at, end, name: best.name })
    at = value.indexOf(ATTACHMENT_SCHEME, Math.max(end, from))
  }
  return refs
}

function hasAttachmentRef(op: HtmlOp): boolean {
  const fields = op as unknown as Record<string, unknown>
  const inString = (v: unknown) => typeof v === 'string' && v.includes(ATTACHMENT_SCHEME)
  return (
    inString(fields.html) ||
    inString(fields.new) ||
    inString(fields.value) ||
    (op.op === 'set_style' && Object.values(op.styles).some(inString))
  )
}

/**
 * An ellipsis inside a data: URL token can only come from re-typing a
 * truncated preview of the document — the src is already corrupt and would
 * render as a broken image. Rejecting the batch up front turns a silent
 * broken image into an instructive error.
 */
const TRUNCATED_DATA_URL_RE = /data:[^\s"'<>]*(?:…|\.\.\.)/
export function findTruncatedDataUrl(ops: HtmlOp[]): number {
  const bad = (v: unknown) => typeof v === 'string' && TRUNCATED_DATA_URL_RE.test(v)
  return ops.findIndex((op) => {
    const fields = op as unknown as Record<string, unknown>
    return (
      bad(fields.html) ||
      bad(fields.new) ||
      bad(fields.old) ||
      bad(fields.value) ||
      (op.op === 'set_style' && Object.values(op.styles).some(bad))
    )
  })
}

/**
 * Replace `attachment://` references in op payload strings with real srcs so
 * the model never streams file bytes through tool arguments (a gateway drops
 * long tool-argument streams — the r182 base64-logo failure). `old` is left
 * untouched: it must match the document, which holds the expanded src.
 */
export async function expandAttachmentRefs(
  ops: HtmlOp[],
  resolve: NonNullable<HtmlDocAccess['resolveAttachmentSrc']>,
  names: readonly string[] = [],
): Promise<{ ops: HtmlOp[]; errors: string[] }> {
  const srcByName = new Map<string, string>()
  const errors: string[] = []
  const collect = (value: unknown): void => {
    if (typeof value !== 'string') return
    for (const ref of findAttachmentRefs(value, names)) srcByName.set(ref.name, '')
  }
  for (const op of ops) {
    const fields = op as unknown as Record<string, unknown>
    collect(fields.html)
    collect(fields.new)
    collect(fields.value)
    if (op.op === 'set_style') for (const v of Object.values(op.styles)) collect(v)
  }
  for (const name of srcByName.keys()) {
    const r = await resolve(name)
    if (r.ok) srcByName.set(name, r.src)
    else errors.push(`${ATTACHMENT_SCHEME}${name}: ${r.error}`)
  }
  if (errors.length > 0) return { ops, errors }
  if (srcByName.size === 0) return { ops, errors }
  const expand = (value: unknown): unknown => {
    if (typeof value !== 'string') return value
    let out = ''
    let cursor = 0
    for (const ref of findAttachmentRefs(value, names)) {
      out +=
        value.slice(cursor, ref.start) +
        (srcByName.get(ref.name) ?? value.slice(ref.start, ref.end))
      cursor = ref.end
    }
    return out + value.slice(cursor)
  }
  const expanded = ops.map((op) => {
    const fields = op as unknown as Record<string, unknown>
    const next: Record<string, unknown> = {
      ...fields,
      ...('html' in fields ? { html: expand(fields.html) } : {}),
      ...('new' in fields ? { new: expand(fields.new) } : {}),
      ...('value' in fields ? { value: expand(fields.value) } : {}),
    }
    if (op.op === 'set_style') {
      next.styles = Object.fromEntries(
        Object.entries(op.styles).map(([k, v]) => [k, expand(v) as string | null]),
      )
    }
    return next as unknown as HtmlOp
  })
  return { ops: expanded, errors }
}

export function createHtmlSkillCore(access: HtmlDocAccess): {
  buildContext(): string
  executeTool(call: AgentToolCall, signal?: AbortSignal): ToolExecution | Promise<ToolExecution>
} {
  /** version the model last saw; index/sid-addressed writes refuse when the user edited after it */
  let seenVersion = -1
  const markSeen = () => {
    seenVersion = access.getVersion()
  }
  const stale = () => access.getLastManualVersion() > seenVersion
  let currentSignal: AbortSignal | undefined

  const landPage = async (spec: PageWriteSpec, preface: string): Promise<ToolExecution> => {
    const summary = t('aiToolWritePage')
    if (!access.writePage)
      return { output: 'page generation is not available here', isError: true, summary }
    const result = await access.writePage(spec, currentSignal)
    if (!result.ok || !result.html)
      return {
        output: `${preface}\nThe page writer produced nothing (${result.error ?? 'no output'}); the document is unchanged. Tell the user briefly and offer to try again.`,
        isError: true,
        summary: t('aiToolWritePageFailed'),
      }
    access.replaceAll(result.html, 'generate')
    markSeen()
    const lines = result.html.split('\n').length
    const sections = [...result.html.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1])
    const imgSlots = (result.html.match(/\bdata-img\s*=/g) ?? []).length
    const note = result.truncated
      ? ' The stream ended early, so the page is INCOMPLETE (the user chose to keep it): the tail is missing. Say so and offer to finish the missing sections with apply_ops.'
      : ''
    const imgNote =
      imgSlots > 0
        ? ` The page has ${imgSlots} image slot(s) (styled <img data-img> placeholders): call fill_images — it asks the user whether to fill them with generated imagery.`
        : ''
    return {
      output: `${preface}\nPage written by the system (${result.html.length} chars, ${lines} lines${sections.length ? `; sections: ${sections.join(', ')}` : ''}). Version ${access.getVersion()}.${note}${imgNote}\nReply with one or two sentences describing the page; do not paste HTML.`,
      mutated: true,
      summary: result.truncated ? t('aiToolWritePagePartial') : summary,
    }
  }

  /** write the brief meta into the open document as one targeted edit; true when the document changed */
  const pinBrief = (brief: Brief): boolean => {
    const current = access.getText()
    const edit = briefPinEdit(current, brief)
    if (edit) {
      const r = access.applyOps([{ op: 'str_replace', old: edit.old, new: edit.new }], 'pin brief')
      if (r.ok) {
        markSeen()
        return true
      }
    } else if (parseBrief(current)) return false
    // whole-document fallback: applyOps flushes pending live edits first, so re-read rather than reuse the snapshot
    access.replaceAll(injectBrief(access.getText(), brief), 'pin brief')
    markSeen()
    return true
  }

  return {
    buildContext() {
      markSeen()
      const text = access.getText()
      const map = access.getMap()
      // one projection per read, shared by every surface below: the file
      // preview, the outline, and the selected element
      const proj = buildProjection(text, map)
      const view = proj.view
      const path = access.getFilePath()
      const title = /<title[^>]*>([^<]*)<\/title>/i.exec(view)?.[1]?.trim()
      const lines = view.split('\n').length
      const head = [
        '## Document',
        `file: ${path ? path.replace(/^.*[/\\]/, '') : '(untitled, not saved yet)'}  (${view.length.toLocaleString()} chars, ${lines} lines, version ${access.getVersion()})`,
        title ? `title: ${title}` : '',
        view.trim()
          ? ''
          : 'The document is empty: plan_page (mode new) or write_document creates it.',
      ].filter(Boolean)
      let outline = buildOutline(proj, map, { depth: 2, maxLines: 60 })
      const selectedSid = access.getSelectedSid()
      const selected = selectedSid !== null ? map.bySid.get(selectedSid) : undefined
      let selection = ''
      if (selected) {
        const source = proj.projectRange(selected.range[0], selected.range[1])
        const clipped =
          source.length > SELECTION_MAX_CHARS
            ? `${source.slice(0, SELECTION_MAX_CHARS)}\n… (truncated; read_source sid=${selected.sid} for the rest)`
            : source
        const l1 = lineOf(proj.view, proj.toViewOffset(selected.range[0]))
        const l2 = lineOf(
          proj.view,
          proj.toViewOffset(Math.max(selected.range[0], selected.range[1] - 1)),
        )
        selection = `\n\n## User selection\nsid=${selected.sid} <${selected.tag}> L${l1}-L${l2}\nEdit/rewrite-style requests apply to this element by default.\n\`\`\`html\n${clipped}\n\`\`\``
      }
      const brief = parseBrief(text)
      const briefBlock = brief
        ? `\n\n## Brief (pinned in <meta name="officevega:brief">)\n${briefSummary(brief)}\nNew content follows this core hook and style; a restyle starts by updating the --brief-* variables and this meta via plan_page.`
        : ''
      const budget =
        CONTEXT_MAX_CHARS - head.join('\n').length - selection.length - briefBlock.length - 40
      if (outline.length > budget)
        outline = `${outline.slice(0, Math.max(0, budget))}\n… (outline truncated; use get_outline)`
      return `${head.join('\n')}\n\noutline (sid = stable element id for apply_ops):\n${outline}${selection}${briefBlock}`
    },

    executeTool(call, signal) {
      currentSignal = signal
      const text = access.getText()
      const map = access.getMap()
      switch (call.name) {
        case 'get_outline': {
          markSeen()
          const depth = Number.isInteger(call.input.depth) ? Number(call.input.depth) : 3
          const fromSid = Number.isInteger(call.input.from_sid)
            ? Number(call.input.from_sid)
            : undefined
          if (fromSid !== undefined && !map.bySid.has(fromSid)) {
            return {
              output: `sid ${fromSid} does not exist`,
              isError: true,
              summary: t('aiToolOutline'),
            }
          }
          const out = buildOutline(buildProjection(text, map), map, {
            depth,
            fromSid,
            maxLines: 400,
          })
          return { output: out || '(empty document)', summary: t('aiToolOutline') }
        }
        case 'read_source': {
          markSeen()
          const page = Number.isInteger(call.input.page) ? Math.max(0, Number(call.input.page)) : 0
          // Line numbers the model sends address the text it was shown, which is
          // the projection — a 40-character key shown as an 11-character marker
          // moves every line after it. So the view is what we resolve lines
          // against, and the raw offsets come back through the projection.
          const proj = buildProjection(text, map)
          let from = 0
          let to = text.length
          if (Number.isInteger(call.input.sid)) {
            const e = map.bySid.get(Number(call.input.sid))
            if (!e)
              return {
                output: `sid ${String(call.input.sid)} does not exist`,
                isError: true,
                summary: t('aiToolReadSource'),
              }
            ;[from, to] = e.range
          } else if (
            Number.isInteger(call.input.start_line) ||
            Number.isInteger(call.input.end_line)
          ) {
            const lines = proj.view.split('\n')
            const s = Math.max(1, Number(call.input.start_line) || 1)
            const e = Math.min(lines.length, Number(call.input.end_line) || lines.length)
            const viewFrom = lines.slice(0, s - 1).join('\n').length + (s > 1 ? 1 : 0)
            const viewTo = lines.slice(0, e).join('\n').length
            from = proj.toRawOffset(viewFrom)
            to = proj.toRawOffset(viewTo)
          }
          const slice = proj.projectRange(from, to)
          const pages = Math.max(1, Math.ceil(slice.length / READ_PAGE_CHARS))
          const chunk = slice.slice(page * READ_PAGE_CHARS, (page + 1) * READ_PAGE_CHARS)
          const startLine = lineOf(proj.view, proj.toViewOffset(from) + page * READ_PAGE_CHARS)
          const body = numbered(chunk, startLine)
          const footer =
            pages > 1 ? `\n(page ${page + 1} of ${pages}; pass page=${page + 1} for more)` : ''
          return { output: body + footer, summary: t('aiToolReadSource') }
        }
        case 'apply_ops': {
          const ops = call.input.ops
          if (!Array.isArray(ops) || ops.length === 0) {
            return {
              output: 'ops must be a non-empty array',
              isError: true,
              summary: t('aiToolApplyOpsFailed'),
            }
          }
          const staleResult = (): ToolExecution => ({
            output: STALE_MESSAGE,
            isError: true,
            summary: t('aiToolApplyOpsFailed'),
          })
          if (stale()) return staleResult()
          // A span withheld from the model is a mark over real characters, so an
          // op reaching one destroys the reader's data silently. Checked before
          // anything is compiled or applied, so a refusal changes nothing.
          const refusal = redactGuardForOps(
            ops,
            buildProjection(access.getText(), access.getMap()),
            access.getMap(),
          )
          if (refusal) {
            return {
              output: `0 of ${ops.length} ops applied — ${refusal.reason}`,
              isError: true,
              summary: t('aiToolApplyOpsFailed'),
            }
          }
          const truncatedAt = findTruncatedDataUrl(ops as HtmlOp[])
          if (truncatedAt >= 0) {
            return {
              output: `0 of ${ops.length} ops applied — op ${truncatedAt + 1} contains a truncated data: URL (an ellipsis inside the src). Never re-type a data: src: change how the image is displayed with set_style / set_attr on its sid and leave the src untouched, or re-reference the file as attachment://<file name> and the app substitutes it.`,
              isError: true,
              summary: t('aiToolApplyOpsFailed'),
            }
          }
          const label =
            typeof call.input.summary === 'string' && call.input.summary
              ? call.input.summary
              : `apply_ops (${ops.length})`
          const finish = (finalOps: HtmlOp[]): ToolExecution => {
            const result = access.applyOps(finalOps, label)
            if (!result.ok) {
              const lines = result.errors.map(
                (e) =>
                  `Op ${e.index + 1}/${ops.length} FAILED (${e.kind.toUpperCase()}): ${e.message}`,
              )
              return {
                output: `0 of ${ops.length} ops applied.\n${lines.join('\n')}`,
                isError: true,
                summary: t('aiToolApplyOpsFailed'),
              }
            }
            markSeen()
            const after = access.getText()
            const where = result.ranges.slice(0, 12).map(([a, b]) => {
              const l1 = lineOf(after, a)
              const l2 = lineOf(after, Math.max(a, b - 1))
              return l1 === l2 ? `L${l1}` : `L${l1}-L${l2}`
            })
            const health = access.getMap().errorCount - map.errorCount
            const warn =
              health > 5
                ? `\nWARNING: the edit introduced ${health} new HTML parse recoveries (unbalanced tags?). Check the preview.`
                : ''
            return {
              output: `Applied ${ops.length} op(s) at ${where.join(', ')}. Document is now version ${access.getVersion()}.${warn}`,
              mutated: true,
              summary: t('aiToolApplyOps', { n: ops.length }),
            }
          }
          if (access.resolveAttachmentSrc && ops.some((op) => hasAttachmentRef(op))) {
            return expandAttachmentRefs(
              ops as HtmlOp[],
              access.resolveAttachmentSrc,
              access.listAttachmentNames?.() ?? [],
            ).then((expanded) => {
              if (expanded.errors.length > 0)
                return {
                  output: `0 of ${ops.length} ops applied — unresolved attachment reference(s):\n${expanded.errors.join('\n')}`,
                  isError: true,
                  summary: t('aiToolApplyOpsFailed'),
                }
              // the user may have typed while the image was read and saved over IPC
              if (stale()) return staleResult()
              return finish(expanded.ops)
            })
          }
          return finish(ops as HtmlOp[])
        }
        case 'ask_clarification': {
          if (!access.askClarification)
            return {
              output:
                'questionnaire cards are not available here; decide sensible defaults and continue',
              isError: true,
              summary: t('aiToolClarify'),
            }
          const raw = Array.isArray(call.input.questions) ? call.input.questions : []
          const questions: ClarifyQuestion[] = raw
            .map((q: Record<string, unknown>, i: number) => ({
              id: String(q.id ?? `q${i + 1}`),
              label: String(q.label ?? '').trim(),
              description: q.description ? String(q.description) : undefined,
              options: Array.isArray(q.options)
                ? q.options.map((o: unknown) => String(o)).slice(0, 5)
                : [],
              multi: !!q.multi,
            }))
            .filter((q) => q.label && q.options.length > 0)
            .slice(0, 4)
          if (questions.length === 0)
            return {
              output: 'questions must be non-empty and every question needs options',
              isError: true,
              summary: t('aiToolClarify'),
            }
          const queries = (Array.isArray(call.input.search) ? call.input.search : [])
            .map((q) => String(q).trim())
            .filter(Boolean)
            .slice(0, 4)
          // research runs under the card's wait: a slow/hung search is dropped after 15 s,
          // the card is never blocked on it
          const searches =
            access.webSearch && queries.length
              ? Promise.all(
                  queries.map((q) =>
                    Promise.race([
                      access.webSearch!(q, 6)
                        .then((r) => ({ q, r }))
                        .catch(() => null),
                      new Promise<null>((res) => setTimeout(() => res(null), 15_000)),
                    ]),
                  ),
                )
              : Promise.resolve([])
          return Promise.all([access.askClarification(questions), searches]).then(([r, found]) => {
            const findings = found
              .map((f) => {
                if (!f || f.r.method === 'error') return ''
                const lines = [
                  f.r.answer ? `Direct answer: ${f.r.answer}` : '',
                  ...f.r.results
                    .slice(0, 4)
                    .map((it) => `- ${it.title}\n  ${it.url}\n  ${it.snippet}`),
                ].filter(Boolean)
                return lines.length ? `### ${f.q}\n${lines.join('\n')}` : ''
              })
              .filter(Boolean)
              .join('\n\n')
            const findingsBlock = findings
              ? `\n\nWeb findings gathered while the user answered (the brief writer reads this transcript — carry the facts and sources into the brief's context):\n${findings}`
              : ''
            return r.cancelled
              ? {
                  output:
                    'The user skipped the questionnaire. Decide the core hook and style yourself, then call plan_page.' +
                    findingsBlock,
                  summary: t('aiToolClarifySkipped'),
                }
              : {
                  output: `User answers:\n${r.answers}${findingsBlock}\nNow call plan_page with a brief that follows these choices.`,
                  summary: t('aiToolClarify'),
                }
          })
        }
        case 'fill_images': {
          const slots: { token: string; prompt: string; tag: string; srcToken?: string }[] = []
          for (const e of map.elements) {
            if (e.tag !== 'img') continue
            const tag = text.slice(e.startTag[0], e.startTag[1])
            const m = /\bdata-img\s*=\s*("[^"]*"|'[^']*')/i.exec(tag)
            if (!m) continue
            const prompt = m[1]!.slice(1, -1).trim()
            if (!prompt) continue
            // a stray src on the same tag would win over the one being written — it goes
            const srcM = /\bsrc\s*=\s*("[^"]*"|'[^']*')/i.exec(tag)
            slots.push({ token: m[0], prompt, tag, srcToken: srcM?.[0] })
          }
          if (!slots.length)
            return {
              output: 'The page has no <img data-img> slots — nothing to fill.',
              isError: true,
              summary: t('aiToolFillImages'),
            }
          if ((!access.generateImage && !access.searchImages) || !access.persistImage)
            return {
              output: 'image filling is not available here',
              isError: true,
              summary: t('aiToolFillImages'),
            }
          return (async (): Promise<ToolExecution> => {
            if (access.askClarification) {
              const noLabel = t('aiFillImagesNo')
              const decision = await access.askClarification([
                {
                  id: 'images',
                  label: t('aiFillImagesAsk', { n: slots.length }),
                  options: [t('aiFillImagesYes'), noLabel],
                },
              ])
              if (decision.cancelled || decision.answers.includes(noLabel))
                return {
                  output:
                    'The user kept the styled image placeholders (no imagery generated). Say so briefly.',
                  summary: t('aiToolFillImages'),
                }
            }
            // resolve each unique prompt once; duplicate slots share one image
            const unique = new Map<string, string>()
            for (const s of slots) {
              const key = s.prompt.toLowerCase().replace(/\s+/g, ' ')
              if (!unique.has(key)) unique.set(key, s.prompt)
            }
            const prompts = [...unique.values()]
            const srcByPrompt = new Map<string, string>()
            let cursor = 0
            // a dead provider fails fast; two consecutive errors = stop asking it
            let genErrors = 0
            const worker = async () => {
              while (cursor < prompts.length) {
                if (currentSignal?.aborted) return
                const prompt = prompts[cursor++]!
                let url: string | undefined
                if (access.generateImage && genErrors < 2) {
                  try {
                    const r = await access.generateImage({ prompt, aspectRatio: '16:9' })
                    url = r.url
                    genErrors = r.error ? genErrors + 1 : 0
                  } catch {
                    genErrors += 1
                  }
                }
                if (!url && access.searchImages) {
                  try {
                    url = (await access.searchImages(prompt, 5))[0]
                  } catch {
                    /* fail-open */
                  }
                }
                if (!url) continue
                try {
                  const src = await access.persistImage!(url)
                  if (src) srcByPrompt.set(prompt.toLowerCase().replace(/\s+/g, ' '), src)
                } catch {
                  /* slot stays a placeholder */
                }
              }
            }
            // image calls are slow, but flooding the provider trips rate limits — pool of 3
            await Promise.all(Array.from({ length: Math.min(3, prompts.length) }, () => worker()))
            if (!srcByPrompt.size)
              return {
                output: `None of the ${prompts.length} image slot(s) could be resolved (generation unavailable or failed, search found nothing). The styled placeholders stay — tell the user briefly.`,
                isError: true,
                summary: t('aiToolFillImages'),
              }
            // re-read the live document: the user may have edited while images were made
            const live = access.getText()
            const done = new Set<string>()
            const stripped = new Set<string>()
            const ops: HtmlOp[] = []
            for (const s of slots) {
              const key = s.prompt.toLowerCase().replace(/\s+/g, ' ')
              const src = srcByPrompt.get(key)
              if (!src || src.includes('"') || done.has(key) || !live.includes(s.token)) continue
              done.add(key)
              // Strip a stray src scoped to this slot's tag text — a doc-wide
              // src="…" replace could hit an unrelated image sharing the URL.
              if (s.srcToken && !stripped.has(s.tag)) {
                stripped.add(s.tag)
                const cleaned = s.tag.replace(s.srcToken, '')
                if (cleaned !== s.tag && live.includes(s.tag))
                  ops.push({ op: 'str_replace', old: s.tag, new: cleaned, replace_all: true })
              }
              ops.push({
                op: 'str_replace',
                old: s.token,
                new: `src="${src}"`,
                replace_all: true,
              })
            }
            if (currentSignal?.aborted)
              return {
                output: 'stopped by the user; the images were not written into the page',
                summary: t('aiToolFillImages'),
              }
            if (stale())
              return {
                output: STALE_MESSAGE,
                isError: true,
                summary: t('aiToolFillImages'),
              }
            if (!ops.length)
              return {
                output:
                  'The image slots were edited or removed while the images were being made — nothing to fill. Re-check with get_outline.',
                summary: t('aiToolFillImages'),
              }
            const r = access.applyOps(ops, t('aiToolFillImages'))
            if (!r.ok)
              return {
                output: `Image fill failed to apply: ${r.errors.map((e) => e.message).join('; ')}`,
                isError: true,
                summary: t('aiToolFillImages'),
              }
            markSeen()
            const filled = done.size
            return {
              output: `Filled ${filled} of ${slots.length} image slot(s) with real imagery. Version ${access.getVersion()}.${
                filled < slots.length
                  ? ' The rest stayed placeholders — say which ones are missing.'
                  : ''
              }`,
              mutated: true,
              summary: t('aiToolFillImagesDone', { n: filled }),
            }
          })()
        }
        case 'plan_page': {
          const { planBrief, confirmBrief } = access
          if (!planBrief || !confirmBrief)
            return {
              output:
                'brief cards are not available here; describe the brief in your reply instead',
              isError: true,
              summary: t('aiToolPlan'),
            }
          const mode = planMode(call.input.mode, text)
          const spec: BriefPlanSpec = {
            mode,
            notes: str(call.input.notes),
            // the brief writer is the model: it reads the projection, not the source
            page:
              mode === 'restyle' || mode === 'extract'
                ? buildProjection(text, map).view.slice(0, PAGE_HEAD_CHARS)
                : undefined,
          }
          return planBrief(spec, currentSignal).then(async (drafted) => {
            if (!drafted.ok)
              return {
                output: `The brief writer produced nothing (${drafted.error}). Tell the user briefly and offer to try again.`,
                isError: true,
                summary: t('aiToolPlanFailed'),
              }
            const brief = coerceBrief(drafted.raw)
            if (typeof brief === 'string')
              return {
                output: `The brief writer returned an unusable brief (${brief}). Call plan_page again, with notes on what it must contain.`,
                isError: true,
                summary: t('aiToolPlanFailed'),
              }
            const context = contextText(drafted.raw.context)
            const decision = await confirmBrief(brief)
            if (decision.kind === 'cancelled')
              return {
                output:
                  'The user dismissed the brief without confirming. Ask what they would like to change, or stop.',
                summary: t('aiToolPlanRejected'),
              }
            if (decision.kind === 'redo')
              return {
                output: `The user asked for a different brief${decision.note ? `: ${decision.note}` : ''}. Proposed so far:\n${briefSummary(brief)}\nCall plan_page again with notes on what must change.`,
                summary: t('aiToolPlanRejected'),
              }
            const edited = decision.brief.user_edited?.length
              ? `\nFields the user edited (keep them exactly): ${decision.brief.user_edited.join(', ')}`
              : ''
            // the user may have typed while the card was open: judge the live document, not the pre-card snapshot
            if (mode === 'new' || mode === 'redesign') {
              if (access.getText().trim() && stale())
                return { output: STALE_MESSAGE, isError: true, summary: t('aiToolPlanRejected') }
              return landPage(
                {
                  kind: 'design',
                  brief: decision.brief,
                  instruction: access.getInstruction?.() ?? '',
                  context,
                },
                `Brief confirmed.${edited}`,
              )
            }
            if (stale())
              return { output: STALE_MESSAGE, isError: true, summary: t('aiToolPlanRejected') }
            const pinned = pinBrief(decision.brief)
            return {
              output: `Brief confirmed (${mode}).${edited}\n${briefSummary(decision.brief)}\n${
                pinned
                  ? 'The brief is now pinned in <head> (meta name="officevega:brief"). '
                  : 'The pinned brief was already current. '
              }${
                mode === 'restyle'
                  ? 'Now update the --brief-* variables and related CSS rules with apply_ops (str_replace inside <style>); keep the structure and text.'
                  : 'No page is generated in extract mode.'
              }`,
              mutated: pinned,
              summary: t('aiToolPlan', { n: decision.brief.sections.length }),
            }
          })
        }
        case 'write_document': {
          const plan = String(call.input.plan ?? '').trim()
          if (!plan)
            return {
              output: 'plan must be non-empty',
              isError: true,
              summary: t('aiToolWritePage'),
            }
          if (text.trim() && stale())
            return { output: STALE_MESSAGE, isError: true, summary: t('aiToolWritePage') }
          return landPage(
            {
              kind: 'content',
              title: str(call.input.title),
              plan,
              instruction: access.getInstruction?.() ?? '',
              context: str(call.input.context),
            },
            '',
          )
        }
        default:
          return { output: `Unknown tool: ${call.name}`, isError: true, summary: call.name }
      }
    },
  }
}

/** A live prompt is read on every request, so it can follow the document. */
export function createHtmlSkill(
  access: HtmlDocAccess,
  systemPrompt: string | { readonly systemPrompt: string },
): AgentSkill {
  const core = createHtmlSkillCore(access)
  return {
    id: 'html',
    get systemPrompt() {
      return typeof systemPrompt === 'string' ? systemPrompt : systemPrompt.systemPrompt
    },
    tools: AGENT_TOOLS,
    buildContext: () => core.buildContext(),
    executeTool: (call, signal) => core.executeTool(call, signal),
  }
}
