import { streamText } from './stream-text'
import type { AgentTransport } from './types'

/** a title reply is one short line — a rambling model gets cut off and the partial still parses */
const TITLE_MAX_CHARS = 300
/** each side of the exchange is truncated so a huge reply cannot blow up the helper call */
const CONTEXT_MAX_CHARS = 2000
/** titles longer than this are cut in the history list */
export const CHAT_TITLE_MAX_CHARS = 60

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`

/**
 * Best-effort parse of the model reply into one clean title string.
 * Accepts a bare line, a quoted line, or a JSON string/array (takes the
 * first usable item). Returns '' when nothing usable came back — the caller
 * then falls back to the first user message.
 */
export function parseChatTitle(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  const firstLine = text.split('\n')[0]!.trim()
  // JSON string or single-item array: unwrap
  if (firstLine.startsWith('"') || firstLine.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(firstLine)
      if (typeof parsed === 'string') return cleanTitle(parsed)
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return cleanTitle(parsed[0])
    } catch {
      // not JSON after all — fall through to plain cleanup
    }
  }
  return cleanTitle(firstLine)
}

function cleanTitle(candidate: string): string {
  const q = candidate
    .trim()
    .replace(/^(?:[-*•]|\d+[.)])\s+/, '')
    .replace(/^["'«»„“”‘’`]+|["'«»„“”‘’`.,;:!?]+$/g, '')
    .trim()
  if (!q) return ''
  return q.length <= CHAT_TITLE_MAX_CHARS ? q : `${q.slice(0, CHAT_TITLE_MAX_CHARS - 1).trimEnd()}…`
}

export interface GenerateChatTitleInput {
  /** IPC transport whose getSettings already resolves the fast model (see withFastModel) */
  transport: AgentTransport
  /** the first user message of the chat */
  user: string
  /** the first assistant reply of the chat */
  assistant: string
  /** the app's aiLangDirective() — keeps the title in the user's language */
  langDirective?: string
  signal?: AbortSignal
}

/**
 * One cheap tool-less model call producing a short chat-history title for
 * the just-started exchange. Never throws — a failed or empty call returns
 * '' and the caller falls back to the first user message.
 */
export async function generateChatTitle(input: GenerateChatTitleInput): Promise<string> {
  const system =
    `You write a short chat-history title for a conversation inside a document editor.\n\n` +
    `Given the user's first request and the assistant's first reply, write exactly one title.\n\n` +
    `Rules:\n` +
    `- at most 6 words, naming the concrete topic or task — never bare "it", "that" or "this"\n` +
    `- plain text, no quotes, no punctuation at the end, no emoji\n` +
    `- answer with the title only, nothing else` +
    (input.langDirective ?? '')
  const user =
    `User request:\n${truncate(input.user, CONTEXT_MAX_CHARS)}\n\n` +
    `Assistant reply:\n${truncate(input.assistant, CONTEXT_MAX_CHARS)}`
  const outcome = await streamText({
    transport: input.transport,
    system,
    user,
    ...(input.signal ? { signal: input.signal } : {}),
    maxChars: TITLE_MAX_CHARS,
    extract: (raw) => ({ text: raw }),
  })
  if (outcome.status === 'empty') return ''
  return parseChatTitle(outcome.text)
}

/** Fallback title when the fast model is unavailable: first line of the user message. */
export function fallbackChatTitle(user: string): string {
  const line = user.trim().split('\n')[0] ?? ''
  return cleanTitle(line) || 'Новый чат'
}
