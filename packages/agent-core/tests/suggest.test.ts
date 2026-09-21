import { describe, expect, it } from 'vitest'
import type { AgentStreamCallbacks, AgentTransport } from '../src/types'
import { generateSuggestedQuestions, parseSuggestedQuestions } from '../src/suggest'

function fakeTransport(script: (cb: AgentStreamCallbacks) => void): AgentTransport {
  return {
    stream: (_req, cb) => {
      queueMicrotask(() => script(cb))
      return { cancel: () => undefined }
    },
  }
}

describe('parseSuggestedQuestions', () => {
  it('parses a bare JSON array and keeps the first 3', () => {
    expect(
      parseSuggestedQuestions('["Add a summary section","Make the tone formal","Shorten the intro","Fourth"]'),
    ).toEqual(['Add a summary section', 'Make the tone formal', 'Shorten the intro'])
  })

  it('parses a {"questions": [...]} object', () => {
    expect(
      parseSuggestedQuestions('{"questions": ["Undo the last change?", "Export to PDF?", "More?"]}'),
    ).toEqual(['Undo the last change?', 'Export to PDF?', 'More?'])
  })

  it('unwraps a fenced JSON block', () => {
    const raw = '```json\n["First?", "Second?", "Third?"]\n```'
    expect(parseSuggestedQuestions(raw)).toEqual(['First?', 'Second?', 'Third?'])
  })

  it('falls back to a numbered/bulleted line list', () => {
    const raw = '1. Extend the table\n- Restyle the header\n3) Translate to French'
    expect(parseSuggestedQuestions(raw)).toEqual([
      'Extend the table',
      'Restyle the header',
      'Translate to French',
    ])
  })

  it('strips surrounding quotes and drops duplicates', () => {
    const raw = '"Make it shorter?"\n"Make it shorter?"\n«Add a chart?»'
    expect(parseSuggestedQuestions(raw)).toEqual(['Make it shorter?', 'Add a chart?'])
  })

  it('skips empty lines, over-long items and non-strings', () => {
    const raw = JSON.stringify([
      '',
      'x'.repeat(200),
      42,
      'Fix the formula?',
      'Add a legend?',
      'Sort by date?',
    ])
    expect(parseSuggestedQuestions(raw)).toEqual([
      'Fix the formula?',
      'Add a legend?',
      'Sort by date?',
    ])
  })

  it('does not strip a leading digit that is part of the question', () => {
    expect(parseSuggestedQuestions('["3D charts possible?","A","B"]')).toEqual([
      '3D charts possible?',
      'A',
      'B',
    ])
  })

  it('returns [] for empty or unusable replies', () => {
    expect(parseSuggestedQuestions('')).toEqual([])
    expect(parseSuggestedQuestions('   ')).toEqual([])
    // a JSON blob with no usable questions must not surface as a chip
    expect(parseSuggestedQuestions('{"questions": "nope"}')).toEqual([])
    expect(parseSuggestedQuestions('{"questions": [1, 2]}')).toEqual([])
  })
})

describe('generateSuggestedQuestions', () => {
  it('streams a tool-less request and returns the parsed questions', async () => {
    let request: { system: string; tools: unknown[]; messages: unknown[] } | undefined
    const transport: AgentTransport = {
      stream: (req, cb) => {
        request = req
        queueMicrotask(() => {
          cb.onDelta('["Add a summary?","Make it formal?","Shorten it?"]')
          cb.onDone()
        })
        return { cancel: () => undefined }
      },
    }
    const questions = await generateSuggestedQuestions({
      transport,
      app: 'docs',
      user: 'rewrite the intro',
      assistant: 'Done — the intro now leads with the thesis.',
    })
    expect(questions).toEqual(['Add a summary?', 'Make it formal?', 'Shorten it?'])
    expect(request?.tools).toEqual([])
    expect(request?.system).toContain('document editor')
  })

  it('returns [] when the stream errors or stays empty', async () => {
    const failing = await generateSuggestedQuestions({
      transport: fakeTransport((cb) => cb.onError('nope')),
      app: 'pdf',
      user: 'u',
      assistant: 'a',
    })
    expect(failing).toEqual([])
    const empty = await generateSuggestedQuestions({
      transport: fakeTransport((cb) => cb.onDone()),
      app: 'pdf',
      user: 'u',
      assistant: 'a',
    })
    expect(empty).toEqual([])
  })

  it('parses whatever arrived when the reply was cut at the size cap', async () => {
    const questions = await generateSuggestedQuestions({
      transport: fakeTransport((cb) => {
        cb.onDelta('["One?","Two?","Three?"')
        cb.onStopReason?.('max_tokens')
        cb.onDone()
      }),
      app: 'sheets',
      user: 'u',
      assistant: 'a',
    })
    expect(questions).toEqual(['One?', 'Two?', 'Three?'])
  })
})
