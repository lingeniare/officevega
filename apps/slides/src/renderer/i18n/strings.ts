import { aiStrings } from './strings-ai'
import { appStrings } from './strings-app'
import { paneStrings } from './strings-panes'
import { ribbonStrings } from './strings-ribbon'

export const strings = {
  en: { ...appStrings.en, ...ribbonStrings.en, ...paneStrings.en, ...aiStrings.en },
  ru: { ...appStrings.ru, ...ribbonStrings.ru, ...paneStrings.ru, ...aiStrings.ru },
  
  
  
  
  

  
  
  uz: {
    ...appStrings.uz,
    ...ribbonStrings.uz,
    ...paneStrings.uz,
    ...aiStrings.uz,
  },
  kk: {
    ...appStrings.kk,
    ...ribbonStrings.kk,
    ...paneStrings.kk,
    ...aiStrings.kk,
  },
  az: {
    ...appStrings.az,
    ...ribbonStrings.az,
    ...paneStrings.az,
    ...aiStrings.az,
  },
  tk: {
    ...appStrings.tk,
    ...ribbonStrings.tk,
    ...paneStrings.tk,
    ...aiStrings.tk,
  },
  ky: {
    ...appStrings.ky,
    ...ribbonStrings.ky,
    ...paneStrings.ky,
    ...aiStrings.ky,
  },
  tt: {
    ...appStrings.tt,
    ...ribbonStrings.tt,
    ...paneStrings.tt,
    ...aiStrings.tt,
  },
  ka: {
    ...appStrings.ka,
    ...ribbonStrings.ka,
    ...paneStrings.ka,
    ...aiStrings.ka,
  },
}
