import React from 'react'
import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import { App } from './App'
import { AudienceView } from './components/AudienceView'
import { LocaleProvider, setModuleLang } from './i18n/locale'
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

// Canvas fillText never triggers @font-face downloads, so the bundled document fonts
// (Carlito ↔ Calibri) must be loaded explicitly or Konva silently draws the fallback face.
for (const variant of ['', 'bold ', 'italic ', 'italic bold ']) {
  document.fonts?.load?.(`${variant}16px Carlito`).catch(() => {})
  document.fonts?.load?.(`${variant}16px 'Carlito GO'`).catch(() => {})
}

// ?mode=audience: the presenter view's external-screen audience show window (created by the main process)
const mode = new URLSearchParams(window.location.search).get('mode')

// macOS windows are created with vibrancy; let the thumbnail pane show it
// (the audience show window stays fully opaque)
if (mode !== 'audience' && navigator.platform.toLowerCase().includes('mac'))
  document.body.classList.add('vib')

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

function applyDesign(design: UiDesign): void {
  if (design === 'standard') document.documentElement.removeAttribute('data-design')
  else document.documentElement.setAttribute('data-design', design)
}

async function bootstrap(): Promise<void> {
  let lang: Lang = 'en'
  let theme: UiTheme = 'system'
  let design: UiDesign = 'digital'
  try {
    // per-promise catch: standalone runs have no app:get-theme handler, and
    // that rejection must not drop a resolved language
    ;[lang, theme, design] = await Promise.all([
      window.slidesApi.getLanguage().catch(() => 'en' as const),
      window.slidesApi.getTheme().catch(() => 'system' as const),
      window.slidesApi.getDesign().catch(() => 'digital' as const),
    ])
  } catch {
    /* dev renderer without the preload bridge */
  }
  setModuleLang(lang)
  document.documentElement.lang = htmlLang(lang)
  document.documentElement.dir = htmlDir(lang)
  // the audience show window renders slide content only — it never themes
  if (mode !== 'audience') {
    applyTheme(theme)
    window.slidesApi?.onThemeChanged(applyTheme)
    applyDesign(design)
    window.slidesApi?.onDesignChanged(applyDesign)
    await window.slidesApi
      ?.getAiPanelPrefs?.()
      .then(applyAiPanelPrefs)
      .catch(() => {})
    window.slidesApi?.onAiPanelPrefsChanged?.(applyAiPanelPrefs)
    // interface zoom (genoffice#1913); the audience show fits its own stage
    await window.slidesApi
      ?.getUiScale?.()
      .then(applyUiScale)
      .catch(() => {})
    window.slidesApi?.onUiScaleChanged?.(applyUiScale)
  }
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LocaleProvider initial={lang}>
        {mode === 'audience' ? <AudienceView /> : <App />}
      </LocaleProvider>
    </React.StrictMode>,
  )
}

void bootstrap()
