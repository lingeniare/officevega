import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createI18n, htmlDir, htmlLang, type Lang, type Params } from '@genoffice/i18n'
import { strings } from './strings'

const translate = createI18n(strings)

export type StringKey = keyof typeof strings.en
export type TFunc = (key: StringKey, params?: Params) => string

/** Appended to the AI system prompt: reply in the user's message language, falling back to the UI language when undetectable (same wording as docs/slides) */
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

export function aiLangDirective(lang: Lang): string {
  return AI_LANG_DIRECTIVES[lang]
}

const LocaleContext = createContext<Lang>('en')

/** Module-level current language: for code outliving render closures (AgentLoop events etc.), kept in sync with the Provider */
let moduleLang: Lang = 'en'

export function t(key: StringKey, params?: Params): string {
  return translate(moduleLang, key, params)
}

export function LocaleProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial)
  moduleLang = lang
  useEffect(
    () =>
      window.pdfApi.onLanguageChanged((next) => {
        document.documentElement.lang = htmlLang(next)
        document.documentElement.dir = htmlDir(next)
        setLang(next)
      }),
    [],
  )
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>
}

export function useI18n(): { lang: Lang; t: TFunc } {
  const lang = useContext(LocaleContext)
  return { lang, t: (key, params) => translate(lang, key, params) }
}
