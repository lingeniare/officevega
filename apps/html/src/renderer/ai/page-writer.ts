import {
  HUMANIZER_RULES,
  HUMANIZER_RULES_BRIEF,
  streamText,
  type AgentTransport,
} from '@genoffice/agent-core'
import type { Brief } from '../document/brief'

/**
 * Whole-page generation runs as its own tool-less request whose reply body IS
 * the HTML. Text deltas stream immediately, so the preview fills in as the model
 * writes and no gateway sees a silent connection. (Tool arguments are buffered
 * server-side until the JSON is complete; a page-sized argument exceeded the
 * Genspark gateway's idle cutoff and arrived as an empty stream.)
 */
export const PAGE_MAX_CHARS = 200_000
/**
 * Minimum output budget requested for a whole-page generation. A 200K-char
 * page is ~50–65K tokens, so the 32K settings default guarantees a truncated
 * page and the keep/discard card on long designs — code-generation floors in
 * chat products use 64K for the same reason. Providers with a lower ceiling
 * reject the value and the output-cap fallback retries there.
 */
export const PAGE_OUTPUT_TOKEN_FLOOR = 64_000
const CONTEXT_CAP = 8000

export type PageWriteSpec =
  | { kind: 'design'; brief: Brief; instruction: string; context?: string }
  | { kind: 'content'; title?: string; plan: string; instruction: string; context?: string }

export interface PageWriteResult {
  ok: boolean
  /** the page to land (complete, or the adopted partial) */
  html?: string
  /** the stream ended before </html>: transport drop, stop, or output cap */
  truncated?: boolean
  error?: string
}

const OUTPUT_CONTRACT = [
  '## Output',
  'Reply with the HTML document only: start at <!doctype html> and end at </html>. No markdown fences, no commentary before or after, no placeholders.',
  'Include <html lang>, <head> with <meta charset="utf-8">, <meta name="viewport">, <title>, and exactly one <style> block; then a semantic body.',
  'Do not add external scripts or CDNs. A real <img> needs a URL given below or already in the document — never invent one. Where the design wants real imagery (the brief\'s image_queries and any other photo/illustration slot), emit <img class="img-slot" data-img="a concise English generation prompt" alt="…"> with NO src; the app fills these with generated or searched images after the page lands. Give .img-slot a rule in <style>: display block, var(--brief-surface) background, the shot\'s aspect-ratio, object-fit: cover, a subtle shimmer animation. No double quotes inside a data-img value. Every other visual stays typographic: color blocks and inline <svg>.',
  'Responsive by construction: CSS grid/flex with min() / clamp() widths, no fixed pixel page width, images with width/height and max-width: 100%.',
].join('\n')

const DESIGN_SYSTEM = [
  'You are the page writer of OfficeVega HTML, a design-first editor for single-file HTML pages. You receive a confirmed brief (core hook, style direction, section list) and write the complete page.',
  '',
  '## Design rules',
  '- Design the page, do not typeset a document: a clear hero, deliberate typographic hierarchy (display heading, generous measure, restrained sizes), one accent system, consistent radius/spacing/shadow tokens, and whitespace that groups content.',
  '- :root defines --brief-primary, --brief-accent, --brief-bg, --brief-surface, --brief-text, --brief-font-heading, --brief-font-body, --brief-radius, --brief-space, --brief-shadow from the brief. Every color, font, radius, spacing and shadow references one of them; never hardcode a second palette or a third font.',
  '- Backgrounds follow the mood: dark, saturated or textured pages are legitimate when the tone calls for them. Text must contrast with its background.',
  '- One root element per section carrying data-section="<type>", built in that section\'s layout variant (hero_split, hero_typographic, hero_image_overlay, feature_grid, stats_row, big_number, two_column, comparison_table, timeline, steps, quote_band, gallery, faq, cta_band, prose). Adjacent sections must not repeat the same pattern. Cards are surfaces (--brief-surface, --brief-radius, --brief-shadow), not bordered boxes.',
  '- Real data only: charts as inline <svg> with width/height, tables as real <table>. Never invent facts or numbers beyond the brief and the reference material; attribute sources when they are given.',
  '- Never crop away part of a user-supplied image (logo, screenshot, product shot, chart): size its container to the image (height auto, aspect-ratio) or use object-fit: contain. Reserve object-fit: cover and fixed-height overflow-hidden frames for decorative photos where losing the edges is acceptable.',
  '- Fields the user edited on the brief are kept exactly.',
  '',
  '## Voice on the page',
  HUMANIZER_RULES_BRIEF,
  '',
  '## Interaction & code quality',
  '- Interactive elements are real elements: <a> for navigation, <button> for actions — never a clickable <div> or <span>. They are keyboard-reachable, show a visible :focus-visible style, and icon-only controls get an aria-label.',
  '- Motion is cheap and optional: transform/opacity transitions and keyframes only, no layout-animating effects or heavy blurs; wrap animations in @media (prefers-reduced-motion: no-preference).',
  '- Forms label every control (<label> or aria-label); tap targets stay at least 40px.',
  '- The page stays fast as one file: inline <svg> for icons and charts, scroll-triggered reveals via IntersectionObserver rather than scroll handlers, and exactly one version of every section — no alternative takes or duplicated blocks.',
  '',
  '## Word-export friendly HTML (only when the brief has docx_friendly=true)',
  '- Linear block flow with semantic tags; side-by-side content as a table with <colgroup> percentages. Avoid position: absolute/fixed, transforms and vw/vh for structure. Page breaks via break-before: page; break-inside: avoid on cards, figures and table rows.',
  '',
  OUTPUT_CONTRACT,
].join('\n')

const CONTENT_SYSTEM = [
  'You are the document writer of OfficeVega HTML. The user wants written content first, not a designed page.',
  '',
  '## Writing rules',
  '- Write the requested text in full as a clean, readable single-column document: semantic <h1>/<h2>, paragraphs, lists and tables as the content needs.',
  '- Restrained typography: system font stack, ~680px measure, generous line height, no hero sections, cards or marketing layout.',
  '- Put the substance in the prose; the page is the document, not a showcase for it. Never invent facts beyond the request and the reference material.',
  '',
  HUMANIZER_RULES,
  '',
  OUTPUT_CONTRACT,
].join('\n')

export function buildPageWriterRequest(
  spec: PageWriteSpec,
  langDirective: string,
): { system: string; user: string } {
  const context = spec.context?.trim()
    ? `\n\n## Reference material (all names, figures and facts come from here)\n${spec.context.slice(0, CONTEXT_CAP)}`
    : ''
  const instruction = `\n\n## The user's request\n${spec.instruction.slice(0, 2000)}`
  if (spec.kind === 'design') {
    const { alternatives: _alternatives, ...brief } = spec.brief
    return {
      system: DESIGN_SYSTEM + langDirective,
      user: `## Confirmed brief\n${JSON.stringify(brief, null, 1)}${context}${instruction}\n\nWrite the page now.`,
    }
  }
  return {
    system: CONTENT_SYSTEM + langDirective,
    user: `## Plan\n${spec.title ? `Title: ${spec.title}\n` : ''}${spec.plan.slice(0, 4000)}${context}${instruction}\n\nWrite the document now.`,
  }
}

const DOC_START = /<!doctype\s|<html[\s>]/i

/** Strip chatter and fences around the document; anything after </html> is dropped. */
export function extractPageHtml(raw: string): { html: string; complete: boolean } {
  let text = raw.replace(/\r\n/g, '\n')
  const start = text.search(DOC_START)
  if (start > 0) text = text.slice(start)
  else if (start < 0) text = text.replace(/^\s*```[a-z]*\n?/i, '')
  const end = text.toLowerCase().lastIndexOf('</html>')
  if (end >= 0) return { html: text.slice(0, end + '</html>'.length).trim(), complete: true }
  return { html: text.replace(/\n?```\s*$/, '').trimEnd(), complete: false }
}

export interface StreamPageOptions {
  transport: AgentTransport
  system: string
  user: string
  signal?: AbortSignal
  /** output-token cap override; callers pass at least PAGE_OUTPUT_TOKEN_FLOOR for whole pages */
  maxTokens?: number
  /** cumulative extracted HTML, throttled by the caller */
  onProgress?(html: string): void
}

export type StreamPageOutcome =
  | { status: 'complete'; html: string }
  | { status: 'partial'; html: string; reason: 'error' | 'stopped' | 'max_tokens'; error?: string }
  | { status: 'empty'; error: string }

/** One tool-less streaming request; resolves with what arrived, never throws. */
export async function streamPage(opts: StreamPageOptions): Promise<StreamPageOutcome> {
  const outcome = await streamText({
    transport: opts.transport,
    system: opts.system,
    user: opts.user,
    signal: opts.signal,
    maxChars: PAGE_MAX_CHARS,
    ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
    extract: (raw) => {
      const { html, complete } = extractPageHtml(raw)
      return { text: html, complete }
    },
    onProgress: opts.onProgress,
  })
  if (outcome.status === 'empty') return outcome
  const { text, ...rest } = outcome
  return { ...rest, html: text }
}
