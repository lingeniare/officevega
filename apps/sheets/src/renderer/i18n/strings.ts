import { aiStrings } from './strings-ai'
import { appStrings } from './strings-app'
import { dialogStrings } from './strings-dialogs'

export const strings = {
  en: { ...appStrings.en, ...dialogStrings.en, ...aiStrings.en },
  ru: { ...appStrings.ru, ...dialogStrings.ru, ...aiStrings.ru },
  cs: { ...appStrings.cs, ...dialogStrings.cs, ...aiStrings.cs },
  nl: { ...appStrings.nl, ...dialogStrings.nl, ...aiStrings.nl },
  ms: { ...appStrings.ms, ...dialogStrings.ms, ...aiStrings.ms },
  he: { ...appStrings.he, ...dialogStrings.he, ...aiStrings.he },
  hi: { ...appStrings.hi, ...dialogStrings.hi, ...aiStrings.hi },

  vi: { ...appStrings.vi, ...dialogStrings.vi, ...aiStrings.vi },
  'zh-TW': { ...appStrings['zh-TW'], ...dialogStrings['zh-TW'], ...aiStrings['zh-TW'] },
  uz: { ...appStrings.uz, ...dialogStrings.uz, ...aiStrings.uz },
  kk: { ...appStrings.kk, ...dialogStrings.kk, ...aiStrings.kk },
  az: { ...appStrings.az, ...dialogStrings.az, ...aiStrings.az },
  tk: { ...appStrings.tk, ...dialogStrings.tk, ...aiStrings.tk },
  ky: { ...appStrings.ky, ...dialogStrings.ky, ...aiStrings.ky },
  tt: { ...appStrings.tt, ...dialogStrings.tt, ...aiStrings.tt },
  ka: { ...appStrings.ka, ...dialogStrings.ka, ...aiStrings.ka },
}
