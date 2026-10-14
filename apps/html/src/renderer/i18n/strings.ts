import { aiStrings } from './strings-ai'
import { appStrings } from './strings-app'

export const strings = {
  en: { ...appStrings.en, ...aiStrings.en },
  ru: { ...appStrings.ru, ...aiStrings.ru },
  cs: { ...appStrings.cs, ...aiStrings.cs },
  nl: { ...appStrings.nl, ...aiStrings.nl },
  ms: { ...appStrings.ms, ...aiStrings.ms },
  he: { ...appStrings.he, ...aiStrings.he },
  hi: { ...appStrings.hi, ...aiStrings.hi },

  vi: { ...appStrings.vi, ...aiStrings.vi },
  'zh-TW': { ...appStrings['zh-TW'], ...aiStrings['zh-TW'] },
  uz: { ...appStrings.uz, ...aiStrings.uz },
  kk: { ...appStrings.kk, ...aiStrings.kk },
  az: { ...appStrings.az, ...aiStrings.az },
  tk: { ...appStrings.tk, ...aiStrings.tk },
  ky: { ...appStrings.ky, ...aiStrings.ky },
  tt: { ...appStrings.tt, ...aiStrings.tt },
  ka: { ...appStrings.ka, ...aiStrings.ka },
}
