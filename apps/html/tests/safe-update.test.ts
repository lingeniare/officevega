import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { safeViewUpdate } from '../src/renderer/source/cm-setup'

/**
 * Regression: @codemirror/view's `ensureLineGaps`/`findPosition` feed
 * `ranges[i]` an unchecked index once the measured geometry goes degenerate —
 * the preview mode keeps the source pane mounted under `display:none`, and a
 * text line ≥ 20000 chars then produces a NaN ratio. The dispatch throws
 * "Cannot destructure property 'from' of 'ranges[i]' as it is undefined" (and,
 * on the corrupted follow-up, "Cannot read properties of undefined (reading
 * 'length')") — which is exactly what `fill_images` surfaced in the chat.
 * Upstream is unfixed (6.43.14), so the dispatch funnel guards the update and
 * rebuilds the view internals instead of losing the edit.
 */
const UPSTREAM_CRASH = /Cannot destructure property 'from'|Cannot read properties of undefined/

function makeView(doc: string, guarded: boolean) {
  return new EditorView({
    state: EditorState.create({ doc, extensions: [EditorView.lineWrapping] }),
    parent: document.body,
    ...(guarded
      ? {
          dispatchTransactions: (trs: readonly import('@codemirror/state').Transaction[], v: EditorView) => {
            safeViewUpdate(v, trs)
          },
        }
      : {}),
  })
}

function poisonGeometry(view: EditorView) {
  // simulate the degenerate geometry a hidden editor reaches after a zero-size
  // measure pass: the oracle values feeding `ensureLineGaps` go non-finite
  const vs = view.viewState as unknown as {
    heightOracle: { lineLength: number; lineHeight: number }
  }
  vs.heightOracle.lineLength = Number.NaN
  vs.heightOracle.lineHeight = Number.NaN
}

describe('safeViewUpdate', () => {
  it('documents the upstream crash an unguarded dispatch hits', () => {
    const view = makeView('x'.repeat(25000), false)
    poisonGeometry(view)
    expect(() => view.dispatch({ changes: { from: 0, to: 3, insert: 'yes' } })).toThrow(
      UPSTREAM_CRASH,
    )
    view.destroy()
  })

  it('recovers: the patch is committed and the view keeps working', () => {
    const doc = 'x'.repeat(25000)
    const view = makeView(doc, true)
    poisonGeometry(view)

    expect(() => view.dispatch({ changes: { from: 0, to: 3, insert: 'yes' } })).not.toThrow()
    expect(view.state.doc.toString()).toBe('yes' + 'x'.repeat(25000 - 3))

    // and the rebuilt view survives the next patch as well
    expect(() => view.dispatch({ changes: { from: 3, insert: '!' } })).not.toThrow()
    expect(view.state.doc.toString()).toBe('yes!' + 'x'.repeat(25000 - 3))
    view.destroy()
  })
})
