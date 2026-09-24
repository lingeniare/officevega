import { streamText } from './stream-text'
import type { AgentTransport } from './types'

/** Which app's AI panel is asking — picks the domain nouns the prompt writes questions about */
export type SuggestAppKind = 'docs' | 'sheets' | 'slides' | 'markdown' | 'html' | 'pdf'

const APP_CONTEXT: Record<SuggestAppKind, string> = {
  docs: 'a Word-style document editor — the assistant rewrites, extends and formats the document',
  sheets:
    'an Excel-style spreadsheet editor — the assistant edits cells, formulas, charts and formatting',
  slides:
    'a PowerPoint-style slide editor — the assistant generates and edits slides, layouts and images',
  markdown: 'a Markdown editor — the assistant writes and restructures markdown content',
  html: 'an HTML page editor — the assistant builds and restyles HTML pages',
  pdf: 'a PDF editor — the assistant answers questions about the document, summarizes and edits it',
}

/** the suggestion reply is tiny — a rambling model gets cut off and its partial output still parses */
const SUGGEST_MAX_CHARS = 1200
/** each side of the exchange is truncated so a huge reply cannot blow up the helper call */
const CONTEXT_MAX_CHARS = 4000
/** over-long lines are not the short chips the UI is built for */
const QUESTION_MAX_CHARS = 120

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`

/**
 * Best-effort parse of the model reply into ≤3 clean question strings.
 * Accepts a bare JSON array, {"questions": [...]}, or a plain line list
 * (numbered/bulleted lines are unwrapped). Returns [] when nothing usable came back.
 */
export function parseSuggestedQuestions(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  let candidates: unknown[] = []
  const jsonish = text.match(/\[[\s\S]*\]/) ?? text.match(/\{[\s\S]*\}/)
  if (jsonish) {
    try {
      const parsed: unknown = JSON.parse(jsonish[0])
      if (Array.isArray(parsed)) candidates = parsed
      else if (
        parsed !== null &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { questions?: unknown }).questions)
      ) {
        candidates = (parsed as { questions: unknown[] }).questions
      }
    } catch {
      // not JSON after all — fall through to the line split
    }
  }
  if (candidates.length === 0 && text.startsWith('[')) {
    // a truncated array (cut mid-stream or missing the closing bracket): salvage
    // whatever complete "…" string literals it managed to write
    candidates = [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => {
      try {
        return JSON.parse(`"${m[1]}"`) as unknown
      } catch {
        return m[1]
      }
    })
  }
  if (candidates.length === 0) {
    candidates = text
      .split('\n')
      .map((line) => line.trim())
      // drop raw JSON fragments — a broken {"questions": …} blob must not become a chip
      .filter((line) => line !== '' && !/^[{[].*[}\]]?$/.test(line) && !/^[}\]]/.test(line))
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const q = candidate
      .trim()
      // list markers: "- ", "• ", "1. ", "2) " — but never a leading digit that is part of the question
      .replace(/^(?:[-*•]|\d+[.)])\s+/, '')
      .replace(/^["'«»„“”‘’`]+|["'«»„“”‘’`]+$/g, '')
      .trim()
    if (!q || q.length > QUESTION_MAX_CHARS) continue
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
    if (out.length === 3) break
  }
  return out
}

export interface SuggestQuestionsInput {
  /** IPC transport whose getSettings already resolves the fast model (see withFastModel) */
  transport: AgentTransport
  app: SuggestAppKind
  /** the user instruction that produced the reply */
  user: string
  /** the assistant reply the suggestions follow up on */
  assistant: string
  /** the app's aiLangDirective() — keeps suggestions in the user's language */
  langDirective?: string
  signal?: AbortSignal
}

/**
 * One cheap tool-less model call producing up to 3 short follow-up questions for
 * the just-finished exchange. Never throws and never touches chat state — a
 * failed or empty call simply means no suggestions this turn.
 */
export async function generateSuggestedQuestions(
  input: SuggestQuestionsInput,
): Promise<string[]> {
  const system =
    `You write follow-up suggestions shown inside ${APP_CONTEXT[input.app]}.\n\n` +
    `Given the user's request and the assistant's reply, write exactly 3 short questions ` +
    `the user is most likely to send next.\n\n` +
    `Rules:\n` +
    `- 3 to 10 words each, phrased as the user talking to the assistant\n` +
    `- concrete next steps about the same content — editing, extending, restyling or checking what was just done\n` +
    `- name the specific topics from the reply; never bare "it", "that" or "this"\n` +
    `- all three different from each other\n` +
    `- answer with a JSON array of 3 strings and nothing else, e.g. ["…","…","…"]` +
    (input.langDirective ?? '')
  const user =
    `User request:\n${truncate(input.user, CONTEXT_MAX_CHARS)}\n\n` +
    `Assistant reply:\n${truncate(input.assistant, CONTEXT_MAX_CHARS)}`
  const outcome = await streamText({
    transport: input.transport,
    system,
    user,
    ...(input.signal ? { signal: input.signal } : {}),
    maxChars: SUGGEST_MAX_CHARS,
    extract: (raw) => ({ text: raw }),
  })
  if (outcome.status === 'empty') return []
  return parseSuggestedQuestions(outcome.text)
}
