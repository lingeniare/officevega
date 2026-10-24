/**
 * Univer UI locale wiring. createUniver boots with en-US (the packs
 * are needed synchronously); once the runtime exists, the app language picks
 * the matching Univer language packs and switches LocaleService, which
 * re-renders the whole Univer React tree (rule-management panels, dialogs,
 * menus). UI languages Univer has no pack for stay English — of the shipped
 * nine, only Russian has a pack.
 */
import { LocaleService, LocaleType, mergeLocales, type ILocales } from '@univerjs/core'
import type { Lang } from '@genoffice/i18n'

import { translateFor } from './i18n/locale'
import type { UniverRuntime } from './univer-state'

type LocalePack = Record<string, unknown>

const UNIVER_LOCALES: Record<
  string,
  { type: LocaleType; load(): Promise<{ default: LocalePack }[]> }
> = {
  ru: {
    type: LocaleType.RU_RU,
    load: () =>
      Promise.all([
        import('@univerjs/preset-sheets-core/locales/ru-RU'),
        import('@univerjs/preset-sheets-conditional-formatting/locales/ru-RU'),
        import('@univerjs/preset-sheets-data-validation/locales/ru-RU'),
        import('@univerjs/preset-sheets-drawing/locales/ru-RU'),
        import('@univerjs/preset-sheets-filter/locales/ru-RU'),
        import('@univerjs/preset-sheets-find-replace/locales/ru-RU'),
        import('@univerjs/preset-sheets-note/locales/ru-RU'),
        import('@univerjs/preset-sheets-sort/locales/ru-RU'),
        import('@univerjs/preset-sheets-table/locales/ru-RU'),
      ]),
  },
}

const NUMBER_AS_TEXT_MESSAGE =
  'The value in this cell is stored as text — it will not be treated as a number in formulas.'

/**
 * Both "number stored as text" alerts title themselves "Error" (and sheets-ui
 * 0.25.1 references info keys no pack ships). Title with the numfmt pack's
 * localized "Number stored as text"; spread the namespaces because mergeLocales
 * merges shallowly.
 */
export function numberAsTextAlertLocale(pack: LocalePack): LocalePack {
  const ns = (name: string) => (pack[name] ?? {}) as Record<string, unknown>
  const info = (name: string) => (ns(name).info ?? {}) as Record<string, string>
  const title = info('sheets-numfmt-ui').forceStringInfo ?? 'Number stored as text'
  const patched = (name: string) => ({
    ...ns(name),
    info: { ...info(name), error: title, forceStringInfo: NUMBER_AS_TEXT_MESSAGE },
  })
  return { 'sheets-ui': patched('sheets-ui'), 'sheets-numfmt-ui': patched('sheets-numfmt-ui') }
}

/**
 * Excel wording for the insert-rows context entries: the upstream en pack
 * pairs "Insert N rows above" with "Insert N rows AFTER" (feedback #302 —
 * "it should be below, not after"; the insert itself lands directly under
 * the selection, only the label misleads). Non-English packs already say
 * below (the zh pack reads "insert below"), so the guard keys the patch to
 * the English text.
 */
export function insertRowsBelowLocale(pack: LocalePack): LocalePack {
  const sheetsUi = (pack['sheets-ui'] ?? {}) as Record<string, unknown>
  const rightClick = (sheetsUi.rightClick ?? {}) as Record<string, string>
  if (rightClick.insertRowsAfterSuffix !== 'rows after') return { 'sheets-ui': sheetsUi }
  return {
    'sheets-ui': {
      ...sheetsUi,
      rightClick: { ...rightClick, insertRowsAfterSuffix: 'rows below' },
    },
  }
}

/**
 * The right-click item that withholds the selected cells from the AI.
 *
 * It is a Univer menu item, so its label is a Univer locale key resolved at
 * render — the app's own `t()` cannot be used for a menu `title`. The pack,
 * however, is built here, so the wording is read straight out of the app's
 * `redactMenuLabel`: one definition, all 21 languages, and the same gesture
 * reads identically in markdown, slides, docs and html. A second hand-written
 * table could only ever drift from it.
 *
 * Languages Univer has no pack for (th/nl/ms/he/hi/cs/zh-TW) keep the English
 * pack the runtime booted with, where every other right-click item is English;
 * the redaction item follows that rather than being the one entry in the menu
 * with a language of its own. `applyUniverLocale` returns before reaching here
 * for those languages, so this is belt and braces — but it keeps the rule a
 * property of this function rather than of its caller.
 */
export function hideFromAiLocale(pack: LocalePack, lang: Lang): LocalePack {
  const label = translateFor(UNIVER_LOCALES[lang] ? lang : 'en')('redactMenuLabel')
  const sheetsUi = (pack['sheets-ui'] ?? {}) as Record<string, unknown>
  const rightClick = (sheetsUi.rightClick ?? {}) as Record<string, string>
  return {
    'sheets-ui': {
      ...sheetsUi,
      rightClick: { ...rightClick, hideSelectionFromAi: label },
    },
  }
}

export function univerLocaleFor(lang: string): LocaleType | null {
  return UNIVER_LOCALES[lang]?.type ?? null
}

export async function applyUniverLocale(runtime: UniverRuntime, lang: Lang): Promise<void> {
  const entry = UNIVER_LOCALES[lang]
  if (!entry) return
  const packs = (await entry.load()).map((mod) => mod.default)
  const merged = mergeLocales(...packs) as LocalePack
  Object.assign(merged, numberAsTextAlertLocale(merged))
  Object.assign(merged, insertRowsBelowLocale(merged))
  Object.assign(merged, hideFromAiLocale(merged, lang))
  const localeService = runtime.univer.__getInjector().get(LocaleService)
  localeService.load({ [entry.type]: merged } as unknown as ILocales)
  localeService.setLocale(entry.type)
}
