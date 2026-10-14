import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

const appSrc = read('src/renderer/App.tsx')
const shellSrc = read('src/renderer/ExcelShell.tsx')
const enSrc = read('src/renderer/i18n/app/en.ts')
const cssSrc = read('src/renderer/styles.css')

describe('File menu in the ribbon tab row', () => {
  it('renders the accent File capsule left of the quick-access Save', () => {
    expect(shellSrc).toMatch(/file-tab-wrap[\s\S]*?ribbon-tab-file[\s\S]*?appFileTab/)
    // File wrap precedes the Save qa-btn in the tab row
    expect(shellSrc).toMatch(/file-tab-wrap[\s\S]*?className="qa-btn"[\s\S]*?onClick=\{onSave\}/)
  })

  it('routes menu items through the same handler as the native File menu', () => {
    expect(shellSrc).toContain("onFileAction('open')")
    expect(shellSrc).toContain("onFileAction('print')")
    expect(shellSrc).toContain("onFileAction('export-pdf')")
    expect(shellSrc).toContain("onFileAction('export-csv')")
    expect(appSrc).toContain('onFileAction={(action) => menuActionRef.current(action)}')
  })

  it('has localized labels and token-based styles', () => {
    for (const key of [
      'appFileTab',
      'appFileOpen',
      'appFileSave',
      'appFileSaveAs',
      'appFileExportPdf',
      'appFileExportCsv',
      'appFilePrint',
    ]) {
      expect(enSrc).toContain(`${key}:`)
    }
    expect(cssSrc).toContain('.ribbon-tab-file')
    expect(cssSrc).toContain('.file-menu')
  })
})
