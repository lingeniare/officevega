import type { AgentToolCall, ToolExecution } from './types'
import type { AgentSkill, ExecutedToolCall } from './skill'

/**
 * The VEGA privacy gateway masks personal data as #TYPE_N# tokens (e.g.
 * #PERSON_1#, #PHONE_NUMBER_2#) before a request leaves the machine and
 * substitutes the real values back into tool_call arguments it recognizes.
 * A token that reaches the executor unresolved is therefore never document
 * content: it is a view artifact the model tried to "clean up" or a token the
 * session dictionary missed — writing it would corrupt the artifact, so the
 * call is refused with instructions instead.
 */
export const PII_TOKEN_PATTERN = /#[A-Za-z][A-Za-z_]*_\d+#/

/**
 * Model-facing prompt section appended while the privacy gateway may be
 * masking. Without it a model sees #TYPE_N# tokens in document context as
 * literal file content and loops trying to delete them — an unverifiable
 * operation, since every re-read returns the masked view again.
 */
export const PII_SHIELD_NOTE = [
  '',
  '# Privacy masking',
  '- Personal data is masked before it reaches you: names, phones, IDs and similar appear as #TYPE_N# tokens (e.g. #PERSON_1#, #PHONE_NUMBER_2#) in document context and tool results. The document stores the real values — a token is a view artifact, never document content.',
  '- Personal-looking text you invent (names, phones, emails, addresses) is masked the same way, so after you write it you will see tokens where your text was — that is the mask working, not you having written literal tokens.',
  '- Never try to remove, fix, or "clean up" these tokens and never write one as document text. To edit text that contains a token, keep the token verbatim in the tool argument (the gateway substitutes the real value back) or address the surrounding literal words instead.',
  '- The masked view never changes after a successful edit: a spot that read #PERSON_1# still reads #PERSON_1# afterwards. Trust the tool result, not the re-read — do not edit again just because tokens remain visible.',
  '- If a tool call is rejected for an unresolved privacy token, re-read the block and work with the literal text around it — do not retry the token.',
].join('\n')

/**
 * Appended to a successful mutation's output while masking may apply: the
 * next masked read still shows tokens over the stored real values, and
 * without this reminder the model takes "tokens remain" as "my edit failed".
 */
export const PII_WRITE_CONFIRM =
  ' (Personal-data #TYPE_N# tokens you may still see around this content are the privacy mask over the stored real values — this change is applied; do not redo it.)'

/** Identical successful calls in a row are reported to the model as a dead end instead of re-running. */
const PII_REPEAT_LIMIT = 3

/**
 * First #TYPE_N# token inside a tool input, or null. Recurses into nested
 * values so tokens hidden inside op arrays or HTML fragments are caught.
 */
export function unresolvedPiiToken(input: unknown): string | null {
  if (typeof input === 'string') return PII_TOKEN_PATTERN.exec(input)?.[0] ?? null
  if (Array.isArray(input)) {
    for (const item of input) {
      const hit = unresolvedPiiToken(item)
      if (hit) return hit
    }
    return null
  }
  if (input !== null && typeof input === 'object') {
    for (const value of Object.values(input)) {
      const hit = unresolvedPiiToken(value)
      if (hit) return hit
    }
  }
  return null
}

/**
 * Wraps a skill so that, while `active()` says the PII gateway may be in the
 * loop, the model is told about masked tokens and tool calls carrying an
 * unresolved #TYPE_N# token fail fast with guidance instead of writing it.
 */
export function withPiiTokenGuard(skill: AgentSkill, active: () => boolean): AgentSkill {
  // repeats of an already-successful call are a masking-loop symptom, not work
  let lastSucceededKey: string | undefined
  let repeats = 0
  const annotate = (r: ToolExecution): ToolExecution =>
    r.mutated && !r.isError ? { ...r, output: (r.output ?? '') + PII_WRITE_CONFIRM } : r
  return {
    id: skill.id,
    get systemPrompt() {
      return skill.systemPrompt + (active() ? PII_SHIELD_NOTE : '')
    },
    get tools() {
      return skill.tools
    },
    ...(skill.buildContext ? { buildContext: () => skill.buildContext!() } : {}),
    executeTool(call: AgentToolCall, signal?: AbortSignal): ToolExecution | Promise<ToolExecution> {
      if (!active()) return skill.executeTool(call, signal)
      const token = unresolvedPiiToken(call.input)
      if (token) {
        return {
          output: `Tool argument contains "${token}", an unresolved privacy token. The gateway masks personal data as #TYPE_N# tokens in what you read and substitutes real values back only for tokens it knows; a token that arrives unresolved is not document content and must never be written into the document. Re-read the block and address the literal text around it instead.`,
          isError: true,
          mutated: false,
          summary: call.name,
        }
      }
      const key = `${call.name}:${JSON.stringify(call.input)}`
      if (key === lastSucceededKey && repeats >= PII_REPEAT_LIMIT - 1) {
        return {
          output: `This call already ran ${repeats} times with identical arguments and succeeded — the document will never look different: the #TYPE_N# tokens you still see are the privacy mask over the stored values, not leftover text. The change is done; report the result instead of repeating the edit.`,
          isError: true,
          mutated: false,
          summary: call.name,
        }
      }
      const result = skill.executeTool(call, signal)
      const track = (r: ToolExecution): ToolExecution => {
        if (r.mutated && !r.isError) {
          repeats = key === lastSucceededKey ? repeats + 1 : 1
          lastSucceededKey = key
        }
        return annotate(r)
      }
      return result instanceof Promise ? result.then(track) : track(result)
    },
    ...(skill.verifyResponse
      ? {
          verifyResponse: (finalText: string, executed: readonly ExecutedToolCall[]) =>
            skill.verifyResponse!(finalText, executed),
        }
      : {}),
  }
}
