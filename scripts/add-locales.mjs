// Add new UI locales (uz, kk, az, tk, ky, tt, ka) across every app dictionary.
// English is the source; strings are translated in batches through an
// OpenAI-compatible chat endpoint (api.vega.chat / OpenRouter proxy).
//
// Usage:
//   VEGA_API_KEY=sk-... node scripts/add-locales.mjs            # full run
//   node scripts/add-locales.mjs --check                        # validate only
//   node scripts/add-locales.mjs --langs=uz,ka --only=markdown  # partial run
//
// The script is resumable: translations are cached in
// scripts/.add-locales-cache.json, so a re-run skips finished strings.
// The API key is read from the environment only — never written to disk.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NEW_LANGS = ['uz', 'kk', 'az', 'tk', 'ky', 'tt', 'ka']
const LANG_NAMES = {
  uz: 'Uzbek (Latin script)',
  kk: 'Kazakh (Cyrillic script)',
  az: 'Azerbaijani (Latin script)',
  tk: 'Turkmen (Latin script)',
  ky: 'Kyrgyz (Cyrillic script)',
  tt: 'Tatar (Cyrillic script)',
  ka: 'Georgian (Georgian script)',
  en: 'English',
  ru: 'Russian',
}

const API_KEY = process.env.VEGA_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
const BASE_URL = (process.env.VEGA_BASE_URL ?? 'https://api.vega.chat/api/v1').replace(/\/$/, '')
const MODEL = process.env.TRANSLATE_MODEL ?? 'openai/gpt-5.6-luna'
const CONCURRENCY = Number(process.env.TRANSLATE_CONCURRENCY ?? 6)
const BATCH_ITEMS = Number(process.env.TRANSLATE_BATCH ?? 80)
const BATCH_CHARS = 4000

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const CHECK_ONLY = argv.includes('--check')
const ONLY = argv.find((a) => a.startsWith('--only='))?.slice(7)
const LANGS_FILTER = argv
  .find((a) => a.startsWith('--langs='))
  ?.slice(8)
  ?.split(',')
const langs = LANGS_FILTER ?? NEW_LANGS

// ---------------------------------------------------------------------------
// string-literal helpers
// ---------------------------------------------------------------------------

/** decode a JS string literal ('x', "x", `x`) */
function evalLit(lit) {
  return Function(`"use strict"; return (${lit})`)()
}

/** re-encode a string as a single-quoted TS literal */
function emitLit(value) {
  const body = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(
      // eslint-disable-next-line no-control-regex -- literal escaping must catch control chars
      /[\u0000-\u001f\u2028\u2029]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    )
  return `'${body}'`
}

/** if s starts with a string literal return its end index, else -1 */
function literalEnd(s) {
  const q = s[0]
  if (q !== "'" && q !== '"' && q !== '`') return -1
  for (let i = 1; i < s.length; i++) {
    if (s[i] === '\\') i++
    else if (s[i] === q) return i + 1
  }
  return -1
}

/**
 * Parse the inner lines of a `{ ... }` object literal into ordered items:
 *   { kind:'entry', key, value }     — key: 'string' (literal may sit on the
 *                                      next line when prettier wrapped it)
 *   { kind:'raw', text }             — comments, blanks, spreads, aliases
 * Throws on anything it cannot classify.
 */
function parseEntries(lines, where) {
  const items = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const t = line.trim()
    if (!t || t.startsWith('//')) {
      items.push({ kind: 'raw', text: line })
      continue
    }
    const m = /^(\s*)(?:'([^'\n]+)'|(\w+))\s*:\s*(.*)$/.exec(line)
    if (!m) {
      if (t.startsWith('...')) {
        items.push({ kind: 'raw', text: line })
        continue
      }
      throw new Error(`${where}: cannot parse line ${JSON.stringify(line)}`)
    }
    const key = m[2] ?? m[3]
    let rest = m[4]
    let end = i
    for (;;) {
      const trimmed = rest.trimStart()
      if (trimmed && (trimmed[0] === "'" || trimmed[0] === '"' || trimmed[0] === '`')) {
        const le = literalEnd(trimmed)
        if (le !== -1 && /^[,\s]*(\/\/.*)?$/.test(trimmed.slice(le))) {
          items.push({ kind: 'entry', key, value: evalLit(trimmed.slice(0, le)) })
          break
        }
        if (end + 1 >= lines.length) throw new Error(`${where}: unterminated literal for ${key}`)
        end++
        rest += '\n' + lines[end]
        continue
      }
      if (trimmed) {
        // `key: identifier,` / number / expression — keep verbatim
        items.push({ kind: 'raw', text: lines.slice(i, end + 1).join('\n') })
        break
      }
      // `key:` alone — the literal is on the following line(s)
      if (end + 1 >= lines.length) throw new Error(`${where}: empty value for ${key}`)
      end++
      rest += '\n' + lines[end]
    }
    i = end
  }
  return items
}

/** placeholders like {name} / {count} */
const placeholdersOf = (s) => (s.match(/\{[^{}]*\}/g) ?? []).sort()

/** drop blank raw lines at the edges of an item list */
function trimBlanks(items) {
  const isBlank = (it) => it.kind === 'raw' && !it.text.trim()
  let a = 0
  let b = items.length
  while (a < b && isBlank(items[a])) a++
  while (b > a && isBlank(items[b - 1])) b--
  return items.slice(a, b)
}

// ---------------------------------------------------------------------------
// brace-aware dict scanner (skips strings and comments)
// ---------------------------------------------------------------------------

function matchingBrace(src, openIdx) {
  let depth = 0
  let i = openIdx
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      const end = literalEnd(src.slice(i))
      if (end === -1) throw new Error('unterminated string in file')
      i += end
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i)
      if (i === -1) return -1
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 2
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

/**
 * Find `{ lang: { ... }, ... }` dictionaries in a file (top-level `  xx: {`
 * blocks whose keys are language codes). Returns one descriptor per dict:
 * { dictStart, dictEnd, blocks: Map<lang, {open, end}> }.
 */
function findLangDicts(src, langsSet) {
  const dicts = []
  const re = /^ {0,2}'?([a-zA-Z-]+)'?: \{\s*$/gm
  let m
  while ((m = re.exec(src))) {
    const lang = m[1]
    if (!langsSet.has(lang)) continue
    // dict's opening '{' is the last char of the previous non-empty line
    const prevNl = src.lastIndexOf('\n', m.index - 2)
    const prevLine = src.slice(prevNl + 1, m.index - 1)
    if (!prevLine.trimEnd().endsWith('{')) continue
    const openIdx = prevNl + 1 + prevLine.lastIndexOf('{')
    const dictEnd = matchingBrace(src, openIdx)
    if (dictEnd === -1) continue
    if (dicts.some((d) => d.dictStart === openIdx)) continue
    const blocks = new Map()
    const bre = /^ {2}'?([a-zA-Z-]+)'?: \{\s*$/gm
    bre.lastIndex = openIdx
    let b
    while ((b = bre.exec(src)) && b.index < dictEnd) {
      const bOpen = src.indexOf('{', b.index)
      blocks.set(b[1], { open: bOpen, end: matchingBrace(src, bOpen) })
    }
    dicts.push({ dictStart: openIdx, dictEnd, blocks })
    re.lastIndex = dictEnd
  }
  return dicts
}

/** entries of a lang block: lines between `  xx: {` and its `  }` */
function blockEntries(src, block, where) {
  return parseEntries(src.slice(block.open + 1, block.end).split('\n'), where)
}

// ---------------------------------------------------------------------------
// LLM translation
// ---------------------------------------------------------------------------

const CACHE_FILE = join(root, 'scripts', '.add-locales-cache.json')
const cache = existsSync(CACHE_FILE)
  ? new Map(Object.entries(JSON.parse(readFileSync(CACHE_FILE, 'utf8'))))
  : new Map()
let cacheDirty = false
const saveCache = () => {
  if (cacheDirty) {
    writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)))
    cacheDirty = false
  }
}
const cacheKey = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16)

let requestsDone = 0
async function llmBatch(lang, pairs, attempt = 0) {
  const obj = Object.fromEntries(pairs.map((p, i) => [`s${i}`, p]))
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 16000,
      messages: [
        {
          role: 'system',
          content:
            `You are a professional UI localization engine for an office suite. ` +
            `Translate JSON string VALUES from English to ${LANG_NAMES[lang]}. ` +
            `Rules: keep every JSON key unchanged; translate only the values; ` +
            `preserve {placeholder} tokens (e.g. {name}, {count}) byte-for-byte; ` +
            `preserve shortcut glyphs ⌘ ⇧ ⌥ ⌃ ⌫ ⏎ and HTML tags/entities unchanged; ` +
            `keep brand names (VEGA, Excel, PDF…) and technical tokens untranslated; ` +
            `use concise operating-system UI wording; return ONLY the JSON object.`,
        },
        { role: 'user', content: JSON.stringify(obj) },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)))
      return llmBatch(lang, pairs, attempt + 1)
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  let text = data.choices?.[0]?.message?.content ?? ''
  text = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    const a = text.indexOf('{')
    const b = text.lastIndexOf('}')
    if (a === -1 || b <= a) throw new Error(`non-JSON reply: ${text.slice(0, 200)}`)
    parsed = JSON.parse(text.slice(a, b + 1))
  }
  return pairs.map((src, i) => [src, parsed[`s${i}`]])
}

/** translate a list of unique strings into one language, with retries */
async function translateAll(lang, texts) {
  const pending = texts.filter((t) => cache.get(cacheKey(t))?.[lang] === undefined)
  if (!pending.length) return
  console.log(`  ${lang}: ${pending.length} strings to translate`)
  const chunks = []
  let cur = []
  let curLen = 0
  for (const t of pending) {
    cur.push(t)
    curLen += t.length
    if (cur.length >= BATCH_ITEMS || curLen >= BATCH_CHARS) {
      chunks.push(cur)
      cur = []
      curLen = 0
    }
  }
  if (cur.length) chunks.push(cur)

  let next = 0
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++]
      try {
        const out = await llmBatch(lang, chunk)
        for (const [src, dst] of out) {
          if (typeof dst === 'string' && dst.trim()) {
            const k = cacheKey(src)
            cache.set(k, { text: src, ...(cache.get(k) ?? {}), [lang]: dst })
            cacheDirty = true
          }
        }
      } catch (err) {
        // fall back to per-string translation so one bad batch doesn't stall the run
        for (const src of chunk) {
          try {
            const out = await llmBatch(lang, [src])
            const dst = out[0]?.[1]
            if (typeof dst === 'string' && dst.trim()) {
              const k = cacheKey(src)
              cache.set(k, { text: src, ...(cache.get(k) ?? {}), [lang]: dst })
              cacheDirty = true
            }
          } catch (e2) {
            console.warn(`    ! failed ${lang}: ${src.slice(0, 60)} — ${e2.message}`)
          }
        }
        console.warn(`    batch fell back to singles (${err.message})`)
      }
      requestsDone++
      if (requestsDone % 10 === 0) {
        saveCache()
        console.log(`    …${requestsDone} batches done`)
      }
    }
  })
  await Promise.all(workers)
  saveCache()

  // placeholder check + one focused retry per offender
  const bad = texts.filter((t) => {
    const dst = cache.get(cacheKey(t))?.[lang]
    if (typeof dst !== 'string') return true
    const a = placeholdersOf(t)
    const b = placeholdersOf(dst)
    return a.length !== b.length || a.some((p, i) => p !== b[i])
  })
  for (const src of bad) {
    try {
      const out = await llmBatch(lang, [src])
      const dst = out[0]?.[1]
      const a = placeholdersOf(src)
      const b = placeholdersOf(typeof dst === 'string' ? dst : '')
      if (typeof dst === 'string' && dst.trim() && a.join() === b.join()) {
        const k = cacheKey(src)
        cache.set(k, { text: src, ...(cache.get(k) ?? {}), [lang]: dst })
        cacheDirty = true
      } else {
        console.warn(`    ! placeholders ${lang}: ${src.slice(0, 70)}`)
      }
    } catch {
      /* keep previous value / English */
    }
  }
  saveCache()
}

const translate = (lang, text) => cache.get(cacheKey(text))?.[lang] ?? text

// ---------------------------------------------------------------------------
// file processors
// ---------------------------------------------------------------------------

const ALL_LANGS = new Set(['en', 'ru', ...NEW_LANGS])

const touched = []

function mark(file) {
  touched.push(file)
}

/** parse a shard dir's en.ts → ordered items; write <lang>.ts per new lang */
function processShardDir(dir) {
  const enFile = join(root, dir, 'en.ts')
  const src = readFileSync(enFile, 'utf8')
  const exp = src.match(/export const en = \{/)
  if (!exp) throw new Error(`${dir}: no 'export const en = {'`)
  const openIdx = src.indexOf('{', exp.index)
  const endIdx = matchingBrace(src, openIdx)
  const tail = src.slice(endIdx + 1) // ` satisfies Record<keyof typeof en, string>` etc.
  const items = parseEntries(src.slice(openIdx + 1, endIdx).split('\n'), `${dir}/en.ts`)

  for (const lang of langs) {
    const body = trimBlanks(items)
      .map((it) =>
        it.kind === 'entry' ? `  ${it.key}: ${emitLit(translate(lang, it.value))},` : it.text,
      )
      .join('\n')
    const out = `${src.slice(0, exp.index)}export const ${lang} = {\n${body}\n}${tail}`
    writeFileSync(join(root, dir, `${lang}.ts`), out)
  }
  mark(`${dir}/{${langs.join(',')}}.ts`)
}

/** add `import { xx }` + dict entries to strings-<name>.ts aggregator */
function patchAggregator(file, dirName) {
  let src = readFileSync(join(root, file), 'utf8')
  const missing = langs.filter((l) => !src.includes(`from './${dirName}/${l}'`))
  if (!missing.length) return // already patched
  const importAnchor = `import { ka } from './${dirName}/ka'`
  if (!src.includes(importAnchor)) throw new Error(`${file}: no ka import`)
  src = src.replace(
    importAnchor,
    `${importAnchor}\n${missing.map((l) => `import { ${l} } from './${dirName}/${l}'`).join('\n')}`,
  )
  const dictAnchor = `  ka,`
  if (!src.includes(dictAnchor)) throw new Error(`${file}: no ka dict entry`)
  src = src.replace(dictAnchor, `${dictAnchor}\n${missing.map((l) => `  ${l},`).join('\n')}`)
  writeFileSync(join(root, file), src)
  mark(file)
}

/**
 * Inline dictionary file: insert `  xx: { ... }` blocks before each dict's
 * closing brace. dicts: { anchor } — unique string right before the dict's
 * '{'; enConst — name of a top-level const when the dict has no `en:` block.
 */
function processInlineDicts(file, dicts) {
  let src = readFileSync(join(root, file), 'utf8')
  for (const d of dicts) {
    const anchorIdx = src.indexOf(d.anchor)
    if (anchorIdx === -1) throw new Error(`${file}: no anchor ${d.anchor}`)
    const openIdx = src.indexOf('{', anchorIdx)
    const dictEnd = matchingBrace(src, openIdx)
    let enItems
    if (d.enConst) {
      const cIdx = src.indexOf(`const ${d.enConst}`)
      if (cIdx === -1) throw new Error(`${file}: no const ${d.enConst}`)
      const cOpen = src.indexOf('{', cIdx)
      const cEnd = matchingBrace(src, cOpen)
      enItems = parseEntries(src.slice(cOpen + 1, cEnd).split('\n'), `${file}:${d.enConst}`)
    } else {
      const enM = /^ {2}en: \{\s*$/m.exec(src.slice(openIdx, dictEnd))
      if (!enM) throw new Error(`${file}: no 'en: {' block in ${d.anchor}`)
      const enOpen = src.indexOf('{', openIdx + enM.index)
      const enEnd = matchingBrace(src, enOpen)
      enItems = blockEntries(src, { open: enOpen, end: enEnd }, `${file}:en`)
    }
    let insert = ''
    for (const lang of langs) {
      const blockRe = new RegExp(`^ {2}${lang}: \\{`, 'm')
      if (blockRe.test(src.slice(openIdx, dictEnd))) continue // already present
      const body = trimBlanks(enItems)
        .map((it) =>
          it.kind === 'entry'
            ? `    ${it.key}: ${emitLit(translate(lang, it.value))},`
            : it.text.replace(/\('en'\)/g, `('${lang}')`),
        )
        .join('\n')
      insert += `  ${lang}: {\n${body}\n  },\n`
    }
    // ensure the previous last block ends with a comma
    const before = src.slice(0, dictEnd)
    const fixed = /,\s*$/.test(before) ? before : before.replace(/}(\s*)$/, '},$1')
    src = fixed + insert + src.slice(dictEnd)
  }
  writeFileSync(join(root, file), src)
  mark(file)
}



/** append missing [key,en] entries to every <lang>.ts in a shard dir */
function appendShardKeys(dir, entries) {
  for (const f of readdirSync(join(root, dir))) {
    if (!f.endsWith('.ts')) continue
    const lang = f.replace(/\.ts$/, '')
    const file = join(root, dir, f)
    let src = readFileSync(file, 'utf8')
    const missing = entries.filter(([k]) => !new RegExp(`\\b${k}:`).test(src))
    if (!missing.length) continue
    const endRe = /\n}( satisfies[^\n]*)?\n?$/
    const m = endRe.exec(src)
    if (!m) throw new Error(`${file}: no object tail`)
    const ins = missing
      .map(([k, en]) => `  ${k}: ${emitLit(en)},`)
      .join('\n')
    src = src.slice(0, m.index) + '\n' + ins + src.slice(m.index)
    writeFileSync(file, src)
  }
  mark(`${dir}/* (+${entries.length} keys)`)
}

/** append missing [key,en] entries inside each lang block of an inline dict */
function appendInlineKeys(file, dictAnchor, entries) {
  let src = readFileSync(join(root, file), 'utf8')
  const anchorIdx = src.indexOf(dictAnchor)
  if (anchorIdx === -1) throw new Error(`${file}: no anchor ${dictAnchor}`)
  const openIdx = src.indexOf('{', anchorIdx)
  const dictEnd = matchingBrace(src, openIdx)
  const blocks = new Map()
  const bre = /^ {2}'?([a-zA-Z-]+)'?: \{\s*$/gm
  bre.lastIndex = openIdx
  let b
  while ((b = bre.exec(src)) && b.index < dictEnd) {
    const bOpen = src.indexOf('{', b.index)
    blocks.set(b[1], { open: bOpen, end: matchingBrace(src, bOpen) })
  }
  const edits = []
  for (const [lang, block] of blocks) {
    const body = src.slice(block.open, block.end)
    const missing = entries.filter(([k]) => !new RegExp(`\\b${k}:`).test(body))
    if (!missing.length) continue
    const ins = missing
      .map(([k, en]) => `    ${k}: ${emitLit(en)},`)
      .join('\n')
    edits.push([block.end, ins])
  }
  edits.sort((a, b) => b[0] - a[0]) // back-to-front keeps earlier offsets valid
  for (const [pos, ins] of edits) src = src.slice(0, pos) + ins + '\n' + src.slice(pos)
  writeFileSync(file, src)
  mark(`${file} (+${entries.length} keys)`)
}

/** merger strings.ts: clone the ka spread entry per new lang */
function processMerger(file) {
  let src = readFileSync(join(root, file), 'utf8')
  const re = /^ {2}ka: \{[^}]*\},\n?/m
  const m = re.exec(src)
  if (!m) throw new Error(`${file}: no ka merger entry`)
  const tpl = m[0]
  const clone = langs
    .filter((l) => !new RegExp(`^ {2}${l}: \\{`, 'm').test(src))
    .map(
      (l) =>
        `  ${l}: ` +
        tpl
          .slice(tpl.indexOf('{'))
          .replace(/\['ka'\]/g, `.${l}`)
          .replace(/\bka\b/g, l),
    )
    .join('')
  src = src.slice(0, m.index + tpl.length) + clone + src.slice(m.index + tpl.length)
  writeFileSync(join(root, file), src)
  mark(file)
}

// ---------------------------------------------------------------------------
// targets
// ---------------------------------------------------------------------------

const SHARD_DIRS = [
  'apps/docs/src/renderer/i18n/ai',
  'apps/docs/src/renderer/i18n/app',
  'apps/docs/src/renderer/i18n/ribbon',
  'apps/html/src/renderer/i18n/ai',
  'apps/html/src/renderer/i18n/app',
  'apps/sheets/src/renderer/i18n/ai',
  'apps/sheets/src/renderer/i18n/app',
  'apps/sheets/src/renderer/i18n/dialogs',
  'apps/slides/src/renderer/i18n/ai',
  'apps/slides/src/renderer/i18n/app',
  'apps/slides/src/renderer/i18n/panes',
  'apps/slides/src/renderer/i18n/ribbon',
]

const AGGREGATORS = SHARD_DIRS.map((d) => {
  const parts = d.split('/')
  return [`${parts.slice(0, -1).join('/')}/strings-${parts.at(-1)}.ts`, parts.at(-1)]
})

const INLINE_DICT_FILES = [
  ['apps/markdown/src/renderer/i18n/strings.ts', [{ anchor: 'export const strings = {' }]],
  [
    'apps/pdf/src/renderer/i18n/strings.ts',
    [
      { anchor: 'const localizedFillFormStrings = {', enConst: 'fillFormStrings' },
      { anchor: 'export const strings = {' },
    ],
  ],
  ['apps/shell/src/renderer/src/strings.ts', [{ anchor: 'export const strings = {' }]],
  ['apps/docs/src/renderer/i18n/strings-editor.ts', [{ anchor: 'defineStrings({' }]],
  ['apps/docs/src/renderer/i18n/strings-zotero.ts', [{ anchor: 'defineStrings({' }]],
  ['apps/docs/src/main/docs-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/sheets/src/main/sheets-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/slides/src/main/i18n-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/pdf/src/main/pdf-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/markdown/src/main/markdown-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/html/src/main/html-main.ts', [{ anchor: 'createI18n({' }]],
  ['apps/shell/src/main/index.ts', [{ anchor: 'createI18n({' }]],
  ['apps/shell/src/main/updater.ts', [{ anchor: 'createI18n({' }]],
  ['apps/docs/src/main/updater.ts', [{ anchor: 'createI18n({' }]],
  [
    'packages/electron-utils/src/app-menu.ts',
    [{ anchor: 'const LABELS: Record<string, Labels> = {', enConst: 'EN' }],
  ],
  [
    'packages/electron-utils/src/context-menu.ts',
    [{ anchor: 'const LABELS: Record<string, ContextMenuLabels> = {', enConst: 'EN' }],
  ],
]

const MERGERS = [
  'apps/docs/src/renderer/i18n/strings.ts',
  'apps/sheets/src/renderer/i18n/strings.ts',
  'apps/slides/src/renderer/i18n/strings.ts',
  'apps/html/src/renderer/i18n/strings.ts',
]

// Keys the components reference but no dictionary defines yet (tooltip-detail
// wiring in progress). Each entry: [key, enText] — en authored here,
// every other language gets the LLM translation of enText.
const EXTRA_KEYS = [
  // [shardDirOrInlineFile, [[key, en], ...]]
  [
    'apps/docs/src/renderer/i18n/ribbon',
    [
      ['ribbonMarginsTip', 'Choose the page margins'],
      ['ribbonOrientationTip', 'Switch between portrait and landscape'],
      ['ribbonPaperSizeTip', 'Choose the paper size'],
      ['ribbonColumnsTip', 'Split the text into columns'],
      ['ribbonIndentLeftTip', 'Paragraph left indent, in points'],
      ['ribbonIndentRightTip', 'Paragraph right indent, in points'],
      ['ribbonSpaceBeforeTip', 'Spacing before the paragraph, in points'],
      ['ribbonSpaceAfterTip', 'Spacing after the paragraph, in points'],
      ['ribbonPositionTip', 'Choose where the object sits on the page'],
      ['ribbonWrapTextTip', 'Choose how text wraps around the object'],
      [
        'ribbonDropCapTip',
        'Add a large initial letter at the start of the paragraph',
      ],
      ['ribbonPageNumberTip', 'Insert a page number'],
      ['ribbonAutoFitTip', 'Resize table columns to fit automatically'],
      ['ribbonZoomInTip', 'Zoom in'],
      ['ribbonZoomOutTip', 'Zoom out'],
    ],
  ],
  [
    'apps/sheets/src/renderer/i18n/app',
    [
      ['appConditionalFormattingTip', 'Highlight cells based on rules'],
      [
        'appCrossHighlightTip',
        'Highlight the row and column of the active cell',
      ],
      ['appDefineNameTip', 'Define a named range'],
      ['appEquationTip', 'Insert an equation'],
      ['appFormulaBarTip', 'Show or hide the formula bar'],
      ['appGridlinesTip', 'Show or hide gridlines'],
      ['appHeadingsTip', 'Show or hide row and column headings'],
      ['appIconsTip', 'Insert an icon'],
      ['appReplaceTip', 'Find and replace text'],
      ['appScreenshotTip', 'Insert a screenshot'],
      ['appSymbolTip', 'Insert a symbol'],
    ],
  ],
  [
    'apps/slides/src/renderer/i18n/ribbon',
    [
      ['ribbonCollapsedGroupTip', 'Show the hidden commands of this group'],
      ['ribbonGroupParagraphTip', 'Paragraph settings'],
      ['ribbonBulletPictureTip', 'Use a picture as the bullet'],
      ['ribbonNoneTip', 'Remove bullets'],
      ['ribbonMoreColorsTip', 'Pick a custom color'],
      ['ribbonChangeChartTypeTip', 'Change the chart type'],
      [
        'ribbonReplacePictureTip',
        'Replace the picture, keeping its formatting',
      ],
      ['ribbonTransparencyTip', 'Set the picture transparency'],
      ['ribbonChangeShapeTip', 'Change the selected shape'],
    ],
  ],
  [
    'apps/slides/src/renderer/i18n/panes',
    [
      ['paneFormatFillTip', 'Fill options for the selection'],
      ['paneFormatOutlineTip', 'Outline options for the selection'],
    ],
  ],
  [
    'apps/html/src/renderer/i18n/app',
    [
      ['saveAsTip', 'Save a copy with a new name'],
      ['aiThemeTip', 'Restyle the page with AI', '用 AI 重新设计页面样式'],
      ['modePresentTip', 'Preview the page full-screen'],
      ['viewPreviewTip', 'Rendered preview'],
      ['viewSplitTip', 'Side-by-side source and preview'],
      ['viewSourceTip', 'HTML source', 'HTML 源代码'],
      ['insertHeadingTip', 'Insert a heading'],
      ['insertParagraphTip', 'Insert a paragraph'],
      ['insertImageTip', 'Insert an image'],
      ['insertTableTip', 'Insert a table'],
      ['insertMoreTip', 'More insert options'],
    ],
  ],
  [
    'apps/pdf/src/renderer/i18n/strings.ts',
    [
      ['highlightTip', 'Highlight the selected text'],
      ['underlineTip', 'Underline the selected text'],
      ['strikeoutTip', 'Strike through the selected text'],
      ['drawColorTip', 'Pick the drawing color'],
      ['drawInkTip', 'Draw freehand on the page'],
      ['drawRectTip', 'Draw a rectangle annotation'],
      ['drawEllipseTip', 'Draw an ellipse annotation'],
      ['drawArrowTip', 'Draw an arrow annotation'],
      ['drawNoteTip', 'Add a sticky note'],
      ['nightModeTip', 'Invert colors for night reading'],
      ['redactClearTip', 'Remove all redaction marks'],
      ['redactApplyTip', 'Permanently remove the marked content'],
      ['formPreviousFieldTip', 'Go to the previous form field'],
      ['formNextFieldTip', 'Go to the next form field'],
    ],
  ],
  [
    'apps/markdown/src/renderer/i18n/strings.ts',
    [['saveAsTip', 'Save a copy with a new name']],
  ],
]

const OLD_LANGS = ['en', 'ru']

// ---------------------------------------------------------------------------
// collect every English source string up-front (global dedup → fewer calls)
// ---------------------------------------------------------------------------

function collectSources() {
  const texts = new Set()
  for (const dir of SHARD_DIRS) {
    if (ONLY && !dir.includes(ONLY)) continue
    const src = readFileSync(join(root, dir, 'en.ts'), 'utf8')
    const exp = src.match(/export const en = \{/)
    const openIdx = src.indexOf('{', exp.index)
    const endIdx = matchingBrace(src, openIdx)
    for (const it of parseEntries(src.slice(openIdx + 1, endIdx).split('\n'), `${dir}/en.ts`))
      if (it.kind === 'entry') texts.add(it.value)
  }
  for (const [file, dicts] of INLINE_DICT_FILES) {
    if (ONLY && !file.includes(ONLY)) continue
    const src = readFileSync(join(root, file), 'utf8')
    for (const d of dicts) {
      const anchorIdx = src.indexOf(d.anchor)
      const openIdx = src.indexOf('{', anchorIdx)
      const dictEnd = matchingBrace(src, openIdx)
      if (d.enConst) {
        const cIdx = src.indexOf(`const ${d.enConst}`)
        const cOpen = src.indexOf('{', cIdx)
        const cEnd = matchingBrace(src, cOpen)
        for (const it of parseEntries(
          src.slice(cOpen + 1, cEnd).split('\n'),
          `${file}:${d.enConst}`,
        ))
          if (it.kind === 'entry') texts.add(it.value)
      } else {
        const enM = /^ {2}en: \{\s*$/m.exec(src.slice(openIdx, dictEnd))
        if (!enM) throw new Error(`${file}: no en block`)
        const enOpen = src.indexOf('{', openIdx + enM.index)
        const enEnd = matchingBrace(src, enOpen)
        for (const it of blockEntries(src, { open: enOpen, end: enEnd }, `${file}:en`))
          if (it.kind === 'entry') texts.add(it.value)
      }
    }
  }
  return [...texts].filter((t) => /\p{L}/u.test(t)) // skip pure-symbol strings
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

function checkFile(file) {
  const src = readFileSync(join(root, file), 'utf8')
  const found = findLangDicts(src, ALL_LANGS)
  const problems = []
  for (const d of found) {
    const refB = d.blocks.get('en')
    if (!refB) continue
    const refItems = blockEntries(src, refB, `${file}:ref`)
    const refKeys = refItems.filter((i) => i.kind === 'entry').map((i) => i.key)
    const refMap = new Map(refItems.filter((i) => i.kind === 'entry').map((i) => [i.key, i.value]))
    for (const lang of langs) {
      const lb = d.blocks.get(lang)
      if (!lb) {
        problems.push(`${file}: dict@${d.dictStart} missing ${lang}`)
        continue
      }
      const items = blockEntries(src, lb, `${file}:${lang}`).filter((i) => i.kind === 'entry')
      const keys = items.map((i) => i.key)
      const missing = refKeys.filter((k) => !keys.includes(k))
      if (missing.length) problems.push(`${file}:${lang} missing keys ${missing.slice(0, 5)}`)
      for (const it of items) {
        const refVal = refMap.get(it.key)
        if (!refVal || it.key.endsWith('One')) continue
        const a = placeholdersOf(refVal)
        const b = placeholdersOf(it.value)
        if (a.join() !== b.join())
          problems.push(`${file}:${lang}:${it.key} placeholders ${b} != ${a}`)
      }
    }
  }
  return problems
}

function problemsSummary(probs) {
  const bad = probs.filter(Boolean)
  return bad.length
    ? `\nPROBLEMS (${bad.length}):\n${bad.slice(0, 60).join('\n')}`
    : '\nvalidation: OK'
}

// ---------------------------------------------------------------------------

async function main() {
  const extraTexts = EXTRA_KEYS.flatMap(([, es]) => es.map(([, en]) => en))
  const texts = [...collectSources(), ...extraTexts]
  console.log(`unique English strings: ${texts.length}; cached: ${cache.size}`)

  if (!CHECK_ONLY && !DRY && !API_KEY) {
    console.error('VEGA_API_KEY (or OPENAI_API_KEY) is required')
    process.exit(1)
  }

  if (!CHECK_ONLY) {
    for (const lang of langs) {
      if (!DRY) await translateAll(lang, texts)
    }
    // existing locales only need the EXTRA_KEYS texts (en is authored)
    if (!DRY)
      for (const lang of OLD_LANGS.filter((l) => l !== 'en'))
        await translateAll(lang, extraTexts)
  }
  if (DRY || CHECK_ONLY) {
    if (CHECK_ONLY) {
      const probs = []
      for (const [file] of INLINE_DICT_FILES) probs.push(...checkFile(file))
      for (const dir of SHARD_DIRS)
        for (const lang of langs)
          if (!existsSync(join(root, dir, `${lang}.ts`))) probs.push(`${dir}/${lang}.ts missing`)
      console.log(problemsSummary(probs))
    }
    return
  }

  for (const dir of SHARD_DIRS) {
    if (ONLY && !dir.includes(ONLY)) continue
    processShardDir(dir)
  }
  for (const [file, dirName] of AGGREGATORS) {
    if (ONLY && !file.includes(ONLY)) continue
    patchAggregator(file, dirName)
  }
  for (const [file, dicts] of INLINE_DICT_FILES) {
    if (ONLY && !file.includes(ONLY)) continue
    processInlineDicts(file, dicts)
  }
  for (const file of MERGERS) {
    if (ONLY && !file.includes(ONLY)) continue
    processMerger(file)
  }
  for (const [target, entries] of EXTRA_KEYS) {
    if (ONLY && !target.includes(ONLY)) continue
    if (target.endsWith('.ts')) {
      appendInlineKeys(target, 'export const strings = {', entries)
    } else {
      appendShardKeys(target, entries)
    }
  }

  console.log(`\nwrote ${touched.length} targets`)
  const probs = []
  for (const [file] of INLINE_DICT_FILES) probs.push(...checkFile(file))
  console.log(problemsSummary(probs))
}

main().catch((e) => {
  saveCache()
  console.error(e)
  process.exit(1)
})
