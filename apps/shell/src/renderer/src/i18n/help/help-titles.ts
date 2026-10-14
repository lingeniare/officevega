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
  'zh-TW',
  'en',
  'ru',
  'cs',
  'nl',
  'ms',
  'he',
  'hi',
  'vi',
] as const

export type HelpTitleLang = (typeof HELP_TITLE_LANGS)[number]

/** Sidebar group headings, per language. */
const GROUP_TITLES: Record<HelpGroupId, Record<HelpTitleLang, string>> = {
  start: {
    'zh-TW': '入門',
    en: 'Getting started',
    ru: 'Начало работы',
    cs: 'Začínáme',
    nl: 'Aan de slag',
    ms: 'Mula',
    he: 'תחילת העבודה',
    hi: 'शुरुआत',
    vi: 'Bắt đầu',
  },
  apps: {
    'zh-TW': '應用程式',
    en: 'Applications',
    ru: 'Приложения',
    cs: 'Aplikace',
    nl: 'Toepassingen',
    ms: 'Aplikasi',
    he: 'יישומים',
    hi: 'ऐप्स',
    vi: 'Ứng dụng',
  },
  ai: {
    'zh-TW': 'AI 功能',
    en: 'AI features',
    ru: 'Возможности ИИ',
    cs: 'Funkce AI',
    nl: 'AI-functies',
    ms: 'Ciri AI',
    he: 'יכולות AI',
    hi: 'AI सुविधाएँ',
    vi: 'Tính năng AI',
  },
  manage: {
    'zh-TW': '檔案與設定',
    en: 'Files & settings',
    ru: 'Файлы и настройки',
    cs: 'Soubory a nastavení',
    nl: 'Bestanden en instellingen',
    ms: 'Fail & tetapan',
    he: 'קבצים והגדרות',
    hi: 'फ़ाइलें और सेटिंग्स',
    vi: 'Tệp và cài đặt',
  },
}

/** Article titles, per language, keyed by topic id. A language lands here when
 *  its bodies land in ./topics; until then the title falls back to English. */
const TOPIC_TITLES: Record<string, Record<HelpTitleLang, string>> = {
  'getting-started': {
    'zh-TW': '快速上手：介面與基本操作',
    en: 'Quick start: the interface and the basics',
    cs: 'Rychlý start: rozhraní a základy',
    nl: 'Snel starten: de interface en de basis',
    ms: 'Mula pantas: antara muka dan asas',
    ru: 'Быстрый старт: интерфейс и основы',
    he: 'התחלה מהירה: הממשק והבסיס',
    hi: 'त्वरित प्रारंभ: इंटरफ़ेस और बुनियादी बातें',
    vi: 'Bắt đầu nhanh: giao diện và những điều cơ bản',
  },
  'home-screen': {
    'zh-TW': '首頁（Home）：檔案都在哪裡',
    en: 'The Home screen: where your files live',
    cs: 'Obrazovka domovské stránky: kde žijí vaše soubory',
    nl: 'Het startscherm: waar je bestanden staan',
    ms: 'Skrin Laman Utama: di mana fail anda berada',
    ru: 'Главный экран: где хранятся ваши файлы',
    he: 'מסך הבית: איפה הקבצים שלך גרים',
    hi: 'होम स्क्रीन: आपकी फ़ाइलें कहाँ हैं',
    vi: 'Màn hình Trang chủ: tập tin của bạn ở đâu',
  },
  'tabs-and-windows': {
    'zh-TW': '分頁與視窗管理',
    en: 'Tabs and window management',
    cs: 'Karty a správa oken',
    nl: 'Tabbladen en vensterbeheer',
    ms: 'Tab dan pengurusan tingkap',
    ru: 'Вкладки и управление окнами',
    he: 'כרטיסיות וניהול חלונות',
    hi: 'टैब और विंडो प्रबंधन',
    vi: 'Quản lý thẻ và cửa sổ',
  },
  shortcuts: {
    'zh-TW': '快捷鍵一覽',
    en: 'Keyboard shortcuts',
    cs: 'Klávesové zkratky',
    nl: 'Sneltoetsen',
    ms: 'Pintasan papan kekunci',
    ru: 'Сочетания клавиш',
    he: 'קיצורי מקלדת',
    hi: 'कीबोर्ड शॉर्टकट',
    vi: 'Phím tắt',
  },
  docs: {
    'zh-TW': 'Docs：文字處理',
    en: 'Docs: word processing',
    cs: 'Docs: textový editor',
    nl: 'Docs: tekstverwerking',
    ms: 'Docs: penyuntingan teks',
    ru: 'Docs: работа с текстом',
    he: 'Docs: עיבוד תמלילים',
    hi: 'Docs: शब्द प्रसंस्करण',
    vi: 'Docs: xử lý văn bản',
  },
  sheets: {
    'zh-TW': 'Sheets：試算表',
    en: 'Sheets: spreadsheets',
    cs: 'Sheets: tabulky',
    nl: 'Sheets: spreadsheets',
    ms: 'Sheets: hamparan',
    ru: 'Sheets: электронные таблицы',
    he: 'Sheets: גיליונות',
    hi: 'Sheets: स्प्रेडशीट',
    vi: 'Sheets: bảng tính',
  },
  slides: {
    'zh-TW': 'Slides：簡報',
    en: 'Slides: presentations',
    cs: 'Slides: prezentace',
    nl: 'Slides: presentaties',
    ms: 'Slides: persembahan',
    ru: 'Slides: презентации',
    he: 'Slides: מצגות',
    hi: 'Slides: प्रस्तुतियाँ',
    vi: 'Slides: trình chiếu',
  },
  pdf: {
    'zh-TW': 'PDF：閱讀、註解與塗黑',
    en: 'PDF: reading, annotating and redacting',
    cs: 'PDF: čtení, anotování a začerňování',
    nl: 'PDF: lezen, annoteren en zwart maken',
    ms: 'PDF: membaca, menganotasi, dan redact',
    ru: 'PDF: чтение, аннотирование и редактирование',
    he: 'PDF: קריאה, הערות והשחרה',
    hi: 'PDF: पढ़ना, एनोटेट करना और कालापन',
    vi: 'PDF: đọc, chú thích và che nội dung',
  },
  markdown: {
    'zh-TW': 'Markdown 編輯器',
    en: 'The Markdown editor',
    cs: 'Editor Markdown',
    nl: 'De Markdown-editor',
    ms: 'Editor Markdown',
    ru: 'Редактор Markdown',
    he: 'עורך ה-Markdown',
    hi: 'Markdown एडिटर',
    vi: 'Trình soạn thảo Markdown',
  },
  html: {
    'zh-TW': 'HTML 編輯器',
    en: 'The HTML editor',
    cs: 'Editor HTML',
    nl: 'De HTML-editor',
    ms: 'Editor HTML',
    ru: 'Редактор HTML',
    he: 'עורך ה-HTML',
    hi: 'HTML एडिटर',
    vi: 'Trình soạn thảo HTML',
  },
  'ai-panel': {
    'zh-TW': 'AI 助理面板',
    en: 'The AI assistant panel',
    cs: 'Panel AI asistenta',
    nl: 'Het AI-assistentpaneel',
    ms: 'Panel pembantu AI',
    ru: 'Панель ИИ-ассистента',
    he: 'חלונית העוזר AI',
    hi: 'AI सहायक पैनल',
    vi: 'Bảng điều khiển trợ lý AI',
  },
  'ai-models': {
    'zh-TW': 'AI 模型與設定',
    en: 'AI models and settings',
    cs: 'Modely AI a nastavení',
    nl: 'AI-modellen en instellingen',
    ms: 'Model AI dan tetapan',
    ru: 'Модели ИИ и настройки',
    he: 'מודלים של AI והגדרות',
    hi: 'AI मॉडल और सेटिंग्स',
    vi: 'Mô hình AI và cài đặt',
  },
  fonts: {
    'zh-TW': '字型：系統字型與可下載字型',
    en: 'Fonts: system faces and downloadable families',
    cs: 'Písma: systémové fonty a stažitelné rodiny',
    nl: 'Lettertypen: systeemlettertypen en te downloaden families',
    ms: 'Fon: muka huruf sistem dan keluarga yang boleh dimuat turun',
    ru: 'Шрифты: системные и загружаемые семейства',
    he: 'גופנים: גופני מערכת ומשפחות להורדה',
    hi: 'फ़ॉन्ट: सिस्टम फ़ॉन्ट और डाउनलोड करने योग्य परिवार',
    vi: 'Phông chữ: phông hệ thống và các họ có thể tải về',
  },
  'file-ops': {
    'zh-TW': '檔案操作：重新命名、刪除、匯出',
    en: 'File operations: rename, delete, export',
    cs: 'Práce se soubory: přejmenování, odstranění, export',
    nl: 'Bestandsbewerkingen: hernoemen, verwijderen, exporteren',
    ms: 'Operasi fail: menamakan semula, memadam, dan eksport',
    ru: 'Работа с файлами: переименование, удаление, экспорт',
    he: 'פעולות קבצים: שינוי שם, מחיקה, ייצוא',
    hi: 'फ़ाइल कार्रवाइयाँ: नाम बदलना, हटाना, निर्यात',
    vi: 'Thao tác tập tin: đổi tên, xóa, xuất',
  },
  'settings-integrations': {
    'zh-TW': '設定、語言、主題與 MCP 整合',
    en: 'Settings, language, theme and MCP integrations',
    cs: 'Nastavení, jazyk, motiv a integrace MCP',
    nl: 'Instellingen, taal, thema en MCP-integraties',
    ms: 'Tetapan, bahasa, tema dan integrasi MCP',
    ru: 'Настройки, язык, тема и интеграции MCP',
    he: 'הגדרות, שפה, ערכת נושא ושילובי MCP',
    hi: 'सेटिंग्स, भाषा, थीम और MCP इंटीग्रेशन',
    vi: 'Cài đặt, ngôn ngữ, chủ đề và tích hợp MCP',
  },
  install: {
    'zh-TW': '安裝 OfficeVega',
    en: 'Installing OfficeVega',
    ru: 'Установка Офис ВЕГА',
    cs: 'Instalace OfficeVega',
    nl: 'OfficeVega installeren',
    ms: 'Pemasangan OfficeVega',
    he: 'התקנת OfficeVega',
    hi: 'OfficeVega इंस्टॉल करना',
    vi: 'Cài đặt OfficeVega',
  },
  cli: {
    'zh-TW': '命令列與智慧代理',
    en: 'Command line and agents',
    ru: 'Командная строка и агенты',
    cs: 'Příkazová řádka a agenti',
    nl: 'Opdrachtregel en agents',
    ms: 'Baris arahan dan ejen',
    he: 'שורת פקודות וסוכנים',
    hi: 'कमांड लाइन और एजेंट',
    vi: 'Dòng lệnh và tác nhân',
  },
  mcp: {
    'zh-TW': '連接程式設計助手',
    en: 'Connecting a coding agent',
    ru: 'Подключение ИИ-агента',
    cs: 'Připojení programového agenta',
    nl: 'Verbinden met een coding agent',
    ms: 'Menyambungkan ejen penulisan kod',
    he: 'חיבור סוכן לקוד',
    hi: 'कोडिंग एजेंट से कनेक्ट करना',
    vi: 'Kết nối tác nhân lập trình',
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
