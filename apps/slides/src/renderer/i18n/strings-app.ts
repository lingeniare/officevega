import { defineStrings } from '@genoffice/i18n'
import { en } from './app/en'
import { ru } from './app/ru'
import { cs } from './app/cs'
import { nl } from './app/nl'
import { ms } from './app/ms'
import { he } from './app/he'
import { hi } from './app/hi'
import { zhTW } from './app/zh-TW'
import { vi } from './app/vi'
import { uz } from './app/uz'
import { kk } from './app/kk'
import { az } from './app/az'
import { tk } from './app/tk'
import { ky } from './app/ky'
import { tt } from './app/tt'
import { ka } from './app/ka'

/** Copy for App.tsx / canvas and edit overlays / renderer root-level modules */
export const appStrings = defineStrings({
  en,
  ru,
  cs,
  nl,
  ms,
  he,
  hi,
  'zh-TW': zhTW,
  vi,
  uz,
  kk,
  az,
  tk,
  ky,
  tt,
  ka,
})
