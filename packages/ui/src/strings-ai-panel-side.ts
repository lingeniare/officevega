import type { Lang } from '@genoffice/i18n'
import type { AiPanelSide } from './ai-panel-prefs'

// Shared by every editor's AI header; each label names the destination side.
export const AI_PANEL_SIDE_LABELS: Record<Lang, Record<AiPanelSide, string>> = {
  en: { left: 'Move AI panel to the left', right: 'Move AI panel to the right' },
  ru: { left: 'Переместить панель ИИ влево', right: 'Переместить панель ИИ вправо' },
  cs: { left: 'Přesunout panel AI doleva', right: 'Přesunout panel AI doprava' },
  nl: { left: 'AI-paneel naar links verplaatsen', right: 'AI-paneel naar rechts verplaatsen' },
  ms: { left: 'Alihkan panel AI ke kiri', right: 'Alihkan panel AI ke kanan' },
  he: { left: 'העברת חלונית הבינה המלאכותית לשמאל', right: 'העברת חלונית הבינה המלאכותית לימין' },
  hi: { left: 'AI पैनल को बाईं ओर ले जाएँ', right: 'AI पैनल को दाईं ओर ले जाएँ' },
  'zh-TW': { left: '將 AI 面板移到左側', right: '將 AI 面板移到右側' },
  vi: { left: 'Di chuyển bảng AI sang trái', right: 'Di chuyển bảng AI sang phải' },
  uz: { left: 'AI panelini chapga koʻchirish', right: 'AI panelini oʻngga koʻchirish' },
  kk: { left: 'AI панелін солға жылжыту', right: 'AI панелін оңға жылжыту' },
  az: { left: 'AI panelini sola köçürün', right: 'AI panelini sağa köçürün' },
  tk: { left: 'AI panelini çepe göçürüň', right: 'AI panelini saga göçürüň' },
  ky: { left: 'AI панелин солго жылдыруу', right: 'AI панелин оңго жылдыруу' },
  tt: { left: 'AI панелен сулга күчерү', right: 'AI панелен уңга күчерү' },
  ka: { left: 'AI პანელის მარცხნივ გადატანა', right: 'AI პანელის მარჯვნივ გადატანა' },
}
