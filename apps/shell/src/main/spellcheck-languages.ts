import { htmlLang, type Lang } from '@genoffice/i18n'

/**
 * The language list handed to session.setSpellCheckerLanguages.
 *
 * Chromium enables only the OS languages by default, so a UI language the OS
 * doesn't share (Russian UI on an English Windows) gets no dictionary and
 * spellcheck silently does nothing. The UI language therefore goes first,
 * followed by the OS preferred languages.
 *
 * Codes are canonicalized against ses.availableSpellCheckerLanguages: the
 * setter throws on a code outside that list, and the engine's codes don't
 * always match our BCP-47 tags ('ru-RU' → 'ru', 'pt-PT' → 'pt-BR'). An empty
 * supported list means the caller couldn't enumerate it — pass the candidates
 * through and let the setter decide.
 */
export function resolveSpellcheckLanguages(
  uiLang: Lang,
  systemLangs: readonly string[],
  available: readonly string[],
): string[] {
  const byCode = new Map<string, string>()
  const byBase = new Map<string, string>()
  for (const tag of available) {
    byCode.set(tag.toLowerCase(), tag)
    const base = tag.toLowerCase().split('-')[0]!
    // prefer the base-language entry ('ru' over 'ru-RU') when both exist
    if (!byBase.has(base) || !tag.includes('-')) byBase.set(base, tag)
  }

  const out: string[] = []
  for (const raw of [htmlLang(uiLang), ...systemLangs]) {
    const tag = raw.trim()
    if (!tag) continue
    const lower = tag.toLowerCase()
    const resolved = available.length
      ? (byCode.get(lower) ?? byBase.get(lower.split('-')[0]!))
      : tag
    if (resolved && !out.includes(resolved)) out.push(resolved)
  }
  return out
}
