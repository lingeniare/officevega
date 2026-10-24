import { describe, expect, it } from 'vitest'
import { resolveSpellcheckLanguages } from '../src/main/spellcheck-languages'
import { LANGS } from '@genoffice/i18n'

/**
 * src/main/spellcheck-languages.ts: the language list handed to
 * session.setSpellCheckerLanguages. The UI language goes first because the OS
 * may not know it (Russian UI on an English Windows left spellcheck dead —
 * only the OS language was enabled). Codes are canonicalized against
 * ses.availableSpellCheckerLanguages because the setter throws on a code
 * outside that list.
 */
const AVAILABLE = ['en-US', 'en-GB', 'ru', 'kk', 'az', 'pt-BR', 'fr', 'de']

describe('resolveSpellcheckLanguages', () => {
  it('puts the UI language first when the OS languages lack it', () => {
    expect(resolveSpellcheckLanguages('ru', ['en-US'], AVAILABLE)).toEqual(['ru', 'en-US'])
  })

  it('dedupes the UI language against the OS languages', () => {
    expect(resolveSpellcheckLanguages('en', ['en-US'], AVAILABLE)).toEqual(['en-US'])
  })

  it('keeps every supported OS language after the UI language', () => {
    expect(resolveSpellcheckLanguages('ru', ['en-US', 'de', 'fr'], AVAILABLE)).toEqual([
      'ru',
      'en-US',
      'de',
      'fr',
    ])
  })

  it('drops a UI language the engine has no dictionary for', () => {
    expect(resolveSpellcheckLanguages('tk', ['en-US'], AVAILABLE)).toEqual(['en-US'])
  })

  it('maps a regional tag to the supported dictionary for its base language', () => {
    expect(resolveSpellcheckLanguages('en', ['pt-PT'], AVAILABLE)).toEqual(['en-US', 'pt-BR'])
  })

  it('matches codes case-insensitively', () => {
    expect(resolveSpellcheckLanguages('ru', ['EN-us'], AVAILABLE)).toEqual(['ru', 'en-US'])
  })

  it('skips unknown OS languages and keeps the known ones', () => {
    expect(resolveSpellcheckLanguages('ru', ['tlh', 'en-US'], AVAILABLE)).toEqual(['ru', 'en-US'])
  })

  it('ignores blank entries', () => {
    expect(resolveSpellcheckLanguages('ru', ['', '  ', 'en-US'], AVAILABLE)).toEqual([
      'ru',
      'en-US',
    ])
  })

  it('passes candidates through when the supported list is unavailable', () => {
    expect(resolveSpellcheckLanguages('ru', ['en-US'], [])).toEqual(['ru-RU', 'en-US'])
  })

  it('returns a non-empty list for every UI language on an en-US system', () => {
    for (const lang of LANGS) {
      expect(resolveSpellcheckLanguages(lang, ['en-US'], AVAILABLE)).toContain('en-US')
    }
  })
})
