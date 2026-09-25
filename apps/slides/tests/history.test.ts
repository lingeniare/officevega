import { describe, expect, it, vi } from 'vitest'
import {
  addPicture,
  createBlankPptx,
  openPptx,
  replacePictureBytes,
  type PictureElement,
} from '@genoffice/pptx-engine'
import type { Session } from '../src/main/session-state'
import {
  beginHistoryBatch,
  carryHistoryForReplacement,
  endHistoryBatch,
  enqueueSessionMutation,
  pushHistory,
  qcSlideCheckpoint,
  qcSlideCheckpointsClear,
  qcSlideRestore,
  registerAiSnapshot,
  restoreAiSnapshot,
  restoreSnapshot,
  settleStaleHistoryBatch,
  takeSnapshot,
} from '../src/main/session-state'

vi.mock('electron', () => ({
  BrowserWindow: { getFocusedWindow: () => null },
}))
vi.mock('../src/main/fonts', () => ({
  createSystemFontMetrics: () => ({}),
}))

function sessionWith(value: string): Session {
  return {
    path: '',
    fitWidthPx: 1280,
    undoStack: [],
    redoStack: [],
    opened: {
      deck: {
        slides: [{ value }],
        size: { cx: 1, cy: 1 },
      },
      archive: { entries: new Map([['deck', new Uint8Array([value.length])]]) },
    },
  } as unknown as Session
}

function valueOf(session: Session): string {
  return (session.opened.deck.slides[0] as unknown as { value: string }).value
}

function setValue(session: Session, value: string): void {
  ;(session.opened.deck.slides[0] as unknown as { value: string }).value = value
}

describe('Slides main-process history batching', () => {
  it('collapses several edits into one pre-run snapshot', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'first')
    pushHistory(session)
    setValue(session, 'second')
    endHistoryBatch(session)

    expect(session.undoStack).toHaveLength(1)
    restoreSnapshot(session, session.undoStack[0]!)
    expect(valueOf(session)).toBe('before')
  })

  it('supports nested tool batching inside an AI-run batch', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'after')
    endHistoryBatch(session)
    expect(session.historyBatch?.depth).toBe(1)
    endHistoryBatch(session)
    expect(session.undoStack).toHaveLength(1)
  })

  it('does not create a history step when every edit is rolled back', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    pushHistory(session)
    session.undoStack.pop()
    endHistoryBatch(session)
    expect(session.undoStack).toHaveLength(0)
  })

  it('restores the deck size on undo', () => {
    const session = sessionWith('before')
    pushHistory(session)
    session.opened.deck.size = { cx: 2, cy: 3 }
    setValue(session, 'after')

    restoreSnapshot(session, session.undoStack.pop()!)
    expect(session.opened.deck.size).toEqual({ cx: 1, cy: 1 })
    expect(valueOf(session)).toBe('before')
  })

  it('keeps the old deck snapshot when replacing the full deck', () => {
    const previous = sessionWith('old deck')
    const replacement = sessionWith('new deck')
    carryHistoryForReplacement(previous, replacement)

    expect(replacement.undoStack).toHaveLength(1)
    restoreSnapshot(replacement, replacement.undoStack.pop()!)
    expect(valueOf(replacement)).toBe('old deck')
  })

  it('returns the pre-run snapshot from the outermost batch end with edits', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'after')
    expect(endHistoryBatch(session)).toBeNull()
    const before = endHistoryBatch(session)
    expect(before).not.toBeNull()
    expect((before!.slides[0] as unknown as { value: string }).value).toBe('before')

    const emptyRun = sessionWith('untouched')
    beginHistoryBatch(emptyRun)
    expect(endHistoryBatch(emptyRun)).toBeNull()
  })

  it('rolls back to a registered AI snapshot and makes the rollback undoable', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'ai edited')
    const id = registerAiSnapshot(session, endHistoryBatch(session)!)

    setValue(session, 'user edited on top')
    expect(restoreAiSnapshot(session, id)).toBe(true)
    expect(valueOf(session)).toBe('before')
    expect(restoreAiSnapshot(session, id)).toBe(false) // consumed

    restoreSnapshot(session, session.undoStack.pop()!) // ⌘Z returns to the pre-rollback state
    expect(valueOf(session)).toBe('user edited on top')
  })

  it('keeps registered snapshots isolated from later in-place deck mutations', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'ai edited')
    const id = registerAiSnapshot(session, endHistoryBatch(session)!)

    restoreSnapshot(session, session.undoStack.pop()!) // undo hands the stack snapshot to the live deck
    setValue(session, 'mutated after undo')
    expect(restoreAiSnapshot(session, id)).toBe(true)
    expect(valueOf(session)).toBe('before')
  })

  it('undo restores the archive-only dirty flag with the deck', () => {
    const session = sessionWith('before')
    pushHistory(session)
    setValue(session, 'notes edited')
    session.metaDirty = true

    session.redoStack.push(takeSnapshot(session))
    restoreSnapshot(session, session.undoStack.pop()!)
    expect(session.metaDirty).toBe(false)

    restoreSnapshot(session, session.redoStack.pop()!)
    expect(session.metaDirty).toBe(true)
  })

  it('undo → edit → redo replays the state that was undone, not a mutated copy', () => {
    const session = sessionWith('before')
    pushHistory(session)
    setValue(session, 'edited')

    // ⌘Z
    session.redoStack.push(takeSnapshot(session))
    restoreSnapshot(session, session.undoStack.pop()!)
    expect(valueOf(session)).toBe('before')

    // typing after the undo must not rewrite the redo snapshot in place
    setValue(session, 'typed after undo')
    restoreSnapshot(session, session.redoStack.pop()!)
    expect(valueOf(session)).toBe('edited')
  })

  it('a batch left open by a crashed tool path is collapsed so undo still works', () => {
    const session = sessionWith('before')
    // run begins a batch, a tool nests another, then the tool path dies without ending either
    beginHistoryBatch(session)
    pushHistory(session)
    setValue(session, 'ai edited')
    beginHistoryBatch(session)
    expect(session.historyBatch).toBeDefined()

    settleStaleHistoryBatch(session)
    expect(session.historyBatch).toBeUndefined()
    expect(session.undoStack.length).toBe(1)

    restoreSnapshot(session, session.undoStack.pop()!)
    expect(valueOf(session)).toBe('before')
  })

  it('undo and redo restore resource bytes and relationships pruned by picture replacement', async () => {
    const png = new Uint8Array(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwV2AAAAAElFTkSuQmCC',
        'base64',
      ),
    )
    const gif = new Uint8Array(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    )
    const opened = await openPptx(await createBlankPptx())
    const slide = opened.deck.slides[0]!
    const picture = addPicture(opened, slide, {
      bytes: png,
      ext: 'png',
      offset: { x: 0, y: 0, cx: 914400, cy: 914400 },
    })!
    const session: Session = {
      path: '',
      opened,
      fitWidthPx: 1280,
      undoStack: [],
      redoStack: [],
    }
    const oldMedia = picture.mediaRef
    const slash = slide.path.lastIndexOf('/')
    const relsPath = `${slide.path.slice(0, slash)}/_rels/${slide.path.slice(slash + 1)}.rels`
    const oldRels = opened.archive.readText(relsPath)!

    // The IPC mutation path snapshots first, then replacement prunes the old
    // relationship/media as soon as the element points at the new bytes.
    pushHistory(session)
    expect(replacePictureBytes(opened, slide, picture.id, gif, 'gif')).toBe(true)
    const newMedia = picture.mediaRef
    const newRels = opened.archive.readText(relsPath)!
    expect(opened.archive.entries.has(oldMedia)).toBe(false)
    expect(opened.archive.readBytes(newMedia)).toEqual(gif)

    // Production undo stores the cleaned state for redo, then restores the
    // pre-mutation snapshot.
    session.redoStack.push(takeSnapshot(session))
    restoreSnapshot(session, session.undoStack.pop()!)
    expect(session.opened.archive.readBytes(oldMedia)).toEqual(png)
    expect(session.opened.archive.entries.has(newMedia)).toBe(false)
    expect(session.opened.archive.readText(relsPath)).toBe(oldRels)
    expect(
      (
        session.opened.deck.slides[0]!.elements.find(
          (element) => element.type === 'picture',
        ) as PictureElement
      ).mediaRef,
    ).toBe(oldMedia)

    // Production redo snapshots the restored state and reapplies the cleaned
    // archive/model snapshot.
    session.undoStack.push(takeSnapshot(session))
    restoreSnapshot(session, session.redoStack.pop()!)
    expect(session.opened.archive.entries.has(oldMedia)).toBe(false)
    expect(session.opened.archive.readBytes(newMedia)).toEqual(gif)
    expect(session.opened.archive.readText(relsPath)).toBe(newRels)
    expect(
      (
        session.opened.deck.slides[0]!.elements.find(
          (element) => element.type === 'picture',
        ) as PictureElement
      ).mediaRef,
    ).toBe(newMedia)
  })
})

describe('QC per-slide checkpoints', () => {
  function twoSlideSession(): Session {
    const session = sessionWith('first')
    session.opened.deck.slides.push({ value: 'second' } as never)
    return session
  }

  function slideValue(session: Session, index: number): string {
    return (session.opened.deck.slides[index] as unknown as { value: string }).value
  }

  function setSlideValue(session: Session, index: number, value: string): void {
    ;(session.opened.deck.slides[index] as unknown as { value: string }).value = value
  }

  it('reverts one slide without touching a sibling page', () => {
    const session = twoSlideSession()
    expect(qcSlideCheckpoint(session, 1)).toBe(true)
    setSlideValue(session, 0, 'first edited')
    setSlideValue(session, 1, 'second edited')

    expect(qcSlideRestore(session, 1)).toBe(true)
    expect(slideValue(session, 1)).toBe('second')
    // The sibling's concurrent QC edit survives — the whole point of per-slide copies.
    expect(slideValue(session, 0)).toBe('first edited')
  })

  it('returns false for a missing checkpoint and after clear', () => {
    const session = sessionWith('a')
    expect(qcSlideRestore(session, 0)).toBe(false)

    qcSlideCheckpoint(session, 0)
    qcSlideCheckpointsClear(session)
    expect(qcSlideRestore(session, 0)).toBe(false)
  })

  it('revert inside the pass batch collapses into the single undo step', () => {
    const session = sessionWith('before')
    beginHistoryBatch(session)
    qcSlideCheckpoint(session, 0)
    pushHistory(session)
    setValue(session, 'qc edited')
    expect(qcSlideRestore(session, 0)).toBe(true)
    expect(valueOf(session)).toBe('before')

    const collapsed = endHistoryBatch(session)
    expect(collapsed).not.toBeNull()
    // Both the edit's and the revert's pushes were spliced — one undo step.
    expect(session.undoStack).toHaveLength(1)
    restoreSnapshot(session, session.undoStack.pop()!)
    expect(valueOf(session)).toBe('before')
  })

  it('revert outside a batch pushes its own undo step', () => {
    const session = sessionWith('before')
    qcSlideCheckpoint(session, 0)
    setValue(session, 'qc edited')
    expect(qcSlideRestore(session, 0)).toBe(true)

    expect(session.undoStack).toHaveLength(1)
    restoreSnapshot(session, session.undoStack.pop()!)
    expect(valueOf(session)).toBe('qc edited')
  })

  it('journal gets a reset marker so op replay cannot cross the revert', () => {
    const session = sessionWith('before')
    session.opSeq = 0
    session.opLog = [{ seq: 0, source: 'script', ops: [] }]
    qcSlideCheckpoint(session, 0)
    setValue(session, 'qc edited')
    qcSlideRestore(session, 0)

    expect(session.opLog.at(-1)?.source).toBe('reset')
    expect(session.opLog.at(-1)?.seq).toBe(1)
  })

  it('checkpoint stores a private copy — later mutations do not leak into it', () => {
    const session = sessionWith('before')
    qcSlideCheckpoint(session, 0)
    setValue(session, 'mutated twice')
    setValue(session, 'mutated thrice')
    qcSlideRestore(session, 0)
    expect(valueOf(session)).toBe('before')
  })
})

describe('enqueueSessionMutation', () => {
  it('serializes queued tails — concurrent landings never interleave', async () => {
    const session = sessionWith('a')
    const order: string[] = []
    const slow = (name: string, delay: number) =>
      enqueueSessionMutation(session, async () => {
        order.push(`${name}:start`)
        await new Promise((r) => setTimeout(r, delay))
        order.push(`${name}:end`)
        return name
      })
    const [ra, rb, rc] = await Promise.all([slow('a', 20), slow('b', 5), slow('c', 0)])
    expect([ra, rb, rc]).toEqual(['a', 'b', 'c'])
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end'])
  })

  it('a rejected task does not jam the queue', async () => {
    const session = sessionWith('a')
    await expect(
      enqueueSessionMutation(session, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    await expect(enqueueSessionMutation(session, async () => 'ok')).resolves.toBe('ok')
  })
})
