#!/usr/bin/env node
/**
 * scripts/stage-update-feed.cjs — assemble the update-feed directory that is
 * uploaded to the update host (officevega.com/updates/) from electron-builder
 * output folders.
 *
 *   node scripts/stage-update-feed.cjs [srcDir ...] [--out dir] [--force]
 *
 * - srcDir: one or more electron-builder output dirs. Defaults to
 *   $BUILD_DIR or apps/shell/release. Pass several dirs to merge manifests
 *   produced by separate arch passes (e.g. a win x64 dir + a win arm64 dir —
 *   the feed needs ONE latest.yml listing every arch's installer).
 * - --out: staging dir (default: <repo>/release-feed). Upload its ENTIRE
 *   contents to the feed URL; upload installers first, the yml manifests
 *   last, so clients never see a manifest pointing at missing files.
 * - --force: allow re-staging an older version than the manifest already in
 *   --out (rollback; the default is forward-only, like promote-stable).
 *
 * Only files listed inside the manifests are copied — blockmaps, unpacked
 * dirs and builder-debug.yml never reach the feed, and rpm stays out by
 * design (publish: null in electron-builder.cjs). A file listed in a
 * manifest but missing from every srcDir aborts the whole run: a partial
 * feed is worse than no feed. Copied files are sha512-verified against the
 * manifest entry. Kept dependency-free so vitest can require it directly.
 */
const { createHash } = require('node:crypto')
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require('node:fs')
const path = require('node:path')
const { releaseUploadDecision, ymlVersion } = require('./update-feed-utils.cjs')

// channel manifests the shell updater can consume: stable → latest*.yml,
// beta → beta*.yml; electron-updater appends the platform suffix itself
// (latest-mac.yml on darwin, latest-linux.yml on linux)
const MANIFEST_RE = /^(latest|beta)(-(mac|linux))?\.yml$/

const isFeedManifest = (name) => MANIFEST_RE.test(name)

// ---------------------------------------------------------------------------
// minimal parser/emitter for the electron-builder channel-manifest shape:
//   version: 0.10.2          <- top-level scalars, order preserved
//   files:
//     - url: App Setup 0.10.2.exe
//       sha512: ...
//       size: 123
//   sha512: ...
// ---------------------------------------------------------------------------

const unquote = (v) => {
  const s = v.trim()
  if (s.length >= 2 && s[0] === s[s.length - 1] && (s[0] === "'" || s[0] === '"')) {
    return s[0] === "'" ? s.slice(1, -1).replace(/''/g, "'") : s.slice(1, -1)
  }
  return s
}

const quote = (v) => (/[:#'"[\]{}>|&*!%@`]/.test(v) || v !== v.trim() ? `'${v.replace(/'/g, "''")}'` : v)

function parseFeedYml(text) {
  const items = [] // top-level layout: scalar keys plus the 'files' marker
  const scalars = {}
  const files = []
  let inFiles = false
  let cur = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (/^files:\s*$/.test(line)) {
      inFiles = true
      if (!items.includes('files')) items.push('files')
      continue
    }
    if (inFiles) {
      const item = /^\s+-\s+url:\s*(.+?)\s*$/.exec(line)
      if (item) {
        cur = { url: unquote(item[1]) }
        files.push(cur)
        continue
      }
      const field = /^\s{3,}(\w+):\s*(.*?)\s*$/.exec(line)
      if (field && cur) {
        if (field[2] !== '') cur[field[1]] = unquote(field[2])
        else cur[field[1]] = ''
        continue
      }
      inFiles = false
      cur = null
    }
    const scalar = /^(\w+):\s*(.*?)\s*$/.exec(line)
    if (scalar) {
      if (!items.includes(scalar[1])) items.push(scalar[1])
      scalars[scalar[1]] = unquote(scalar[2])
    }
  }
  return { items, scalars, files }
}

function dumpFeedYml(doc) {
  const out = []
  for (const key of doc.items) {
    if (key === 'files') {
      out.push('files:')
      for (const f of doc.files) {
        out.push(`  - url: ${quote(f.url)}`)
        for (const k of Object.keys(f)) {
          if (k !== 'url' && f[k] !== '') out.push(`    ${k}: ${quote(String(f[k]))}`)
        }
      }
    } else {
      out.push(`${key}: ${quote(doc.scalars[key] ?? '')}`)
    }
  }
  return out.join('\n') + '\n'
}

/** basename of the url entry; absolute-URL entries stay remote (null = nothing to copy) */
function artifactName(url) {
  if (/^https?:\/\//i.test(url)) return null
  try {
    const pathname = new URL(url, 'https://feed.invalid/').pathname
    const base = pathname.slice(pathname.lastIndexOf('/') + 1)
    return base ? decodeURIComponent(base) : null
  } catch {
    return null
  }
}

/** union the files list of `extra` into `base`; versions must be identical */
function mergeManifests(name, base, extra) {
  if (base.scalars.version !== extra.scalars.version) {
    throw new Error(
      `${name}: version mismatch between source dirs (${base.scalars.version} vs ${extra.scalars.version}); clean stale artifacts or stage one build at a time`,
    )
  }
  const byUrl = new Map(base.files.map((f) => [f.url, f]))
  for (const f of extra.files) {
    const existing = byUrl.get(f.url)
    if (!existing) {
      byUrl.set(f.url, { ...f })
    } else if (existing.sha512 && f.sha512 && existing.sha512 !== f.sha512) {
      throw new Error(`${name}: sha512 conflict for ${f.url} between source dirs`)
    }
  }
  base.files = [...byUrl.values()]
  return base
}

const sha512Of = (file) => createHash('sha512').update(readFileSync(file)).digest('base64')

function parseArgs(argv) {
  const srcDirs = []
  let out = null
  let force = false
  let help = false
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') out = argv[++i]
    else if (a === '--force') force = true
    else if (a === '--help' || a === '-h') help = true
    else srcDirs.push(a)
  }
  return { srcDirs, out, force, help }
}

function main(argv = process.argv.slice(2), io = console) {
  const repoRoot = path.join(__dirname, '..')
  const { srcDirs, out, force, help } = parseArgs(argv)
  if (help) {
    io.log('Usage: node scripts/stage-update-feed.cjs [srcDir ...] [--out dir] [--force]')
    return 0
  }
  const dirs = srcDirs.length
    ? srcDirs.map((d) => path.resolve(d))
    : [path.resolve(process.env.BUILD_DIR || path.join('apps', 'shell', 'release'))]
  const outDir = path.resolve(out || path.join(repoRoot, 'release-feed'))

  // 1. discover + parse channel manifests across the source dirs
  const manifests = new Map() // name -> { doc, srcDir }
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      io.log(`skip ${dir} (not found)`)
      continue
    }
    for (const name of readdirSync(dir)) {
      if (!isFeedManifest(name)) continue
      const file = path.join(dir, name)
      const doc = parseFeedYml(readFileSync(file, 'utf8'))
      const existing = manifests.get(name)
      manifests.set(
        name,
        existing ? { doc: mergeManifests(name, existing.doc, doc), srcDir: existing.srcDir } : { doc, srcDir: dir },
      )
      io.log(`found ${name} v${doc.scalars.version ?? '?'} in ${dir}`)
    }
  }
  if (manifests.size === 0) {
    io.error('no channel manifests (latest*.yml / beta*.yml) found — run an electron-builder dist first')
    return 1
  }

  // 2. forward-only guard against what is already staged
  for (const [name, { doc }] of manifests) {
    const staged = path.join(outDir, name)
    const current = existsSync(staged) ? ymlVersion(readFileSync(staged, 'utf8')) : null
    const decision = releaseUploadDecision(doc.scalars.version, current, {
      force,
      allowExisting: true,
    })
    if (decision.action === 'reject') {
      io.error(`${name}: ${decision.reason}`)
      return 1
    }
  }

  // 3. resolve every manifest-referenced artifact against the source dirs
  const copies = [] // { from, name }
  const problems = []
  for (const [name, { doc }] of manifests) {
    for (const f of doc.files) {
      const base = artifactName(f.url)
      if (base === null) continue // remote URL or unparsable — nothing to copy
      const from = dirs.map((d) => path.join(d, base)).find((p) => existsSync(p))
      if (!from) problems.push(`${name}: ${base} not found in any source dir`)
      else copies.push({ from, name: base, declared: f.sha512 })
    }
  }
  if (problems.length) {
    for (const p of problems) io.error(p)
    return 1
  }

  // 4. copy artifacts with sha512 verification, then write the manifests last
  mkdirSync(outDir, { recursive: true })
  const seen = new Set()
  for (const c of copies) {
    if (seen.has(c.name)) continue
    seen.add(c.name)
    if (c.declared && sha512Of(c.from) !== c.declared) {
      io.error(`${c.name}: sha512 does not match the manifest entry — rebuild the artifact`)
      return 1
    }
    copyFileSync(c.from, path.join(outDir, c.name))
    io.log(`staged ${c.name}`)
  }
  for (const [name, { doc }] of manifests) {
    writeFileSync(path.join(outDir, name), dumpFeedYml(doc))
    io.log(`staged ${name} (${doc.files.length} file(s), v${doc.scalars.version ?? '?'})`)
  }

  io.log('')
  io.log(`Feed ready in ${outDir}`)
  io.log('Upload order: installers first, the *.yml manifests LAST.')
  return 0
}

if (require.main === module) {
  process.exitCode = main()
}

module.exports = {
  isFeedManifest,
  parseFeedYml,
  dumpFeedYml,
  artifactName,
  mergeManifests,
  parseArgs,
  main,
}
