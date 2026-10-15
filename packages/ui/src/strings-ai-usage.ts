import type { Lang } from '@genoffice/i18n'

/** Tooltips for the token-usage chips under assistant replies and on the composer
 * (all editors and the kb-ask panel share them; the chips themselves are numeric). */
export interface AiUsageLabels {
  /** per-reply chip tooltip */
  runTitle: string
  /** session-total chip tooltip */
  sessionTitle: string
}

export const AI_USAGE_LABELS: Record<Lang, AiUsageLabels> = {
  en: {
    runTitle: 'Token usage for this reply',
    sessionTitle: 'Session token usage',
  },
  ru: {
    runTitle: 'Токены, использованные в этом ответе',
    sessionTitle: 'Токены за всю сессию',
  },
  
  
  
  
  
  
  
  uz: {
    runTitle: 'Bu javobning token sarfi',
    sessionTitle: 'Sessiyaning jami token sarfi',
  },
  kk: {
    runTitle: 'Осы жауаптың token шығыны',
    sessionTitle: 'Сессияның жиынтық token шығыны',
  },
  az: {
    runTitle: 'Bu cavabın token istifadəsi',
    sessionTitle: 'Sessiyanın ümumi token istifadəsi',
  },
  tk: {
    runTitle: 'Bu jogabyň token sarp edilişi',
    sessionTitle: 'Sessiýanyň jemi token sarp edilişi',
  },
  ky: {
    runTitle: 'Бул жооптун token колдонмосу',
    sessionTitle: 'Сессиянын жалпы token колдонмосу',
  },
  tt: {
    runTitle: 'Бу җавапның token тотылуы',
    sessionTitle: 'Сессиянең гомуми token тотылуы',
  },
  ka: {
    runTitle: 'ამ პასუხის ტოკენების მოხმარება',
    sessionTitle: 'სესიის ტოკენების ჯამური მოხმარება',
  },
}
