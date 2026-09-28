import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

// the staging script is a dependency-free CommonJS helper shared with local
// release runs; load via createRequire since this test file is ESM
const require = createRequire(import.meta.url)
const {
  isFeedManifest,
  parseFeedYml,
  dumpFeedYml,
  artifactName,
  mergeManifests,
  main,
} = require('../../../scripts/stage-update-feed.cjs')

const dirs: string[] = []
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'feed-'))
  dirs.push(d)
  return d
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true })
})

const silent = { log: () => {}, error: () => {} }

function yml(version: string, file: string, sha512 = 'sha==', size = '3'): string {
  return `version: ${version}\nfiles:\n  - url: ${file}\n    sha512: ${sha512}\n    size: ${size}\nreleaseDate: '2026-01-01T00:00:00.000Z'\n`
}

function buildDir(name: string, manifest: string, fileName?: string): string {
  const dir = tmp()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), manifest)
  writeFileSync(join(dir, 'builder-debug.yml'), 'not: a feed\n')
  if (fileName) {
    const sha = createHash('sha512').update('bin').digest('base64')
    writeFileSync(join(dir, fileName), 'bin')
    writeFileSync(
      join(dir, name),
      yml('0.10.3', fileName, sha, '3'),
    )
  }
  return dir
}

describe('stage-update-feed', () => {
  it('detects only channel manifests', () => {
    for (const ok of ['latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'beta.yml', 'beta-mac.yml']) {
      expect(isFeedManifest(ok), ok).toBe(true)
    }
    for (const bad of ['builder-debug.yml', 'foo.yml', 'latest.yaml', 'rc.yml']) {
      expect(isFeedManifest(bad), bad).toBe(false)
    }
  })

  it('round-trips the manifest shape', () => {
    const text = yml('0.10.3', 'App Setup 0.10.3.exe')
    const doc = parseFeedYml(text)
    expect(doc.scalars.version).toBe('0.10.3')
    expect(doc.files).toHaveLength(1)
    const doc2 = parseFeedYml(dumpFeedYml(doc))
    expect(doc2.scalars.version).toBe('0.10.3')
    expect(doc2.files[0].url).toBe('App Setup 0.10.3.exe')
    expect(doc2.files[0].sha512).toBe('sha==')
  })

  it('resolves artifact basenames and skips remote urls', () => {
    expect(artifactName('App Setup 1.exe')).toBe('App Setup 1.exe')
    expect(artifactName('https://cdn.example/x/App%20Setup.exe')).toBeNull()
  })

  it('merges same-version manifests across arch passes', () => {
    const a = parseFeedYml(yml('0.10.3', 'App x64.exe'))
    const b = parseFeedYml(yml('0.10.3', 'App arm64.exe'))
    mergeManifests('latest.yml', a, b)
    expect(a.files.map((f: { url: string }) => f.url)).toEqual(['App x64.exe', 'App arm64.exe'])
  })

  it('rejects merging different versions', () => {
    const a = parseFeedYml(yml('0.10.3', 'a.exe'))
    const b = parseFeedYml(yml('0.10.4', 'b.exe'))
    expect(() => mergeManifests('latest.yml', a, b)).toThrow(/version mismatch/)
  })

  it('stages a fixture feed end to end', () => {
    const src = buildDir('latest.yml', '', 'App Setup 0.10.3.exe')
    const out = join(tmp(), 'out')
    expect(main([src, '--out', out], silent)).toBe(0)
    const staged = readFileSync(join(out, 'latest.yml'), 'utf8')
    expect(staged).toContain('version: 0.10.3')
    expect(readFileSync(join(out, 'App Setup 0.10.3.exe'), 'utf8')).toBe('bin')
  })

  it('fails when a manifest file is missing', () => {
    const src = tmp()
    writeFileSync(join(src, 'latest.yml'), yml('0.10.3', 'missing.exe'))
    expect(main([src, '--out', join(tmp(), 'out')], silent)).toBe(1)
  })

  it('fails on sha512 mismatch of a copied artifact', () => {
    const src = tmp()
    writeFileSync(join(src, 'latest.yml'), yml('0.10.3', 'a.exe', 'wrong=='))
    writeFileSync(join(src, 'a.exe'), 'bin')
    expect(main([src, '--out', join(tmp(), 'out')], silent)).toBe(1)
  })

  it('rejects staging an older version over a staged newer one', () => {
    const src = buildDir('latest.yml', '', 'a.exe')
    const out = tmp()
    writeFileSync(join(out, 'latest.yml'), yml('0.10.4', 'b.exe'))
    expect(main([src, '--out', out], silent)).toBe(1)
    expect(main([src, '--out', out, '--force'], silent)).toBe(0)
  })
})
