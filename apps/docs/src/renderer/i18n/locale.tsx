import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createI18n, htmlDir, htmlLang, type Lang, type Params } from '@genoffice/i18n'
import { strings } from './strings'

const translate = createI18n(strings)

export type StringKey = keyof typeof strings.en
export type TFunc = (key: StringKey, params?: Params) => string

// mirror for non-React modules (pagination, editor extensions, AI tools …);
// set before first render and on every language switch
let moduleLang: Lang = 'en'
export const getLang = (): Lang => moduleLang
export const setModuleLang = (lang: Lang): void => {
  moduleLang = lang
}
/** module-level translator — components should prefer useI18n().t so they re-render on switch */
export const t: TFunc = (key, params) => translate(moduleLang, key, params)

const AI_LANG_DIRECTIVES: Record<Lang, string> = {
  en: "\n\nReply in the same language as the user's message; if it cannot be determined, reply in English.",
  ru: '\n\nОтвечай на том же языке, что и сообщение пользователя; если его невозможно определить, отвечай на русском.',
  cs: '\n\nOdpovídej ve stejném jazyce jako zpráva uživatele; pokud ho nelze určit, odpovídej česky.',
  nl: '\n\nAntwoord in dezelfde taal als het bericht van de gebruiker; als die niet te bepalen is, antwoord dan in het Nederlands.',
  ms: '\n\nBalas dalam bahasa yang sama dengan mesej pengguna; jika tidak dapat ditentukan, balas dalam bahasa Melayu.',
  he: '\n\nהשב באותה שפה של הודעת המשתמש; אם לא ניתן לקבוע אותה, השב בעברית.',
  hi: '\n\nउपयोगकर्ता के संदेश की भाषा में ही उत्तर दें; यदि भाषा निर्धारित न हो सके, तो हिंदी में उत्तर दें।',
  'zh-TW': '\n\n用與使用者訊息相同的語言回覆；無法判斷使用者訊息的語言時，用繁體中文回覆。',
  vi: '\n\nTrả lời bằng ngôn ngữ của tin nhắn người dùng; nếu không xác định được, hãy trả lời bằng tiếng Việt.',
  uz: '\n\nFoydalanuvchi xabari bilan bir xil tilda javob bering; tilni aniqlab boʻlmassa, oʻzbek tilida javob bering.',
  kk: '\n\nПайдаланушы хабарламасымен бір тілде жауап беріңіз; тілді анықтау мүмкін болмаса, қазақша жауап беріңіз.',
  az: '\n\nİstifadəçinin mesajı ilə eyni dildə cavab verin; dil müəyyən edilə bilmirsə, azərbaycan dilində cavab verin.',
  tk: '\n\nUlanyjynyň habaryndaky dilde jogap beriň; dilni anyklap bolmasa, türkmen dilinde jogap beriň.',
  ky: '\n\nКолдонучунун билдирүүсүндөгү тилде жооп бериңиз; тилди аныктоо мүмкүн болбосо, кыргызча жооп бериңиз.',
  tt: '\n\nКулланучы хәбәренең телендә җавап бирегез; телне билгеләү мөмкин булмаса, татарча җавап бирегез.',
  ka: '\n\nუპასუხეთ მომხმარებლის შეტყობინების ენაზე; თუ ენის დადგენა შეუძლებელია, უპასუხეთ ქართულად.',
}

/** appended to the agent system prompt: replies follow the user's message language, falling back to the UI language */
export function aiLangDirective(): string {
  return AI_LANG_DIRECTIVES[moduleLang]
}

/** BCP-47 locale per UI language, for date/number formatting */
export const DATE_LOCALES: Record<Lang, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  cs: 'cs-CZ',
  nl: 'nl-NL',
  ms: 'ms-MY',
  he: 'he-IL',
  hi: 'hi-IN',
  'zh-TW': 'zh-TW',
  vi: 'vi-VN',
  uz: 'uz-UZ',
  kk: 'kk-KZ',
  az: 'az-AZ',
  tk: 'tk-TM',
  ky: 'ky-KG',
  tt: 'tt-RU',
  ka: 'ka-GE',
}

const LocaleContext = createContext<Lang>('en')

export function LocaleProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial)
  useEffect(
    () =>
      window.desktop.onLanguageChanged((next) => {
        setModuleLang(next)
        document.documentElement.lang = htmlLang(next)
        document.documentElement.dir = htmlDir(next)
        setLang(next)
      }),
    [],
  )
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>
}

export interface I18n {
  lang: Lang
  t: TFunc
  /** BCP-47 locale for date/number formatting */
  dateLocale: string
}

export function useI18n(): I18n {
  const lang = useContext(LocaleContext)
  return {
    lang,
    t: (key, params) => translate(lang, key, params),
    dateLocale: DATE_LOCALES[lang],
  }
}
