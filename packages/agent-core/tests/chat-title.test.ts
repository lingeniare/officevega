import { describe, expect, it } from 'vitest'
import type { AgentStreamCallbacks, AgentTransport } from '../src/types'
import { fallbackChatTitle, generateChatTitle, parseChatTitle } from '../src/chat-title'

function fakeTransport(script: (cb: AgentStreamCallbacks) => void): AgentTransport {
  return {
    stream: (_req, cb) => {
      queueMicrotask(() => script(cb))
      return { cancel: () => undefined }
    },
  }
}

describe('parseChatTitle', () => {
  it('cleans a plain line', () => {
    expect(parseChatTitle('Rewrite the quarterly report intro')).toBe(
      'Rewrite the quarterly report intro',
    )
  })

  it('strips quotes, bullets and trailing punctuation', () => {
    expect(parseChatTitle('"Make the table formal."')).toBe('Make the table formal')
    expect(parseChatTitle('- Fix the formula?')).toBe('Fix the formula')
  })

  it('unwraps a JSON string or array', () => {
    expect(parseChatTitle('"Budget summary draft"')).toBe('Budget summary draft')
    expect(parseChatTitle('["Pivot chart help", "other"]')).toBe('Pivot chart help')
  })

  it('truncates over-long titles and returns empty for garbage', () => {
    expect(parseChatTitle(`x${'y'.repeat(200)}`).length).toBeLessThanOrEqual(60)
    expect(parseChatTitle('')).toBe('')
    expect(parseChatTitle('   ')).toBe('')
  })
})

describe('generateChatTitle', () => {
  it('streams a tool-less request and returns the parsed title', async () => {
    let request: { system: string; tools: unknown[] } | undefined
    const transport: AgentTransport = {
      stream: (req, cb) => {
        request = req
        queueMicrotask(() => {
          cb.onDelta('Quarterly report intro')
          cb.onDone()
        })
        return { cancel: () => undefined }
      },
    }
    const title = await generateChatTitle({
      transport,
      user: 'rewrite the intro',
      assistant: 'Done — the intro now leads with the thesis.',
    })
    expect(title).toBe('Quarterly report intro')
    expect(request?.tools).toEqual([])
    expect(request?.system).toContain('chat-history title')
  })

  it('returns empty when the stream errors or stays empty', async () => {
    const failing = await generateChatTitle({
      transport: fakeTransport((cb) => cb.onError('nope')),
      user: 'u',
      assistant: 'a',
    })
    expect(failing).toBe('')
    const empty = await generateChatTitle({
      transport: fakeTransport((cb) => cb.onDone()),
      user: 'u',
      assistant: 'a',
    })
    expect(empty).toBe('')
  })
})

describe('fallbackChatTitle', () => {
  it('takes the first line of the user message', () => {
    expect(fallbackChatTitle('Fix the budget table\nsecond line here')).toBe('Fix the budget table')
    expect(fallbackChatTitle('   ')).toBe('Новый чат')
  })
})
