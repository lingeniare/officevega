import { describe, expect, it } from 'vitest'
import {
  TRANSLATE_LANGS,
  appLangKey,
  ribbonLangKey,
  type TranslateLang,
} from '../src/renderer/components/translate-langs'

/** The languages the translate menu offers, in menu order. */
const SHIPPED: Array<[TranslateLang, string]> = [
  ['en', 'English'],
  ['ru', 'Russian'],
]

describe('translate language keys', () => {
  it('reproduces the keys that ship, in order', () => {
    // These strings appear in every locale file. A refactor that changed one
    // would leave the menu showing a raw key, or nothing at all.
    expect(TRANSLATE_LANGS.map((l) => appLangKey(l.code))).toEqual(
      SHIPPED.map(([, k]) => `appLang${k}`),
    )
    expect(TRANSLATE_LANGS.map((l) => ribbonLangKey(l.code))).toEqual(
      SHIPPED.map(([, k]) => `ribbonLang${k}`),
    )
  })

  it('covers the two languages the translate menu offers', () => {
    expect(TRANSLATE_LANGS).toHaveLength(2)
  })

  it('gives every language a distinct key on both surfaces', () => {
    const app = TRANSLATE_LANGS.map((l) => appLangKey(l.code))
    const ribbon = TRANSLATE_LANGS.map((l) => ribbonLangKey(l.code))
    expect(new Set(app).size).toBe(TRANSLATE_LANGS.length)
    expect(new Set(ribbon).size).toBe(TRANSLATE_LANGS.length)
  })

  it('spells keys out in full rather than abbreviating the code', () => {
    // a "smart" rule would produce appLangEn / appLangRu and break the
    // strings that already exist
    expect(appLangKey('en')).not.toBe('appLangEn')
    for (const { key } of TRANSLATE_LANGS) expect(key.length).toBeGreaterThan(2)
  })

  it('keeps both surfaces in step — the same language maps to parallel keys', () => {
    for (const { code } of TRANSLATE_LANGS) {
      expect(appLangKey(code).replace('appLang', '')).toBe(
        ribbonLangKey(code).replace('ribbonLang', ''),
      )
    }
  })
})
