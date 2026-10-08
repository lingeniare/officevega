import { describe, expect, it, vi } from 'vitest'
import {
  PII_SHIELD_NOTE,
  PII_TOKEN_PATTERN,
  unresolvedPiiToken,
  withPiiTokenGuard,
} from '../src/pii-token-guard'
import type { AgentSkill } from '../src/skill'
import type { ToolExecution } from '../src/types'

const baseSkill = (): AgentSkill => ({
  id: 'test',
  systemPrompt: 'base prompt',
  tools: [{ name: 'edit_doc', description: 'd', inputSchema: { type: 'object' } }],
  buildContext: () => 'ctx',
  executeTool: vi.fn((call): ToolExecution => ({
    output: `ran ${call.name}`,
    mutated: true,
    summary: 'sum',
  })),
  verifyResponse: () => null,
})

describe('unresolvedPiiToken', () => {
  it('finds a token anywhere inside the input', () => {
    expect(unresolvedPiiToken({ find: '#PERSON_1#', replace: 'x' })).toBe('#PERSON_1#')
    expect(unresolvedPiiToken({ ops: [{ html: '<p>Адрес: #ADDRESS_3#</p>' }] })).toBe('#ADDRESS_3#')
    expect(unresolvedPiiToken({ a: { b: ['#SNILS_2#'] } })).toBe('#SNILS_2#')
  })

  it('returns null for clean input and non-string shapes', () => {
    expect(unresolvedPiiToken({ find: 'Иванов', replace: 'x' })).toBeNull()
    expect(unresolvedPiiToken({ n: 5, list: [null, { s: 'plain #text#' }] })).toBeNull()
    expect(unresolvedPiiToken(undefined)).toBeNull()
  })

  it('matches only the #TYPE_N# shape', () => {
    expect(PII_TOKEN_PATTERN.test('#PERSON_10#')).toBe(true)
    expect(PII_TOKEN_PATTERN.test('#PHONE_NUMBER_2#')).toBe(true)
    expect(PII_TOKEN_PATTERN.test('#nope#')).toBe(false)
    expect(PII_TOKEN_PATTERN.test('heading_1')).toBe(false)
  })
})

describe('withPiiTokenGuard', () => {
  it('appends the note to the prompt and rejects unresolved tokens while active', () => {
    const skill = baseSkill()
    const wrapped = withPiiTokenGuard(skill, () => true)

    expect(wrapped.systemPrompt).toBe('base prompt' + PII_SHIELD_NOTE)

    const rejected = wrapped.executeTool({
      id: 'c1',
      name: 'edit_doc',
      input: { ops: [{ find: '#PERSON_1#', replace: 'Иванов' }] },
    }) as ToolExecution
    expect(rejected.isError).toBe(true)
    expect(rejected.mutated).toBe(false)
    expect(rejected.output).toContain('#PERSON_1#')
    expect(skill.executeTool).not.toHaveBeenCalled()
  })

  it('passes through untouched while inactive', () => {
    const skill = baseSkill()
    const wrapped = withPiiTokenGuard(skill, () => false)

    expect(wrapped.systemPrompt).toBe('base prompt')
    const result = wrapped.executeTool({
      id: 'c1',
      name: 'edit_doc',
      input: { find: '#PERSON_1#' },
    }) as ToolExecution
    expect(result.output).toBe('ran edit_doc')
    expect(skill.executeTool).toHaveBeenCalledOnce()
  })

  it('lets resolved arguments through while active and confirms the write once', () => {
    const skill = baseSkill()
    const wrapped = withPiiTokenGuard(skill, () => true)
    const result = wrapped.executeTool({
      id: 'c1',
      name: 'edit_doc',
      input: { find: 'Иванов Иван Иванович', replace: 'Петров П.П.' },
    }) as ToolExecution
    expect(result.mutated).toBe(true)
    expect(result.output).toContain('privacy mask')
    expect(skill.executeTool).toHaveBeenCalledOnce()
  })

  it('rejects the third identical successful call as a masking loop', () => {
    const skill = baseSkill()
    const wrapped = withPiiTokenGuard(skill, () => true)
    const call = { id: 'c1', name: 'edit_doc', input: { text: 'same' } }
    const r1 = wrapped.executeTool(call) as ToolExecution
    const r2 = wrapped.executeTool(call) as ToolExecution
    const r3 = wrapped.executeTool(call) as ToolExecution
    expect(r1.isError).toBeUndefined()
    expect(r2.isError).toBeUndefined()
    expect(r3.isError).toBe(true)
    expect(r3.output).toContain('privacy mask')
    expect(skill.executeTool).toHaveBeenCalledTimes(2)
  })

  it('does not count an identical call whose previous run failed', () => {
    const skill = baseSkill()
    let fail = true
    skill.executeTool = vi.fn(() =>
      fail
        ? { output: 'boom', isError: true, mutated: false, summary: 's' }
        : { output: 'ok', mutated: true, summary: 's' },
    )
    const wrapped = withPiiTokenGuard(skill, () => true)
    const call = { id: 'c1', name: 'edit_doc', input: { text: 'same' } }
    const r1 = wrapped.executeTool(call) as ToolExecution
    fail = false
    const r2 = wrapped.executeTool(call) as ToolExecution
    const r3 = wrapped.executeTool(call) as ToolExecution
    expect(r1.isError).toBe(true)
    expect(r2.mutated).toBe(true)
    expect(r3.mutated).toBe(true) // only the second success counts toward the cap
    expect(skill.executeTool).toHaveBeenCalledTimes(3)
  })

  it('keeps the wrapped skill live: prompt, tools, context and verifyResponse delegate', () => {
    const skill = baseSkill()
    let active = false
    const wrapped = withPiiTokenGuard(skill, () => active)

    expect(wrapped.id).toBe('test')
    expect(wrapped.buildContext?.()).toBe('ctx')
    expect(wrapped.tools).toHaveLength(1)
    expect(wrapped.verifyResponse?.('text', [])).toBeNull()

    expect(wrapped.systemPrompt).toBe('base prompt')
    active = true
    expect(wrapped.systemPrompt).toContain('# Privacy masking')
  })
})
