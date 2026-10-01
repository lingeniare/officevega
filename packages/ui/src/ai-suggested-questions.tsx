import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Feature flag for the suggested-follow-up-questions strip. `false` disables
 * the whole feature: `refresh` becomes a no-op, no helper model call is made
 * and `AiSuggestedQuestions` always renders null. All the wiring (per-app
 * fast-model transports, `generateSuggestedQuestions`, the Settings "fast
 * model" pick) stays in place — flip back to `true` to re-enable.
 */
export const AI_SUGGESTED_QUESTIONS_ENABLED = false

/**
 * State owner for the suggested-follow-up-questions strip that every AI panel
 * shows after a finished reply. `generate` is the app's wiring to its model
 * call (agent-core's generateSuggestedQuestions over the IPC transport).
 *
 * Race discipline: `refresh` supersedes any in-flight call (abort + seq bump)
 * and dedupes on the user::assistant pair, so StrictMode/retries don't double
 * the request; `clear` drops the list and kills the pending call — call it when
 * a new run starts or the chat resets.
 */
export function useSuggestedQuestions(
  generate: (user: string, assistant: string, signal: AbortSignal) => Promise<string[]>,
): {
  readonly questions: readonly string[]
  refresh: (user: string, assistant: string) => void
  clear: () => void
} {
  const [questions, setQuestions] = useState<readonly string[]>([])
  const seqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const lastKeyRef = useRef('')
  const generateRef = useRef(generate)
  generateRef.current = generate

  const clear = useCallback(() => {
    seqRef.current += 1
    lastKeyRef.current = ''
    abortRef.current?.abort()
    abortRef.current = null
    setQuestions([])
  }, [])

  const refresh = useCallback((user: string, assistant: string) => {
    if (!AI_SUGGESTED_QUESTIONS_ENABLED) {
      clear()
      return
    }
    const u = user.trim()
    const a = assistant.trim()
    abortRef.current?.abort()
    abortRef.current = null
    if (!u || !a) {
      setQuestions([])
      return
    }
    const key = `${u}::${a}`
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    const seq = ++seqRef.current
    const ctl = new AbortController()
    abortRef.current = ctl
    void generateRef
      .current(u, a, ctl.signal)
      .then((qs) => {
        if (seq === seqRef.current && !ctl.signal.aborted && qs.length > 0) setQuestions(qs)
      })
      .catch(() => undefined)
  }, [clear])

  // unmount: kill an in-flight call so it can't setState on a dead panel
  useEffect(() => () => abortRef.current?.abort(), [])

  return { questions, refresh, clear }
}

/**
 * The 3 follow-up chips rendered under the last assistant reply. Clicking one
 * hands the question back through `onPick` — the panel fills the composer and
 * fires the regular send path.
 */
export function AiSuggestedQuestions({
  questions,
  onPick,
}: {
  readonly questions: readonly string[]
  readonly onPick: (question: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="ai-suggest">
      {questions.map((q) => (
        <button key={q} type="button" className="ai-suggest-item" onClick={() => onPick(q)}>
          <span className="ai-suggest-item-text">{q}</span>
        </button>
      ))}
    </div>
  )
}
