import type { AgentMessage, AgentToolCall, AgentToolDef } from '@genoffice/agent-core'
import { aiFetch } from '../fetch'
import { httpBodyDetail, piiShieldError } from '../http-error'
import {
  gensparkAttributionHeaders,
  opencodeSessionHeaders,
  vegaSessionHeaders,
} from '../providers'
import { modelEchoesReasoning } from '../registry'
import type { AiChatResponse, AiProviderConfig } from '../types'
import { createStreamWatchdog, type StreamWatchdog } from '../watchdog'
import {
  endpointUrl,
  httpErrorDetail,
  jsonBodyInsteadOfSse,
  openAiContentText,
  parseToolInput,
  readCappedResponseText,
  sseErrorText,
  sseDataEvents,
  throwIfCreditsNotice,
  throwIfPaymentRequired,
  throwIfToolCountOverBudget,
  throwIfToolJsonOverBudget,
  usageCount,
  type StreamCallbacks,
} from './shared'
import type { AiTokenUsage } from '../types'

/**
 * Anthropic-family models behind OpenAI-compatible gateways (OpenRouter, the
 * VEGA proxy, LiteLLM) honor `cache_control` markers passed through on message
 * parts: the system block plus the tail message pin the whole prefix in cache,
 * so tool-loop turns re-read it instead of re-prefilling. Other providers
 * auto-cache (OpenAI, DeepSeek) or ignore the field, so it stays gated.
 *
 * A router id (`openrouter/auto`) is also worth marking on OpenRouter-family
 * hosts only: OpenRouter translates block-level markers for every
 * caching-capable model it routes to (Anthropic/Google natively, OpenAI as
 * `prompt_cache_breakpoint`) and drops them for the rest, so the breakpoints
 * ride along and only ever help. Direct non-OpenRouter endpoints keep the
 * Claude-only gate — a strict server may reject unknown content-part fields.
 */
function wantsPromptCache(model: string, baseUrl: string): boolean {
  if (/(^|\/)(anthropic\/)?claude[-\w.]*$/i.test(model) || /^claude[-\w.]*$/i.test(model)) {
    return true
  }
  return /(^|\/)auto$/i.test(model) && /(vega\.chat|openrouter\.ai)/i.test(baseUrl)
}

const EPHEMERAL_CACHE = { type: 'ephemeral' } as const

const PII_UNAVAILABLE_RETRIES = 2

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function cacheableContent(content: unknown): unknown {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content, cache_control: EPHEMERAL_CACHE }]
  }
  if (Array.isArray(content) && content.length > 0) {
    const tail = content.at(-1)
    if (tail && typeof tail === 'object') {
      return [...content.slice(0, -1), { ...tail, cache_control: EPHEMERAL_CACHE }]
    }
  }
  return content
}

function openAiMessages(
  system: string,
  messages: AgentMessage[],
  echoReasoning: boolean,
  promptCache: boolean,
): unknown[] {
  const out: Array<Record<string, unknown>> = [
    promptCache
      ? { role: 'system', content: cacheableContent(system) }
      : { role: 'system', content: system },
  ]
  for (const m of messages) {
    if (m.role === 'user') {
      if (!m.images?.length) {
        out.push({ role: 'user', content: m.text })
      } else {
        out.push({
          role: 'user',
          content: [
            ...(m.text ? [{ type: 'text', text: m.text }] : []),
            ...m.images.map((img) => ({
              type: 'image_url',
              image_url: { url: `data:${img.mime};base64,${img.base64}` },
            })),
          ],
        })
      }
    } else if (m.role === 'assistant') {
      const hasTools = !!(m.toolCalls && m.toolCalls.length > 0)
      // content:null with no tool_calls is an empty assistant turn; some OpenAI-
      // compatible proxies drop or reject the follow-up conversation after that.
      out.push({
        role: 'assistant',
        content: m.text || (hasTools ? null : '(no content)'),
        ...(echoReasoning && m.reasoning ? { reasoning_content: m.reasoning } : {}),
        ...(hasTools
          ? {
              tool_calls: m.toolCalls!.map((call) => ({
                id: call.id,
                type: 'function',
                function: { name: call.name, arguments: JSON.stringify(call.input) },
              })),
            }
          : {}),
      })
    } else {
      for (const r of m.results) {
        // OpenAI has no structured is_error flag (Anthropic sends one); prefix the
        // content so the model can tell a failed call from a successful one and retry.
        out.push({
          role: 'tool',
          tool_call_id: r.id,
          content: r.isError ? `Error: ${r.output}` : r.output,
        })
      }
    }
  }
  // breakpoint on the tail message: the whole conversation prefix is cached
  if (promptCache && out.length > 1) {
    const last = out.at(-1)!
    last.content = cacheableContent(last.content)
  }
  return out
}

/** Emits a complete (non-streamed) chat completion delivered as a plain JSON body. */
function emitOpenAiJsonMessage(bodyText: string, cb: StreamCallbacks): void {
  let msg: {
    choices?: Array<{
      message?: {
        content?: unknown
        reasoning_content?: string
        tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>
      }
      finish_reason?: string | null
    }>
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
    error?: { message?: string } | string
  }
  try {
    msg = JSON.parse(bodyText) as typeof msg
  } catch {
    throw new Error(`The model returned an unparseable JSON body: ${httpBodyDetail(bodyText)}`)
  }
  if (msg.error) throw new Error(sseErrorText(msg.error, 'Model error'))
  const choice = msg.choices?.[0]
  let emitted = false
  if (choice?.message?.reasoning_content) {
    emitted = true
    cb.onReasoningDelta?.(choice.message.reasoning_content)
  }
  if (choice?.message?.content) {
    // A gateway may answer with `content` as an array of parts; concatenated raw it
    // reaches the loop as "[object Object]", so flatten it first.
    const text = openAiContentText(choice.message.content)
    if (text) {
      emitted = true
      cb.onDelta(text)
    }
  }
  const toolCalls: AgentToolCall[] = []
  for (const tc of choice?.message?.tool_calls ?? []) {
    if (!tc.function?.name) continue
    // A complete JSON body carries the whole turn at once, so the per-turn tool
    // budget of the streamed path has to be applied here as well
    throwIfToolCountOverBudget(toolCalls.length + 1, 'openai-compatible')
    emitted = true
    const { input, error } = parseToolInput(tc.function.arguments ?? '')
    toolCalls.push({
      id: tc.id ?? crypto.randomUUID(),
      name: tc.function.name,
      input,
      inputError: error,
    })
  }
  // a 'length' finish may have cut off the last tool call's arguments
  const lastTool = toolCalls.at(-1)
  if (choice?.finish_reason === 'length' && lastTool) lastTool.truncated = true
  for (const call of toolCalls) cb.onToolCall(call)
  if (!emitted) throw new Error(`The model returned no content: ${httpBodyDetail(bodyText)}`)
  if (choice?.finish_reason === 'length') cb.onStopReason?.('max_tokens')
  const jsonUsage = msg.usage as
    { prompt_tokens?: unknown; completion_tokens?: unknown } | undefined
  if (jsonUsage) {
    const usage: AiTokenUsage = {}
    const input = usageCount(jsonUsage.prompt_tokens)
    const output = usageCount(jsonUsage.completion_tokens)
    if (input !== undefined) usage.inputTokens = input
    if (output !== undefined) usage.outputTokens = output
    if (usage.inputTokens !== undefined || usage.outputTokens !== undefined) cb.onUsage?.(usage)
  }
}

/** Per-endpoint request shaping resolved from the provider registry. */
export interface OpenAiRequestOptions {
  omitTemperature?: boolean | undefined
  /** send the output cap as OpenAI's renamed `max_completion_tokens` (GPT-5.x/o-series 400 on `max_tokens`) */
  useMaxCompletionTokens?: boolean | undefined
  /** vendor-specific fields merged into the request body (e.g. DeepSeek's `thinking`) */
  bodyExtras?: Record<string, unknown> | undefined
  /** echo `reasoning_content` back on assistant turns; absent = the shipped family heuristic */
  echoReasoning?: boolean | undefined
  /** static headers a user-hosted endpoint needs (merged last, so they win) */
  headers?: Record<string, string> | undefined
  /** stream idle budget override for slow local servers */
  idleTimeoutMs?: number | undefined
}

const usageRejectedGateways = new Set<string>()

/** test hook */
export function resetUsageRejectedGateways(): void {
  usageRejectedGateways.clear()
}

export async function streamOpenAiCompatible(
  baseUrl: string,
  config: AiProviderConfig,
  system: string,
  messages: AgentMessage[],
  tools: AgentToolDef[],
  maxTokens: number,
  cb: StreamCallbacks,
  options: OpenAiRequestOptions = {},
): Promise<void> {
  const wd = createStreamWatchdog(cb.signal, undefined, options.idleTimeoutMs)
  return wd.guard(() =>
    openAiCompatibleTurn(baseUrl, config, system, messages, tools, maxTokens, cb, wd, {
      ...options,
      requestUsage: !usageRejectedGateways.has(baseUrl),
    }).catch((e) => {
      // Some gateways reject the (spec) stream_options field outright; a 400 that
      // names it is retried once without it, and the gateway is remembered so
      // later turns skip the extra round trip — those providers never report usage.
      if (!/HTTP 4\d\d:[\s\S]*stream_options/i.test(e instanceof Error ? e.message : String(e)))
        throw e
      usageRejectedGateways.add(baseUrl)
      return openAiCompatibleTurn(baseUrl, config, system, messages, tools, maxTokens, cb, wd, {
        ...options,
        requestUsage: false,
      })
    }),
  )
}

async function openAiCompatibleTurn(
  baseUrl: string,
  config: AiProviderConfig,
  system: string,
  messages: AgentMessage[],
  tools: AgentToolDef[],
  maxTokens: number,
  cb: StreamCallbacks,
  wd: StreamWatchdog,
  options: OpenAiRequestOptions & { requestUsage?: boolean | undefined },
): Promise<void> {
  const onBytes = () => {
    wd.touch()
    cb.onActivity?.()
  }
  const request: RequestInit = {
    method: 'POST',
    signal: wd.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...gensparkAttributionHeaders(baseUrl),
      ...opencodeSessionHeaders(baseUrl, cb.sessionId),
      ...vegaSessionHeaders(baseUrl, cb.sessionId),
      // user-hosted endpoints may route on static headers; merged last so a
      // deliberate profile header beats an inferred one
      ...options.headers,
    },
    body: JSON.stringify({
      model: config.model,
      ...(options.useMaxCompletionTokens
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
      messages: openAiMessages(
        system,
        messages,
        options.echoReasoning ?? modelEchoesReasoning(config.model),
        wantsPromptCache(config.model, baseUrl),
      ),
      ...(tools.length > 0
        ? {
            tools: tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
          }
        : {}),
      ...(options.omitTemperature ? {} : { temperature: 0.3 }),
      ...options.bodyExtras,
      stream: true,
      // OpenAI-class providers only report usage in a stream when asked (a final
      // chunk with empty choices carries it); strict gateways that reject the
      // field are retried once without it by streamOpenAiCompatible.
      ...(options.requestUsage ? { stream_options: { include_usage: true } } : {}),
    }),
  }
  const url = endpointUrl(baseUrl, 'chat/completions')
  let response = await aiFetch(url, request)
  let body: string | undefined
  // The PII shield failed closed (nothing was forwarded): a resend is safe, so retry with backoff
  for (let attempt = 1; attempt <= PII_UNAVAILABLE_RETRIES && response.status === 503; attempt++) {
    body = await readCappedResponseText(response, onBytes)
    if (piiShieldError(body)?.code !== 'pii_unavailable') break
    await abortableSleep(1500 * 2 ** (attempt - 1), wd.signal)
    response = await aiFetch(url, request)
    body = undefined
  }
  // headers arrived: ping the renderer watchdog too, or a slow first chunk could trip it
  onBytes()
  if (!response.ok || !response.body) {
    body ??= await readCappedResponseText(response, onBytes)
    throwIfPaymentRequired(response.status, body)
    throw new Error(`HTTP ${response.status}: ${httpErrorDetail(response.status, body)}`)
  }
  const jsonBody = await jsonBodyInsteadOfSse(response, onBytes)
  if (jsonBody !== null) {
    throwIfCreditsNotice(jsonBody)
    return emitOpenAiJsonMessage(jsonBody, cb)
  }
  // tool call arguments stream in fragments keyed by index
  const pendingTools = new Map<number, { id: string; name: string; json: string }>()
  // Early emission removes finished calls from pendingTools, so the count cap
  // needs its own tally of every index the stream has started.
  const seenToolIndexes = new Set<number>()
  let stopReason: string | undefined
  let abnormalFinish: string | undefined
  let sawFinish = false
  let sawDone = false
  let emitted = false
  let turnUsage: AiTokenUsage | undefined
  const flushTools = () => {
    const entries = [...pendingTools.entries()].sort(([a], [b]) => a - b)
    const lastIndex = entries.at(-1)?.[0]
    for (const [index, pending] of entries) {
      if (pending.name) {
        const { input, error } = parseToolInput(pending.json)
        emitted = true
        cb.onToolCall({
          id: pending.id,
          name: pending.name,
          input,
          inputError: error,
          // a 'length' finish cuts off the last streaming tool's arguments
          ...(stopReason === 'max_tokens' && index === lastIndex ? { truncated: true } : {}),
        })
      }
    }
    pendingTools.clear()
  }
  for await (const sse of sseDataEvents(response.body, onBytes)) {
    if (sse.raw === '[DONE]') {
      sawDone = true
      break
    }
    // A truncated frame or a non-JSON keep-alive from a proxy skips that event
    // rather than killing the turn.
    if (sse.json === undefined) continue
    const event = sse.json as {
      choices?: Array<{
        delta?: {
          content?: unknown
          /** DeepSeek/MiniMax native and LiteLLM-normalized thinking stream; OpenRouter uses `reasoning` */
          reasoning_content?: string
          reasoning?: string
          tool_calls?: Array<{
            index: number
            id?: string
            function?: { name?: string; arguments?: string }
          }>
        }
        finish_reason?: string | null
      }>
      /** usage chunk (requested via stream_options): empty choices + the counts */
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }
      error?: { message?: string } | string
    }
    if (event.error) throw new Error(sseErrorText(event.error, 'Model stream error'))
    // The usage chunk arrives with empty choices right before [DONE]; some
    // providers (DeepSeek et al) attach usage to the last content chunk instead.
    if (event.usage) {
      const usage: AiTokenUsage = {}
      const input = usageCount(event.usage.prompt_tokens)
      const output = usageCount(event.usage.completion_tokens)
      if (input !== undefined) usage.inputTokens = input
      if (output !== undefined) usage.outputTokens = output
      if (usage.inputTokens !== undefined || usage.outputTokens !== undefined) {
        turnUsage = usage
      }
    }
    const choice = event.choices?.[0]
    if (!choice) continue
    const reasoning = choice.delta?.reasoning_content ?? choice.delta?.reasoning
    if (typeof reasoning === 'string' && reasoning) {
      emitted = true
      cb.onReasoningDelta?.(reasoning)
    }
    if (choice.delta?.content) {
      // Same array-of-parts shape as the JSON body path above.
      const text = openAiContentText(choice.delta.content)
      if (text) {
        emitted = true
        cb.onDelta(text)
      }
    }
    for (const tc of choice.delta?.tool_calls ?? []) {
      // A call's arguments end when the stream moves on to a higher index —
      // emit it right away so read-only tools start while later calls stream.
      for (const [index, pending] of pendingTools) {
        if (index < tc.index && pending.name) {
          pendingTools.delete(index)
          const { input, error } = parseToolInput(pending.json)
          emitted = true
          cb.onToolCall({ id: pending.id, name: pending.name, input, inputError: error })
        }
      }
      if (!seenToolIndexes.has(tc.index)) {
        seenToolIndexes.add(tc.index)
        throwIfToolCountOverBudget(seenToolIndexes.size, 'openai-compatible')
      }
      const pending = pendingTools.get(tc.index) ?? {
        id: tc.id ?? crypto.randomUUID(),
        name: '',
        json: '',
      }
      if (tc.id) pending.id = tc.id
      // Spec-compliant servers send the name once, but some local/proxy
      // servers resend the full (or growing) name on every delta; naive
      // concatenation then yields "read_fileread_file" and every call fails
      // as an unknown tool. Treat a delta that extends the accumulated name
      // as a resend, anything else as a fragment to append.
      if (tc.function?.name) {
        pending.name = tc.function.name.startsWith(pending.name)
          ? tc.function.name
          : pending.name + tc.function.name
      }
      if (tc.function?.arguments) {
        pending.json += tc.function.arguments
        throwIfToolJsonOverBudget(pending.json.length, 'openai-compatible')
      }
      pendingTools.set(tc.index, pending)
    }
    if (choice.finish_reason) {
      sawFinish = true
      if (choice.finish_reason === 'length') stopReason = 'max_tokens'
      else if (choice.finish_reason !== 'stop' && choice.finish_reason !== 'tool_calls') {
        abnormalFinish = choice.finish_reason
      }
      flushTools()
    }
  }
  // No finish and no [DONE] with half-received arguments: the connection dropped
  if (!sawFinish && !sawDone) {
    const broken = [...pendingTools.values()].filter((p) => p.name && parseToolInput(p.json).error)
    if (broken.length > 0) {
      const received = broken.reduce((n, p) => n + p.json.length, 0)
      throw new Error(
        `The model stream closed while sending tool arguments (${received} chars received); the connection was dropped. ` +
          'If this recurs on a large request (e.g. generating a whole document), ask for the output in several smaller parts.',
      )
    }
  }
  flushTools()
  if (!sawFinish && !sawDone && emitted) {
    throw new Error('The model stream ended before a finish_reason or [DONE] marker')
  }
  // e.g. finish_reason=content_filter with no output, or a stream with no
  // message framing at all (gateway soft-failure) — surface both instead of an
  // empty success; a genuine empty turn still carries finish_reason=stop
  if (!emitted && abnormalFinish) {
    throw new Error(`The model returned no content (finish_reason=${abnormalFinish})`)
  }
  if (!emitted && !sawFinish) {
    throw new Error('The model returned no content (empty stream)')
  }
  if (stopReason) cb.onStopReason?.(stopReason)
  if (turnUsage) cb.onUsage?.(turnUsage)
}

export async function chatOpenAiCompatible(
  wd: StreamWatchdog,
  baseUrl: string,
  config: AiProviderConfig,
  system: string,
  user: string,
  options: OpenAiRequestOptions = {},
): Promise<AiChatResponse> {
  const response = await aiFetch(endpointUrl(baseUrl, 'chat/completions'), {
    method: 'POST',
    signal: wd.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...gensparkAttributionHeaders(baseUrl),
      ...opencodeSessionHeaders(baseUrl),
      ...vegaSessionHeaders(baseUrl),
      ...options.headers,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(options.omitTemperature ? {} : { temperature: 0.3 }),
      ...options.bodyExtras,
    }),
  })
  wd.touch()
  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}: ${httpErrorDetail(response.status, await readCappedResponseText(response, () => wd.touch()))}`,
    }
  }
  // A 200 with an HTML shell / empty / truncated body (gateway soft-failure)
  // would make response.json() throw; return ok:false instead of leaking a
  // raw SyntaxError to the caller.
  const bodyText = await readCappedResponseText(response, () => wd.touch())
  let json: { choices?: Array<{ message?: { content?: string } }> }
  try {
    json = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }> }
  } catch {
    return {
      ok: false,
      error: `AI returned a non-JSON response: ${httpBodyDetail(bodyText)}`,
    }
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) return { ok: false, error: 'AI returned an empty response' }
  return { ok: true, content }
}
