import type { Lang } from '@genoffice/i18n'
import type { AiPanelSide } from './ai-panel-prefs'

// Shared by every editor's AI header; each label names the destination side.
export const AI_PANEL_SIDE_LABELS: Record<Lang, Record<AiPanelSide, string>> = {
  en: { left: 'Move AI panel to the left', right: 'Move AI panel to the right' },
  ru: { left: 'Переместить панель ИИ влево', right: 'Переместить панель ИИ вправо' },
  
  
  
  
  
  
  
  uz: { left: 'AI panelini chapga koʻchirish', right: 'AI panelini oʻngga koʻchirish' },
  kk: { left: 'AI панелін солға жылжыту', right: 'AI панелін оңға жылжыту' },
  az: { left: 'AI panelini sola köçürün', right: 'AI panelini sağa köçürün' },
  tk: { left: 'AI panelini çepe göçürüň', right: 'AI panelini saga göçürüň' },
  ky: { left: 'AI панелин солго жылдыруу', right: 'AI панелин оңго жылдыруу' },
  tt: { left: 'AI панелен сулга күчерү', right: 'AI панелен уңга күчерү' },
  ka: { left: 'AI პანელის მარცხნივ გადატანა', right: 'AI პანელის მარჯვნივ გადატანა' },
}
