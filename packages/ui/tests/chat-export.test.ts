import { describe, expect, it } from 'vitest'
import {
  chatExportTitle,
  chatTranscriptToMarkdown,
  suggestChatExportName,
} from '../src/chat-export'

const META = {
  title: 'report.docx',
  userLabel: 'You',
  assistantLabel: 'VEGA',
  date: new Date(2026, 8, 30), // 2026-09-30 local
}

describe('chatTranscriptToMarkdown', () => {
  it('serializes turns as role-headed markdown sections', () => {
    const md = chatTranscriptToMarkdown(
      [
        { role: 'user', text: 'Summarize chapter 2' },
        { role: 'assistant', text: 'Chapter 2 covers **budget** planning.' },
        { role: 'user', text: 'Make it shorter' },
      ],
      META,
    )
    expect(md).toBe(
      [
        '# report.docx — 2026-09-30',
        '',
        '## You',
        '',
        'Summarize chapter 2',
        '',
        '## VEGA',
        '',
        'Chapter 2 covers **budget** planning.',
        '',
        '## You',
        '',
        'Make it shorter',
        '',
      ].join('\n'),
    )
  })

  it('keeps assistant markdown verbatim (lists, code fences, links)', () => {
    const reply = 'Steps:\n\n1. one\n2. two\n\n```ts\nconst a = 1\n```\n\n[doc](docnav://3)'
    const md = chatTranscriptToMarkdown([{ role: 'assistant', text: reply }], META)
    expect(md).toContain(reply)
    expect(md.endsWith('\n')).toBe(true)
  })

  it('skips empty/whitespace-only turns', () => {
    const md = chatTranscriptToMarkdown(
      [
        { role: 'user', text: '   ' },
        { role: 'assistant', text: 'ok' },
      ],
      META,
    )
    expect(md).not.toContain('## You')
    expect(md).toContain('## VEGA')
  })

  it('returns a title-only document for an empty transcript', () => {
    const md = chatTranscriptToMarkdown([], META)
    expect(md).toBe('# report.docx — 2026-09-30\n')
  })
})

describe('chatExportTitle', () => {
  it('defaults to today', () => {
    const { date: _omit, ...meta } = META
    expect(chatExportTitle(meta)).toMatch(/^report\.docx — \d{4}-\d{2}-\d{2}$/)
  })
})

describe('suggestChatExportName', () => {
  it('builds a dated .md name', () => {
    expect(suggestChatExportName('report.docx', new Date(2026, 8, 30))).toBe(
      'ai-chat-report.docx-2026-09-30.md',
    )
  })
  it('sanitizes path-hostile characters', () => {
    expect(suggestChatExportName('a/b\\c:d*.docx', new Date(2026, 8, 30))).toBe(
      'ai-chat-a-b-c-d-.docx-2026-09-30.md',
    )
  })
  it('falls back to a generic base', () => {
    expect(suggestChatExportName('   ', new Date(2026, 8, 30))).toBe(
      'ai-chat-chat-2026-09-30.md',
    )
  })
})
