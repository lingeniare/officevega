// One-off: merge a `createI18n({...})`-style locale table inside a file mid-merge.
// Usage: node tools/_merge-i18n-table.mjs <file> <openerRegex> <closerRegex>
// Defaults: opener /createI18n\({/, closer /^\}\)/.
// Keeps only shipped locales; per locale, upstream supplies the key set/order,
// our side overrides values it customized, ours-only keys are appended.
// Non-key lines before the first key of a locale block (e.g. `...spread()`)
// are kept as the block "head": theirs wins when the locale exists upstream.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = process.argv[2]
const OPENER = new RegExp(process.argv[3] ?? 'createI18n\\({')
const CLOSER = new RegExp(process.argv[4] ?? '^}\\)')
const SHIPPED = ['en', 'ru', 'uz', 'kk', 'az', 'tk', 'ky', 'tt', 'ka']

const ours = execSync(`git show HEAD:${FILE}`, { encoding: 'utf-8', maxBuffer: 64 << 20 })
const theirs = execSync(`git show upstream/main:${FILE}`, { encoding: 'utf-8', maxBuffer: 64 << 20 })
const merged = readFileSync(FILE, 'utf-8')

function parseTable(src) {
  const lines = src.split('\n')
  const start = lines.findIndex((l) => OPENER.test(l))
  if (start < 0) throw new Error(`no opener ${OPENER} in source`)
  let end = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (CLOSER.test(lines[i])) { end = i; break }
  }
  if (end < 0) throw new Error(`no closer ${CLOSER}`)
  const blocks = new Map() // locale -> { order: [key], lines: Map key->[raw lines], head: [lines] }
  let cur = null, curKey = null
  for (let i = start + 1; i < end; i++) {
    const line = lines[i]
    const mLoc = line.match(/^  ([a-zA-Z-]+): \{$/)
    if (mLoc) {
      cur = mLoc[1]
      curKey = null
      blocks.set(cur, { order: [], lines: new Map(), head: [] })
      continue
    }
    if (line === '  },' || line === '  }') { cur = null; curKey = null; continue }
    if (!cur) continue
    const mKey = line.match(/^    ([A-Za-z0-9_$]+|'[^']+'):/)
    if (mKey) {
      curKey = mKey[1]
      const b = blocks.get(cur)
      b.order.push(curKey)
      b.lines.set(curKey, [line])
    } else if (curKey) {
      blocks.get(cur).lines.get(curKey).push(line)
    } else {
      // head line (spread/comment before the first key)
      blocks.get(cur).head.push(line)
    }
  }
  return { start, end, lines, blocks, openLine: lines[start], closeLine: lines[end] }
}

const O = parseTable(ours)
const T = parseTable(theirs)

console.log('ours locales:', [...O.blocks.keys()].join(','))
console.log('theirs locales:', [...T.blocks.keys()].join(','))

const enRef = T.blocks.get('en') ?? O.blocks.get('en')
const M = parseTable(merged)
// sparse tables (e.g. locale-override maps without an en base) emit only the
// shipped locales that exist on either side
const emitLocs = SHIPPED.filter((l) => O.blocks.has(l) || T.blocks.has(l))
const out = [M.openLine]
for (const loc of emitLocs) {
  const tb = T.blocks.get(loc)
  const ob = O.blocks.get(loc)
  if (!ob) { console.log(`WARN: we lack ${loc} — taking upstream block whole`); }
  out.push(`  ${loc}: {`)
  // head: theirs when the locale exists upstream (carries new spreads), else ours
  const head = (tb ? tb.head : ob.head).filter((l) => l.trim() !== '')
  out.push(...head)
  const emitted = new Set()
  if (tb && !ob) {
    for (const key of tb.order) {
      if (emitted.has(key)) continue
      emitted.add(key)
      out.push(...tb.lines.get(key))
    }
  } else if (tb) {
    for (const key of tb.order) {
      if (emitted.has(key)) continue
      emitted.add(key)
      out.push(...(ob.lines.has(key) ? ob.lines.get(key) : tb.lines.get(key)))
    }
  } else {
    for (const key of ob.order) {
      if (emitted.has(key)) continue
      emitted.add(key)
      out.push(...ob.lines.get(key))
    }
    // en-refill only when 'en' is a real row of this table — sparse override
    // maps (no en row) would otherwise duplicate the en base into every locale
    let added = 0
    for (const key of O.blocks.has('en') ? (enRef?.order ?? []) : []) {
      if (emitted.has(key)) continue
      emitted.add(key)
      out.push(...enRef.lines.get(key))
      added++
    }
    if (added) console.log(`${loc}: +${added} en-placeholder keys`)
  }
  if (tb) {
    for (const key of ob.order) {
      if (emitted.has(key)) continue
      emitted.add(key)
      out.push(...ob.lines.get(key))
    }
  }
  out.push('  },')
}
out.push(M.closeLine)

const mLines = merged.split('\n')
const result = [...mLines.slice(0, M.start), ...out, ...mLines.slice(M.end + 1)]

writeFileSync(FILE, result.join('\n'))
console.log('rewrote table region lines', M.start + 1, '-', M.end + 1)

for (const loc of SHIPPED) {
  const tb = T.blocks.get(loc), ob = O.blocks.get(loc)
  if (!tb || !ob) continue
  const overridden = tb.order.filter((k) => ob.lines.has(k) && ob.lines.get(k).join('\n') !== tb.lines.get(k).join('\n'))
  const oursOnly = ob.order.filter((k) => !tb.lines.has(k))
  if (overridden.length || oursOnly.length)
    console.log(`${loc}: ours-overrides=[${overridden.join(',')}] ours-only=[${oursOnly.join(',')}]`)
}
