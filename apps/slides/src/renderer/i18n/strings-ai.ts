import { defineStrings } from '@genoffice/i18n'
import { en } from './ai/en'
import { ru } from './ai/ru'
import { uz } from './ai/uz'
import { kk } from './ai/kk'
import { az } from './ai/az'
import { tk } from './ai/tk'
import { ky } from './ai/ky'
import { tt } from './ai/tt'
import { ka } from './ai/ka'

/** User-visible copy for the ai/ panel and tool feedback (LLM prompts are not included here) */
export const aiStrings = defineStrings({
  en,
  ru,
  uz,
  kk,
  az,
  tk,
  ky,
  tt,
  ka,
})
