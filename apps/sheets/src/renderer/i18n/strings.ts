import { aiStrings } from './strings-ai'
import { appStrings } from './strings-app'
import { dialogStrings } from './strings-dialogs'

export const strings = {
  en: { ...appStrings.en, ...dialogStrings.en, ...aiStrings.en },
  ru: { ...appStrings.ru, ...dialogStrings.ru, ...aiStrings.ru },
  
  
  
  
  

  
  
  uz: { ...appStrings.uz, ...dialogStrings.uz, ...aiStrings.uz },
  kk: { ...appStrings.kk, ...dialogStrings.kk, ...aiStrings.kk },
  az: { ...appStrings.az, ...dialogStrings.az, ...aiStrings.az },
  tk: { ...appStrings.tk, ...dialogStrings.tk, ...aiStrings.tk },
  ky: { ...appStrings.ky, ...dialogStrings.ky, ...aiStrings.ky },
  tt: { ...appStrings.tt, ...dialogStrings.tt, ...aiStrings.tt },
  ka: { ...appStrings.ka, ...dialogStrings.ka, ...aiStrings.ka },
}
