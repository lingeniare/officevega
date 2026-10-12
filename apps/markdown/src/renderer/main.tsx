import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { DocTheme, UiDesign, UiTheme } from '../shared/ipc'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/ai-model-picker.css'
import '@genoffice/ui/ai-queue-strip.css'
import '@genoffice/ui/ai-usage.css'
import '@genoffice/ui/dropdown.css'
import '@genoffice/ui/find-panel.css'
import '@genoffice/ui/ribbon-collapse.css'
import '@genoffice/ui/markdown.css'
import '@genoffice/ui/ai-panel-prefs.css'
import '@genoffice/ui/ai-scope-quote.css'
import '@genoffice/ui/image-viewer.css'
import 'katex/dist/katex.min.css'
import './styles.css'
import '@genoffice/ui/ai-chat.css'
import '@genoffice/ui/ai-history-menu.css'
import '@genoffice/ui/cup-skin.css'
import { applyAiPanelPrefs, installScreenTips } from '@genoffice/ui'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

function applyDesign(design: UiDesign): void {
  if (design === 'standard') document.documentElement.removeAttribute('data-design')
  else document.documentElement.setAttribute('data-design', design)
}

function applyDocumentTheme(theme: DocTheme): void {
  // data-doc-theme drives the preview paper (genoffice#1811); absent means 'follow' the UI theme
  if (theme === 'follow') document.documentElement.removeAttribute('data-doc-theme')
  else document.documentElement.setAttribute('data-doc-theme', theme)
}

void (async () => {
  const [lang, theme, design, docTheme] = await Promise.all([
    window.markdownApi.getLanguage().catch(() => 'zh' as const),
    window.markdownApi.getTheme().catch(() => 'system' as const),
    window.markdownApi.getDesign().catch(() => 'digital' as const),
    window.markdownApi.getDocumentTheme?.().catch(() => 'follow' as const),
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  applyDesign(design)
  applyDocumentTheme(docTheme ?? 'follow')
  window.markdownApi.onThemeChanged(applyTheme)
  window.markdownApi.onDesignChanged(applyDesign)
  window.markdownApi.onDocumentThemeChanged?.(applyDocumentTheme)
  await window.markdownApi
    ?.getAiPanelPrefs?.()
    .then(applyAiPanelPrefs)
    .catch(() => {})
  window.markdownApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
