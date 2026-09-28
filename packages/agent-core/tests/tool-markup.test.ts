import { describe, expect, it } from 'vitest'
import { createToolCallMarkupStripper } from '../src/tool-markup'

/** feed every delta, return all emitted text plus the flush tail */
const run = (deltas: string[]): string => {
  const stripper = createToolCallMarkupStripper()
  return deltas.map((d) => stripper.feed(d)).join('') + stripper.flush()
}

describe('createToolCallMarkupStripper', () => {
  it('passes plain text through unchanged', () => {
    expect(run(['Hello', ', world'])).toBe('Hello, world')
  })

  it('strips a complete <tool_call> block inline', () => {
    expect(run(['Sure!<tool_call>{"name":"x"}</tool_call>Done.'])).toBe('Sure!Done.')
  })

  it('strips markup whose tags are split across deltas', () => {
    expect(run(['a<tool_', 'call>{"a"', ':1}</tool', '_call>b'])).toBe('ab')
  })

  it('emits nothing while a markup block is streaming its payload', () => {
    const s = createToolCallMarkupStripper()
    expect(s.feed('<tool_call>')).toBe('')
    expect(s.feed('{"a":1}')).toBe('')
    expect(s.feed('</tool_call>')).toBe('')
    expect(s.feed('visible')).toBe('visible')
  })

  it('drops an unclosed markup block on flush', () => {
    expect(run(['ok <tool_call>{"a":1'])).toBe('ok ')
  })

  it('drops an orphan close tag', () => {
    expect(run(['a</tool_call>b'])).toBe('ab')
  })

  it('strips a <function_call> block', () => {
    expect(run(['x<function_call name="f">{"a":1}</function_call>y'])).toBe('xy')
  })

  it('keeps a "<" that proves to be ordinary text', () => {
    expect(run(['a < b', ' and < c'])).toBe('a < b and < c')
  })

  it('does not strip a different tag that only prefixes the name', () => {
    expect(run(['keep <tool_calls>x</tool_calls> me'])).toBe(
      'keep <tool_calls>x</tool_calls> me',
    )
  })

  it('holds a partial tag prefix until it resolves, then strips the whole tag', () => {
    const s = createToolCallMarkupStripper()
    expect(s.feed('a<too')).toBe('a')
    expect(s.feed('l_call>x</tool_call>b')).toBe('b')
  })

  it('handles markup carrying a long payload without re-emitting it', () => {
    const payload = 'x'.repeat(500)
    expect(run(['<tool_call>', payload, 'more', '</tool_call>tail'])).toBe('tail')
  })
})
