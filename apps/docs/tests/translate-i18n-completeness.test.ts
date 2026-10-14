import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  TRANSLATE_LANGS,
  appLangKey,
  ribbonLangKey,
} from '../src/renderer/components/translate-langs'

/**
 * The menu is driven by the key list, not by what the locale files contain, so
 * a missing `appLang*` entry does not fail a build — the button renders and
 * `t()` returns the raw key name. These read the shipped files to catch that.
 */

const LOCALES = [
  'az',
  'cs',
  'en',
  'he',
  'hi',
  'ka',
  'kk',
  'ky',
  'ms',
  'nl',
  'ru',
  'tk',
  'tt',
  'uz',
  'vi',
  'zh-TW',
] as const

const DOCS_APP = join(__dirname, '..', 'src', 'renderer', 'i18n', 'app')
const DOCS_RIBBON = join(__dirname, '..', 'src', 'renderer', 'i18n', 'ribbon')
const SLIDES_RIBBON = join(__dirname, '..', '..', 'slides', 'src', 'renderer', 'i18n', 'ribbon')

function keysIn(dir: string, file: string, family: 'appLang' | 'ribbonLang'): string[] {
  const src = readFileSync(join(dir, file), 'utf8')
  return [...src.matchAll(new RegExp(`\\b${family}[A-Za-z]+:`, 'g'))].map((m) =>
    m[0].replace(':', ''),
  )
}

function expectComplete(dir: string, family: 'appLang' | 'ribbonLang', label: string) {
  for (const locale of LOCALES) {
    const present = new Set(keysIn(dir, `${locale}.ts`, family))
    const missing = TRANSLATE_LANGS.map((l) =>
      family === 'appLang' ? appLangKey(l.code) : ribbonLangKey(l.code),
    ).filter((k) => !present.has(k))
    expect(missing, `${label}/${locale}.ts is missing ${missing.length}`).toEqual([])
  }
}

describe('translate target strings exist for every locale', () => {
  it('docs: the right-click menu has a name for all 9 languages, in all 16 locales', () => {
    expectComplete(DOCS_APP, 'appLang', 'docs app i18n')
  })

  it('docs: the ribbon dropdown has a name for all 9 languages, in all 16 locales', () => {
    expectComplete(DOCS_RIBBON, 'ribbonLang', 'docs ribbon i18n')
  })

  it('slides: the ribbon dropdown has a name for all 9 languages, in all 16 locales', () => {
    expectComplete(SLIDES_RIBBON, 'ribbonLang', 'slides ribbon i18n')
  })
})

describe('no locale file is missing a language the menu offers', () => {
  it('the three i18n trees carry the same number of language names', () => {
    const counts = [
      keysIn(DOCS_APP, 'en.ts', 'appLang').length,
      keysIn(DOCS_RIBBON, 'en.ts', 'ribbonLang').length,
      keysIn(SLIDES_RIBBON, 'en.ts', 'ribbonLang').length,
    ]
    // all three must land on the same number, or one menu shows a row another hides
    expect(new Set(counts).size).toBe(1)
    expect(counts[0]).toBe(TRANSLATE_LANGS.length)
  })

  it('every locale ships the same set, so no language appears in one UI and not another', () => {
    const baseline = new Set(keysIn(DOCS_APP, 'en.ts', 'appLang'))
    for (const locale of LOCALES) {
      expect(new Set(keysIn(DOCS_APP, `${locale}.ts`, 'appLang'))).toEqual(baseline)
    }
  })
})

describe('the shipped strings are translated, not raw keys or copies', () => {
  it('no locale defines a language name as an empty string', () => {
    for (const dir of [DOCS_APP, DOCS_RIBBON, SLIDES_RIBBON]) {
      for (const locale of LOCALES) {
        const src = readFileSync(join(dir, `${locale}.ts`), 'utf8')
        const empties = [...src.matchAll(/\b(?:app|ribbon)Lang\w+:\s*''/g)]
        expect(empties.length, `${dir}/${locale}.ts`).toBe(0)
      }
    }
  })

  it('a non-latin locale writes its own script, not a latin transliteration', () => {
    // guards the failure the review caught: a row that is really another
    // language's text pasted in (Thai file shipping "Bahasa Indonesia")
    const he = readFileSync(join(DOCS_APP, 'he.ts'), 'utf8')
    const hebrew = /appLangHebrew:\s*'([^']*)'/.exec(he)?.[1] ?? ''
    expect(hebrew).not.toBe('Hebrew')
    expect(hebrew).toMatch(/[\u0590-\u05FF]/)
  })

  it('zh-TW keeps the traditional forms', () => {
    const src = readFileSync(join(DOCS_APP, 'zh-TW.ts'), 'utf8')
    // Written as \u escapes so this file stays ASCII and does not trip the
    // comment-language gate, while still asserting the glyphs.
    const traditional = '\u7e41\u9ad4\u4e2d\u6587'
    const simplified = '\u7b80\u4f53\u4e2d\u6587'
    const row = (key: string) => new RegExp(`${key}:\\s*'[^']*'`).exec(src)?.[0] ?? ''
    expect(row('appLangTraditionalChinese')).toContain(traditional)
    expect(row('appLangTraditionalChinese')).not.toContain(simplified)
  })
})

describe('locale files are in step with each other', () => {
  it('every tree has all the locale files, so no locale silently misses the new rows', () => {
    for (const dir of [DOCS_APP, DOCS_RIBBON, SLIDES_RIBBON]) {
      expect(readdirSync(dir).filter((f) => f.endsWith('.ts')).length).toBe(LOCALES.length)
    }
  })
})
