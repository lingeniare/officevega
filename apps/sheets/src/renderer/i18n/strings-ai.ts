import { defineStrings } from '@genoffice/i18n'
import { en } from './ai/en'
import { ru } from './ai/ru'
import { cs } from './ai/cs'
import { nl } from './ai/nl'
import { ms } from './ai/ms'
import { he } from './ai/he'
import { hi } from './ai/hi'
import { zhTW } from './ai/zh-TW'
import { vi } from './ai/vi'
import { uz } from './ai/uz'
import { kk } from './ai/kk'
import { az } from './ai/az'
import { tk } from './ai/tk'
import { ky } from './ai/ky'
import { tt } from './ai/tt'
import { ka } from './ai/ka'

/** User-visible copy for the ai/ panel and tool feedback (LLM prompts excluded) */
export const aiStrings = defineStrings({
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
