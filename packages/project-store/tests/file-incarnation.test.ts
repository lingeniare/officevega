import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ProjectStore } from '../src/store.js'

// #1021: a path bound to a chat must not hand that chat to a different file
// object that later takes the same path. The binding carries an incarnation
// signature (inode + creation time): renames keep it, in-place writes keep
// it, delete+recreate and atomic rewrites change it, and the app's own saves
// refresh it through noteFileWritten.

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'project-store-incarnation-'))
}

/** Replaces a file the way atomicWriteFile does: write beside, rename over. */
function atomicReplace(path: string, content: string): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

describe('file incarnation binding (#1021)', () => {
  let tmpDir: string
  let store: ProjectStore
  let docPath: string

  beforeEach(() => {
    tmpDir = makeTempDir()
    store = new ProjectStore(tmpDir)
    docPath = join(tmpDir, 'report.docx')
    writeFileSync(docPath, 'original bytes')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('keeps the same chatId across repeated resolves of the same file', () => {
    const first = store.resolveChatForFile(docPath)
    const second = store.resolveChatForFile(docPath)
    expect(second).toEqual(first)
  })

  it('mints a fresh chatId when an unrelated file takes the path', () => {
    const first = store.resolveChatForFile(docPath)
    unlinkSync(docPath)
    writeFileSync(docPath, 'a different document')
    const second = store.resolveChatForFile(docPath)
    expect(second.projectId).toBe(first.projectId)
    expect(second.chatId).not.toBe(first.chatId)
  })

  it('keeps the replaced file’s transcript readable under the old chatId', () => {
    const first = store.resolveChatForFile(docPath)
    store.appendChatMessage(first.projectId, first.chatId, {
      role: 'assistant',
      text: 'old file transcript',
    })
    unlinkSync(docPath)
    writeFileSync(docPath, 'replacement')
    store.resolveChatForFile(docPath)
    const history = store.loadChat(first.projectId, first.chatId)
    expect(history.map((m) => m.text)).toContain('old file transcript')
  })

  it('treats an atomic rewrite with noteFileWritten as the same file (our own save)', () => {
    const first = store.resolveChatForFile(docPath)
    atomicReplace(docPath, 'saved v2')
    store.noteFileWritten(docPath)
    const second = store.resolveChatForFile(docPath)
    expect(second).toEqual(first)
  })

  it('treats an atomic rewrite without noteFileWritten as a different file', () => {
    const first = store.resolveChatForFile(docPath)
    atomicReplace(docPath, 'foreign atomic rewrite')
    const second = store.resolveChatForFile(docPath)
    expect(second.chatId).not.toBe(first.chatId)
  })

  it('keeps the chatId through an in-place write (foreign in-place edit)', () => {
    const first = store.resolveChatForFile(docPath)
    appendFileSync(docPath, '\nappended externally')
    const second = store.resolveChatForFile(docPath)
    expect(second).toEqual(first)
  })

  it('follows the chat through fileRenamed (move keeps the file object)', () => {
    const first = store.resolveChatForFile(docPath)
    const movedPath = join(tmpDir, 'renamed.docx')
    renameSync(docPath, movedPath)
    store.fileRenamed(docPath, movedPath)
    const second = store.resolveChatForFile(movedPath)
    expect(second).toEqual(first)
  })

  it('does not rebind the moved chat when a new file lands on the vacated path', () => {
    const first = store.resolveChatForFile(docPath)
    const movedPath = join(tmpDir, 'renamed.docx')
    renameSync(docPath, movedPath)
    store.fileRenamed(docPath, movedPath)
    // An unrelated file lands on the vacated path: the moved binding (and its
    // path-hash fallback) must not resurrect the transcript onto it.
    writeFileSync(docPath, 'different file at the old name')
    const second = store.resolveChatForFile(docPath)
    expect(second.chatId).not.toBe(first.chatId)
    // And the moved file still owns the original chat.
    expect(store.resolveChatForFile(movedPath)).toEqual(first)
  })

  it('keeps the chat when the file is missing at resolve (deleted while closed)', () => {
    const first = store.resolveChatForFile(docPath)
    unlinkSync(docPath)
    const second = store.resolveChatForFile(docPath)
    expect(second).toEqual(first)
  })

  it('migrates a legacy mapping without a signature: keeps chat, records sig', () => {
    const first = store.resolveChatForFile(docPath)
    // Strip the signature to simulate an index written before this feature.
    const indexPath = join(tmpDir, 'projects', 'index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      chatSigByPath?: Record<string, unknown>
    }
    delete index.chatSigByPath
    writeFileSync(indexPath, JSON.stringify(index))
    const second = store.resolveChatForFile(docPath)
    expect(second).toEqual(first)
    const migrated = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      chatSigByPath?: Record<string, { i?: number; b?: number }>
    }
    expect(Object.keys(migrated.chatSigByPath ?? {}).length).toBeGreaterThan(0)
  })

  it('does not refresh a foreign path (noteFileWritten is a no-op without a mapping)', () => {
    const other = join(tmpDir, 'other.docx')
    writeFileSync(other, 'x')
    store.noteFileWritten(other)
    expect(existsSync(join(tmpDir, 'projects', 'index.json'))).toBe(false)
  })
})
