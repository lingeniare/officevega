/**
 * Per-language titles for the manual's sidebar and article headings.
 *
 * The registry holds the structure — which topics exist, their group and order
 * — and this holds the words, one entry per UI language. They are separate
 * because they change for different reasons and on different schedules: a new
 * topic lands in the registry, a new language lands here, and a language with
 * no body yet still needs a title so the sidebar never shows an empty row.
 */

import type { HelpGroupId } from './help-registry'

/** The languages the manual has titles for; `@genoffice/i18n`'s list, minus none. */
export const HELP_TITLE_LANGS = [
  'en',
  'ru',
] as const

export type HelpTitleLang = (typeof HELP_TITLE_LANGS)[number]

/** Sidebar group headings, per language. */
const GROUP_TITLES: Record<HelpGroupId, Record<HelpTitleLang, string>> = {
  start: {
    
    en: 'Getting started',
    ru: 'Начало работы',
    
    
    
    
    
    
  },
  apps: {
    
    en: 'Applications',
    ru: 'Приложения',
    
    
    
    
    
    
  },
  ai: {
    
    en: 'AI features',
    ru: 'Возможности ИИ',
    
    
    
    
    
    
  },
  manage: {
    
    en: 'Files & settings',
    ru: 'Файлы и настройки',
    
    
    
    
    
    
  },
}

/** Article titles, per language, keyed by topic id. A language lands here when
 *  its bodies land in ./topics; until then the title falls back to English. */
const TOPIC_TITLES: Record<string, Record<HelpTitleLang, string>> = {
  'getting-started': {
    
    en: 'Quick start: the interface and the basics',
    
    
    
    ru: 'Быстрый старт: интерфейс и основы',
    
    
    
  },
  'home-screen': {
    
    en: 'The Home screen: where your files live',
    
    
    
    ru: 'Главный экран: где хранятся ваши файлы',
    
    
    
  },
  'tabs-and-windows': {
    
    en: 'Tabs and window management',
    
    
    
    ru: 'Вкладки и управление окнами',
    
    
    
  },
  shortcuts: {
    
    en: 'Keyboard shortcuts',
    
    
    
    ru: 'Сочетания клавиш',
    
    
    
  },
  docs: {
    
    en: 'Docs: word processing',
    
    
    
    ru: 'Docs: работа с текстом',
    
    
    
  },
  sheets: {
    
    en: 'Sheets: spreadsheets',
    
    
    
    ru: 'Sheets: электронные таблицы',
    
    
    
  },
  slides: {
    
    en: 'Slides: presentations',
    
    
    
    ru: 'Slides: презентации',
    
    
    
  },
  pdf: {
    
    en: 'PDF: reading, annotating and redacting',
    
    
    
    ru: 'PDF: чтение, аннотирование и редактирование',
    
    
    
  },
  markdown: {
    
    en: 'The Markdown editor',
    
    
    
    ru: 'Редактор Markdown',
    
    
    
  },
  html: {
    
    en: 'The HTML editor',
    
    
    
    ru: 'Редактор HTML',
    
    
    
  },
  'ai-panel': {
    
    en: 'The AI assistant panel',
    
    
    
    ru: 'Панель ИИ-ассистента',
    
    
    
  },
  'ai-models': {
    
    en: 'AI models and settings',
    
    
    
    ru: 'Модели ИИ и настройки',
    
    
    
  },
  fonts: {
    
    en: 'Fonts: system faces and downloadable families',
    
    
    
    ru: 'Шрифты: системные и загружаемые семейства',
    
    
    
  },
  'file-ops': {
    
    en: 'File operations: rename, delete, export',
    
    
    
    ru: 'Работа с файлами: переименование, удаление, экспорт',
    
    
    
  },
  'settings-integrations': {
    
    en: 'Settings, language, theme and MCP integrations',
    
    
    
    ru: 'Настройки, язык, тема и интеграции MCP',
    
    
    
  },
  install: {
    
    en: 'Installing OfficeVega',
    ru: 'Установка Офис ВЕГА',
    
    
    
    
    
    
  },
  cli: {
    
    en: 'Command line and agents',
    ru: 'Командная строка и агенты',
    
    
    
    
    
    
  },
  mcp: {
    
    en: 'Connecting a coding agent',
    ru: 'Подключение ИИ-агента',
    
    
    
    
    
    
  },
}

/** Sidebar group heading in the reader's language; English when unknown. */
export function groupTitle(id: HelpGroupId, lang: string): string {
  const row = GROUP_TITLES[id]
  return (row?.[lang as HelpTitleLang] ?? row?.en) as string
}

/** Article title in the reader's language; falls back to the topic id, which
 *  is never pretty, so a language added without its titles shows up as a gap
 *  rather than as a blank row. */
export function topicTitle(id: string, lang: string): string {
  const row = TOPIC_TITLES[id]
  return (row?.[lang as HelpTitleLang] ?? row?.en ?? id) as string
}
