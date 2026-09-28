/**
 * Incremental stripper for raw tool-call markup leaked into the text stream.
 * Gateways fronting weaker models (OpenRouter-style proxies, BYOK endpoints)
 * sometimes deliver `<tool_call>{…}</tool_call>` (or the `<function_call>`
 * variant) as ordinary content instead of a native tool call; rendered in the
 * chat bubble it reads as garbage. The markup is removed as it streams: a tag
 * split across deltas still vanishes because an unmatched `<…` tail is held
 * back until it either completes a tag or proves to be text.
 *
 * Text deliberately written about the syntax itself (e.g. "what does
 * <tool_call> mean") is stripped too — the same trade-off the gateway-side
 * stripper this mirrors accepts.
 */

const OPEN_RE = /<(?:tool_call|function_call)\b[^>]*>/
const CLOSE_TAG = /<\/(?:tool_call|function_call)>/
/** a complete open or close tag anywhere in the buffer */
const ANY_TAG_RE = /<\/?(?:tool_call|function_call)\b[^>]*>/

export interface ToolMarkupStripper {
  /** one streamed delta in, cleaned text out (may be empty while markup is pending) */
  feed(delta: string): string
  /** stream ended: leftover real text out; unclosed markup is dropped */
  flush(): string
}

export function createToolCallMarkupStripper(): ToolMarkupStripper {
  let buf = ''
  /** currently inside a markup block, waiting for a close tag */
  let inside = false

  /** length of the trailing `<…` region that could still grow into a tag */
  const incompleteTagTail = (s: string): number => {
    const lt = s.lastIndexOf('<')
    return lt > s.lastIndexOf('>') ? s.length - lt : 0
  }

  return {
    feed(delta) {
      buf += delta
      let out = ''
      for (;;) {
        if (inside) {
          const close = CLOSE_TAG.exec(buf)
          if (!close) {
            // everything buffered is markup; keep only a tail long enough to
            // hold a close tag split across deltas (longest is </function_call>)
            buf = buf.slice(Math.max(0, buf.length - 32))
            return out
          }
          buf = buf.slice(close.index + close[0].length)
          inside = false
          continue
        }
        const tag = ANY_TAG_RE.exec(buf)
        if (!tag) {
          const hold = incompleteTagTail(buf)
          out += buf.slice(0, buf.length - hold)
          buf = buf.slice(buf.length - hold)
          return out
        }
        out += buf.slice(0, tag.index)
        buf = buf.slice(tag.index + tag[0].length)
        if (OPEN_RE.test(tag[0])) inside = true
        // an orphan close tag is dropped and scanning continues
      }
    },
    flush() {
      const out = inside ? '' : buf
      buf = ''
      inside = false
      return out
    },
  }
}
