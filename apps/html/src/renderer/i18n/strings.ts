import { aiStrings } from './strings-ai'
import { appStrings } from './strings-app'

export const strings = {
  en: { ...appStrings.en, ...aiStrings.en },
  ru: { ...appStrings.ru, ...aiStrings.ru },
  
  
  
  
  

  
  
  uz: { ...appStrings.uz, ...aiStrings.uz },
  kk: { ...appStrings.kk, ...aiStrings.kk },
  az: { ...appStrings.az, ...aiStrings.az },
  tk: { ...appStrings.tk, ...aiStrings.tk },
  ky: { ...appStrings.ky, ...aiStrings.ky },
  tt: { ...appStrings.tt, ...aiStrings.tt },
  ka: { ...appStrings.ka, ...aiStrings.ka },
}
