import { describe, expect, it } from 'vitest'
import { strings } from '../src/renderer/i18n/strings'

/**
 * The fillFormStrings block merges an en base with per-locale overrides, so a
 * missing translation silently falls back to English. This asserts every key
 * from that block actually carries a localized value in every locale.
 * Keys whose en text is only placeholders/punctuation (e.g. "{current} /
 * {total}") are allowed to stay identical.
 */
const BLOCK_KEYS = Object.keys(strings.en).filter((k) =>
  /^(ribbonTabFillForm|ribbonTabFormDesign|form|redact|insertText|textInsert|insertedText|editInsertedText|deleteInsertedText)/.test(
    k,
  ),
)

const hasLettersBeyondPlaceholders = (s: string) =>
  /[A-Za-z\u0400-\u04FF\u10A0-\u10FF\u0600-\u06FF]/.test(s.replace(/\{\w+\}/g, ''))

describe('fill-form strings — no English fallback', () => {
  const locales = Object.keys(strings).filter((l) => l !== 'en')
  it('block key list is non-empty', () => {
    expect(BLOCK_KEYS.length).toBeGreaterThan(50)
  })
  for (const lang of locales) {
    it(`${lang} localizes every fill-form key`, () => {
      const untranslated = BLOCK_KEYS.filter(
        (k) =>
          hasLettersBeyondPlaceholders(strings.en[k as keyof typeof strings.en] as string) &&
          (strings as Record<string, Record<string, string>>)[lang]![k] ===
            (strings.en as Record<string, string>)[k],
      )
      expect(untranslated).toEqual([])
    })
  }
})
