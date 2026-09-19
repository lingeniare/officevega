import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

const appSrc = read('src/renderer/App.tsx')
const ipcSrc = read('src/shared/ipc.ts')
const stringsSrc = read('src/renderer/i18n/strings.ts')
const cssSrc = read('src/renderer/styles.css')

describe('File menu in the ribbon tab row', () => {
  it('renders the accent File capsule immediately left of the quick-access Save', () => {
    expect(appSrc).toMatch(/file-tab-wrap[\s\S]*?ribbon-tab-file[\s\S]*?fileTab/)
    // the first control after the File wrap is the Save qa-btn
    expect(appSrc).toMatch(
      /file-tab-wrap[\s\S]*?<\/div>\s*\)\}[\s\S]*?className="qa-btn"[\s\S]*?void save\(\)/,
    )
  })

  it('wires menu items to the shared open/save-as channels and existing actions', () => {
    expect(appSrc).toContain('window.pdfApi.requestOpenDialog()')
    expect(appSrc).toContain('window.pdfApi.requestSaveAsDialog()')
    expect(appSrc).toContain("convertTo('docx')")
    expect(appSrc).toContain("convertTo('xlsx')")
    expect(appSrc).toContain("convertTo('pptx')")
    expect(appSrc).toContain('openPrintDlg()')
    expect(ipcSrc).toContain('requestSaveAsDialog(): void')
    expect(ipcSrc).toContain('requestOpenDialog(): void')
  })

  it('has localized labels and token-based styles', () => {
    for (const key of ['fileTab', 'fileOpen', 'fileSaveAs']) {
      expect(stringsSrc).toContain(`${key}:`)
    }
    expect(cssSrc).toContain('.ribbon-tab-file')
    expect(cssSrc).toContain('.file-menu')
    expect(cssSrc).toContain('var(--accent)')
  })
})
