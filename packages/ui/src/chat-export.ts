/**
 * Export an AI chat transcript to a standalone Markdown document (#1974).
 * Every app's panel keeps a `{ role, text }[]` history — this is the single
 * serializer they all share so the file layout is identical suite-wide.
 */

export interface ChatExportEntry {
  role: 'user' | 'assistant'
  text: string
}

export interface ChatExportMeta {
  /** document/chat title for the heading, e.g. the file name or the KB panel title */
  title: string
  /** localized "You" */
  userLabel: string
  /** assistant name as shown in the UI ("VEGA") */
  assistantLabel: string
  /** ISO date shown next to the title (defaults to today, local) */
  date?: Date
}

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** '# AI conversation — report.docx — 2026-09-30' */
export function chatExportTitle(meta: ChatExportMeta): string {
  return `${meta.title} — ${isoDay(meta.date ?? new Date())}`
}

export function chatTranscriptToMarkdown(
  entries: readonly ChatExportEntry[],
  meta: ChatExportMeta,
): string {
  const parts: string[] = [`# ${chatExportTitle(meta)}`]
  for (const e of entries) {
    const text = e.text.trim()
    if (!text) continue
    parts.push(`## ${e.role === 'user' ? meta.userLabel : meta.assistantLabel}`, text)
  }
  return `${parts.join('\n\n')}\n`
}

/** suggested export file name: `ai-chat-report.docx-2026-09-30.md` (sanitized) */
export function suggestChatExportName(sourceName: string, date = new Date()): string {
  const base = sourceName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'chat'
  return `ai-chat-${base}-${isoDay(date)}.md`
}
