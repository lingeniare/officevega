/**
 * Settings › "show the AI sidebar" is a HARD off in OfficeVega: unlike
 * upstream's soft hide, flipping the switch closes the panel and removes the
 * Ask-AI entry points (ribbon buttons, menu items) entirely — no ask action
 * can reopen it while the switch is off. Docs, slides and sheets read it
 * through `useAiSidebarEnabled(set…)` (which also closes the panel); the other
 * editors read `useAiPanelPrefs().showAiSidebar` and gate the panel plus the
 * ribbon entries on the value.
 *
 * Mounting six editors is out of reach in one suite, so what is assertable
 * here is the wiring: each editor reads the switch, hands the panel setter to
 * the shared mechanism where it uses one, and hard-gates the AI surface on
 * the flag. An editor that dropped the read would keep a live Ask-AI entry
 * into a disabled feature — so every call site is pinned by name, along with
 * the derived-state workaround (`aiOpenedExplicitly`) that must not return.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Every editor that owns an AI dock: how it reads the switch, and (for docs,
 * the one app on the shared hook) the panel setter it hands over. */
const EDITORS = [
  {
    app: 'docs',
    file: 'apps/docs/src/renderer/App.tsx',
    read: 'useAiSidebarEnabled(setShowAi)',
  },
  {
    app: 'slides',
    file: 'apps/slides/src/renderer/App.tsx',
    read: 'useAiSidebarEnabled(setShowAi)',
  },
  { app: 'html', file: 'apps/html/src/renderer/App.tsx', read: 'useAiPanelPrefs().showAiSidebar' },
  {
    app: 'markdown',
    file: 'apps/markdown/src/renderer/App.tsx',
    read: 'useAiPanelPrefs().showAiSidebar',
  },
  { app: 'pdf', file: 'apps/pdf/src/renderer/App.tsx', read: 'useAiPanelPrefs().showAiSidebar' },
  {
    app: 'sheets',
    file: 'apps/sheets/src/renderer/ExcelShell.tsx',
    read: 'useAiSidebarEnabled(setIsCopilotOpen)',
  },
]

const source = (file: string) => readFileSync(join(repoRoot, file), 'utf8')

describe('the AI sidebar switch reaches every editor', () => {
  it.each(EDITORS)('$app reads the switch through the shared pref', ({ file, read }) => {
    const code = source(file)
    expect(code).toContain(read)
  })

  it.each(EDITORS)('$app hard-gates the AI surface on the switch', ({ file }) => {
    const code = source(file)
    // hard-off: the ribbon Ask-AI entries and the panel itself render only
    // while the flag is on — a soft-hide would keep the entries clickable
    expect(code).toMatch(/aiEnabled && \(/)
  })

  it.each(EDITORS)(
    '$app does not gate the panel on a derived "opened explicitly" flag',
    ({ file }) => {
      const code = source(file)
      expect(code).not.toMatch(/aiOpenedExplicitly|prevShowAiRef/)
    },
  )
})
