// One-off merge aid: bring per-locale shard dictionaries to key parity with en.ts.
// Usage: node tools/_i18n-parity.mjs <dir-with-shards>
// Appends missing keys (with the English text as placeholder) just before each
// shard's closing `}` / `} satisfies` line.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = process.argv[2]
const EN = join(DIR, 'en.ts')

/** parse `  key: ...` top-level entries, each value may span several lines */
function entries(src) {
  const lines = src.split('\n')
  const out = new Map() // key -> [lines]
  let cur = null
  for (const line of lines) {
    const m = line.match(/^  ([A-Za-z0-9_$]+|'[^']+'):/)
    if (m) {
      cur = m[1]
      out.set(cur, [line])
    } else if (cur && (line.startsWith('    ') || line.trim() === '')) {
      out.get(cur).push(line)
    } else {
      cur = null
    }
  }
  return out
}

const en = entries(readFileSync(EN, 'utf-8'))
let patchedAny = false
for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.ts') || f === 'en.ts') continue
  const p = join(DIR, f)
  const s = readFileSync(p, 'utf-8')
  const loc = entries(s)
  const missing = [...en.keys()].filter((k) => !loc.has(k))
  if (missing.length === 0) continue
  const block = missing.map((k) => en.get(k).join('\n')).join('\n')
  // insert before the closing `}` (optionally `} satisfies ...`)
  const i = s.search(/\n\}(?:\s|$)/)
  if (i < 0) { console.log('SKIP (no close):', p); continue }
  const next = s.slice(0, i) + '\n' + block + s.slice(i)
  writeFileSync(p, next)
  console.log(`${f}: +${missing.length} keys: ${missing.join(',')}`)
  patchedAny = true
}
if (!patchedAny) console.log('all shards already in parity')
