import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ProjectStore } from '../src/store.js'

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'project-store-history-test-'))
}

describe('chat history (titles + sessions)', () => {
  let tmpDir: string
  let store: ProjectStore

  beforeEach(() => {
    tmpDir = makeTempDir()
    store = new ProjectStore(tmpDir)
    store.ensureDefaultProject()
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('setChatTitle stores titles and listChatSessions returns them newest-first', () => {
    const fileA = join(tmpDir, 'a.docx')
    const fileB = join(tmpDir, 'b.docx')
    writeFileSync(fileA, 'a')
    writeFileSync(fileB, 'b')
    const rA = store.resolveChatForFile(fileA)
    const rB = store.resolveChatForFile(fileB)
    store.appendChatMessage(rA.projectId, rA.chatId, { role: 'user', text: 'fix budget' })
    store.appendChatMessage(rA.projectId, rA.chatId, { role: 'assistant', text: 'done' })
    store.appendChatMessage(rB.projectId, rB.chatId, { role: 'user', text: 'make slides' })
    store.appendChatMessage(rB.projectId, rB.chatId, { role: 'assistant', text: 'ok' })
    store.setChatTitle(rA.projectId, rA.chatId, {
      title: 'Budget fix',
      preview: 'fix budget',
      provider: 'vega',
    })
    store.setChatTitle(rB.projectId, rB.chatId, {
      title: 'Slides draft',
      preview: 'make slides',
      provider: 'vega',
    })

    const all = store.listChatSessions()
    expect(all).toHaveLength(2)
    // b was touched last → first
    expect(all[0]!.title).toBe('Slides draft')
    expect(all[1]!.title).toBe('Budget fix')
    expect(all[0]!.fileName).toBe('b.docx')
  })

  it('searches title + preview + file name, case-insensitively', () => {
    const fileA = join(tmpDir, 'report.docx')
    writeFileSync(fileA, 'a')
    const rA = store.resolveChatForFile(fileA)
    store.appendChatMessage(rA.projectId, rA.chatId, { role: 'user', text: 'hello' })
    store.appendChatMessage(rA.projectId, rA.chatId, { role: 'assistant', text: 'hi' })
    store.setChatTitle(rA.projectId, rA.chatId, { title: 'Budget review', preview: 'Q3 numbers' })

    expect(store.listChatSessions({ query: 'budget' })).toHaveLength(1)
    expect(store.listChatSessions({ query: 'Q3 NUMBERS' })).toHaveLength(1)
    expect(store.listChatSessions({ query: 'report' })).toHaveLength(1)
    expect(store.listChatSessions({ query: 'nope-nothing' })).toHaveLength(0)
  })

  it('beginNewChatSession keeps the old transcript reachable and repoints the file', () => {
    const file = join(tmpDir, 'doc.docx')
    writeFileSync(file, 'x')
    const first = store.resolveChatForFile(file)
    store.appendChatMessage(first.projectId, first.chatId, { role: 'user', text: 'one' })
    store.appendChatMessage(first.projectId, first.chatId, { role: 'assistant', text: 'uno' })
    store.setChatTitle(first.projectId, first.chatId, { title: 'First chat', preview: 'one' })

    const second = store.beginNewChatSession(file)
    expect(second.chatId).not.toBe(first.chatId)
    // reopening the file lands on the new (latest) session
    expect(store.resolveChatForFile(file)).toEqual(second)
    // the old session is still listed
    const titles = store.listChatSessions().map((s) => s.title)
    expect(titles).toContain('First chat')
    // old messages survived
    expect(store.loadChat(first.projectId, first.chatId)).toHaveLength(2)
    expect(store.loadChat(second.projectId, second.chatId)).toHaveLength(0)
  })

  it('rejects traversal ids fail-closed', () => {
    expect(() => store.setChatTitle('default', '../evil', { title: 'x' })).toThrow()
    expect(() => store.setChatTitle('../evil', 'chat1', { title: 'x' })).toThrow()
  })
})
