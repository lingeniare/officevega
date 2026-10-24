import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiDesign, UiTheme } from '../shared/ipc'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/ai-queue-strip.css'
import '@genoffice/ui/ai-usage.css'
import '@genoffice/ui/ai-skills.css'
import '@genoffice/ui/color-picker.css'
import '@genoffice/ui/dropdown.css'
import '@genoffice/ui/ribbon-collapse.css'
import '@genoffice/ui/markdown.css'
import '@genoffice/ui/ai-panel-prefs.css'
import '@genoffice/ui/ai-scope-quote.css'
import './styles.css'
import '@genoffice/ui/ai-chat.css'
import '@genoffice/ui/ai-history-menu.css'
import '@genoffice/ui/cup-skin.css'
import { applyAiPanelPrefs, applyUiScale, installScreenTips } from '@genoffice/ui'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

function applyDesign(design: UiDesign): void {
  if (design === 'standard') document.documentElement.removeAttribute('data-design')
  else document.documentElement.setAttribute('data-design', design)
}

void (async () => {
  const [lang, theme, design] = await Promise.all([
    window.pdfApi.getLanguage().catch(() => 'en' as const),
    window.pdfApi.getTheme().catch(() => 'system' as const),
    window.pdfApi.getDesign().catch(() => 'digital' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  applyDesign(design)
  window.pdfApi.onThemeChanged(applyTheme)
  window.pdfApi.onDesignChanged(applyDesign)
  await window.pdfApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.pdfApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  // interface zoom (genoffice#1913): the page scale divides it back out
  await window.pdfApi
    ?.getUiScale?.()
    .then(applyUiScale)
    .catch(() => {})
  window.pdfApi?.onUiScaleChanged?.(applyUiScale)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
