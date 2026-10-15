// One-off: inject ribbon File-menu keys into per-locale i18n shards, sourcing
// translations from the main-process menu label tables (sheets-main.ts /
// docs-main.ts / shell index.ts) so renderer wording matches the native menu.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Extract `key: 'value'` string literals from each `  lang: { ... }` block.
function extractLabels(file, keys) {
  const src = readFileSync(file, 'utf8')
  const out = {}
  const blockRe = /^ {2}'?([a-zA-Z-]+)'?: \{/gm
  let m
  while ((m = blockRe.exec(src))) {
    const lang = m[1]
    const start = m.index + m[0].length
    // find the block end: a line that is exactly `  },` or `  }`
    const endMatch = /^ {2}\},?$/gm
    endMatch.lastIndex = start
    const end = endMatch.exec(src)
    const body = src.slice(start, end ? end.index : src.length)
    const labels = {}
    for (const key of keys) {
      const kv = new RegExp(`${key}: '((?:[^'\\\\]|\\\\.)*)'`, 'm').exec(body)
      if (kv) labels[key] = kv[1]
    }
    out[lang] = labels
  }
  return out
}

// Insert `  key: 'value',` lines before the object's closing `}` in a shard.
function inject(file, entries, comment) {
  const src = readFileSync(file, 'utf8')
  if (entries.some(([k]) => new RegExp(`\\b${k}:`).test(src))) {
    console.log('skip (already present):', file)
    return
  }
  const lines = entries.map(([k, v]) => `  ${k}: '${v.replace(/'/g, "\\'")}',`)
  const block = `${comment ? `  ${comment}\n` : ''}${lines.join('\n')}\n`
  // last top-level closing brace of the exported object
  const idx = src.search(/\n}( satisfies|\s*$)/)
  if (idx === -1) throw new Error(`no closing brace in ${file}`)
  writeFileSync(file, src.slice(0, idx) + '\n' + block + src.slice(idx + 1))
  console.log('updated:', file)
}

// ---------- sheets ----------
const sheetsLabels = extractLabels(join(root, 'apps/sheets/src/main/sheets-main.ts'), [
  'menuFile',
  'menuOpenWorkbook',
  'menuSave',
  'menuSaveAs',
  'menuExportPdf',
  'menuExportCsv',
  'menuPrint',
])

const sheetsDir = join(root, 'apps/sheets/src/renderer/i18n/app')
for (const f of readdirSync(sheetsDir)) {
  const lang = f.replace('.ts', '')
  const L = sheetsLabels[lang]
  if (!L) throw new Error(`sheets: no labels for ${lang}`)
  inject(join(sheetsDir, f), [
    ['appFileTab', L.menuFile],
    ['appFileOpen', L.menuOpenWorkbook],
    ['appFileSave', L.menuSave],
    ['appFileSaveAs', L.menuSaveAs],
    ['appFileExportPdf', L.menuExportPdf],
    ['appFileExportCsv', L.menuExportCsv],
    ['appFilePrint', L.menuPrint],
  ], '// Ribbon File menu')
}

// ---------- shared source: shell tMain (covers all 20 locales) ----------
const shellLabels = extractLabels(join(root, 'apps/shell/src/main/index.ts'), [
  'menuFile',
  'menuOpen',
  'menuSave',
  'menuSaveAs',
  'menuExportDocx',
  'menuExportPdf',
  'menuExportHtml',
  'menuOpenInDocs',
  'menuPrint',
])

// Inject keys into the `  lang: { ... }` block of a monolithic strings file
// (only blocks after `export const strings`, i.e. skip helper consts above it).
function injectLangBlock(file, lang, entries, comment) {
  const src = readFileSync(file, 'utf8')
  const from = src.indexOf('export const strings')
  if (from === -1) throw new Error(`no strings export in ${file}`)
  const key = lang.includes('-') ? `'${lang}'` : lang
  const start = src.indexOf(`  ${key}: {`, from)
  if (start === -1) throw new Error(`no ${lang} block in ${file}`)
  const bodyStart = src.indexOf('{', start) + 1
  const end = src.indexOf('\n  },', bodyStart)
  if (end === -1) throw new Error(`no block end for ${lang} in ${file}`)
  const body = src.slice(bodyStart, end)
  if (entries.some(([k]) => new RegExp(`\\b${k}:`).test(body))) {
    console.log(`skip ${lang} (already present):`, file)
    return
  }
  const lines = entries
    .map(([k, v]) => `    ${k}: '${v.replace(/'/g, "\\'")}',`)
    .join('\n')
  const block = `    ${comment ?? '// Ribbon File menu'}\n${lines}\n`
  writeFileSync(file, src.slice(0, end) + '\n' + block + src.slice(end))
}

// ---------- pdf (single strings.ts) ----------
const pdfFile = join(root, 'apps/pdf/src/renderer/i18n/strings.ts')
for (const [lang, L] of Object.entries(shellLabels)) {
  injectLangBlock(pdfFile, lang, [
    ['fileTab', L.menuFile],
    ['fileOpen', L.menuOpen],
    ['fileSaveAs', L.menuSaveAs],
  ])
}
console.log('pdf done')

// ---------- markdown (single strings.ts) ----------
const mdFile = join(root, 'apps/markdown/src/renderer/i18n/strings.ts')
for (const [lang, L] of Object.entries(shellLabels)) {
  injectLangBlock(mdFile, lang, [
    ['fileTab', L.menuFile],
    ['fileOpen', L.menuOpen],
    ['fileSave', L.menuSave],
    ['fileExportDocx', L.menuExportDocx],
    ['fileExportPdf', L.menuExportPdf],
    ['fileOpenInDocs', L.menuOpenInDocs],
    ['filePrint', L.menuPrint],
  ])
}
console.log('markdown done')

// ---------- html (per-locale shards) ----------
const htmlDir = join(root, 'apps/html/src/renderer/i18n/app')
for (const f of readdirSync(htmlDir)) {
  const lang = f.replace('.ts', '')
  const L = shellLabels[lang]
  if (!L) throw new Error(`html: no labels for ${lang}`)
  inject(join(htmlDir, f), [
    ['fileTab', L.menuFile],
    ['fileOpen', L.menuOpen],
    ['fileSave', L.menuSave],
    ['fileExportDocx', L.menuExportDocx],
    ['fileExportPdf', L.menuExportPdf],
    ['fileExportHtml', L.menuExportHtml],
    ['filePrint', L.menuPrint],
  ], '// Ribbon File menu')
}

// ---------- docs ribbon (per-locale shards; labels from docs-main) ----------
const docsLabels = extractLabels(join(root, 'apps/docs/src/main/docs-main.ts'), [
  'menuExportPdf',
  'menuExportHtml',
  'menuExportImages',
  'menuPrint',
])
const docsDir = join(root, 'apps/docs/src/renderer/i18n/ribbon')
for (const f of readdirSync(docsDir)) {
  const lang = f.replace('.ts', '')
  const L = docsLabels[lang]
  if (!L) throw new Error(`docs: no labels for ${lang}`)
  inject(join(docsDir, f), [
    ['ribbonExportPdf', L.menuExportPdf],
    ['ribbonExportHtml', L.menuExportHtml],
    ['ribbonExportImages', L.menuExportImages],
    ['ribbonPrint', L.menuPrint],
  ], '// File menu')
}
