import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { PresentView } from './PresentView'
import { LocaleProvider } from './i18n/locale'
import type { UiDesign, UiTheme } from '../shared/ipc'
import { applyAiPanelPrefs, installScreenTips } from '@genoffice/ui'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/dropdown.css'
import '@genoffice/ui/find-panel.css'
import '@genoffice/ui/color-picker.css'
import '@genoffice/ui/ribbon-collapse.css'
import '@genoffice/ui/ai-panel-prefs.css'
import '@genoffice/ui/ai-scope-quote.css'
import '@genoffice/ui/image-dialogs.css'
import './styles.css'
import '@genoffice/ui/ai-chat.css'
import '@genoffice/ui/cup-skin.css'

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
    window.htmlApi.getLanguage().catch(() => 'zh' as const),
    window.htmlApi.getTheme().catch(() => 'system' as const),
    window.htmlApi.getDesign().catch(() => 'standard' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  applyDesign(design)
  window.htmlApi.onThemeChanged(applyTheme)
  window.htmlApi.onDesignChanged(applyDesign)
  await window.htmlApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.htmlApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  // a present tab/window (opened by Present → New tab) renders only its owner's preview
  const params = new URLSearchParams(location.search)
  const present = params.has('present')
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      {present ? <PresentView title={params.get('title') ?? ''} /> : <App />}
    </LocaleProvider>,
  )
})()
