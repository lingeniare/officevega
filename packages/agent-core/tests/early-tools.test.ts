import { describe, expect, it, vi } from 'vitest'
import {
  AgentLoop,
  type AgentMessage,
  type AgentSkill,
  type AgentStreamCallbacks,
  type AgentToolCall,
  type AgentTransport,
  type ToolExecution,
} from '../src'

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

interface RecordedCall {
  request: { system: string; messages: AgentMessage[]; tools: unknown[] }
  callbacks: AgentStreamCallbacks
}

function recordingTransport(): AgentTransport & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  return {
    calls,
    stream(request, callbacks) {
      calls.push({ request, callbacks })
      return { cancel: () => queueMicrotask(() => callbacks.onDone()) }
    },
  }
}

function skillWith(
  tools: Array<{ name: string; readonly?: boolean }>,
  executeTool: (call: AgentToolCall) => ToolExecution | Promise<ToolExecution>,
): AgentSkill {
  return {
    id: 'test',
    systemPrompt: 'system',
    tools: tools.map((t) => ({
      name: t.name,
      description: 'd',
      inputSchema: { type: 'object' },
      ...(t.readonly ? { readonly: true } : {}),
    })),
    executeTool,
  }
}

describe('early read-only tool execution', () => {
  it('starts a read-only tool while the model stream is still open', async () => {
    const transport = recordingTransport()
    const started: string[] = []
    const loop = new AgentLoop({
      transport,
      skill: skillWith(
        [{ name: 'peek', readonly: true }, { name: 'poke' }],
        (call) => {
          started.push(call.name)
          return { output: `out:${call.name}`, summary: call.name }
        },
      ),
    })
    loop.run('go')
    await flush()
    const cb = transport.calls[0]!.callbacks
    // the read-only call's arguments complete while the turn is still streaming
    cb.onToolCall({ id: 'a', name: 'peek', input: {} })
    await flush()
    expect(started).toEqual(['peek'])
    // a mutating call emitted afterwards neither early-starts nor blocks the read
    cb.onToolCall({ id: 'b', name: 'poke', input: {} })
    await flush()
    expect(started).toEqual(['peek']) // mutating calls wait for the turn to finish
    cb.onDone()
    await flush()
    expect(started).toEqual(['peek', 'poke'])
    const toolMsg = loop.messages.find((m) => m.role === 'tool')
    expect(toolMsg && 'results' in toolMsg ? toolMsg.results.map((r) => r.output) : []).toEqual([
      'out:peek',
      'out:poke',
    ])
  })

  it('does not early-start reads that follow a mutating call in the same turn', async () => {
    const transport = recordingTransport()
    const started: string[] = []
    const loop = new AgentLoop({
      transport,
      skill: skillWith(
        [{ name: 'poke' }, { name: 'peek', readonly: true }],
        (call) => {
          started.push(call.name)
          return { output: `out:${call.name}`, summary: call.name }
        },
      ),
    })
    loop.run('go')
    await flush()
    const cb = transport.calls[0]!.callbacks
    cb.onToolCall({ id: 'm', name: 'poke', input: {} })
    cb.onToolCall({ id: 'r', name: 'peek', input: {} })
    await flush()
    expect(started).toEqual([]) // the read must run after the mutation, in order
    cb.onDone()
    await flush()
    expect(started).toEqual(['poke', 'peek'])
  })

  it('runs consecutive read-only calls as one concurrent wave, results in call order', async () => {
    const transport = recordingTransport()
    const started: string[] = []
    const resolvers = new Map<string, (e: ToolExecution) => void>()
    const loop = new AgentLoop({
      transport,
      skill: skillWith(
        [
          { name: 'mutate' },
          { name: 'readA', readonly: true },
          { name: 'readB', readonly: true },
        ],
        (call) => {
          started.push(call.name)
          if (call.name === 'mutate') return { output: 'done', summary: 'm', mutated: true }
          return new Promise<ToolExecution>((resolve) => resolvers.set(call.id, resolve))
        },
      ),
    })
    loop.run('go')
    await flush()
    const cb = transport.calls[0]!.callbacks
    // mutation first: the trailing reads can't early-start, so they form a wave at turn end
    cb.onToolCall({ id: 'm', name: 'mutate', input: {} })
    cb.onToolCall({ id: 'ra', name: 'readA', input: {} })
    cb.onToolCall({ id: 'rb', name: 'readB', input: {} })
    cb.onDone()
    await flush()
    // both reads launched together, after the mutation
    expect(started).toEqual(['mutate', 'readA', 'readB'])
    // resolving out of order still yields results in call order
    resolvers.get('rb')!({ output: 'B', summary: 'b' })
    resolvers.get('ra')!({ output: 'A', summary: 'a' })
    await flush()
    const toolMsg = loop.messages.find((m) => m.role === 'tool')
    expect(toolMsg && 'results' in toolMsg ? toolMsg.results.map((r) => r.output) : []).toEqual([
      'done',
      'A',
      'B',
    ])
    // the loop continued to the next model turn with the results
    await flush()
    expect(transport.calls.length).toBe(2)
  })

  it('a read-only call dropped mid-arguments is never executed', async () => {
    const transport = recordingTransport()
    const executeTool = vi.fn(() => ({ output: 'ok', summary: 'x' }))
    const loop = new AgentLoop({
      transport,
      skill: skillWith([{ name: 'peek', readonly: true }], executeTool),
    })
    loop.run('go')
    await flush()
    const cb = transport.calls[0]!.callbacks
    cb.onToolCall({ id: 'a', name: 'peek', input: {}, truncated: true })
    await flush()
    cb.onDone()
    await flush()
    expect(executeTool).not.toHaveBeenCalled()
    const toolMsg = loop.messages.find((m) => m.role === 'tool')
    expect(
      toolMsg && 'results' in toolMsg ? toolMsg.results[0]!.isError : undefined,
    ).toBe(true)
  })
})

describe('stale context stripping', () => {
  it('replaces earlier per-run context blocks with a marker on the next run', async () => {
    const transport = recordingTransport()
    const skill: AgentSkill = {
      id: 'test',
      systemPrompt: 'system',
      tools: [],
      buildContext: () => 'SNAPSHOT',
      executeTool: () => ({ output: 'ok', summary: 'x' }),
    }
    const loop = new AgentLoop({
      transport,
      skill,
      formatUserMessage: (instruction, context) =>
        context ? `${instruction}\n\n<doc-context>\n${context}\n</doc-context>` : instruction,
      staleContextPattern: /\n\n<doc-context>\n[\s\S]*?<\/doc-context>/g,
    })
    loop.run('first')
    await flush()
    transport.calls[0]!.callbacks.onDelta('answer one')
    transport.calls[0]!.callbacks.onDone()
    await flush()

    loop.run('second')
    await flush()
    const msgs = transport.calls[1]!.request.messages
    expect(msgs[0]).toEqual({
      role: 'user',
      text: 'first\n\n[snapshot superseded — the latest message carries the current state]',
    })
    // the newest message keeps its full context
    expect(msgs.at(-1)).toEqual({
      role: 'user',
      text: 'second\n\n<doc-context>\nSNAPSHOT\n</doc-context>',
    })
  })

  it('keeps only the newest image-bearing user message', async () => {
    const transport = recordingTransport()
    const skill: AgentSkill = {
      id: 'test',
      systemPrompt: 'system',
      tools: [],
      executeTool: () => ({ output: 'ok', summary: 'x' }),
    }
    const loop = new AgentLoop({ transport, skill })
    const img = (tag: string) => [{ base64: tag, mime: 'image/png' }]
    loop.run('q1', img('first'))
    await flush()
    transport.calls[0]!.callbacks.onDone()
    await flush()
    loop.run('q2', img('second'))
    await flush()
    transport.calls[1]!.callbacks.onDone()
    await flush()
    loop.run('q3')
    await flush()
    const msgs = transport.calls[2]!.request.messages.filter((m) => m.role === 'user')
    expect(msgs.map((m) => ('images' in m ? (m.images?.length ?? 0) : 0))).toEqual([0, 1, 0])
    expect(msgs[1] && 'images' in msgs[1] ? msgs[1].images?.[0]?.base64 : '').toBe('second')
  })
})
