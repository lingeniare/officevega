import { createHash, randomUUID } from 'node:crypto'
import { handOffBytes } from './byte-handoff'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  BrowserWindow,
  Menu,
  WebContentsView,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  nativeTheme,
  net,
  session,
  shell,
  webContents,
} from 'electron'
import {
  abortOnDestroyed,
  appMenuLabels,
  buildPrintableHtml,
  configuredDefaultSaveDir,
  contextMenuLabels,
  fetchRemoteImage,
  installContextMenu,
  setContextMenuInterceptor,
  installNavigationGuard,
  isHeadlessMode,
  printHtmlToPdf,
  safeExternalUrl,
  saveAsSuggestion,
  saveImageFromUrl,
  saveTextFileWithDialog,
  showOpenDialogWithMemory,
  showSaveDialogWithMemory,
  aboutMenuItem,
  checkUpdatesMenuItem,
  licenseMenuItem,
  privacyMenuItem,
  toggleDevToolsItem,
  windowMenuTemplate,
  type HeadlessExportFormat,
  type HeadlessExportTarget,
  installRendererProtocol,
  registerRendererScheme,
  rendererUrl,
  themedSurfaceColor,
  forwardRendererConsole,
  MAX_REMOTE_IMAGE_BYTES,
  readBodyCapped,
  writeJsonAtomic,
} from '@genoffice/electron-utils'
import { configureMetricsCache, familyVerticalMetrics } from '@genoffice/font-metrics'
import { appTitle, createI18n, getUiLang, normalizeLang, setUiLang } from '@genoffice/i18n'
import { ProjectStore } from '@genoffice/project-store'
import type {
  IpcMainInvokeEvent,
  MenuItemConstructorOptions,
  NativeImage,
  OpenDialogOptions,
  SaveDialogOptions,
  WebContents,
} from 'electron'
import { parseFileToText } from '@genoffice/file-parse'
import { convertHtmlToDocx } from '../../../../packages/html2docx/src'
import { ElectronBrowserDriver } from '../../../../packages/html2docx/src/drivers/electron'
import {
  AiCreditsError,
  AiTimeoutError,
  isAiNetworkError,
  isAiOverloadedError,
  chatForProvider,
  defaultAiSettings,
  activeProvider,
  listProviderModels,
  testMediaProvider,
  type AiMediaProviderConfig,
  type AiMediaProviderId,
  type AiProviderId,
  type AiSearchProviderId,
  requestProvider,
  resolveAiSettings,
  maxOutputTokensOf,
  sanitizeAiSettings,
  sanitizeCliPath,
  setAiUserAgent,
  setPiiShieldEnabled,
  setRescueFetch,
  warmAiConnections,
  streamForProvider,
  type AiChatRequest,
  type AiSettings,
  type AiStreamChunk,
  type AiStreamRequest,
  type GenSparkAccountStatus,
  type LegacyAiSettings,
} from '@genoffice/ai-provider'
import { listCodexModels, shutdownCodexAppServers } from '@genoffice/ai-provider/codex-app-server'
import { listCustomModelsForIpc } from '@genoffice/ai-provider/custom-models'
import {
  ensureOfficeVegaLogin,
  noteGskCallFailure,
  officeVegaApiKey,
  setOfficeVegaAuthListener,
  gskApiKey,
  generateImageTool,
  testSearchProvider,
  gskLoginInfo,
  hasGskAuth,
  vegaAccountInfo,
  webSearchTool,
  imageSearchTool,
  analyzeMediaTool,
  documentMediaRoots,
} from '@genoffice/ai-search'
import type {
  AiDocContent,
  AttachmentAddResult,
  AttachmentImageResult,
  AttachmentMeta,
  AttachmentReadResult,
  ContextMenuRequest,
  CreateDocumentRequest,
  CreateDocumentResult,
  DecryptOpenResult,
  DocsTabInfo,
  MenuCommand,
  OpenDocxResult,
  PdfLinkPlan,
  SpellLanguages,
} from '../shared/ipc'
import { ATTACHMENT_IMAGE_EXTS } from '../shared/ipc'
import { applyPdfLinkPlan } from './pdf-links'
import { ClickClaims } from '../shared/context-menu-claims'
import { findDocxPath } from '../shared/open-file'
import { atomicWriteFile, looksLikeZip } from './atomic-write'
import {
  adoptLazyMediaHashes,
  forgetLazyMediaOwner,
  materializeLazyDocx,
  moveLazyMediaSource,
  openLazyDocx,
  pointLazyMediaAt,
  readLazyMedia,
  registerLazyMediaProtocol,
} from './lazy-media'
import { inlineLazyMediaInHtml } from './lazy-media-inline'
import {
  commitDocPasswordSave,
  currentDocPasswordIntentRevision,
  decryptDocx,
  decryptRecoveryCopy,
  discardDocPasswordIntents,
  DocxDecryptError,
  docPasswordFor,
  encryptDocx,
  forgetDocPasswords,
  isEncryptedDocx,
  markDiskEncrypted,
  prepareRecoveryDocx,
  rememberDocPassword,
  renameDocPassword,
  setDocPassword,
  snapshotDocPassword,
} from './docx-encryption'
import { isExternallyModified, type DiskFileState } from './external-change'
import { copyImageDisplaySize, validCopyImageDataUrl } from './copy-image-guard'
import { printScaleOption, validPrintGeometry } from './print-args'
import {
  assignStarredGroup,
  dropStarredItems,
  readStarredItems,
  renameStarredItem,
  starredGroupMap,
  starredGroupNames,
  toggleStarredItem,
  writeStarredItems,
} from './starred-files'
import { initDocsAutoUpdater } from './updater'
import { registerZoteroIpc, teardownZoteroIpc } from './zotero-ipc'
import menuPlusIcon1x from './assets/menu-plus.png?asset'
import menuPlusIcon2x from './assets/menu-plus@2x.png?asset'
import menuFolderIcon1x from './assets/menu-folder.png?asset'
import menuFolderIcon2x from './assets/menu-folder@2x.png?asset'

/**
 * Docs main-process logic as an embeddable module: no top-level side effects.
 * Standalone mode (apps/docs entry) calls startDocsStandalone(); the unified
 * shell (apps/shell) instead calls configureDocsRuntime() + registerDocsIpc()
 * + createDocsWindow() and owns the app lifecycle itself.
 */

const isDev = !!process.env.ELECTRON_RENDERER_URL

const tMain = createI18n({
  en: {
    dlgOpenDoc: 'Open Document',
    filterWord: 'Word Documents',
    dlgSaveAs: 'Save As',
    closeUnsavedMsg: 'This document has unsaved changes.',
    closeUnsavedDetail: 'Do you want to save them before closing?',
    closeNoReplyMsg: 'The document is not responding and may have unsaved changes.',
    closeNoReplyDetail: 'Close anyway? Unsaved changes will be lost.',
    btnCloseAnyway: 'Close Anyway',
    autosaveFoundTitle: 'Recovered version found',
    autosaveFoundBody:
      'There are unsaved changes from your last session. Restore the autosaved version?',
    autosaveRestore: 'Restore',
    autosaveDiscard: 'Discard',
    autosaveFileNewer: 'The file on disk is newer than this recovered copy — restoring will replace those newer changes.',
    btnDontSave: "Don't Save",
    btnCancel: 'Cancel',
    extModifiedMsg: 'The file has been modified by another program.',
    extModifiedDetail: 'Save anyway and overwrite the changes on disk?',
    btnOverwrite: 'Overwrite',
    dlgInsertImage: 'Insert Image',
    filterImages: 'Images',
    dlgAddAttachment: 'Add Attachments',
    filterSupported: 'Supported Files',
    filterAll: 'All Files',
    dlgExportPdf: 'Export as PDF',
    dlgExportHtml: 'Export as HTML',
    dlgPickExportDir: 'Choose Export Folder',
    errUnsupportedExt: '.{ext} files are not supported',
    errNotFile: 'not a file',
    errTooLarge: 'exceeds the {mb}MB limit',
    errImageTooLarge: 'image exceeds the 5MB limit',
    errUnreadable: 'cannot be read',
    errFileTooLarge: 'File exceeds the size limit',
    errParseFailed: 'Failed to parse file',
    errImageNoText: 'Image attachments have no text; the image is sent along with the user message',
    errNotImage: 'not a supported image type',
    errGskNotLoggedIn: 'Not signed in to VEGA: click “Sign in to VEGA” below, sign in, then retry',
    errNoApiKey: 'No API key configured for {provider}',
    errAiBusy: 'The AI service is busy right now — please try again in a moment',
    errNoModel: 'No model name configured',
    menuFile: 'File',
    menuNewDoc: 'New Document',
    menuNewWindow: 'New Window',
    menuOpen: 'Open…',
    menuOpenRecent: 'Open Recent',
    menuNoRecent: 'No Recent Documents',
    menuClose: 'Close',
    menuSave: 'Save',
    menuSaveAs: 'Save As…',
    menuPageSetup: 'Page Setup…',
    menuExportPdf: 'Export as PDF…',
    menuExportHtml: 'Export as HTML…',
    menuExportImages: 'Export as Images…',
    menuPrint: 'Print…',
    menuEdit: 'Edit',
    menuUndo: 'Undo',
    menuRedo: 'Redo',
    menuCut: 'Cut',
    menuCopy: 'Copy',
    menuPaste: 'Paste',
    menuPasteMatch: 'Paste and Match Style',
    menuFindReplace: 'Find and Replace…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Select All',
    menuView: 'View',
    menuZoom: 'Zoom',
    menuUiZoom: 'Interface Zoom',
    menuZoomIn: 'Zoom In',
    menuZoomOut: 'Zoom Out',
    menuZoom100: 'Actual Size (100%)',
    menuPageWidth: 'Page Width',
    menuWholePage: 'Whole Page',
    menuMultiPage: 'Multiple Pages',
    menuAiSidebar: 'AI Sidebar',
    menuDarkMode: 'Dark Mode',
    menuFullscreen: 'Enter Full Screen',
    menuInsert: 'Insert',
    menuInsertTable: 'Table…',
    menuInsertImage: 'Image…',
    menuInsertPageBreak: 'Page Break',
    menuInsertLink: 'Hyperlink…',
    menuInsertEquation: 'Equation…',
    menuComment: 'Comment',
    menuFormat: 'Format',
    menuBold: 'Bold',
    menuItalic: 'Italic',
    menuUnderline: 'Underline',
    menuAlign: 'Align',
    menuAlignLeft: 'Align Left',
    menuAlignCenter: 'Center',
    menuAlignRight: 'Align Right',
    menuAlignJustify: 'Justify',
    menuFont: 'Font…',
    menuParagraph: 'Paragraph…',
    menuTools: 'Tools',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Word Count…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI Proofread',
    menuWindow: 'Window',
    menuHelp: 'Help',
    menuShortcuts: 'Keyboard Shortcuts',
  },
  
  ru: {
    dlgOpenDoc: 'Открыть документ',
    filterWord: 'Документы Word',
    dlgSaveAs: 'Сохранить как',
    closeUnsavedMsg: 'В этом документе есть несохранённые изменения.',
    closeUnsavedDetail: 'Сохранить их перед закрытием?',
    closeNoReplyMsg: 'Документ не отвечает; возможно, есть несохранённые изменения.',
    closeNoReplyDetail: 'Всё равно закрыть? Несохранённые изменения будут потеряны.',
    btnCloseAnyway: 'Закрыть всё равно',
    autosaveFoundTitle: 'Найдена восстановленная версия',
    autosaveFoundBody:
      'Есть несохранённые изменения из прошлого сеанса. Восстановить автосохранённую версию?',
    autosaveRestore: 'Восстановить',
    autosaveDiscard: 'Отклонить',
    autosaveFileNewer: 'Файл на диске новее этой восстановленной копии — восстановление заменит эти более новые изменения.',
    btnDontSave: 'Не сохранять',
    btnCancel: 'Отмена',
    extModifiedMsg: 'Файл был изменён другой программой.',
    extModifiedDetail: 'Всё равно сохранить и перезаписать изменения на диске?',
    btnOverwrite: 'Перезаписать',
    dlgInsertImage: 'Вставить рисунок',
    filterImages: 'Изображения',
    dlgAddAttachment: 'Добавить вложения',
    filterSupported: 'Поддерживаемые файлы',
    filterAll: 'Все файлы',
    dlgExportPdf: 'Экспорт в PDF',
    dlgExportHtml: 'Экспорт в HTML',
    dlgPickExportDir: 'Выбор папки для экспорта',
    errUnsupportedExt: 'файлы .{ext} не поддерживаются',
    errNotFile: 'не является файлом',
    errTooLarge: 'превышает лимит {mb} МБ',
    errImageTooLarge: 'изображение превышает лимит 5 МБ',
    errUnreadable: 'не удается прочитать',
    errFileTooLarge: 'Файл превышает максимальный размер',
    errParseFailed: 'Не удалось разобрать файл',
    errImageNoText:
      'Вложенные изображения не содержат текста; изображение отправляется вместе с сообщением пользователя, смотрите его напрямую',
    errNotImage: 'неподдерживаемый тип изображения',
    errGskNotLoggedIn:
      'Вы не вошли в ВЕГА: нажмите «Подключить ИИ» ниже, войдите и повторите попытку',
    errNoApiKey: 'API-ключ для {provider} не настроен',
    errAiBusy: 'Сервис ИИ сейчас перегружен — повторите попытку чуть позже',
    errNoModel: 'Не указано имя модели',
    menuFile: 'Файл',
    menuNewDoc: 'Создать документ',
    menuNewWindow: 'Новое окно',
    menuOpen: 'Открыть…',
    menuOpenRecent: 'Открыть последние',
    menuNoRecent: 'Нет последних документов',
    menuClose: 'Закрыть',
    menuSave: 'Сохранить',
    menuSaveAs: 'Сохранить как…',
    menuPageSetup: 'Параметры страницы…',
    menuExportPdf: 'Экспорт в PDF…',
    menuExportHtml: 'Экспорт в HTML…',
    menuExportImages: 'Экспорт в изображения…',
    menuPrint: 'Печать…',
    menuEdit: 'Правка',
    menuUndo: 'Отменить',
    menuRedo: 'Повторить',
    menuCut: 'Вырезать',
    menuCopy: 'Копировать',
    menuPaste: 'Вставить',
    menuPasteMatch: 'Вставить и согласовать стиль',
    menuFindReplace: 'Найти и заменить…',
    menuGoTo: 'Перейти…',
    menuSelectAll: 'Выделить все',
    menuView: 'Вид',
    menuZoom: 'Масштаб',
    menuUiZoom: 'Масштаб интерфейса',
    menuZoomIn: 'Увеличить',
    menuZoomOut: 'Уменьшить',
    menuZoom100: 'Фактический размер (100%)',
    menuPageWidth: 'По ширине страницы',
    menuWholePage: 'Страница целиком',
    menuMultiPage: 'Несколько страниц',
    menuAiSidebar: 'Боковая панель ИИ',
    menuDarkMode: 'Темный режим',
    menuFullscreen: 'Перейти в полноэкранный режим',
    menuInsert: 'Вставка',
    menuInsertTable: 'Таблица…',
    menuInsertImage: 'Рисунок…',
    menuInsertPageBreak: 'Разрыв страницы',
    menuInsertLink: 'Гиперссылка…',
    menuInsertEquation: 'Уравнение…',
    menuComment: 'Примечание',
    menuFormat: 'Формат',
    menuBold: 'Полужирный',
    menuItalic: 'Курсив',
    menuUnderline: 'Подчеркнутый',
    menuAlign: 'Выравнивание',
    menuAlignLeft: 'По левому краю',
    menuAlignCenter: 'По центру',
    menuAlignRight: 'По правому краю',
    menuAlignJustify: 'По ширине',
    menuFont: 'Шрифт…',
    menuParagraph: 'Абзац…',
    menuTools: 'Сервис',
    menuTable: 'Таблица',
    menuTableInsert: 'Вставить',
    menuTableInsertTable: 'Таблица…',
    menuTableColsLeft: 'Столбцы слева',
    menuTableColsRight: 'Столбцы справа',
    menuTableRowsAbove: 'Строки выше',
    menuTableRowsBelow: 'Строки ниже',
    menuTableCells: 'Ячейки…',
    menuTableDelete: 'Удалить',
    menuTableDeleteTable: 'Таблицу',
    menuTableDeleteColumns: 'Столбцы',
    menuTableDeleteRows: 'Строки',
    menuTableSelect: 'Выделить',
    menuTableSelectCell: 'Ячейку',
    menuTableSelectColumn: 'Столбец',
    menuTableSelectRow: 'Строку',
    menuTableSelectTable: 'Таблицу',
    menuTableMergeCells: 'Объединить ячейки',
    menuTableSplitCells: 'Разделить ячейки…',
    menuTableSplitTable: 'Разделить таблицу',
    menuTableAutoFit: 'Автоподбор',
    menuTableAutoFitContents: 'По содержимому',
    menuTableAutoFitWindow: 'По ширине окна',
    menuTableFixedWidth: 'Фиксированная ширина столбца',
    menuTableDistributeRows: 'Выровнять высоту строк',
    menuTableDistributeColumns: 'Выровнять ширину столбцов',
    menuTableRepeatHeader: 'Повторять строки заголовков',
    menuTableGridlines: 'Отображать сетку',
    menuTableProperties: 'Свойства таблицы…',
    menuWordCount: 'Статистика…',
    menuAutoCorrect: 'Параметры автозамены…',
    menuPreferences: 'Параметры…',
    menuAiProofread: 'ИИ-корректура',
    menuWindow: 'Окно',
    menuHelp: 'Справка',
    menuShortcuts: 'Сочетания клавиш',
  },
  
  
  
  
  
  
  uz: {
    dlgOpenDoc: 'Hujjatni ochish',
    filterWord: 'Word hujjatlari',
    dlgSaveAs: 'Boshqa nom bilan saqlash',
    closeUnsavedMsg: 'Bu hujjatda saqlanmagan o‘zgarishlar mavjud.',
    closeUnsavedDetail: 'Yopishdan oldin ularni saqlamoqchimisiz?',
    closeNoReplyMsg: 'Hujjat javob bermayapti va saqlanmagan o‘zgarishlar bo‘lishi mumkin.',
    closeNoReplyDetail: 'Baribir yopilsinmi? Saqlanmagan o‘zgarishlar yo‘qoladi.',
    btnCloseAnyway: 'Baribir yopish',
    autosaveFoundTitle: 'Qayta tiklangan versiya topildi',
    autosaveFoundBody:
      'Oxirgi seansingizdan saqlanmagan o‘zgarishlar mavjud. Avtomatik saqlangan versiya tiklansinmi?',
    autosaveRestore: 'Tiklash',
    autosaveDiscard: 'Bekor qilish',
    autosaveFileNewer: 'Diskdagi fayl ushbu tiklangan nusxadan yangi — tiklash yangi o‘zgarishlarni almashtiradi.',
    btnDontSave: 'Saqlamaslik',
    btnCancel: 'Bekor qilish',
    extModifiedMsg: 'Fayl boshqa dastur tomonidan o‘zgartirildi.',
    extModifiedDetail: 'Baribir saqlab, diskdagi o‘zgarishlar ustidan yozilsinmi?',
    btnOverwrite: 'Ustiga yozish',
    dlgInsertImage: 'Rasm qo‘shish',
    filterImages: 'Rasmlar',
    dlgAddAttachment: 'Biriktirmalar qo‘shish',
    filterSupported: 'Qo‘llab-quvvatlanadigan fayllar',
    filterAll: 'Barcha fayllar',
    dlgExportPdf: 'PDF sifatida eksport qilish',
    dlgExportHtml: 'HTML sifatida eksport qilish',
    dlgPickExportDir: 'Eksport jildini tanlash',
    errUnsupportedExt: '.{ext} fayllar qo‘llab-quvvatlanmaydi',
    errNotFile: 'fayl emas',
    errTooLarge: '{mb} MB chegarasidan oshib ketadi',
    errImageTooLarge: 'rasm 5 MB chegarasidan oshib ketadi',
    errUnreadable: 'o‘qib bo‘lmaydi',
    errFileTooLarge: 'Fayl hajm chegarasidan oshib ketdi',
    errParseFailed: 'Faylni tahlil qilish muvaffaqiyatsiz tugadi',
    errImageNoText:
      'Rasm biriktirmalarida matn yo‘q; rasm foydalanuvchi xabari bilan birga yuboriladi',
    errNotImage: 'qo‘llab-quvvatlanadigan rasm turi emas',
    errGskNotLoggedIn:
      'VEGA’ga kirilmagan: quyida “VEGA’ga kirish” tugmasini bosing, kiring va qayta urinib ko‘ring',
    errNoApiKey: '{provider} uchun API kaliti sozlanmagan',
    errAiBusy: 'AI xizmati hozir band — birozdan so‘ng qayta urinib ko‘ring',
    errNoModel: 'Model nomi sozlanmagan',
    menuFile: 'Fayl',
    menuNewDoc: 'Yangi hujjat',
    menuNewWindow: 'Yangi oyna',
    menuOpen: 'Ochish…',
    menuOpenRecent: 'So‘nggi hujjatlarni ochish',
    menuNoRecent: 'So‘nggi hujjatlar yo‘q',
    menuClose: 'Yopish',
    menuSave: 'Saqlash',
    menuSaveAs: 'Boshqa nom bilan saqlash…',
    menuPageSetup: 'Sahifa sozlamalari…',
    menuExportPdf: 'PDF sifatida eksport qilish…',
    menuExportHtml: 'HTML sifatida eksport qilish…',
    menuExportImages: 'Rasmlar sifatida eksport qilish…',
    menuPrint: 'Chop etish…',
    menuEdit: 'Tahrirlash',
    menuUndo: 'Bekor qilish',
    menuRedo: 'Qaytarish',
    menuCut: 'Kesish',
    menuCopy: 'Nusxalash',
    menuPaste: 'Joylashtirish',
    menuPasteMatch: 'Uslubni moslab joylashtirish',
    menuFindReplace: 'Topish va almashtirish…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Barchasini tanlash',
    menuView: 'Ko‘rinish',
    menuZoom: 'Zoom',
    menuUiZoom: 'Interfeys masshtabi',
    menuZoomIn: 'Kattalashtirish',
    menuZoomOut: 'Kichraytirish',
    menuZoom100: 'Haqiqiy o‘lcham (100%)',
    menuPageWidth: 'Sahifa kengligi',
    menuWholePage: 'Butun sahifa',
    menuMultiPage: 'Bir necha sahifa',
    menuAiSidebar: 'AI yon paneli',
    menuDarkMode: 'Qorong‘i rejim',
    menuFullscreen: 'To‘liq ekranga o‘tish',
    menuInsert: 'Kiritish',
    menuInsertTable: 'Jadval (3×3)',
    menuInsertImage: 'Rasm…',
    menuInsertPageBreak: 'Sahifa uzilishi',
    menuInsertLink: 'Giperhavola…',
    menuInsertEquation: 'Tenglama…',
    menuComment: 'Izoh',
    menuFormat: 'Format',
    menuBold: 'Qalin',
    menuItalic: 'Qiya',
    menuUnderline: 'Tagiga chizish',
    menuAlign: 'Tekislash',
    menuAlignLeft: 'Chapga tekislash',
    menuAlignCenter: 'Markazga tekislash',
    menuAlignRight: 'O‘ngga tekislash',
    menuAlignJustify: 'Eniga tekislash',
    menuFont: 'Shrift…',
    menuParagraph: 'Abzas…',
    menuTools: 'Asboblar',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'So‘zlar soni…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI tekshiruvi',
    menuWindow: 'Oyna',
    menuHelp: 'Yordam',
    menuShortcuts: 'Klaviatura yorliqlari',
  },
  kk: {
    dlgOpenDoc: 'Құжатты ашу',
    filterWord: 'Word құжаттары',
    dlgSaveAs: 'Басқаша сақтау',
    closeUnsavedMsg: 'Бұл құжатта сақталмаған өзгерістер бар.',
    closeUnsavedDetail: 'Жабудан бұрын оларды сақтау керек пе?',
    closeNoReplyMsg: 'Құжат жауап бермей тұр және сақталмаған өзгерістер болуы мүмкін.',
    closeNoReplyDetail: 'Бәрібір жабу керек пе? Сақталмаған өзгерістер жоғалады.',
    btnCloseAnyway: 'Бәрібір жабу',
    autosaveFoundTitle: 'Қалпына келтірілген нұсқа табылды',
    autosaveFoundBody:
      'Соңғы сеанстан сақталмаған өзгерістер бар. Автоматты сақталған нұсқаны қалпына келтіру керек пе?',
    autosaveRestore: 'Қалпына келтіру',
    autosaveDiscard: 'Бас тарту',
    autosaveFileNewer: 'Дискідегі файл осы қалпына келтірілген көшірмеден жаңа — қалпына келтіру жаңа өзгерістерді ауыстырады.',
    btnDontSave: 'Сақтамау',
    btnCancel: 'Бас тарту',
    extModifiedMsg: 'Файлды басқа бағдарлама өзгерткен.',
    extModifiedDetail: 'Бәрібір сақтап, дискідегі өзгерістердің үстінен жазу керек пе?',
    btnOverwrite: 'Қайта жазу',
    dlgInsertImage: 'Сурет кірістіру',
    filterImages: 'Суреттер',
    dlgAddAttachment: 'Тіркемелер қосу',
    filterSupported: 'Қолдау көрсетілетін файлдар',
    filterAll: 'Барлық файлдар',
    dlgExportPdf: 'PDF ретінде экспорттау',
    dlgExportHtml: 'HTML ретінде экспорттау',
    dlgPickExportDir: 'Экспорттау қалтасын таңдау',
    errUnsupportedExt: '.{ext} файлдарына қолдау көрсетілмейді',
    errNotFile: 'файл емес',
    errTooLarge: '{mb} МБ шегінен асады',
    errImageTooLarge: 'сурет 5 МБ шегінен асады',
    errUnreadable: 'оқылмайды',
    errFileTooLarge: 'Файл өлшем шегінен асады',
    errParseFailed: 'Файлды талдау сәтсіз аяқталды',
    errImageNoText: 'Сурет тіркемелерінде мәтін жоқ; сурет пайдаланушы хабарымен бірге жіберіледі',
    errNotImage: 'қолдау көрсетілмейтін сурет түрі',
    errGskNotLoggedIn:
      'VEGA жүйесіне кірмегенсіз: төмендегі “VEGA жүйесіне кіру” түймесін басып, кіріңіз де, әрекетті қайталаңыз',
    errNoApiKey: '{provider} үшін API кілті конфигурацияланбаған',
    errAiBusy: 'AI қызметі қазір бос емес — біраздан соң қайталап көріңіз',
    errNoModel: 'Үлгі атауы конфигурацияланбаған',
    menuFile: 'Файл',
    menuNewDoc: 'Жаңа құжат',
    menuNewWindow: 'Жаңа терезе',
    menuOpen: 'Ашу…',
    menuOpenRecent: 'Соңғы құжаттарды ашу',
    menuNoRecent: 'Соңғы құжаттар жоқ',
    menuClose: 'Жабу',
    menuSave: 'Сақтау',
    menuSaveAs: 'Басқаша сақтау…',
    menuPageSetup: 'Бет параметрлері…',
    menuExportPdf: 'PDF ретінде экспорттау…',
    menuExportHtml: 'HTML ретінде экспорттау…',
    menuExportImages: 'Суреттер ретінде экспорттау…',
    menuPrint: 'Басып шығару…',
    menuEdit: 'Өңдеу',
    menuUndo: 'Болдырмау',
    menuRedo: 'Қайта орындау',
    menuCut: 'Қиып алу',
    menuCopy: 'Көшіру',
    menuPaste: 'Қою',
    menuPasteMatch: 'Мәнерін сәйкестендіріп қою',
    menuFindReplace: 'Іздеу және ауыстыру…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Барлығын таңдау',
    menuView: 'Көрініс',
    menuZoom: 'Zoom',
    menuUiZoom: 'Интерфейс масштабы',
    menuZoomIn: 'Үлкейту',
    menuZoomOut: 'Кішірейту',
    menuZoom100: 'Нақты өлшем (100%)',
    menuPageWidth: 'Бет ені',
    menuWholePage: 'Бүкіл бет',
    menuMultiPage: 'Бірнеше бет',
    menuAiSidebar: 'AI бүйірлік тақтасы',
    menuDarkMode: 'Қараңғы режим',
    menuFullscreen: 'Толық экранға өту',
    menuInsert: 'Кірістіру',
    menuInsertTable: 'Кесте (3×3)',
    menuInsertImage: 'Сурет…',
    menuInsertPageBreak: 'Бет үзілімі',
    menuInsertLink: 'Гиперсілтеме…',
    menuInsertEquation: 'Теңдеу…',
    menuComment: 'Пікір',
    menuFormat: 'Пішім',
    menuBold: 'Қалың',
    menuItalic: 'Көлбеу',
    menuUnderline: 'Асты сызылған',
    menuAlign: 'Туралау',
    menuAlignLeft: 'Сол жаққа туралау',
    menuAlignCenter: 'Ортаға туралау',
    menuAlignRight: 'Оң жаққа туралау',
    menuAlignJustify: 'Ені бойынша туралау',
    menuFont: 'Қаріп…',
    menuParagraph: 'Абзац…',
    menuTools: 'Құралдар',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Сөздер саны…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI көмегімен тексеру',
    menuWindow: 'Терезе',
    menuHelp: 'Анықтама',
    menuShortcuts: 'Пернетақта таңбашалары',
  },
  az: {
    dlgOpenDoc: 'Sənədi aç',
    filterWord: 'Word sənədləri',
    dlgSaveAs: 'Fərqli saxla',
    closeUnsavedMsg: 'Bu sənəddə yadda saxlanmamış dəyişikliklər var.',
    closeUnsavedDetail: 'Bağlamazdan əvvəl onları yadda saxlamaq istəyirsiniz?',
    closeNoReplyMsg: 'Sənəd cavab vermir və yadda saxlanmamış dəyişikliklər ola bilər.',
    closeNoReplyDetail: 'Yenə də bağlansın? Yadda saxlanmamış dəyişikliklər itiriləcək.',
    btnCloseAnyway: 'Yenə də bağla',
    autosaveFoundTitle: 'Bərpa edilmiş versiya tapıldı',
    autosaveFoundBody:
      'Son sessiyanızdan saxlanmamış dəyişikliklər var. Avtomatik saxlanmış versiya bərpa edilsin?',
    autosaveRestore: 'Bərpa et',
    autosaveDiscard: 'Ləğv edin',
    autosaveFileNewer: 'Diskdəki fayl bu bərpa olunmuş nüsxədən daha yenidir — bərpa etmək həmin yeni dəyişiklikləri əvəz edəcək.',
    btnDontSave: 'Saxlama',
    btnCancel: 'Ləğv et',
    extModifiedMsg: 'Fayl başqa proqram tərəfindən dəyişdirilib.',
    extModifiedDetail: 'Yenə də yadda saxlanılsın və diskdəki dəyişikliklərin üzərinə yazılsın?',
    btnOverwrite: 'Üzərinə yaz',
    dlgInsertImage: 'Şəkil daxil et',
    filterImages: 'Şəkillər',
    dlgAddAttachment: 'Qoşmalar əlavə et',
    filterSupported: 'Dəstəklənən fayllar',
    filterAll: 'Bütün fayllar',
    dlgExportPdf: 'PDF kimi ixrac et',
    dlgExportHtml: 'HTML kimi ixrac et',
    dlgPickExportDir: 'İxrac qovluğunu seçin',
    errUnsupportedExt: '.{ext} faylları dəstəklənmir',
    errNotFile: 'fayl deyil',
    errTooLarge: '{mb} MB həddini keçir',
    errImageTooLarge: 'şəkil 5 MB həddini keçir',
    errUnreadable: 'oxumaq mümkün deyil',
    errFileTooLarge: 'Fayl ölçü həddini keçir',
    errParseFailed: 'Faylı təhlil etmək alınmadı',
    errImageNoText:
      'Şəkil qoşmalarında mətn yoxdur; şəkil istifadəçi mesajı ilə birlikdə göndərilir',
    errNotImage: 'dəstəklənməyən şəkil növüdür',
    errGskNotLoggedIn:
      'VEGA-ya daxil olunmayıb: aşağıda “VEGA-ya daxil ol” düyməsinə klikləyin, daxil olun və sonra yenidən cəhd edin',
    errNoApiKey: '{provider} üçün API açarı konfiqurasiya edilməyib',
    errAiBusy: 'AI xidməti hazırda məşğuldur — bir qədər sonra yenidən cəhd edin',
    errNoModel: 'Model adı konfiqurasiya edilməyib',
    menuFile: 'Fayl',
    menuNewDoc: 'Yeni sənəd',
    menuNewWindow: 'Yeni pəncərə',
    menuOpen: 'Aç…',
    menuOpenRecent: 'Son sənədləri aç',
    menuNoRecent: 'Son sənəd yoxdur',
    menuClose: 'Bağla',
    menuSave: 'Saxla',
    menuSaveAs: 'Başqa adla saxla…',
    menuPageSetup: 'Səhifə parametrləri…',
    menuExportPdf: 'PDF kimi ixrac et…',
    menuExportHtml: 'HTML kimi ixrac et…',
    menuExportImages: 'Şəkillər kimi ixrac et…',
    menuPrint: 'Çap et…',
    menuEdit: 'Redaktə edin',
    menuUndo: 'Geri al',
    menuRedo: 'Təkrarla',
    menuCut: 'Kəs',
    menuCopy: 'Kopyala',
    menuPaste: 'Yapışdır',
    menuPasteMatch: 'Üsluba uyğun yapışdır',
    menuFindReplace: 'Tap və əvəz et…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Hamısını seç',
    menuView: 'Görünüş',
    menuZoom: 'Zoom',
    menuUiZoom: 'İnterfeys miqyası',
    menuZoomIn: 'Böyüt',
    menuZoomOut: 'Kiçilt',
    menuZoom100: 'Həqiqi ölçü (100%)',
    menuPageWidth: 'Səhifə eni',
    menuWholePage: 'Bütün səhifə',
    menuMultiPage: 'Bir neçə səhifə',
    menuAiSidebar: 'AI yan paneli',
    menuDarkMode: 'Tünd rejim',
    menuFullscreen: 'Tam ekrana keç',
    menuInsert: 'Daxil et',
    menuInsertTable: 'Cədvəl (3×3)',
    menuInsertImage: 'Şəkil…',
    menuInsertPageBreak: 'Səhifə sonu',
    menuInsertLink: 'Hiperkeçid…',
    menuInsertEquation: 'Tənlik…',
    menuComment: 'Şərh',
    menuFormat: 'Format',
    menuBold: 'Qalın',
    menuItalic: 'Kursiv',
    menuUnderline: 'Altından xətt',
    menuAlign: 'Düzülüş',
    menuAlignLeft: 'Sola düzləndir',
    menuAlignCenter: 'Mərkəzləşdir',
    menuAlignRight: 'Sağa düzləndir',
    menuAlignJustify: 'Hər iki kənara düzləndir',
    menuFont: 'Şrift…',
    menuParagraph: 'Abzas…',
    menuTools: 'Alətlər',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Söz sayı…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI yoxlaması',
    menuWindow: 'Pəncərə',
    menuHelp: 'Kömək',
    menuShortcuts: 'Klaviatura qısayolları',
  },
  tk: {
    dlgOpenDoc: 'Resminamany aç',
    filterWord: 'Word resminamalary',
    dlgSaveAs: 'Başga at bilen ýatda sakla',
    closeUnsavedMsg: 'Bu resminamada saklanmadyk üýtgeşmeler bar.',
    closeUnsavedDetail: 'Ýapmazdan öň olary saklamak isleýärsiňizmi?',
    closeNoReplyMsg: 'Resminama jogap bermeýär we saklanmadyk üýtgeşmeler bolmagy mümkin.',
    closeNoReplyDetail: 'Her niçik bolsa ýapmalymy? Saklanmadyk üýtgeşmeler ýitiriler.',
    btnCloseAnyway: 'Her niçik bolsa ýap',
    autosaveFoundTitle: 'Dikeldilen wersiýa tapyldy',
    autosaveFoundBody:
      'Soňky sessiýaňyzdan saklanmadyk üýtgeşmeler bar. Awtomatiki saklanan wersiýa dikeldilsinmi?',
    autosaveRestore: 'Dikelt',
    autosaveDiscard: 'Taşla',
    autosaveFileNewer: 'Diskdäki faýl bu dikeldilen nusgadan täze — dikeltmek şol täze üýtgeşmeleri çalşar.',
    btnDontSave: 'Saklama',
    btnCancel: 'Ýatyr',
    extModifiedMsg: 'Faýl başga bir programma tarapyndan üýtgedildi.',
    extModifiedDetail: 'Her niçigem bolsa saklap, diskdäki üýtgeşmeleriň üstünden ýazylsynmy?',
    btnOverwrite: 'Üstünden ýazmak',
    dlgInsertImage: 'Surat goý',
    filterImages: 'Suratlar',
    dlgAddAttachment: 'Goşundy goş',
    filterSupported: 'Goldanýan faýllar',
    filterAll: 'Ähli faýllar',
    dlgExportPdf: 'PDF görnüşinde eksport et',
    dlgExportHtml: 'HTML görnüşinde eksport et',
    dlgPickExportDir: 'Eksport bukjasyny saýlaň',
    errUnsupportedExt: '.{ext} faýllary goldanylmaýar',
    errNotFile: 'faýl däl',
    errTooLarge: '{mb} MB çäginden geçýär',
    errImageTooLarge: 'surat 5 MB çäginden geçýär',
    errUnreadable: 'okap bolmaýar',
    errFileTooLarge: 'Faýl ölçeg çäginden geçýär',
    errParseFailed: 'Faýly seljermek başartmady',
    errImageNoText:
      'Surat goşundylarynda tekst ýok; surat ulanyjynyň habary bilen bilelikde iberilýär',
    errNotImage: 'goldanylmaýan surat görnüşi',
    errGskNotLoggedIn:
      'VEGA-da giriş edilmedi: aşakdaky “VEGA-a giriş” düwmesine basyň, giriş ediň we soňra täzeden synanyşyň',
    errNoApiKey: '{provider} üçin API açary düzülmedi',
    errAiBusy: 'AI hyzmaty häzir meşgul — birazdan täzeden synanyşyň',
    errNoModel: 'Modeliň ady düzülmedi',
    menuFile: 'Faýl',
    menuNewDoc: 'Täze resminama',
    menuNewWindow: 'Täze penjire',
    menuOpen: 'Aç…',
    menuOpenRecent: 'Soňky açylanlar',
    menuNoRecent: 'Soňky resminamalar ýok',
    menuClose: 'Ýap',
    menuSave: 'Sakla',
    menuSaveAs: 'Başga at bilen ýatda sakla…',
    menuPageSetup: 'Sahypa sazlamasy…',
    menuExportPdf: 'PDF hökmünde eksport et…',
    menuExportHtml: 'HTML hökmünde eksport et…',
    menuExportImages: 'Suratlar hökmünde eksport et…',
    menuPrint: 'Çap et…',
    menuEdit: 'Redaktirle',
    menuUndo: 'Yza al',
    menuRedo: 'Gaýtala',
    menuCut: 'Kes',
    menuCopy: 'Göçür',
    menuPaste: 'Goý',
    menuPasteMatch: 'Stili gabat getirip goý',
    menuFindReplace: 'Tap we çalyş…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Hemmesini saýla',
    menuView: 'Görkez',
    menuZoom: 'Zoom',
    menuUiZoom: 'Interfeýs masshtaby',
    menuZoomIn: 'Ulalt',
    menuZoomOut: 'Kiçelt',
    menuZoom100: 'Hakyky ölçeg (100%)',
    menuPageWidth: 'Sahypanyň giňligi',
    menuWholePage: 'Bütin sahypa',
    menuMultiPage: 'Birnäçe sahypa',
    menuAiSidebar: 'AI gapdal paneli',
    menuDarkMode: 'Garaňky tertip',
    menuFullscreen: 'Doly ekran režimine gir',
    menuInsert: 'Goşmak',
    menuInsertTable: 'Tablisa (3×3)',
    menuInsertImage: 'Surat…',
    menuInsertPageBreak: 'Sahypa bölümi',
    menuInsertLink: 'Giperbaglanyşyk…',
    menuInsertEquation: 'Deňleme…',
    menuComment: 'Teswir',
    menuFormat: 'Format',
    menuBold: 'Galyň',
    menuItalic: 'Gyşyk',
    menuUnderline: 'Aşagy çyzylan',
    menuAlign: 'Deňleşdir',
    menuAlignLeft: 'Çep gapdala deňle',
    menuAlignCenter: 'Merkeze deňle',
    menuAlignRight: 'Sag gapdala deňle',
    menuAlignJustify: 'Iki gapdala deňle',
    menuFont: 'Şrift…',
    menuParagraph: 'Abzas…',
    menuTools: 'Gurallar',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Söz sany…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI barlagy',
    menuWindow: 'Penjire',
    menuHelp: 'Kömek',
    menuShortcuts: 'Klawiatura gysga ýollary',
  },
  ky: {
    dlgOpenDoc: 'Документти ачуу',
    filterWord: 'Word документтери',
    dlgSaveAs: 'Башкача сактоо',
    closeUnsavedMsg: 'Бул документте сакталбаган өзгөртүүлөр бар.',
    closeUnsavedDetail: 'Жабуудан мурун аларды сактагыңыз келеби?',
    closeNoReplyMsg: 'Документ жооп бербей жатат жана анда сакталбаган өзгөртүүлөр болушу мүмкүн.',
    closeNoReplyDetail: 'Баары бир жабылсынбы? Сакталбаган өзгөртүүлөр жоголот.',
    btnCloseAnyway: 'Баары бир жабуу',
    autosaveFoundTitle: 'Калыбына келтирилген версия табылды',
    autosaveFoundBody:
      'Акыркы сеансыңыздан сакталбаган өзгөртүүлөр бар. Автоматтык сакталган версия калыбына келтирилсинби?',
    autosaveRestore: 'Калыбына келтирүү',
    autosaveDiscard: 'Жокко чыгаруу',
    autosaveFileNewer: 'Дисктеги файл ушул калыбына келтирилген көчүрмөдөн жаңы — калыбына келтирүү жаңы өзгөртүүлөрдү алмаштырат.',
    btnDontSave: 'Сактабаңыз',
    btnCancel: 'Жокко чыгаруу',
    extModifiedMsg: 'Файл башка программа тарабынан өзгөртүлдү.',
    extModifiedDetail: 'Баары бир сактап, дисктеги өзгөртүүлөрдүн үстүнөн жазылсынбы?',
    btnOverwrite: 'Үстүнөн жазуу',
    dlgInsertImage: 'Сүрөт киргизүү',
    filterImages: 'Сүрөттөр',
    dlgAddAttachment: 'Тиркемелерди кошуу',
    filterSupported: 'Колдоого алынган файлдар',
    filterAll: 'Бардык файлдар',
    dlgExportPdf: 'PDF катары экспорттоо',
    dlgExportHtml: 'HTML катары экспорттоо',
    dlgPickExportDir: 'Экспорттоо папкасын тандоо',
    errUnsupportedExt: '.{ext} файлдары колдоого алынбайт',
    errNotFile: 'файл эмес',
    errTooLarge: '{mb}МБ чегинен ашат',
    errImageTooLarge: 'сүрөт 5МБ чегинен ашат',
    errUnreadable: 'окулбайт',
    errFileTooLarge: 'Файл өлчөм чегинен ашат',
    errParseFailed: 'Файлды талдоо ишке ашкан жок',
    errImageNoText:
      'Сүрөт тиркемелеринде текст жок; сүрөт колдонуучунун билдирүүсү менен кошо жөнөтүлөт',
    errNotImage: 'колдоого алынбаган сүрөт түрү',
    errGskNotLoggedIn:
      "VEGA'га кирген жоксуз: төмөндөгү “VEGA'га кирүү” баскычын басып, кириңиз да, кайра аракет кылыңыз",
    errNoApiKey: '{provider} үчүн API ачкычы конфигурацияланган эмес',
    errAiBusy: 'AI кызматы азыр бош эмес — бир аздан кийин кайра аракет кылыңыз',
    errNoModel: 'Модель аты конфигурацияланган эмес',
    menuFile: 'Файл',
    menuNewDoc: 'Жаңы документ',
    menuNewWindow: 'Жаңы терезе',
    menuOpen: 'Ачуу…',
    menuOpenRecent: 'Жакында ачылгандар',
    menuNoRecent: 'Жакында ачылган документтер жок',
    menuClose: 'Жабуу',
    menuSave: 'Сактоо',
    menuSaveAs: 'Башкача сактоо…',
    menuPageSetup: 'Баракты жөндөө…',
    menuExportPdf: 'PDF катары экспорттоо…',
    menuExportHtml: 'HTML катары экспорттоо…',
    menuExportImages: 'Сүрөттөр катары экспорттоо…',
    menuPrint: 'Басып чыгаруу…',
    menuEdit: 'Түзөтүү',
    menuUndo: 'Артка кайтаруу',
    menuRedo: 'Кайталоо',
    menuCut: 'Кесүү',
    menuCopy: 'Көчүрүү',
    menuPaste: 'Коюу',
    menuPasteMatch: 'Стилди дал келтирип чаптоо',
    menuFindReplace: 'Табуу жана алмаштыруу…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Баарын тандоо',
    menuView: 'Көрүнүш',
    menuZoom: 'Zoom',
    menuUiZoom: 'Интерфейс масштабы',
    menuZoomIn: 'Чоңойтуу',
    menuZoomOut: 'Кичирейтүү',
    menuZoom100: 'Чыныгы өлчөм (100%)',
    menuPageWidth: 'Барактын туурасы',
    menuWholePage: 'Бүтүндөй барак',
    menuMultiPage: 'Бир нече барак',
    menuAiSidebar: 'AI каптал тилкеси',
    menuDarkMode: 'Караңгы режим',
    menuFullscreen: 'Толук экранга өтүү',
    menuInsert: 'Кыстаруу',
    menuInsertTable: 'Таблица (3×3)',
    menuInsertImage: 'Сүрөт…',
    menuInsertPageBreak: 'Бет бөлгүч',
    menuInsertLink: 'Гипершилтеме…',
    menuInsertEquation: 'Теңдеме…',
    menuComment: 'Комментарий',
    menuFormat: 'Формат',
    menuBold: 'Калың',
    menuItalic: 'Курсив',
    menuUnderline: 'Асты сызылган',
    menuAlign: 'Тегиздөө',
    menuAlignLeft: 'Солго тегиздөө',
    menuAlignCenter: 'Ортого тегиздөө',
    menuAlignRight: 'Оңго тегиздөө',
    menuAlignJustify: 'Эки жакка тегиздөө',
    menuFont: 'Шрифт…',
    menuParagraph: 'Абзац…',
    menuTools: 'Куралдар',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Сөздөрдүн саны…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI текшерүүсү',
    menuWindow: 'Терезе',
    menuHelp: 'Жардам',
    menuShortcuts: 'Баскычтоп жарлыктары',
  },
  tt: {
    dlgOpenDoc: 'Документны ачу',
    filterWord: 'Word документлары',
    dlgSaveAs: 'Башкача саклау',
    closeUnsavedMsg: 'Бу документта сакланмаган үзгәрешләр бар.',
    closeUnsavedDetail: 'Ябар алдыннан аларны сакларга телисезме?',
    closeNoReplyMsg: 'Документ җавап бирми һәм сакланмаган үзгәрешләре булырга мөмкин.',
    closeNoReplyDetail: 'Шулай да ябыңмы? Сакланмаган үзгәрешләр югалачак.',
    btnCloseAnyway: 'Шулай да ябарга',
    autosaveFoundTitle: 'Калыбына китерелгән версия табылды',
    autosaveFoundBody:
      'Соңгы сессиягездән сакланмаган үзгәрешләр бар. Автоматик сакланган версияне торгызыргамы?',
    autosaveRestore: 'Торгызу',
    autosaveDiscard: 'Ташлау',
    autosaveFileNewer: 'Дисктагы файл бу калыбына китерелгән күчермәдән яңа — калыбына китерү шул яңа үзгәрешләрне алыштырачак.',
    btnDontSave: 'Сакламаска',
    btnCancel: 'Баш тарту',
    extModifiedMsg: 'Файл башка программа тарафыннан үзгәртелгән.',
    extModifiedDetail: 'Барыбер саклап, дисктагы үзгәрешләрне өстән язаргамы?',
    btnOverwrite: 'Өстеннән язу',
    dlgInsertImage: 'Рәсем кертү',
    filterImages: 'Рәсемнәр',
    dlgAddAttachment: 'Беркетмәләр өстәү',
    filterSupported: 'Ярдәм ителгән файллар',
    filterAll: 'Барлык файллар',
    dlgExportPdf: 'PDF итеп экспортлау',
    dlgExportHtml: 'HTML итеп экспортлау',
    dlgPickExportDir: 'Экспорт папкасын сайлагыз',
    errUnsupportedExt: '.{ext} файлларына ярдәм ителми',
    errNotFile: 'файл түгел',
    errTooLarge: '{mb}MB лимитыннан артып китә',
    errImageTooLarge: 'рәсем 5MB лимитыннан артып китә',
    errUnreadable: 'укып булмый',
    errFileTooLarge: 'Файл рөхсәт ителгән зурлык чикләреннән артып китә',
    errParseFailed: 'Файлны эшкәртеп булмады',
    errImageNoText: 'Рәсем беркетмәләрендә текст юк; рәсем кулланучы хәбәре белән бергә җибәрелә',
    errNotImage: 'ярдәм ителгән рәсем төре түгел',
    errGskNotLoggedIn:
      "VEGA'га керелмәгән: түбәндәге “VEGA'га керү” төймәсенә басыгыз, керегез һәм яңадан эшләп карагыз",
    errNoApiKey: '{provider} өчен API ачкычы көйләнмәгән',
    errAiBusy: 'AI хезмәте хәзер мәшгуль — бераздан яңадан башлагыз',
    errNoModel: 'Модель исеме көйләнмәгән',
    menuFile: 'Файл',
    menuNewDoc: 'Яңа документ',
    menuNewWindow: 'Яңа тәрәзә',
    menuOpen: 'Ачу…',
    menuOpenRecent: 'Соңгы документларны ачу',
    menuNoRecent: 'Соңгы документлар юк',
    menuClose: 'Ябу',
    menuSave: 'Саклау',
    menuSaveAs: 'Башкача сакларга…',
    menuPageSetup: 'Битне көйләү…',
    menuExportPdf: 'PDF итеп экспортлау…',
    menuExportHtml: 'HTML итеп экспортлау…',
    menuExportImages: 'Рәсемнәр итеп экспортлау…',
    menuPrint: 'Бастыру…',
    menuEdit: 'Үзгәртү',
    menuUndo: 'Гамәлне кире кайтару',
    menuRedo: 'Кабатлау',
    menuCut: 'Кисеп алу',
    menuCopy: 'Күчереп алу',
    menuPaste: 'Куеп ябыштыру',
    menuPasteMatch: 'Стильгә туры китереп кую',
    menuFindReplace: 'Табу һәм алыштыру…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'Барысын сайлау',
    menuView: 'Күренеш',
    menuZoom: 'Zoom',
    menuUiZoom: 'Интерфейс масштабы',
    menuZoomIn: 'Зурайту',
    menuZoomOut: 'Кечерәйтү',
    menuZoom100: 'Чын зурлык (100%)',
    menuPageWidth: 'Бит киңлеге',
    menuWholePage: 'Бөтен бит',
    menuMultiPage: 'Берничә бит',
    menuAiSidebar: 'AI ян тактасы',
    menuDarkMode: 'Караңгы режим',
    menuFullscreen: 'Тулы экран режимына керү',
    menuInsert: 'Кертү',
    menuInsertTable: 'Таблица (3×3)',
    menuInsertImage: 'Рәсем…',
    menuInsertPageBreak: 'Бит өзелеше',
    menuInsertLink: 'Гиперсылтама…',
    menuInsertEquation: 'Тигезләмә…',
    menuComment: 'Аңлатма',
    menuFormat: 'Формат',
    menuBold: 'Калын',
    menuItalic: 'Курсив',
    menuUnderline: 'Астына сызу',
    menuAlign: 'Тигезләү',
    menuAlignLeft: 'Сулга тигезләү',
    menuAlignCenter: 'Үзәккә тигезләү',
    menuAlignRight: 'Уңга тигезләү',
    menuAlignJustify: 'Киңлек буенча тигезләү',
    menuFont: 'Шрифт…',
    menuParagraph: 'Абзац…',
    menuTools: 'Кораллар',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'Сүзләр саны…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI тикшерүе',
    menuWindow: 'Тәрәзә',
    menuHelp: 'Ярдәм',
    menuShortcuts: 'Клавиатура кыска юллары',
  },
  ka: {
    dlgOpenDoc: 'დოკუმენტის გახსნა',
    filterWord: 'Word-ის დოკუმენტები',
    dlgSaveAs: 'შენახვა როგორც',
    closeUnsavedMsg: 'ამ დოკუმენტში შენახული ცვლილებებია.',
    closeUnsavedDetail: 'დახურვამდე გსურთ მათი შენახვა?',
    closeNoReplyMsg: 'დოკუმენტი არ პასუხობს და შესაძლოა, მასში შენახული ცვლილებები იყოს.',
    closeNoReplyDetail: 'მაინც დავხუროთ? შენახული ცვლილებები დაიკარგება.',
    btnCloseAnyway: 'მაინც დახურვა',
    autosaveFoundTitle: 'აღდგენილი ვერსია ნაპოვნია',
    autosaveFoundBody:
      'თქვენი ბოლო სესიიდან შენახული ცვლილებები არსებობს. აღვადგინოთ ავტომატურად შენახული ვერსია?',
    autosaveRestore: 'აღდგენა',
    autosaveDiscard: 'გაუქმება',
    autosaveFileNewer: 'დისკზე არსებული ფაილი ამ აღდგენილი ასლზე უფრო ახალია — აღდგენა ჩაანაცვლებს ამ უფრო ახალ ცვლილებებს.',
    btnDontSave: 'არ შეინახო',
    btnCancel: 'გაუქმება',
    extModifiedMsg: 'ფაილი შეცვალა სხვა პროგრამამ.',
    extModifiedDetail: 'მაინც შევინახოთ და დისკზე არსებული ცვლილებები გადავაწეროთ?',
    btnOverwrite: 'გადაწერა',
    dlgInsertImage: 'სურათის ჩასმა',
    filterImages: 'სურათები',
    dlgAddAttachment: 'დანართების დამატება',
    filterSupported: 'მხარდაჭერილი ფაილები',
    filterAll: 'ყველა ფაილი',
    dlgExportPdf: 'PDF-ად ექსპორტი',
    dlgExportHtml: 'HTML-ად ექსპორტი',
    dlgPickExportDir: 'აირჩიეთ ექსპორტის საქაღალდე',
    errUnsupportedExt: '.{ext} ფაილები მხარდაჭერილი არ არის',
    errNotFile: 'ფაილი არ არის',
    errTooLarge: 'აჭარბებს {mb}MB ლიმიტს',
    errImageTooLarge: 'სურათი აჭარბებს 5MB ლიმიტს',
    errUnreadable: 'წაკითხვა შეუძლებელია',
    errFileTooLarge: 'ფაილი აჭარბებს ზომის ლიმიტს',
    errParseFailed: 'ფაილის გაანალიზება ვერ მოხერხდა',
    errImageNoText:
      'სურათის დანართებს ტექსტი არ აქვს; სურათი მომხმარებლის შეტყობინებასთან ერთად გაიგზავნება',
    errNotImage: 'სურათის ეს ტიპი მხარდაჭერილი არ არის',
    errGskNotLoggedIn:
      'VEGA-ში შესული არ ხართ: დააწკაპუნეთ ქვემოთ „Sign in to VEGA“-ზე, შედით სისტემაში და ხელახლა სცადეთ',
    errNoApiKey: '{provider}-ისთვის API key კონფიგურირებული არ არის',
    errAiBusy: 'AI სერვისი ამჟამად დატვირთულია — გთხოვთ, ცოტა ხანში სცადოთ ხელახლა',
    errNoModel: 'მოდელის სახელი კონფიგურირებული არ არის',
    menuFile: 'ფაილი',
    menuNewDoc: 'ახალი დოკუმენტი',
    menuNewWindow: 'ახალი ფანჯარა',
    menuOpen: 'გახსნა…',
    menuOpenRecent: 'ბოლოს გახსნილი',
    menuNoRecent: 'ბოლო დოკუმენტები არ არის',
    menuClose: 'დახურვა',
    menuSave: 'შენახვა',
    menuSaveAs: 'შენახვა როგორც…',
    menuPageSetup: 'გვერდის პარამეტრები…',
    menuExportPdf: 'PDF-ად ექსპორტი…',
    menuExportHtml: 'HTML-ად ექსპორტი…',
    menuExportImages: 'სურათებად ექსპორტი…',
    menuPrint: 'ბეჭდვა…',
    menuEdit: 'რედაქტირება',
    menuUndo: 'გაუქმება',
    menuRedo: 'გამეორება',
    menuCut: 'ამოჭრა',
    menuCopy: 'კოპირება',
    menuPaste: 'ჩასმა',
    menuPasteMatch: 'ჩასმა სტილის შესაბამისობით',
    menuFindReplace: 'ძებნა და ჩანაცვლება…',
    menuGoTo: 'Go To…',
    menuSelectAll: 'ყველას არჩევა',
    menuView: 'ხედი',
    menuZoom: 'Zoom',
    menuUiZoom: 'ინტერფეისის მასშტაბი',
    menuZoomIn: 'გადიდება',
    menuZoomOut: 'შემცირება',
    menuZoom100: 'რეალური ზომა (100%)',
    menuPageWidth: 'გვერდის სიგანე',
    menuWholePage: 'მთელი გვერდი',
    menuMultiPage: 'რამდენიმე გვერდი',
    menuAiSidebar: 'AI გვერდითი პანელი',
    menuDarkMode: 'მუქი რეჟიმი',
    menuFullscreen: 'სრულ ეკრანზე გადასვლა',
    menuInsert: 'ჩასმა',
    menuInsertTable: 'ცხრილი (3×3)',
    menuInsertImage: 'სურათი…',
    menuInsertPageBreak: 'გვერდის გამყოფი',
    menuInsertLink: 'ჰიპერბმული…',
    menuInsertEquation: 'განტოლება…',
    menuComment: 'კომენტარი',
    menuFormat: 'ფორმატი',
    menuBold: 'მუქი',
    menuItalic: 'დახრილი',
    menuUnderline: 'ქვედა ხაზი',
    menuAlign: 'გასწორება',
    menuAlignLeft: 'მარცხნივ გასწორება',
    menuAlignCenter: 'ცენტრში გასწორება',
    menuAlignRight: 'მარჯვნივ გასწორება',
    menuAlignJustify: 'ორივე კიდეზე გასწორება',
    menuFont: 'შრიფტი…',
    menuParagraph: 'აბზაცი…',
    menuTools: 'ხელსაწყოები',
    menuTable: 'Table',
    menuTableInsert: 'Insert',
    menuTableInsertTable: 'Table…',
    menuTableColsLeft: 'Columns to the Left',
    menuTableColsRight: 'Columns to the Right',
    menuTableRowsAbove: 'Rows Above',
    menuTableRowsBelow: 'Rows Below',
    menuTableCells: 'Cells…',
    menuTableDelete: 'Delete',
    menuTableDeleteTable: 'Table',
    menuTableDeleteColumns: 'Columns',
    menuTableDeleteRows: 'Rows',
    menuTableSelect: 'Select',
    menuTableSelectCell: 'Cell',
    menuTableSelectColumn: 'Column',
    menuTableSelectRow: 'Row',
    menuTableSelectTable: 'Table',
    menuTableMergeCells: 'Merge Cells',
    menuTableSplitCells: 'Split Cells…',
    menuTableSplitTable: 'Split Table',
    menuTableAutoFit: 'AutoFit and Distribute',
    menuTableAutoFitContents: 'AutoFit to Contents',
    menuTableAutoFitWindow: 'AutoFit to Window',
    menuTableFixedWidth: 'Fixed Column Width',
    menuTableDistributeRows: 'Distribute Rows Evenly',
    menuTableDistributeColumns: 'Distribute Columns Evenly',
    menuTableRepeatHeader: 'Repeat Header Rows',
    menuTableGridlines: 'View Gridlines',
    menuTableProperties: 'Table Properties…',
    menuWordCount: 'სიტყვების რაოდენობა…',
    menuAutoCorrect: 'AutoCorrect Options…',
    menuPreferences: 'Preferences…',
    menuAiProofread: 'AI კორექტურა',
    menuWindow: 'ფანჯარა',
    menuHelp: 'დახმარება',
    menuShortcuts: 'კლავიატურის მალსახმობები',
  },
})
const tm = (key: Parameters<typeof tMain>[1], params?: Parameters<typeof tMain>[2]) =>
  tMain(getUiLang(), key, params)

// ---- runtime configuration (paths differ when bundled into the shell) ----

interface DocsRuntimeConfig {
  /** absolute path to the docs preload bundle */
  preloadPath: string
  /** dev-server URL for the docs renderer (wins over rendererFile) */
  rendererUrl?: string | undefined
  /** absolute path to the built docs renderer index.html */
  rendererFile: string
}

let runtime: DocsRuntimeConfig = {
  preloadPath: join(__dirname, '../preload/index.js'),
  rendererUrl: process.env.ELECTRON_RENDERER_URL,
  rendererFile: join(__dirname, '../renderer/index.html'),
}

export function configureDocsRuntime(config: DocsRuntimeConfig): void {
  runtime = config
  // shell mode: the shell queues argv files itself (per-tab pendingWindowOpens);
  // the module-scope fallback would leak the double-clicked file into the next
  // blank tab's consume-pending-open
  pendingOpenPath = null
}

let mainWindow: BrowserWindow | null = null
let rendererReady = false
let pendingOpenPath = findDocxPath(process.argv)
/** documents queued for windows/tabs spawned via New Tab, keyed by webContents id */
const pendingWindowOpens = new Map<number, string>()
/** webContents ids that should open as a new blank doc instead of the start screen */
const pendingNewBlankIds = new Set<number>()

/** mark a docs webContents as "open blank on first consume" (called by the shell for home:new-doc) */
export function markDocsNewBlank(wcId: number): void {
  pendingNewBlankIds.add(wcId)
}

/** AI-authored content waiting for its create_document tab, keyed by webContents id */
const pendingAiDocContents = new Map<number, AiDocContent>()

/** queue AI content for a fresh blank docs tab (called by the shell right after creating the view) */
export function queueDocsAiContent(wcId: number, content: AiDocContent): void {
  pendingAiDocContents.set(wcId, content)
}

/** the single real BrowserWindow hosting the tab strip, used as dialog parent in tab mode */
let docsShellWindow: BrowserWindow | null = null
export function setDocsShellWindow(win: BrowserWindow | null): void {
  docsShellWindow = win
}

/** the window hosting a tab's WebContentsView when BrowserWindow.fromWebContents
 *  cannot tell (detached "Open in New Window" editors) */
let hostWindowHook: ((wc: WebContents) => BrowserWindow | undefined) | null = null
export function setDocsHostWindowHook(
  fn: ((wc: WebContents) => BrowserWindow | undefined) | null,
): void {
  hostWindowHook = fn
}

function hostWindowFor(wc: WebContents | null | undefined): BrowserWindow | undefined {
  const own = wc && (hostWindowHook?.(wc) ?? BrowserWindow.fromWebContents(wc))
  if (own && !own.isDestroyed()) return own
  return docsShellWindow && !docsShellWindow.isDestroyed() ? docsShellWindow : undefined
}

/** injected by the shell in tab mode: resolves the webContents of the currently active docs tab,
 * used for menu-command forwarding where there is no IpcMainInvokeEvent to key off of. */
let activeDocsResolver: (() => WebContents | null) | null = null
export function setActiveDocsResolver(fn: (() => WebContents | null) | null): void {
  activeDocsResolver = fn
}

function activeDocsWebContents(): WebContents | null {
  if (activeDocsResolver) return activeDocsResolver()
  return BrowserWindow.getFocusedWindow()?.webContents ?? mainWindow?.webContents ?? null
}

/** dialog parent for the calling tab: the sender's own window when it has one
 *  (standalone mode, detached "Open in New Window" editors), else the shell window */
function dialogParent(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return hostWindowFor(event.sender)
}

async function openDialog(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  return showOpenDialogWithMemory(dialog, dialogParent(event), options)
}

async function saveDialog(event: IpcMainInvokeEvent, options: SaveDialogOptions) {
  // before any pick is remembered, bare-name suggestions anchor in the
  // configurable default save folder instead of Electron's Downloads pin
  return showSaveDialogWithMemory(dialog, dialogParent(event), options, defaultSaveDir())
}

/** default folder where new files land on their first (silent) save; shared with the other editors via shell. User-configurable (app-settings.json), falls back to <Documents>/OfficeVega. */
export function defaultSaveDir(): string {
  return configuredDefaultSaveDir(app)
}

/** first free path for fileName inside dir: name.ext, name-2.ext, name-3.ext… */
export function uniquePathIn(dir: string, fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const base = dot > 0 ? fileName.slice(0, dot) : fileName
  const ext = dot > 0 ? fileName.slice(dot) : ''
  let candidate = join(dir, fileName)
  for (let i = 2; existsSync(candidate); i++) candidate = join(dir, `${base}-${i}${ext}`)
  return candidate
}

/**
 * An encrypted file the window holds no password for does not become a
 * document yet: loadDocx hands back a password marker with no side effects and
 * the renderer runs the replace guard once the password decrypted it
 * (submitDocPwd). Guarding here as well would prompt twice, and a Don't Save
 * answer would drop the recovery copy before anything replaced the document.
 */
async function opensAsPasswordPrompt(filePath: string, wcId: number): Promise<boolean> {
  if (docPasswordFor(wcId, filePath)) return false
  try {
    return isEncryptedDocx(await readFile(filePath))
  } catch {
    return false
  }
}

export function openExternalDocx(filePath: string | null): void {
  if (!filePath || !/\.docx$/i.test(filePath)) return
  const win = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!rendererReady || !win) {
    pendingOpenPath = filePath
    return
  }
  void (async () => {
    const wcId = win.webContents.id
    if (
      rendererReady &&
      !(await opensAsPasswordPrompt(filePath, wcId)) &&
      !(await requestDocsClose(win.webContents, win))
    ) {
      return
    }
    return loadDocx(filePath, wcId)
  })()
    .then((result) => {
      if (!result || win.isDestroyed()) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
      win.webContents.send('docs:opened', result)
    })
    .catch((err) => dialog.showErrorBox(tm('dlgOpenDoc'), String(err)))
}

function userDataPath(...parts: string[]): string {
  return join(app.getPath('userData'), ...parts)
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    /* corrupted state file: fall back to defaults */
  }
  return fallback
}

// ---- recent files ----

const RECENT_PATH = () => userDataPath('recent.json')

// the home screen lists all of these; the File menu shows only the first few
const RECENT_LIMIT = 100

function pushRecent(filePath: string): void {
  const recent = readJson<string[]>(RECENT_PATH(), [])
  // Every save lands here (autosave = every 30s): skip the write and the menu
  // rebuild when the file is already at the head of the list
  if (recent[0] === filePath) return
  const next = [filePath, ...recent.filter((p) => p !== filePath)].slice(0, RECENT_LIMIT)
  try {
    writeJsonAtomic(RECENT_PATH(), next)
  } catch (err) {
    // the document itself is already saved; a lost recents entry must not fail the save
    console.warn('[docs] recent.json write failed:', err)
  }
  buildDocsMenu() // keep File > Open Recent in sync
}

/** unified recents for the shell home screen (paths only; type = extension).
 *  No existence filter: a transiently unavailable path (disconnected drive,
 *  pending mount) must stay listed — the stat layer flags it instead (r158) */
export function readRecentFiles(): string[] {
  return readJson<string[]>(RECENT_PATH(), [])
}

export function recordRecentFile(filePath: string): void {
  pushRecent(filePath)
}

export function removeRecentFiles(filePaths: string[]): void {
  const drop = new Set(filePaths)
  const recent = readJson<string[]>(RECENT_PATH(), [])
  writeJsonAtomic(
    RECENT_PATH(),
    recent.filter((p) => !drop.has(p)),
  )
  buildDocsMenu()
}

/** shell notification: the file of an open view was renamed on disk (renamed in
 *  the Home list) — push to the matching renderer so it syncs its save path and
 *  title bar (docs keeps path state on the renderer side). */
export function docsFileRenamed(wc: WebContents, oldPath: string, newPath: string): void {
  // keep the save allowlist in sync so docs:save accepts the renamed path
  docWritablePaths.get(wc.id)?.delete(oldPath)
  allowDocWrite(wc.id, newPath)
  rememberOpenDoc(wc.id, newPath)
  const states = docDiskStates.get(wc.id)
  const recorded = states?.get(oldPath)
  if (states && recorded) {
    states.delete(oldPath)
    states.set(newPath, recorded)
  }
  // an encrypted document's password must follow the path, or the next save
  // finds no password under the new name and silently writes plaintext
  renameDocPassword(wc.id, oldPath, newPath)
  moveLazyMediaSource(oldPath, newPath)
  wc.send('docs:renamed', { oldPath, newPath })
}

/** keep a renamed file at its old position in the recent/starred lists */
export function replaceRecentFile(oldPath: string, newPath: string): void {
  const recent = readJson<string[]>(RECENT_PATH(), [])
  writeJsonAtomic(
    RECENT_PATH(),
    recent.map((p) => (p === oldPath ? newPath : p)),
  )
  const renamed = renameStarredItem(readStarredItems(STARRED_PATH()), oldPath, newPath)
  if (renamed) writeStarredItems(STARRED_PATH(), renamed)
  buildDocsMenu()
}

// ---- starred files (home screen favorites) ----
// the store lives in starred-files.ts (pure, unit-tested); legacy flat
// string[] files migrate to the versioned shape on the first write

const STARRED_PATH = () => userDataPath('starred.json')

/** No existence filter, same rationale as readRecentFiles: a transiently
 *  unavailable starred file must keep its star and its Starred-view row —
 *  filtering here also desynced the star state shown on recents rows (r158) */
export function readStarredFiles(): string[] {
  return readStarredItems(STARRED_PATH()).map((item) => item.path)
}

export function toggleStarredFile(filePath: string): void {
  writeStarredItems(STARRED_PATH(), toggleStarredItem(readStarredItems(STARRED_PATH()), filePath))
}

/** Bulk unstar (in-app delete, bulk unfollow from the Starred view, or
 *  removing an unavailable entry from the recents list): the star must not
 *  outlive the row it pointed at (r158) */
export function removeStarredFiles(filePaths: string[]): void {
  const next = dropStarredItems(readStarredItems(STARRED_PATH()), filePaths)
  if (next) writeStarredItems(STARRED_PATH(), next)
}

/** put each starred path into `group` (null = back to ungrouped). Groups have
 *  no separate list: a group exists while an entry carries its name, so
 *  creating one is assigning its first file and emptying one is implicit. */
export function setStarredGroup(filePaths: string[], group: string | null): void {
  const next = assignStarredGroup(readStarredItems(STARRED_PATH()), filePaths, group)
  if (next) writeStarredItems(STARRED_PATH(), next)
}

/** group names that currently have at least one starred file, first-seen order */
export function readStarredGroups(): string[] {
  return starredGroupNames(readStarredItems(STARRED_PATH()))
}

/** starred path → its group (ungrouped paths absent); feeds the home IPC entries */
export function readStarredGroupMap(): Map<string, string> {
  return starredGroupMap(readStarredItems(STARRED_PATH()))
}

// ---- original archive (pass-through base: original file archived by content hash) ----

async function archiveOriginal(filePath: string, hash: string, size: number): Promise<void> {
  // a copy larger than the whole cap would only evict every other original
  if (size > ORIGINALS_MAX_BYTES) return
  const dir = userDataPath('originals')
  await mkdir(dir, { recursive: true })
  const target = join(dir, `${hash}.docx`)
  if (!existsSync(target)) await copyFile(filePath, target)
  void pruneOriginals(dir)
}

const ORIGINALS_MAX_BYTES = 500 * 1024 * 1024
let originalsPruneRunning = false

/** cap the archive's total size; oldest by mtime go first (never blocks the open path) */
async function pruneOriginals(dir: string): Promise<void> {
  if (originalsPruneRunning) return
  originalsPruneRunning = true
  try {
    const files: Array<{ path: string; size: number; mtimeMs: number }> = []
    for (const name of await readdir(dir)) {
      try {
        const s = await stat(join(dir, name))
        if (s.isFile()) files.push({ path: join(dir, name), size: s.size, mtimeMs: s.mtimeMs })
      } catch {
        /* removed concurrently */
      }
    }
    let total = files.reduce((sum, f) => sum + f.size, 0)
    files.sort((a, b) => a.mtimeMs - b.mtimeMs)
    for (const f of files) {
      if (total <= ORIGINALS_MAX_BYTES) break
      try {
        await unlink(f.path)
        total -= f.size
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* directory unreadable: retry on the next archive */
  } finally {
    originalsPruneRunning = false
  }
}

/** per-renderer paths writable via docs:save — populated by open/save-as flows */
const docWritablePaths = new Map<number, Set<string>>()
/** per-renderer PDF export targets authorized via the export save dialog */
const pdfWritablePaths = new Map<number, Set<string>>()
const tornDownWcIds = new Set<number>()

// per renderer, kept current on open/save/save-as/rename; only the local-media allowlist reads it
const openDocByWc = new Map<number, string>()

function rememberOpenDoc(wcId: number, filePath: string): void {
  openDocByWc.set(wcId, filePath)
}

function docsMediaRoots(wcId: number): string[] {
  return documentMediaRoots(openDocByWc.get(wcId), join(app.getPath('temp'), 'genoffice-pasted'))
}

function allowDocWrite(wcId: number, filePath: string): void {
  const set = docWritablePaths.get(wcId) ?? new Set<string>()
  set.add(filePath)
  docWritablePaths.set(wcId, set)
}

/** MCP save_session: the shell resolved this path for the tab, so docs:save-to may write it */
export function authorizeMcpDocWrite(wcId: number, filePath: string): void {
  allowDocWrite(wcId, filePath)
}

function canDocWrite(wcId: number, filePath: string): boolean {
  return docWritablePaths.get(wcId)?.has(filePath) === true
}

function allowPdfWrite(wcId: number, filePath: string): void {
  const set = pdfWritablePaths.get(wcId) ?? new Set<string>()
  set.add(filePath)
  pdfWritablePaths.set(wcId, set)
}

// Fidelity-harness escape hatch: headless runs have no save dialog to authorize
// paths, so an explicitly configured directory (set only by our test scripts)
// is treated as pre-authorized for PDF export.
const testExportDir = process.env.OFFICEVEGA_TEST_EXPORT_DIR || null

function canPdfWrite(wcId: number, filePath: string): boolean {
  if (testExportDir && filePath.startsWith(testExportDir + '/')) return true
  return pdfWritablePaths.get(wcId)?.has(filePath) === true
}

// Export as images runs the regular PDF export against a temp file: that file must
// not be revealed like a user export, and only the tab that asked may read it back
// (or write PNGs into the folder it picked).
const imageExportTemps = new Map<number, Set<string>>()
const imageExportDirs = new Map<number, Set<string>>()

function isImageExportTemp(wcId: number, filePath: string): boolean {
  return imageExportTemps.get(wcId)?.has(filePath) === true
}

// Word's Ignore All lasts for the document session. Chromium has no
// per-document skip list, so the word sits in the custom dictionary while a
// renderer holds it and leaves when the last holder goes; the journal pulls
// crash-orphaned words back out on the next start.
const SPELL_IGNORED_PATH = () => userDataPath('spell-ignored.json')
const spellIgnored = new Map<string, Set<number>>()
const journalIgnoredWords = () => writeJsonAtomic(SPELL_IGNORED_PATH(), [...spellIgnored.keys()])

function releaseSpellIgnores(wcId: number): void {
  let changed = false
  for (const [word, holders] of spellIgnored) {
    if (!holders.delete(wcId) || holders.size > 0) continue
    spellIgnored.delete(word)
    session.defaultSession.removeWordFromSpellCheckerDictionary(word)
    changed = true
  }
  if (changed) journalIgnoredWords()
}

function dropDocWriter(wcId: number): void {
  releaseSpellIgnores(wcId)
  docWritablePaths.delete(wcId)
  pdfWritablePaths.delete(wcId)
  openDocByWc.delete(wcId)
  for (const p of imageExportTemps.get(wcId) ?? []) void rm(p, { force: true })
  imageExportTemps.delete(wcId)
  imageExportDirs.delete(wcId)
  docDiskStates.delete(wcId)
  forgetLazyMediaOwner(wcId)
  // Destroyed renderers count as torn down too: window-close paths never run
  // teardownDocsRenderer, but an in-flight save handler resuming after the
  // destruction must still fail its re-check (wcIds are never reused, so the
  // set only accumulates a few integers per session).
  tornDownWcIds.add(wcId)
}

// ── External-modification detection: remember the disk state at every read/write
// so docs:save can refuse to clobber edits made by Word/another window ──
const docDiskStates = new Map<number, Map<string, DiskFileState>>()

const sha256Hex = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

async function rememberDiskState(wcId: number, filePath: string, hash: string): Promise<void> {
  try {
    const s = await stat(filePath)
    const states = docDiskStates.get(wcId) ?? new Map<string, DiskFileState>()
    states.set(filePath, { mtimeMs: s.mtimeMs, size: s.size, hash })
    docDiskStates.set(wcId, states)
  } catch {
    /* unstatable target: skip tracking; the next save simply won't flag a conflict */
  }
}

async function diskChangedExternally(wcId: number, filePath: string): Promise<boolean> {
  let current: { mtimeMs: number; size: number } | null
  try {
    current = await stat(filePath)
  } catch {
    current = null
  }
  return isExternallyModified(docDiskStates.get(wcId)?.get(filePath), current, async () => {
    try {
      return sha256Hex(await readFile(filePath))
    } catch {
      return null
    }
  })
}

/** A closed docs tab detaches without destroying its webContents (shell freeze
 * workaround), so the orphan must lose write access and stop its timers — otherwise
 * its 30s recovery loop resurrects content the user already discarded. */
export function teardownDocsRenderer(contents: WebContents): void {
  teardownZoteroIpc(contents)
  tornDownWcIds.add(contents.id)
  releaseSpellIgnores(contents.id)
  forgetLazyMediaOwner(contents.id)
  // Sweep recovery copies for this renderer's documents: every non-crash close
  // either saved (docs:save already cleared it) or explicitly discarded, so a
  // copy still on disk here is a leftover from an in-flight recovery write.
  for (const p of docWritablePaths.get(contents.id) ?? []) clearRecoveryCopy(p)
  // reclaim every per-wcId grant, not just doc saves — the orphaned renderer
  // must also lose its dialog-authorized PDF targets and disk-state cache
  docWritablePaths.delete(contents.id)
  pdfWritablePaths.delete(contents.id)
  docDiskStates.delete(contents.id)
  forgetDocPasswords(contents.id)
  if (!contents.isDestroyed()) contents.send('docs:teardown')
}

// ── Crash recovery: dirty renderers push a copy every 30s
// (docs:write-recovery); a normal save cleans it up; open offers Restore/Discard ──
const recoveryDir = () => userDataPath('docs-autosave')
const recoveryPathFor = (filePath: string) =>
  join(recoveryDir(), `${createHash('sha1').update(filePath).digest('hex').slice(0, 16)}.docx`)

/** Bumped by every clear: an in-flight docs:write-recovery that started before
 * the bump must not recreate the file it is about to land (stale-recovery race). */
const recoveryClearEpochs = new Map<string, number>()

function clearRecoveryCopy(filePath: string): void {
  recoveryClearEpochs.set(filePath, (recoveryClearEpochs.get(filePath) ?? 0) + 1)
  try {
    unlinkSync(recoveryPathFor(filePath))
  } catch {
    /* nothing to clean */
  }
}

interface MaybeRecoveredDocBytes {
  bytes: Buffer
  recovered: boolean
}

/** On open, if a recovery copy exists, always ask whether to restore (still
 * points at the original path; only save persists it). A newer on-disk file no
 * longer deletes the copy silently (#1020) — it only marks the prompt: the
 * copy can be the sole artifact holding pre-crash edits, and it goes away only
 * when the user picks Discard. */
async function maybeRecoverDocBytes(
  filePath: string,
  original: Buffer,
): Promise<MaybeRecoveredDocBytes> {
  const asPath = recoveryPathFor(filePath)
  let fileIsNewer = false
  try {
    if (!existsSync(asPath)) return { bytes: original, recovered: false }
    fileIsNewer = statSync(asPath).mtimeMs <= statSync(filePath).mtimeMs
  } catch {
    return { bytes: original, recovered: false }
  }
  const options = {
    type: 'question' as const,
    buttons: [tm('autosaveRestore'), tm('autosaveDiscard')],
    defaultId: 0,
    cancelId: 1,
    message: tm('autosaveFoundTitle'),
    detail: fileIsNewer
      ? `${tm('autosaveFoundBody')}\n\n${tm('autosaveFileNewer')}`
      : tm('autosaveFoundBody'),
  }
  const parent = BrowserWindow.getFocusedWindow() ?? mainWindow
  const r =
    parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
  if (r.response === 0) {
    try {
      return { bytes: await readFile(asPath), recovered: true }
    } catch {
      return { bytes: original, recovered: false }
    }
  }
  clearRecoveryCopy(filePath)
  return { bytes: original, recovered: false }
}

// Word's own .docx ceiling
const MAX_OPEN_BYTES = 512 * 1024 * 1024

async function showOpenError(wcId: number, detail: string): Promise<void> {
  const parent = hostWindowFor(webContents.fromId(wcId)) ?? mainWindow
  const options = { type: 'error' as const, message: tm('dlgOpenDoc'), detail }
  if (parent && !parent.isDestroyed()) await dialog.showMessageBox(parent, options)
  else await dialog.showMessageBox(options)
}

async function loadDocx(
  filePath: string,
  wcId: number,
  password?: string,
): Promise<OpenDocxResult> {
  if (typeof filePath !== 'string' || !/\.docx$/i.test(filePath)) return null
  if (!existsSync(filePath)) return null
  const size = (await stat(filePath)).size
  const lazy = await openLazyDocx(filePath, wcId)
  if ((lazy?.bytes.length ?? size) > MAX_OPEN_BYTES) {
    const mb = MAX_OPEN_BYTES / 1024 / 1024
    await showOpenError(wcId, `${basename(filePath)}: ${tm('errTooLarge', { mb })}`)
    return null
  }
  const original = lazy?.bytes ?? (await readFile(filePath))
  // Password-protected docx (ECMA-376 CFB container): without a password, hand
  // back a marker — the renderer prompts and retries via docs:open-decrypt.
  // No side effects (recents/write grant) until the password checks out.
  let plainBytes: Buffer = original
  const encrypted = isEncryptedDocx(original)
  if (encrypted) {
    const pwd = password ?? docPasswordFor(wcId, filePath)
    if (!pwd) return { needsPassword: true, path: filePath, name: basename(filePath) }
    plainBytes = await decryptDocx(original, pwd) // throws DocxDecryptError
    rememberDocPassword(wcId, filePath, pwd)
  } else {
    rememberDocPassword(wcId, filePath, null)
  }
  // the archive keeps the on-disk original as-is (encrypted ones included: they
  // reopen with the user's password), so a bad save never loses the source file
  const hash = lazy?.hash ?? sha256Hex(original)
  await archiveOriginal(filePath, hash, size)
  const recovery = await maybeRecoverDocBytes(filePath, plainBytes)
  let bytes = recovery.bytes
  let recovered = recovery.recovered
  // recovery copies of a protected document are themselves encrypted (see
  // docs:write-recovery); an unreadable copy falls back to the original
  if (encrypted && isEncryptedDocx(bytes)) {
    try {
      bytes = await decryptRecoveryCopy(wcId, filePath, bytes)
    } catch {
      bytes = plainBytes
      recovered = false
    }
  }
  if (recovered) await adoptLazyMediaHashes(bytes, filePath, wcId)
  pushRecent(filePath)
  allowDocWrite(wcId, filePath)
  rememberOpenDoc(wcId, filePath)
  if (fileOpenedHook) fileOpenedHook(wcId, filePath)
  markDiskEncrypted(wcId, filePath, encrypted)
  // record the on-disk file, not the recovery copy: what matters is what save would overwrite
  await rememberDiskState(wcId, filePath, hash)
  return {
    path: filePath,
    name: basename(filePath),
    dataUrl: handOffBytes(bytes),
    hash,
    encrypted,
    recovered: recovered || undefined,
  }
}

// ---- IPC ----

const IMAGE_MIME: Record<string, 'image/png' | 'image/jpeg' | 'image/gif'> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

// ---- chat attachments: local files parsed for the agent ----

const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024
/** plain-text extensions read as UTF-8 */
const TEXT_EXTS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'yaml',
  'yml',
  'xml',
  'html',
  'htm',
  'log',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'java',
  'c',
  'h',
  'cpp',
  'go',
  'rs',
  'rb',
  'sh',
  'sql',
  'css',
])
/** office/pdf formats get text extracted via @genoffice/file-parse; images skip extraction and go multimodal (files:read-image) */
const ATTACHMENT_EXTS = new Set([
  ...TEXT_EXTS,
  'doc',
  'docx',
  'pdf',
  'pptx',
  'ppt',
  'xlsx',
  'xlsm',
  'xls',
  ...ATTACHMENT_IMAGE_EXTS,
])

const ATTACHMENT_IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}
/** multimodal size cap per image attachment (keeps the context from blowing up) */
const ATTACHMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

/** extracted text cache keyed by path; invalidated by mtime+size */
const attachmentTextCache = new Map<string, { stamp: string; text: string }>()

function statAttachment(filePath: string): { meta?: AttachmentMeta; error?: string } {
  const name = basename(filePath)
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (!ATTACHMENT_EXTS.has(ext)) return { error: `${name}: ${tm('errUnsupportedExt', { ext })}` }
  try {
    const stat = statSync(filePath)
    if (!stat.isFile()) return { error: `${name}: ${tm('errNotFile')}` }
    if (stat.size > ATTACHMENT_MAX_BYTES) {
      return {
        error: `${name}: ${tm('errTooLarge', { mb: Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024) })}`,
      }
    }
    if (ATTACHMENT_IMAGE_EXTS.has(ext) && stat.size > ATTACHMENT_IMAGE_MAX_BYTES) {
      return { error: `${name}: ${tm('errImageTooLarge')}` }
    }
    return { meta: { path: filePath, name, ext, sizeBytes: stat.size } }
  } catch {
    return { error: `${name}: ${tm('errUnreadable')}` }
  }
}

function collectAttachments(paths: string[]): AttachmentAddResult {
  const accepted: AttachmentMeta[] = []
  const rejected: string[] = []
  for (const p of paths) {
    const { meta, error } = statAttachment(p)
    if (meta) accepted.push(meta)
    else if (error) rejected.push(error)
  }
  return { accepted, rejected }
}

/** save clipboard-pasted image bytes to a temp file (screenshots/bitmaps with no local path); returns null for non-images or empty data */
let pastedImageSeq = 0
let pastedDirPruned = false

/** drop pasted-image temp files older than 7 days (once per app run) */
function prunePastedImages(dir: string): void {
  if (pastedDirPruned) return
  pastedDirPruned = true
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      try {
        if (statSync(p).mtimeMs < cutoff) unlinkSync(p)
      } catch {
        // ignore: another tab may have removed it already
      }
    }
  } catch {
    // ignore: directory may not exist yet
  }
}
function savePastedImage(data: unknown, ext: unknown): string | null {
  const cleanExt = typeof ext === 'string' ? ext.toLowerCase() : ''
  if (!ATTACHMENT_IMAGE_EXTS.has(cleanExt)) return null
  const bytes =
    data instanceof ArrayBuffer
      ? Buffer.from(data)
      : ArrayBuffer.isView(data)
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : null
  if (!bytes || bytes.byteLength === 0) return null
  const dir = join(app.getPath('temp'), 'officevega-pasted')
  mkdirSync(dir, { recursive: true })
  prunePastedImages(dir)
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
  const filePath = join(dir, `pasted-${stamp}-${++pastedImageSeq}.${cleanExt}`)
  writeFileSync(filePath, bytes)
  return filePath
}

/** parse an attachment to text via @genoffice/file-parse (docx/pdf/pptx/xlsx/plain text) */
async function extractAttachmentText(filePath: string): Promise<string> {
  const stat = statSync(filePath)
  const stamp = `${stat.mtimeMs}:${stat.size}`
  const cached = attachmentTextCache.get(filePath)
  if (cached && cached.stamp === stamp) return cached.text
  if (stat.size > ATTACHMENT_MAX_BYTES) throw new Error(tm('errFileTooLarge'))
  const parsed = await parseFileToText(filePath)
  if (!parsed.ok || parsed.kind !== 'text' || parsed.text == null) {
    throw new Error(parsed.error ?? tm('errParseFailed'))
  }
  attachmentTextCache.set(filePath, { stamp, text: parsed.text })
  // keep the cache bounded (a handful of recent files is plenty)
  if (attachmentTextCache.size > 8) {
    const oldest = attachmentTextCache.keys().next().value
    if (oldest) attachmentTextCache.delete(oldest)
  }
  return parsed.text
}

// ---- print / export PDF ----

const TWIPS_PER_INCH = 1440

// ---- AI settings + chat proxy (main process avoids renderer CORS) ----
// provider metadata, settings defaults/migration, and per-provider streaming/chat
// implementations live in @genoffice/ai-provider, shared with apps/sheets.

const SETTINGS_PATH = () => userDataPath('ai-settings.json')

/** the AI Model provider's VEGA key — media/search VEGA slots may share it; falls back to the sign-in-issued key */
function storedVegaKey(): string {
  const stored = readJson<Partial<AiSettings> & LegacyAiSettings>(SETTINGS_PATH(), {})
  return (
    resolveAiSettings(stored, defaultAiSettings()).providers.vega?.apiKey?.trim() ||
    officeVegaApiKey()
  )
}

const activeAiStreams = new Map<string, AbortController>()

/** every renderer (tabs, home) re-reads ai-settings.json — the composer chip and
 *  the settings page edit the same file from different windows */
function broadcastAiSettingsChanged(): void {
  for (const wc of webContents.getAllWebContents())
    if (!wc.isDestroyed()) wc.send('ai:settings-changed')
}

/**
 * AI settings + chat/stream proxy handlers. Split out so the shell can
 * register them exactly once for all window types (docs, sheets, home) —
 * sheets' standalone AI handlers use the same channel names.
 */
export function registerAiIpc(): void {
  app.once('before-quit', shutdownCodexAppServers)
  // sign-in/out lands here whichever UI started it (chat button, Home,
  // settings): every open view re-reads settings/status off this push
  setOfficeVegaAuthListener((auth) => {
    const payload = { loggedIn: auth !== null }
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) wc.send('ai:auth-changed', payload)
    }
  })
  ipcMain.handle('ai:get-settings', async (): Promise<AiSettings> => {
    const stored = readJson<Partial<AiSettings> & LegacyAiSettings>(SETTINGS_PATH(), {})
    // pre-lock legacy file: genspark selected with cloud tools opted out. The
    // settings UI locks the tools switch on with genspark and apps read this
    // file live, so heal the stored flag once. Judged on the *stored* provider
    // — never the activeProvider fallback below, which must not leak into the
    // file and clobber a saved (half-configured) BYOK selection.
    if ((stored.provider ?? 'genspark') === 'genspark' && stored.gskToolsEnabled === false) {
      stored.gskToolsEnabled = true
      writeJsonAtomic(SETTINGS_PATH(), stored)
    }
    const settings = resolveAiSettings(stored, defaultAiSettings())
    setPiiShieldEnabled(settings.piiShieldEnabled !== false)
    // `provider` reports the effective route (a stored BYOK provider is honored
    // when usable; half-filled configs fall back to genspark); storedProvider
    // keeps the user's pick visible so the settings UI can't clobber it
    const storedProvider = settings.provider
    settings.provider = activeProvider(settings)
    // a legacy genspark pick upgraded by a live VEGA credential reads as a
    // plain vega choice — no storedProvider hint, so a save migrates the file
    if (storedProvider === 'genspark' && settings.provider === 'vega') return settings
    return storedProvider === settings.provider ? settings : { ...settings, storedProvider }
  })

  // Cloud account status: the VEGA sign-in (issued key) is primary, the shared
  // gsk CLI login a fallback; the frontend uses it to prompt login when logged out
  ipcMain.handle(
    'ai:gsk-status',
    async (_event, withEmail?: boolean): Promise<GenSparkAccountStatus> => {
      const vegaKey = officeVegaApiKey()
      if (!vegaKey && !hasGskAuth()) return { loggedIn: false }
      if (!withEmail) return { loggedIn: true }
      if (vegaKey) {
        // the account query also carries the deposit — the chat composer's
        // VEGA balance badge reads it from the same response
        const info = await vegaAccountInfo()
        return {
          loggedIn: true,
          ...(info?.email !== undefined ? { email: info.email } : {}),
          ...(info?.balance !== undefined ? { balance: info.balance } : {}),
          ...(info?.balanceRub !== undefined ? { balanceRub: info.balanceRub } : {}),
          ...(info?.currency !== undefined ? { currency: info.currency } : {}),
        }
      }
      const email = (await gskLoginInfo())?.email
      return email ? { loggedIn: true, email } : { loggedIn: true }
    },
  )

  // a 401 on the gsk key drops the stored key and re-reads the shared config;
  // this fork owns no gsk login flow — the sign-in button below takes over
  ipcMain.handle('ai:gsk-login', () => {
    ensureOfficeVegaLogin((url) => void shell.openExternal(url))
  })

  ipcMain.handle('ai:set-settings', (_event, settings: AiSettings) => {
    // SECURITY.md: payloads are schema-checked in the main process. The settings
    // file feeds cliPath into spawn() and baseUrl receives the gsk bearer token,
    // so the renderer's copy is sanitized before it touches disk. Sanitize also
    // drops storedProvider — a get-settings transport hint that is never persisted.
    const sanitized = sanitizeAiSettings(settings)
    if (!sanitized) {
      console.warn('[ai] rejected invalid ai:set-settings payload')
      return
    }
    setPiiShieldEnabled(sanitized.piiShieldEnabled !== false)
    writeJsonAtomic(SETTINGS_PATH(), sanitized)
    broadcastAiSettingsChanged()
  })

  ipcMain.handle('ai:codex-models', async (_event, cliPath: unknown) => {
    // the probe spawns the path directly, so it gets the same metacharacter and
    // existence check as the stored setting (anything else: auto-detect)
    return listCodexModels(sanitizeCliPath(cliPath))
  })

  // live model catalog for liveCatalog providers (VEGA, OpenRouter):
  // GET {base}/models filtered by modality — powers the settings pickers
  ipcMain.handle('ai:provider-models', async (_event, input: unknown) => {
    const req = (input ?? {}) as {
      provider?: AiProviderId
      apiKey?: string
      baseUrl?: string
      input?: string
      output?: string
      excludeOutput?: unknown
      excludePrefixes?: unknown
      excludeSuffixes?: unknown
    }
    if (!req.provider) return { models: [], defaultModel: '' }
    const strings = (v: unknown) =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : undefined
    return listProviderModels(
      req.provider,
      {
        // the renderer never sees the issued VEGA key — supply it here so the
        // signed-in catalog works for a keyless vega slot
        apiKey: String(req.apiKey ?? '') || (req.provider === 'vega' ? officeVegaApiKey() : ''),
        model: '',
        ...(typeof req.baseUrl === 'string' && req.baseUrl ? { baseUrl: req.baseUrl } : {}),
      },
      {
        ...(typeof req.input === 'string' && req.input ? { input: req.input } : {}),
        ...(typeof req.output === 'string' && req.output ? { output: req.output } : {}),
        ...(strings(req.excludeOutput) ? { excludeOutput: strings(req.excludeOutput) } : {}),
        ...(strings(req.excludePrefixes) ? { excludePrefixes: strings(req.excludePrefixes) } : {}),
        ...(strings(req.excludeSuffixes) ? { excludeSuffixes: strings(req.excludeSuffixes) } : {}),
      },
    )
  })
  ipcMain.handle('ai:custom-models', (_event, input: unknown) => listCustomModelsForIpc(input))

  ipcMain.handle('ai:stream', async (event, request: AiStreamRequest) => {
    // per-request settings get the same schema check as the persisted ones: a
    // compromised renderer could otherwise hand cliPath/baseUrl straight to
    // the provider layer without ever touching the settings file
    const settings = sanitizeAiSettings(request.settings)
    if (!settings) {
      event.sender.send('ai:stream-chunk', {
        requestId: request.requestId,
        type: 'error',
        error: 'invalid AI settings payload',
      } satisfies AiStreamChunk)
      return
    }
    setPiiShieldEnabled(settings.piiShieldEnabled !== false)
    const { requestId, system, messages } = request
    const tools = request.tools ?? []
    const maxTokens = request.maxTokens ?? maxOutputTokensOf(settings)
    // callers pass the effective provider from ai:get-settings — resolving again
    // here would break "test connection" on a stored-but-keyless BYOK pick; only
    // the legacy-genspark→vega upgrade is re-applied (a pre-sign-in snapshot
    // would otherwise stay on the signed-out route until the tab reloads)
    const { provider, config: resolvedConfig } = requestProvider(settings)
    let config = resolvedConfig
    // the genspark key never enters the settings file; requests take it from the gsk login state.
    // A VEGA slot likewise inherits the sign-in-issued key when its own is empty.
    // set only when the gsk key was injected: a 401 then means that key expired
    let gskKey = ''
    if (provider === 'genspark' && config && !config.apiKey) {
      gskKey = gskApiKey()
      config = { ...config, apiKey: gskKey }
    } else if (provider === 'vega' && config && !config.apiKey?.trim()) {
      config = { ...config, apiKey: officeVegaApiKey() }
    }
    const send = (chunk: AiStreamChunk) => {
      if (!event.sender.isDestroyed()) event.sender.send('ai:stream-chunk', chunk)
    }
    if (!config || (provider !== 'codex' && !config.apiKey)) {
      send({
        requestId,
        type: 'error',
        error:
          provider === 'genspark' || (provider === 'vega' && !officeVegaApiKey())
            ? tm('errGskNotLoggedIn')
            : tm('errNoApiKey', { provider }),
      })
      return
    }
    if (provider !== 'codex' && !config.model) {
      send({ requestId, type: 'error', error: tm('errNoModel') })
      return
    }
    const controller = new AbortController()
    activeAiStreams.set(requestId, controller)
    const unwatchSender = abortOnDestroyed(event.sender, controller)
    // wire-activity keepalive: lets the renderer's silence watchdog tell a slow turn from a dead one
    let lastPing = 0
    const ping = () => {
      const now = Date.now()
      if (now - lastPing < 5_000) return
      lastPing = now
      send({ requestId, type: 'ping' })
    }
    try {
      let stopReason: string | undefined
      await streamForProvider(provider, config, system, messages, tools, maxTokens, {
        ...(request.sessionId ? { sessionId: request.sessionId } : {}),
        signal: controller.signal,
        onDelta: (text) => send({ requestId, type: 'delta', text }),
        onReasoningDelta: (text) => send({ requestId, type: 'reasoning', text }),
        onToolCall: (toolCall) => send({ requestId, type: 'tool-call', toolCall }),
        onActivity: ping,
        onStopReason: (reason) => {
          stopReason = reason
        },
        onUsage: (usage) => send({ requestId, type: 'usage', usage }),
      })
      send({ requestId, type: 'done', stopReason })
    } catch (err) {
      if (controller.signal.aborted) {
        send({ requestId, type: 'done' })
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[ai-stream] ${requestId} (${provider}/${config.model}) failed:`, msg)
        // an expired/revoked key drops to signed-out so the inline sign-in button shows
        noteGskCallFailure(gskKey, err)
        send({
          requestId,
          type: 'error',
          error: msg,
          ...(err instanceof AiTimeoutError
            ? { errorCode: 'timeout' as const }
            : err instanceof AiCreditsError
              ? { errorCode: 'credits' as const }
              : isAiNetworkError(err)
                ? { errorCode: 'network' as const }
                : isAiOverloadedError(err)
                  ? { errorCode: 'overloaded' as const }
                  : {}),
        })
      }
    } finally {
      unwatchSender()
      activeAiStreams.delete(requestId)
    }
  })

  ipcMain.handle('ai:stream-cancel', (_event, requestId: string) => {
    activeAiStreams.get(requestId)?.abort()
  })

  // shared search tools (content + images): Serper with DuckDuckGo fallback (same source as slides/sheets)
  ipcMain.handle('ai:web-search', async (_event, query: string, maxResults?: number) => {
    try {
      return await webSearchTool(
        SETTINGS_PATH(),
        String(query),
        typeof maxResults === 'number' ? maxResults : 6,
      )
    } catch (err) {
      return { results: [], method: 'error', error: String(err) }
    }
  })
  ipcMain.handle('ai:image-search', async (_event, query: string, maxResults?: number) => {
    try {
      return await imageSearchTool(
        SETTINGS_PATH(),
        String(query),
        typeof maxResults === 'number' ? maxResults : 8,
      )
    } catch (err) {
      return { images: [], method: 'error', error: String(err) }
    }
  })

  // media understanding (pictures in the document, attachments, local files): BYOK media
  // provider when one is configured, otherwise the Genspark CLI behind its login gate.
  // docs-prefixed: slides registers its own ai:analyze-media in the same shell process.
  ipcMain.handle(
    'docs:analyze-media',
    async (event, op: { mediaUrls: string[]; requirements: string }) => {
      const mediaUrls = (op.mediaUrls ?? []).map(String).filter(Boolean)
      // a picture opened lazily from a large docx is only addressable by its main-process
      // store; hand its bytes over as a data URL so the loader can read them like any other
      const resolved: string[] = []
      for (const url of mediaUrls) {
        const lazy = await readLazyMedia(url).catch(() => null)
        resolved.push(lazy ? `data:${lazy.mime};base64,${lazy.body.toString('base64')}` : url)
      }
      return analyzeMediaTool(
        SETTINGS_PATH(),
        {
          mediaUrls: resolved,
          requirements: String(op.requirements ?? ''),
        },
        { mediaRoots: docsMediaRoots(event.sender.id) },
      )
    },
  )

  // download image from URL → base64+mime (download in the main process avoids CORS; the renderer builds the image node and measures size itself)
  ipcMain.handle(
    'ai:fetch-image',
    async (_event, url: string): Promise<{ base64: string; mime: string } | null> => {
      try {
        // the URL originates from AI tool calls (prompt-injectable via web search
        // results), so refuse non-http schemes and private/link-local targets;
        // redirects are followed manually so every hop is validated too.
        // fetchRemoteImage adds CDN-friendly headers and transient-error retries.
        const resp = await fetchRemoteImage(String(url))
        if (!resp || !resp.ok) return null
        const buf = Buffer.from(await readBodyCapped(resp, MAX_REMOTE_IMAGE_BYTES))
        const ct = resp.headers.get('content-type') ?? ''
        const mime = ct.includes('png')
          ? 'image/png'
          : ct.includes('gif')
            ? 'image/gif'
            : 'image/jpeg'
        return { base64: buf.toString('base64'), mime }
      } catch {
        return null
      }
    },
  )

  // docs-owned (like pdf:generate-image): slides' ai:generate-image is only
  // registered once a slides view exists, so docs needs its own channel
  ipcMain.handle(
    'docs:ai-generate-image',
    (event, op: { prompt?: unknown; aspectRatio?: unknown }) =>
      generateImageTool(
        SETTINGS_PATH(),
        {
          prompt: String(op?.prompt ?? ''),
          aspectRatio: op?.aspectRatio ? String(op.aspectRatio) : undefined,
        },
        { mediaRoots: docsMediaRoots(event.sender.id) },
      ),
  )

  ipcMain.handle('ai:search-test', (_event, input: unknown) => {
    const { provider, apiKey } = (input ?? {}) as { provider?: AiSearchProviderId; apiKey?: string }
    if (!provider || provider === 'genspark') {
      return hasGskAuth() ? { ok: true } : { ok: false, error: tm('errGskNotLoggedIn') }
    }
    // a VEGA slot may share the AI Model key — test the effective credential
    const key = String(apiKey ?? '') || (provider === 'vega' ? storedVegaKey() : '')
    return testSearchProvider(provider, key)
  })

  // settings-UI connection test for the media provider (genspark = the gsk login state)
  ipcMain.handle('ai:media-test', (_event, input: unknown) => {
    const { provider, config } = (input ?? {}) as {
      provider?: AiMediaProviderId
      config?: AiMediaProviderConfig
    }
    if (!provider || provider === 'genspark') {
      return hasGskAuth() ? { ok: true } : { ok: false, error: tm('errGskNotLoggedIn') }
    }
    if (!config) return { ok: false, error: 'No media provider configuration' }
    // a VEGA slot may share the AI Model key — test the effective credential
    const effective =
      provider === 'vega' && !config.apiKey?.trim()
        ? { ...config, apiKey: storedVegaKey() }
        : config
    return testMediaProvider(provider, effective)
  })

  ipcMain.handle('ai:chat', async (_event, request: AiChatRequest) => {
    // same schema check as ai:stream: one-shot requests would otherwise act on
    // the renderer's settings copy verbatim
    const settings = sanitizeAiSettings(request.settings)
    if (!settings) return { ok: false, error: 'invalid AI settings payload' }
    setPiiShieldEnabled(settings.piiShieldEnabled !== false)
    const { system, user } = request
    // callers pass the effective provider from ai:get-settings — resolving again
    // here would break "test connection" on a stored-but-keyless BYOK pick; only
    // the legacy-genspark→vega upgrade is re-applied (a pre-sign-in snapshot
    // would otherwise stay on the signed-out route until the tab reloads)
    const { provider, config: resolvedConfig } = requestProvider(settings)
    let config = resolvedConfig
    // set only when the gsk key was injected: a 401 then means that key expired
    let gskKey = ''
    if (provider === 'genspark' && config && !config.apiKey) {
      gskKey = gskApiKey()
      config = { ...config, apiKey: gskKey }
    } else if (provider === 'vega' && config && !config.apiKey?.trim()) {
      config = { ...config, apiKey: officeVegaApiKey() }
    }
    if (!config || (provider !== 'codex' && !config.apiKey)) {
      return {
        ok: false,
        error:
          provider === 'genspark' || (provider === 'vega' && !officeVegaApiKey())
            ? tm('errGskNotLoggedIn')
            : tm('errNoApiKey', { provider }),
      }
    }
    if (provider !== 'codex' && !config.model) return { ok: false, error: tm('errNoModel') }
    try {
      const result = await chatForProvider(provider, config, system, user)
      // the one-shot path reports HTTP failures as ok:false with the raw body —
      // replace capacity/rate-limit dumps with the localized "busy" message
      if (!result.ok && isAiOverloadedError(result.error)) {
        return { ok: false, error: tm('errAiBusy') }
      }
      if (!result.ok) noteGskCallFailure(gskKey, result.error)
      return result
    } catch (err) {
      noteGskCallFailure(gskKey, err)
      return { ok: false, error: isAiOverloadedError(err) ? tm('errAiBusy') : String(err) }
    }
  })
}

// ── project-store IPC (shared across docs / slides / sheets) ──────────────

let projectStore: ProjectStore | null = null
let projectIpcRegistered = false

function getProjectStore(): ProjectStore {
  if (!projectStore) projectStore = new ProjectStore(app.getPath('userData'))
  return projectStore
}

/**
 * Fired when a save lands on a new path (save-as / first silent save). The shell
 * uses it to sync the tab title/path, record recents and apply a pending project —
 * same contract as the sheets/slides opened hooks. Never called standalone.
 * Returns the final path when the shell filed the new file into a Home folder.
 */
let fileSavedHook: ((wc: WebContents, filePath: string) => string | void) | null = null

export function setDocsFileSavedHook(
  hook: (wc: WebContents, filePath: string) => string | void,
): void {
  fileSavedHook = hook
}

function notifyFileSaved(wc: WebContents, filePath: string): string {
  const moved = fileSavedHook ? fileSavedHook(wc, filePath) : undefined
  return typeof moved === 'string' && moved ? moved : filePath
}

/**
 * Fired when a docx is opened INSIDE an existing tab (File > Open dialog or an
 * explicit path open). Sheets and slides have had this hook from the start;
 * docs only synced the tab on save-as/first-save, so a file opened into an
 * untitled tab kept the "Untitled Document" tab title until a save landed on a
 * NEW path — which a plain Ctrl+S to the original file never does (r115).
 */
let fileOpenedHook: ((wcId: number, filePath: string) => void) | null = null

export function setDocsFileOpenedHook(hook: (wcId: number, filePath: string) => void): void {
  fileOpenedHook = hook
}

/**
 * Reverse lookup from a sheets sessionId to its file path. In shell mode the
 * project:* handlers are registered by this file, but only sheets-main knows the
 * sessionId mapping; the shell injects it at startup (standalone docs doesn't need it).
 */
let sessionPathResolver: ((senderId: number, sessionId: string) => string | null) | null = null

export function setSessionPathResolver(
  fn: (senderId: number, sessionId: string) => string | null,
): void {
  sessionPathResolver = fn
}

/** After a file is renamed/moved on disk, sync project-store (fileMap/chatIdByPath re-key accordingly; history follows the file). */
export function projectFilePaths(): string[] {
  try {
    return getProjectStore().knownFilePaths()
  } catch {
    return []
  }
}

export function projectFileRenamed(oldPath: string, newPath: string): void {
  try {
    getProjectStore().fileRenamed(oldPath, newPath)
  } catch (err) {
    console.warn('[project-store] fileRenamed failed:', err)
  }
}

/**
 * Register the project:* IPC handlers (all three apps share the same channel names).
 * Idempotency guard: registered only once in shell mode.
 */
export function registerProjectIpc(): void {
  if (projectIpcRegistered) return
  projectIpcRegistered = true

  /** Resolve projectId + chatId from a file path (sheets without a path resolves via sessionId) */
  ipcMain.handle(
    'project:resolveChat',
    (event, args: { filePath: string | null; tempChatId?: string; sessionId?: string }) => {
      const store = getProjectStore()
      store.ensureDefaultProject()
      let resolvedPath = args.filePath
      if (!resolvedPath && args.sessionId && sessionPathResolver) {
        resolvedPath = sessionPathResolver(event.sender.id, args.sessionId)
      }
      if (!resolvedPath) {
        return {
          projectId: 'default',
          chatId: args.tempChatId ?? `unsaved-${Date.now()}`,
        }
      }
      return store.resolveChatForFile(resolvedPath)
    },
  )

  /** Append a message */
  ipcMain.handle(
    'project:appendChat',
    (
      _event,
      args: {
        projectId: string
        chatId: string
        role: 'user' | 'assistant'
        text: string
        tools?: Array<{
          name: string
          summary: string
          isError?: boolean
          input?: string
          output?: string
        }>
        attachments?: Array<{ name: string; path?: string; ext?: string; sizeBytes?: number }>
        scope?: { label: string; text?: string }
      },
    ) => {
      if (args.role !== 'user' && args.role !== 'assistant') {
        throw new Error(`Invalid chat role: ${String(args.role)}`)
      }
      if (typeof args.text !== 'string' || args.text.length > 200_000) {
        throw new Error('Invalid chat text: must be a string up to 200000 chars')
      }
      if (args.tools && !Array.isArray(args.tools)) throw new Error('Invalid chat tools')
      if (args.attachments && !Array.isArray(args.attachments)) {
        throw new Error('Invalid chat attachments')
      }
      const store = getProjectStore()
      const msg: Parameters<ProjectStore['appendChatMessage']>[2] = {
        role: args.role,
        text: args.text,
      }
      if (args.tools) msg.tools = args.tools
      if (args.attachments) msg.attachments = args.attachments
      if (args.scope) msg.scope = args.scope

      store.appendChatMessage(args.projectId, args.chatId, msg)
    },
  )

  /** Read history */
  ipcMain.handle(
    'project:loadChat',
    (
      _event,
      args: {
        projectId: string
        chatId: string
        limit?: number
      },
    ) => {
      const store = getProjectStore()
      return store.loadChat(args.projectId, args.chatId, args.limit ?? 200)
    },
  )

  /** rebind chat (called after a file first hits disk): newFilePath/sessionId take priority; the main process computes chatId and records fileMap */
  ipcMain.handle(
    'project:rebindChat',
    (
      event,
      args: {
        projectId: string
        tempChatId: string
        newChatId?: string
        newFilePath?: string
        sessionId?: string
      },
    ) => {
      const store = getProjectStore()
      let path = args.newFilePath ?? null
      if (!path && args.sessionId && sessionPathResolver) {
        path = sessionPathResolver(event.sender.id, args.sessionId)
      }
      if (path) {
        return store.rebindChatToFile(args.projectId, args.tempChatId, path)
      }
      if (args.newChatId) store.rebindChat(args.projectId, args.tempChatId, args.newChatId)
      return { projectId: args.projectId, chatId: args.newChatId ?? args.tempChatId }
    },
  )

  /** start a new chat session for a file (older sessions stay in history) */
  ipcMain.handle(
    'project:beginNewChatSession',
    (_event, args: { filePath: string }) => {
      if (typeof args?.filePath !== 'string' || !args.filePath) {
        throw new Error('Invalid filePath: must be a non-empty string')
      }
      return getProjectStore().beginNewChatSession(args.filePath)
    },
  )

  /** global chat history, newest first */
  ipcMain.handle(
    'project:listChatSessions',
    (
      _event,
      args: { projectId?: string; query?: string; limit?: number },
    ) => {
      if (args && typeof args !== 'object') throw new Error('Invalid args')
      if (args?.projectId !== undefined && typeof args.projectId !== 'string') {
        throw new Error('Invalid projectId')
      }
      if (args?.query !== undefined && typeof args.query !== 'string') {
        throw new Error('Invalid query')
      }
      if (args?.limit !== undefined && typeof args.limit !== 'number') {
        throw new Error('Invalid limit')
      }
      return getProjectStore().listChatSessions(args ?? {})
    },
  )

  /** upsert the title/preview sidecar of a chat */
  ipcMain.handle(
    'project:setChatTitle',
    (
      _event,
      args: { projectId: string; chatId: string; title?: string; preview?: string; provider?: string },
    ) => {
      if (typeof args?.projectId !== 'string' || typeof args?.chatId !== 'string') {
        throw new Error('Invalid projectId/chatId')
      }
      for (const key of ['title', 'preview', 'provider'] as const) {
        if (args[key] !== undefined && typeof args[key] !== 'string') {
          throw new Error(`Invalid ${key}`)
        }
      }
      getProjectStore().setChatTitle(args.projectId, args.chatId, {
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.preview !== undefined ? { preview: args.preview } : {}),
        ...(args.provider !== undefined ? { provider: args.provider } : {}),
      })
    },
  )
}

/** A4 at 96dpi, as the HTML app exports */
const ALT_CHUNK_VIEWPORT = { width: 794, height: 1123, deviceScaleFactor: 2 }
const ALT_CHUNK_HTML_MAX_CHARS = 64 * 1024 * 1024
// An AI-generated page whose scripts never yield must not strand the hidden
// conversion window; the slides export path uses the same shape.
const ALT_CHUNK_TIMEOUT_MS = 120_000

/** an encrypted save leaves no plain file to serve lazy pictures from: the
 *  renderer takes the materialized document back and leaves lazy mode */
const reissuedDoc = (
  encrypted: boolean,
  hashes: Set<string>,
  plain: Buffer,
): { dataUrl?: string } => (encrypted && hashes.size > 0 ? { dataUrl: handOffBytes(plain) } : {})

/** document/attachment/window IPC (everything except the AI proxy above) */
export function registerDocsIpc(): void {
  registerZoteroIpc()
  void app.whenReady().then(registerLazyMediaProtocol)
  // Node fetch (undici) direct connections get reset under VPN/tun setups; retry over Chromium's stack
  setRescueFetch((url, init) => net.fetch(url, init))
  setAiUserAgent(`OfficeVega/${app.getVersion()}`)
  // keep TLS sockets warm between agent turns (default pool drops them after ~4s idle)
  warmAiConnections()

  // shared with the other editor modules — last (identical) registration wins
  ipcMain.removeHandler('app:get-language')
  ipcMain.handle('app:get-language', () => getUiLang())
  ipcMain.handle('docs:confirm-document-replace', (event) =>
    requestDocsClose(event.sender, dialogParent(event)),
  )
  ipcMain.handle('docs:system-locale', () => app.getSystemLocale())

  configureMetricsCache(userDataPath('font-metrics'))
  ipcMain.handle('docs:font-metrics', (_event, family: string) =>
    typeof family === 'string' ? familyVerticalMetrics(family) : null,
  )

  ipcMain.handle('docs:open', async (event) => {
    const result = await openDialog(event, {
      title: tm('dlgOpenDoc'),
      filters: [{ name: tm('filterWord'), extensions: ['docx'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return loadDocx(result.filePaths[0], event.sender.id)
  })

  ipcMain.handle('docs:open-path', (event, filePath: string) => loadDocx(filePath, event.sender.id))

  // w:altChunk HTML: the same html2docx chain as the HTML app's export, in a
  // hidden window; the renderer parses the result and shows its blocks
  ipcMain.handle('docs:altchunk-html-to-docx', async (_event, html: unknown) => {
    if (typeof html !== 'string' || !html.trim() || html.length > ALT_CHUNK_HTML_MAX_CHARS) {
      return null
    }
    const workDir = await mkdtemp(join(tmpdir(), 'officevega-altchunk-'))
    let driver: ElectronBrowserDriver | null = null
    try {
      const htmlPath = join(workDir, 'chunk.html')
      // the BOM outranks a stale <meta charset> left in the decoded markup
      await writeFile(htmlPath, `\ufeff${html}`, 'utf8')
      driver = await ElectronBrowserDriver.create(ALT_CHUNK_VIEWPORT)
      // The markup is an unsanitised AI artifact: a script that never yields
      // would otherwise keep executeJavaScript pending forever, and the
      // finally below would never run (the hidden window and workDir leak for
      // good). Race a watchdog and destroy the window on timeout, matching
      // the slides export guard.
      const conversion = convertHtmlToDocx({ url: pathToFileURL(htmlPath).href }, driver, {
        naturalTableWidth: true,
      }).then(({ docx }) => docx)
      let watchdog: ReturnType<typeof setTimeout> | undefined
      const docx = await Promise.race([
        conversion,
        new Promise<null>((resolve) => {
          watchdog = setTimeout(() => {
            if (driver && !driver.isWindowDestroyed()) driver.destroyNow()
            driver = null
            console.warn('[docs] altChunk conversion timed out; window destroyed')
            resolve(null)
          }, ALT_CHUNK_TIMEOUT_MS)
        }),
      ]).finally(() => clearTimeout(watchdog))
      return docx
    } catch (err) {
      console.warn('[docs] altChunk conversion failed:', err)
      return null
    } finally {
      await driver?.close()
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  // Review > Protect > Encrypt with Password: set/clear the open password.
  // Takes effect on the next save (docs:save / save-as / save-new all consult the store).
  ipcMain.handle(
    'docs:set-password',
    (event, filePath: string | null, password: string | null): { ok: boolean } => {
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      if (filePath !== null && typeof filePath !== 'string') return { ok: false }
      if (password !== null && (typeof password !== 'string' || password.length === 0)) {
        return { ok: false }
      }
      // only the document this renderer legitimately has open (same grant as saving)
      if (filePath && !canDocWrite(event.sender.id, filePath)) return { ok: false }
      setDocPassword(event.sender.id, filePath, password)
      return { ok: true }
    },
  )

  ipcMain.handle('docs:password-intent-revision', (event): number => {
    if (tornDownWcIds.has(event.sender.id)) return -1
    return currentDocPasswordIntentRevision()
  })

  ipcMain.handle(
    'docs:discard-password-intents',
    (event, throughRevision: unknown): { ok: boolean } => {
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      if (
        typeof throughRevision !== 'number' ||
        !Number.isSafeInteger(throughRevision) ||
        throughRevision < 0
      ) {
        return { ok: false }
      }
      discardDocPasswordIntents(event.sender.id, throughRevision)
      return { ok: true }
    },
  )

  // decrypt-and-open a password-protected docx; wrong-password keeps the renderer's prompt open
  ipcMain.handle(
    'docs:open-decrypt',
    async (event, filePath: string, password: string): Promise<DecryptOpenResult> => {
      if (typeof filePath !== 'string' || typeof password !== 'string' || password.length === 0) {
        return { ok: false, reason: 'error', error: 'invalid arguments' }
      }
      try {
        const result = await loadDocx(filePath, event.sender.id, password)
        if (!result) return { ok: false, reason: 'error', error: 'file not found' }
        // the file was swapped for a plain docx between prompt and submit — still an open
        if ('needsPassword' in result) return { ok: false, reason: 'error', error: 'not encrypted' }
        return { ok: true, result }
      } catch (err) {
        if (err instanceof DocxDecryptError) {
          return { ok: false, reason: err.reason, error: err.message }
        }
        return { ok: false, reason: 'error', error: String(err) }
      }
    },
  )

  ipcMain.handle('docs:consume-pending-open', (event) => {
    rendererReady = true
    // a tab spawned via New Tab loads the document queued for it specifically
    const queued = pendingWindowOpens.get(event.sender.id)
    if (queued) {
      pendingWindowOpens.delete(event.sender.id)
      return loadDocx(queued, event.sender.id)
    }
    const filePath = pendingOpenPath
    pendingOpenPath = null
    return filePath ? loadDocx(filePath, event.sender.id) : null
  })

  /** returns true when this tab was opened via "New Document" and should start blank */
  ipcMain.handle('docs:consume-new-blank', (event) => {
    rendererReady = true
    if (pendingNewBlankIds.has(event.sender.id)) {
      pendingNewBlankIds.delete(event.sender.id)
      return true
    }
    return false
  })

  /** one-shot AI content queued by create_document for this tab; null when none */
  ipcMain.handle('docs:consume-ai-doc-content', (event): AiDocContent | null => {
    const content = pendingAiDocContents.get(event.sender.id) ?? null
    pendingAiDocContents.delete(event.sender.id)
    return content
  })

  // ---- headless export mode (--headless-export) ----

  ipcMain.handle('docs:consume-headless-export', (event): HeadlessExportTarget | null => {
    const target = headlessExportTargets.get(event.sender.id) ?? null
    headlessExportTargets.delete(event.sender.id)
    return target
  })

  ipcMain.on('docs:headless-export-done', (event, result: unknown) => {
    const settle = headlessExportWaiters.get(event.sender.id)
    if (!settle) return
    headlessExportWaiters.delete(event.sender.id)
    const state = result as { ok?: unknown; error?: unknown } | null
    settle({
      ok: state?.ok === true,
      ...(typeof state?.error === 'string' ? { error: state.error } : {}),
    })
  })

  ipcMain.handle(
    'docs:save',
    async (event, filePath: string, data: ArrayBuffer, auto?: boolean) => {
      try {
        // only paths this renderer opened or chose via save-as may be overwritten
        if (typeof filePath !== 'string' || !canDocWrite(event.sender.id, filePath)) {
          return { ok: false, error: 'save target is not an opened document' }
        }
        if (await diskChangedExternally(event.sender.id, filePath)) {
          // autosave must never clobber another program's edits silently; the
          // renderer stays dirty and the next manual save raises the dialog
          if (auto === true) return { ok: false, reason: 'external-modified' }
          const options = {
            type: 'warning' as const,
            message: tm('extModifiedMsg'),
            detail: tm('extModifiedDetail'),
            buttons: [tm('btnOverwrite'), tm('btnCancel')],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
          }
          const parent = dialogParent(event)
          const { response } =
            parent && !parent.isDestroyed()
              ? await dialog.showMessageBox(parent, options)
              : await dialog.showMessageBox(options)
          if (response !== 0) return { ok: false, reason: 'external-modified' }
        }
        // The tab may have been closed while the external-change check or the
        // overwrite prompt was pending: a Don't Save close revoked this tab's
        // grants, and landing the write now would persist discarded edits.
        if (tornDownWcIds.has(event.sender.id) || !canDocWrite(event.sender.id, filePath)) {
          return { ok: false, error: 'save target is not an opened document' }
        }
        // Snapshot desired state: the disk password remains unchanged until the
        // atomic write succeeds, and a newer ribbon intent survives this save.
        const passwordState = snapshotDocPassword(event.sender.id, filePath)
        const { bytes: plain, hashes } = await materializeLazyDocx(Buffer.from(data))
        const bytes = passwordState.password ? encryptDocx(plain, passwordState.password) : plain
        await atomicWriteFile(filePath, bytes)
        // Teardown may have cleared all in-memory secrets while the atomic
        // write was pending. Never resurrect state for an orphaned renderer.
        if (tornDownWcIds.has(event.sender.id)) {
          return { ok: false, error: 'save target is not an opened document' }
        }
        await rememberDiskState(event.sender.id, filePath, sha256Hex(bytes))
        if (tornDownWcIds.has(event.sender.id)) {
          return { ok: false, error: 'save target is not an opened document' }
        }
        pointLazyMediaAt(
          hashes,
          filePath,
          event.sender.id,
          passwordState.password ? plain : undefined,
        )
        // Commit immediately after the final await: intents received during
        // post-write bookkeeping are included, with no later async race.
        const passwordIntentPending = commitDocPasswordSave(
          event.sender.id,
          passwordState,
          filePath,
        )
        clearRecoveryCopy(filePath)
        pushRecent(filePath)
        // The atomic write replaced the file object — refresh the chat binding's
        // incarnation signature so the next open keeps its history (#1021).
        getProjectStore().noteFileWritten(filePath)
        return {
          ok: true,
          passwordIntentPending,
          ...reissuedDoc(!!passwordState.password, hashes, plain),
        }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  // crash-recovery copy from a dirty renderer; best-effort, never surfaces
  ipcMain.handle('docs:write-recovery', async (event, filePath: string, data: ArrayBuffer) => {
    try {
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      if (typeof filePath !== 'string' || !canDocWrite(event.sender.id, filePath))
        return { ok: false }
      // snapshot before any await: a save or discard that clears the recovery
      // copy while this write is in flight bumps the epoch and invalidates it
      const epoch = recoveryClearEpochs.get(filePath) ?? 0
      await mkdir(recoveryDir(), { recursive: true })
      // Recovery follows the current disk state, never the desired next-save
      // password. Missing state for an encrypted disk file skips the tick so
      // plaintext can never be written as its recovery copy.
      const bytes = prepareRecoveryDocx(event.sender.id, filePath, Buffer.from(data))
      if (!bytes) return { ok: false }
      await atomicWriteFile(recoveryPathFor(filePath), bytes)
      // The tab may have been closed ("Don't Save" clears the copy, teardown
      // revokes access) or the document saved (docs:save clears the copy) while
      // the write was in flight. A write that lost either race would offer
      // discarded or already-saved content as recovery on the next open — undo it.
      if (
        tornDownWcIds.has(event.sender.id) ||
        !canDocWrite(event.sender.id, filePath) ||
        (recoveryClearEpochs.get(filePath) ?? 0) !== epoch
      ) {
        clearRecoveryCopy(filePath)
        return { ok: false }
      }
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  // Blink only respells an editable as a consequence of real (trusted) typing
  // of a word-committing character inside it: attribute flips, focus cycles,
  // script selection moves, execCommand edits, fresh DOM nodes, synthetic
  // clicks/arrow keys — and even a typed zero-width space — all leave existing
  // typos unmarked (each verified pixel-by-pixel).
  // Type one trusted space; the RENDERER removes it again by script (a
  // trusted Backspace would work too, but its deletion re-suppresses the
  // caret paragraph and that line stays unmarked) with ProseMirror's DOM
  // observer paused, so the round trip never becomes a transaction.
  // spell-diag trace (intermittent squiggle loss, platform-bound
  // and unreproducible on demand) — a tiny always-on log support can ask for.
  // Size-capped: over 256KB the file restarts from its last half.
  ipcMain.on('docs:spell-diag', (_event, line: unknown) => {
    if (typeof line !== 'string' || line.length > 500) return
    try {
      const path = userDataPath('spell-diag.log')
      if (existsSync(path) && statSync(path).size > 256 * 1024) {
        const tail = readFileSync(path, 'utf-8').slice(-128 * 1024)
        writeFileSync(path, tail.slice(tail.indexOf('\n') + 1))
      }
      appendFileSync(path, `${new Date().toISOString()} ${line}\n`)
    } catch {
      // diagnostics must never break the app
    }
  })

  // The document body draws its own React context menu, but Chromium's
  // misspelling + suggestions for the clicked word only surface in the main
  // process `context-menu` event. The renderer claims each body right-click
  // synchronously from its DOM handler, i.e. before Blink requests the menu,
  // so claims and events arrive in the same order: a claimed click gets its
  // data forwarded and no native menu, anything else (header/footer surfaces,
  // inputs) pops the native menu as before.
  const ctxMenuClaims = new Map<number, ClickClaims>()
  ipcMain.on('docs:context-menu-claim', (event, seq: unknown) => {
    event.returnValue = true
    if (typeof seq !== 'number') return
    let claims = ctxMenuClaims.get(event.sender.id)
    if (!claims) {
      claims = new ClickClaims()
      ctxMenuClaims.set(event.sender.id, claims)
    }
    claims.claim(seq, Date.now())
  })
  ipcMain.on('docs:context-menu-arm', (event) => {
    const wc = event.sender
    setContextMenuInterceptor(app, wc, (contents, params) => {
      if (contents.isDestroyed() || tornDownWcIds.has(contents.id)) return Promise.resolve(false)
      const seq = ctxMenuClaims.get(contents.id)?.take(Date.now()) ?? null
      if (seq !== null) {
        const request: ContextMenuRequest = {
          seq,
          misspelledWord: params.misspelledWord,
          suggestions: params.dictionarySuggestions,
        }
        contents.send('docs:context-menu', request)
      }
      return Promise.resolve(seq !== null)
    })
    wc.once('destroyed', () => {
      setContextMenuInterceptor(app, wc, null)
      ctxMenuClaims.delete(wc.id)
    })
  })
  void app.whenReady().then(() => {
    const orphans = readJson<string[]>(SPELL_IGNORED_PATH(), [])
    for (const w of orphans) session.defaultSession.removeWordFromSpellCheckerDictionary(w)
    if (orphans.length) journalIgnoredWords()
  })
  ipcMain.handle('docs:spell-ignore-word', (event, word: unknown) => {
    if (typeof word !== 'string' || !word.trim()) return false
    const w = word.trim()
    let holders = spellIgnored.get(w)
    if (!holders) {
      holders = new Set()
      spellIgnored.set(w, holders)
      journalIgnoredWords()
    }
    holders.add(event.sender.id)
    return event.sender.session.addWordToSpellCheckerDictionary(w)
  })
  ipcMain.handle('docs:spell-add-word', (event, word: unknown) => {
    if (typeof word !== 'string' || !word.trim()) return false
    const w = word.trim()
    if (spellIgnored.delete(w)) journalIgnoredWords()
    return event.sender.session.addWordToSpellCheckerDictionary(w)
  })
  ipcMain.handle('docs:spell-replace', (event, word: unknown) => {
    if (typeof word === 'string' && word) event.sender.replaceMisspelling(word)
  })
  ipcMain.handle('docs:spell-languages', (event): SpellLanguages => {
    const session = event.sender.session
    return {
      active: session.getSpellCheckerLanguages(),
      available: session.availableSpellCheckerLanguages,
    }
  })
  ipcMain.handle('docs:spell-set-languages', (event, langs: unknown): SpellLanguages => {
    const session = event.sender.session
    const available = new Set(session.availableSpellCheckerLanguages)
    const next = Array.isArray(langs)
      ? langs.filter((l): l is string => typeof l === 'string' && available.has(l))
      : []
    if (next.length) session.setSpellCheckerLanguages(next)
    return { active: session.getSpellCheckerLanguages(), available: [...available] }
  })

  ipcMain.handle('docs:respell-kick', async (event) => {
    const wc = event.sender
    if (tornDownWcIds.has(wc.id) || wc.isDestroyed()) return
    wc.focus()
    // Blink only respells after a user activation, and only a keydown grants one
    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Space' })
    wc.sendInputEvent({ type: 'char', keyCode: ' ' })
    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Space' })
    // resolve only after the input pipeline has delivered the keystroke, so
    // the caller can scrub the space it produced
    await new Promise((r) => setTimeout(r, 120))
  })

  ipcMain.handle(
    'docs:save-as',
    async (event, defaultName: string, data: ArrayBuffer, sourcePath?: string | null) => {
      // an orphaned (closed-tab) renderer must not open dialogs or land new files
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      const result = await saveDialog(event, {
        title: tm('dlgSaveAs'),
        defaultPath: saveAsSuggestion(
          typeof sourcePath === 'string' ? sourcePath : null,
          defaultName,
        ),
        filters: [{ name: tm('filterWord'), extensions: ['docx'] }],
      })
      if (result.canceled || !result.filePath) return { ok: false }
      // the tab may have been closed while the dialog was open; checked before the
      // write because Save As may overwrite an existing file (no safe rollback)
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      try {
        const passwordState = snapshotDocPassword(
          event.sender.id,
          typeof sourcePath === 'string' && sourcePath ? sourcePath : null,
        )
        const { bytes: plain, hashes } = await materializeLazyDocx(Buffer.from(data))
        const bytes = passwordState.password ? encryptDocx(plain, passwordState.password) : plain
        await atomicWriteFile(result.filePath, bytes)
        if (tornDownWcIds.has(event.sender.id)) return { ok: false }
        allowDocWrite(event.sender.id, result.filePath)
        rememberOpenDoc(event.sender.id, result.filePath)
        await rememberDiskState(event.sender.id, result.filePath, sha256Hex(bytes))
        pointLazyMediaAt(
          hashes,
          result.filePath,
          event.sender.id,
          passwordState.password ? plain : undefined,
        )
        if (tornDownWcIds.has(event.sender.id)) return { ok: false }
        const passwordIntentPending = commitDocPasswordSave(
          event.sender.id,
          passwordState,
          result.filePath,
        )
        pushRecent(result.filePath)
        // the renderer has no path yet to match a rename notification against,
        // so the reply must carry the path it may save to next
        const savedPath = notifyFileSaved(event.sender, result.filePath)
        return {
          ok: true,
          path: savedPath,
          passwordIntentPending,
          ...reissuedDoc(!!passwordState.password, hashes, plain),
        }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  ipcMain.handle('docs:save-new', async (event, defaultName: string, data: ArrayBuffer) => {
    try {
      // a discarded draft in an orphaned renderer must not silently persist
      // itself to the default folder after the user chose Don't Save
      if (tornDownWcIds.has(event.sender.id)) return { ok: false }
      const filePath = uniquePathIn(defaultSaveDir(), defaultName)
      const passwordState = snapshotDocPassword(event.sender.id, null)
      const { bytes: plain, hashes } = await materializeLazyDocx(Buffer.from(data))
      const bytes = passwordState.password ? encryptDocx(plain, passwordState.password) : plain
      await atomicWriteFile(filePath, bytes)
      // teardown may have happened while the write was in flight — the path is
      // freshly created, so rolling it back is safe (mirrors docs:write-recovery)
      if (tornDownWcIds.has(event.sender.id)) {
        await unlink(filePath).catch(() => {})
        return { ok: false }
      }
      allowDocWrite(event.sender.id, filePath)
      rememberOpenDoc(event.sender.id, filePath)
      await rememberDiskState(event.sender.id, filePath, sha256Hex(bytes))
      pointLazyMediaAt(
        hashes,
        filePath,
        event.sender.id,
        passwordState.password ? plain : undefined,
      )
      if (tornDownWcIds.has(event.sender.id)) {
        await unlink(filePath).catch(() => {})
        return { ok: false }
      }
      const passwordIntentPending = commitDocPasswordSave(event.sender.id, passwordState, filePath)
      pushRecent(filePath)
      const savedPath = notifyFileSaved(event.sender, filePath)
      return {
        ok: true,
        path: savedPath,
        passwordIntentPending,
        ...reissuedDoc(!!passwordState.password, hashes, plain),
      }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle(
    'docs:create-document',
    (_event, request: CreateDocumentRequest): Promise<CreateDocumentResult> =>
      createAiDocument(request),
  )

  // MCP-driven output: write the live document to an explicit absolute path with
  // no dialog. Mirrors docs:save-new's bookkeeping (write allowlist, disk state,
  // recents, tab-title sync) but targets a caller-chosen path and refuses to
  // clobber an existing file unless the caller asked for overwrite.
  ipcMain.handle(
    'docs:save-to',
    async (event, filePath: string, data: ArrayBuffer, overwrite: boolean) => {
      try {
        if (tornDownWcIds.has(event.sender.id)) return { ok: false }
        if (typeof filePath !== 'string' || !isAbsolute(filePath)) {
          return { ok: false, error: 'path must be absolute' }
        }
        if (extname(filePath).toLowerCase() !== '.docx') {
          return { ok: false, error: 'path must point to a .docx file' }
        }
        // only a target the MCP layer resolved for this tab may be written
        if (!canDocWrite(event.sender.id, filePath)) {
          return { ok: false, error: 'save target was not authorized' }
        }
        const existed = existsSync(filePath)
        if (!overwrite && existed) {
          return {
            ok: false,
            error: `file already exists: ${filePath} (pass overwrite:true to replace it)`,
          }
        }
        await mkdir(dirname(filePath), { recursive: true })
        const passwordState = snapshotDocPassword(event.sender.id, null)
        const { bytes: plain, hashes } = await materializeLazyDocx(Buffer.from(data))
        const bytes = passwordState.password ? encryptDocx(plain, passwordState.password) : plain
        await atomicWriteFile(filePath, bytes)
        // teardown may have happened while the write was in flight — only a file
        // this handler created is safe to roll back; an overwritten one stays
        const rollback = async (): Promise<{ ok: false }> => {
          if (!existed) await unlink(filePath).catch(() => {})
          return { ok: false }
        }
        if (tornDownWcIds.has(event.sender.id)) return rollback()
        await rememberDiskState(event.sender.id, filePath, sha256Hex(bytes))
        pointLazyMediaAt(
          hashes,
          filePath,
          event.sender.id,
          passwordState.password ? plain : undefined,
        )
        if (tornDownWcIds.has(event.sender.id)) return rollback()
        const passwordIntentPending = commitDocPasswordSave(
          event.sender.id,
          passwordState,
          filePath,
        )
        pushRecent(filePath)
        rememberOpenDoc(event.sender.id, filePath)
        notifyFileSaved(event.sender, filePath)
        return {
          ok: true,
          path: filePath,
          passwordIntentPending,
          ...reissuedDoc(!!passwordState.password, hashes, plain),
        }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  ipcMain.handle('docs:recent', () =>
    readJson<string[]>(RECENT_PATH(), []).filter((p) => existsSync(p)),
  )

  ipcMain.handle('docs:pick-image', async (event) => {
    const result = await openDialog(event, {
      title: tm('dlgInsertImage'),
      filters: [{ name: tm('filterImages'), extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    const mime = IMAGE_MIME[ext]
    if (!mime) return null
    return {
      base64: readFileSync(filePath).toString('base64'),
      mime,
      name: basename(filePath),
    }
  })

  ipcMain.handle('files:pick', async (event): Promise<AttachmentAddResult | null> => {
    const result = await openDialog(event, {
      title: tm('dlgAddAttachment'),
      filters: [
        { name: tm('filterSupported'), extensions: [...ATTACHMENT_EXTS] },
        { name: tm('filterAll'), extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return collectAttachments(result.filePaths)
  })

  ipcMain.handle('files:add', (_event, paths: string[]) => collectAttachments(paths))

  ipcMain.handle(
    'files:read',
    async (
      _event,
      filePath: string,
      offset: number,
      maxChars: number,
    ): Promise<AttachmentReadResult> => {
      const name = basename(filePath)
      const ext = name.split('.').pop()?.toLowerCase() ?? ''
      if (!ATTACHMENT_EXTS.has(ext)) return { ok: false, error: tm('errUnsupportedExt', { ext }) }
      if (ATTACHMENT_IMAGE_EXTS.has(ext)) {
        return { ok: false, error: tm('errImageNoText') }
      }
      try {
        const text = await extractAttachmentText(filePath)
        const start = Math.max(0, Math.floor(offset) || 0)
        const size = Math.min(Math.max(1, Math.floor(maxChars) || 1), 48_000)
        return {
          ok: true,
          name,
          totalChars: text.length,
          offset: start,
          text: text.slice(start, start + size),
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  // image attachments read raw bytes → base64; AiPanel puts them into the user message's images for multimodal
  ipcMain.handle('files:read-image', (_event, filePath: string): AttachmentImageResult => {
    const name = basename(filePath)
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const mime = ATTACHMENT_IMAGE_MIME[ext]
    if (!mime) return { ok: false, error: `${name}: ${tm('errNotImage')}` }
    try {
      const stat = statSync(filePath)
      if (stat.size > ATTACHMENT_IMAGE_MAX_BYTES) {
        return { ok: false, error: `${name}: ${tm('errImageTooLarge')}` }
      }
      return { ok: true, base64: readFileSync(filePath).toString('base64'), mime }
    } catch {
      return { ok: false, error: `${name}: ${tm('errUnreadable')}` }
    }
  })

  // clipboard-pasted images (screenshots and other bitmaps with no local path): saved to a temp file then use the regular attachment path
  ipcMain.handle(
    'files:add-pasted-image',
    (_event, data: unknown, ext: unknown): AttachmentAddResult => {
      const filePath = savePastedImage(data, ext)
      return filePath
        ? collectAttachments([filePath])
        : { accepted: [], rejected: [tm('errNotImage')] }
    },
  )

  // r136: copying an embedded picture must yield a real bitmap for external
  // apps (Gmail pasted blank) plus plain <img> html for cross-document paste
  // (the protected wrapper round-tripped as a "protected content" shell).
  ipcMain.handle(
    'docs:copy-image-to-clipboard',
    async (_event, dataUrl: unknown, meta: unknown): Promise<boolean> => {
      // Renderer-supplied bitmap: validate before base64 decode + nativeImage
      // (a huge data URL would OOM the main process). Non-data URLs are
      // lazy-media ids resolved below.
      if (!validCopyImageDataUrl(dataUrl)) return false
      let bytes: Buffer
      let htmlSrc = dataUrl
      if (dataUrl.startsWith('data:image/')) {
        bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
      } else {
        const media = await readLazyMedia(dataUrl)
        if (!media) return false
        bytes = media.body
        // another document cannot resolve this document's lazy URL; inline the bytes
        htmlSrc = `data:${media.mime};base64,${bytes.toString('base64')}`
      }
      // createFromBuffer, not createFromDataURL — the latter returns an empty
      // image for valid PNGs in this Electron
      const image = nativeImage.createFromBuffer(bytes)
      if (image.isEmpty()) return false
      // the html flavor carries the DISPLAY size + layout meta so an in-app
      // paste keeps size/align/wrap instead of falling back to bitmap pixels
      let width = image.getSize().width
      let height = image.getSize().height
      let metaAttr = ''
      if (typeof meta === 'string' && meta.length <= 2048) {
        try {
          const parsed = copyImageDisplaySize(meta)
          if (parsed.width !== undefined) width = parsed.width
          if (parsed.height !== undefined) height = parsed.height
          const escaped = meta.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
          metaAttr = ` data-image-meta="${escaped}"`
        } catch {
          /* malformed payload: plain img */
        }
      }
      clipboard.write({
        image,
        html: `<img src="${htmlSrc}" width="${width}" height="${height}"${metaAttr}>`,
      })
      return true
    },
  )

  // renderer print scale (inverse of the preview's print zoom, see print-zoom.ts)
  // Infinity passes a `> 0` check, so require finiteness before handing it to Chromium.
  const pdfScale = (scale?: number) => printScaleOption(scale)
  const printScale = (scale?: number) =>
    typeof scale === 'number' && Number.isFinite(scale) && scale > 0 && scale !== 1
      ? { scaleFactor: Math.round(scale * 100) }
      : {}

  ipcMain.handle('docs:print', async (event, scale?: number) => {
    // print the calling tab's own content; zero margins — the docx page padding provides them.
    // Resolves when the system dialog is dismissed; the print dialog stays open on cancel
    // (ok=false without error) and surfaces real failures.
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      event.sender.print(
        { margins: { marginType: 'none' }, ...printScale(scale) },
        (success, failureReason) => {
          resolve({
            ok: success,
            ...(failureReason && !/cancel/i.test(failureReason) ? { error: failureReason } : {}),
          })
        },
      )
    })
  })

  ipcMain.handle(
    'docs:export-pdf',
    async (
      event,
      defaultName: string,
      pageWidthTwips: number,
      pageHeightTwips: number,
      outPath?: string,
      scale?: number,
    ) => {
      // Renderer-supplied page geometry reaches Chromium printToPDF verbatim:
      // reject non-finite/out-of-range sizes (0.1in..50in) and scales (0.1..5),
      // same guard as docs:print-pdf-buffer (a malformed w:pgSz in a doc would
      // otherwise hand Chromium a page thousands of inches wide).
      if (!validPrintGeometry(pageWidthTwips, pageHeightTwips, scale)) {
        return { ok: false, error: 'invalid page size or scale' }
      }
      // renderer-supplied outPath is only honored when a save dialog authorized it before
      let filePath = outPath ?? null
      if (filePath && !canPdfWrite(event.sender.id, filePath)) {
        return { ok: false, error: 'export target is not an authorized path' }
      }
      if (!filePath) {
        const result = await saveDialog(event, {
          title: tm('dlgExportPdf'),
          defaultPath: defaultName.replace(/\.docx$/i, '') + '.pdf',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        })
        if (result.canceled || !result.filePath) return { ok: false }
        filePath = result.filePath
        allowPdfWrite(event.sender.id, filePath)
      }
      try {
        const data = await event.sender.printToPDF({
          printBackground: true,
          // custom pageSize is in inches; the docx page padding provides the margins
          pageSize: {
            width: pageWidthTwips / TWIPS_PER_INCH,
            height: pageHeightTwips / TWIPS_PER_INCH,
          },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          ...pdfScale(scale),
        })
        await atomicWriteFile(filePath, data)
        if (!isImageExportTemp(event.sender.id, filePath)) openGeneratedFile(filePath)
        return { ok: true, path: filePath }
      } catch (err) {
        // path is already authorized, so the renderer can retry chunked to the same target
        return { ok: false, error: String(err), path: filePath }
      }
    },
  )

  ipcMain.handle('docs:save-image-as', async (event, src: unknown) => {
    if (tornDownWcIds.has(event.sender.id) || typeof src !== 'string') return { ok: false }
    return saveImageFromUrl(dialogParent(event), src, {
      title: tm('dlgSaveAs'),
      fallbackDir: defaultSaveDir(),
    })
  })

  ipcMain.handle(
    'docs:export-ai-chat',
    async (event, markdown: unknown, name: unknown, title: unknown) => {
      if (tornDownWcIds.has(event.sender.id) || typeof markdown !== 'string' || !markdown)
        return { ok: false }
      const defaultName = typeof name === 'string' && name ? name : 'ai-chat.md'
      const dialogTitle = typeof title === 'string' && title ? title : tm('dlgSaveAs')
      return saveTextFileWithDialog(dialogParent(event), {
        title: dialogTitle,
        defaultName,
        ext: 'md',
        filterName: 'Markdown',
        content: markdown,
        fallbackDir: defaultSaveDir(),
      })
    },
  )

  ipcMain.handle('docs:pick-export-images-target', async (event) => {
    let dir = testExportDir
    if (!dir) {
      const r = await openDialog(event, {
        title: tm('dlgPickExportDir'),
        properties: ['openDirectory', 'createDirectory'],
      })
      dir = r.canceled ? null : (r.filePaths[0] ?? null)
    }
    if (!dir) return null
    const wcId = event.sender.id
    const pdfPath = join(tmpdir(), `officevega-docs-images-${randomUUID()}.pdf`)
    allowPdfWrite(wcId, pdfPath)
    imageExportTemps.set(wcId, (imageExportTemps.get(wcId) ?? new Set()).add(pdfPath))
    imageExportDirs.set(wcId, (imageExportDirs.get(wcId) ?? new Set()).add(dir))
    return { dir, pdfPath }
  })

  ipcMain.handle('docs:take-export-pdf', async (event, pdfPath: string) => {
    const temps = imageExportTemps.get(event.sender.id)
    if (typeof pdfPath !== 'string' || !temps?.has(pdfPath)) {
      return { ok: false, error: 'not an image-export temp file' }
    }
    temps.delete(pdfPath)
    try {
      const data = await readFile(pdfPath)
      return { ok: true, base64: data.toString('base64') }
    } catch (err) {
      return { ok: false, error: String(err) }
    } finally {
      await rm(pdfPath, { force: true })
    }
  })

  ipcMain.handle(
    'docs:write-export-image',
    async (event, dir: string, fileName: string, pngBase64: string) => {
      if (typeof dir !== 'string' || !imageExportDirs.get(event.sender.id)?.has(dir)) {
        return { ok: false, error: 'export target is not an authorized folder' }
      }
      if (
        typeof fileName !== 'string' ||
        fileName !== basename(fileName) ||
        !/^[^/\\]+\.png$/.test(fileName)
      ) {
        return { ok: false, error: 'invalid image file name' }
      }
      try {
        const filePath = join(dir, fileName)
        await atomicWriteFile(filePath, Buffer.from(String(pngBase64), 'base64'))
        return { ok: true, path: filePath }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  ipcMain.handle(
    'docs:export-html',
    async (event, defaultName: string, html: string, outPath?: string) => {
      if (typeof html !== 'string' || !html) return { ok: false, error: 'empty document' }
      let filePath = outPath ?? null
      if (filePath && !canPdfWrite(event.sender.id, filePath)) {
        return { ok: false, error: 'export target is not an authorized path' }
      }
      if (!filePath) {
        const result = await saveDialog(event, {
          title: tm('dlgExportHtml'),
          defaultPath: defaultName.replace(/\.docx$/i, '') + '.html',
          filters: [{ name: 'HTML', extensions: ['html'] }],
        })
        if (result.canceled || !result.filePath) return { ok: false }
        filePath = result.filePath
        allowPdfWrite(event.sender.id, filePath)
      }
      try {
        await atomicWriteFile(
          filePath,
          Buffer.from(await inlineLazyMediaInHtml(html, readLazyMedia), 'utf8'),
        )
        openGeneratedFile(filePath)
        return { ok: true, path: filePath }
      } catch (err) {
        return { ok: false, error: String(err), path: filePath }
      }
    },
  )

  // mixed paper-size export: the renderer prints group by group per size (other pages hidden via CSS); this produces one group's bytes
  ipcMain.handle(
    'docs:print-pdf-buffer',
    async (event, pageWidthTwips: number, pageHeightTwips: number, scale?: number) => {
      // Renderer-supplied page geometry reaches Chromium printToPDF verbatim:
      // reject non-finite/out-of-range sizes (0.5in..50in) and scales (0.1..5).
      if (!validPrintGeometry(pageWidthTwips, pageHeightTwips, scale)) {
        return { ok: false, error: 'invalid page size or scale' }
      }
      try {
        const data = await event.sender.printToPDF({
          printBackground: true,
          pageSize: {
            width: pageWidthTwips / TWIPS_PER_INCH,
            height: pageHeightTwips / TWIPS_PER_INCH,
          },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          ...pdfScale(scale),
        })
        return { ok: true, base64: data.toString('base64') }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  // merge grouped PDF fragments into one file in page order (pdf-lib)
  ipcMain.handle(
    'docs:save-merged-pdf',
    async (
      event,
      defaultName: string,
      base64Parts: string[],
      outPath?: string,
      linkPlan?: PdfLinkPlan,
    ) => {
      let filePath = outPath ?? null
      if (filePath && !canPdfWrite(event.sender.id, filePath)) {
        return { ok: false, error: 'export target is not an authorized path' }
      }
      if (!filePath) {
        const result = await saveDialog(event, {
          title: tm('dlgExportPdf'),
          defaultPath: defaultName.replace(/\.docx$/i, '') + '.pdf',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        })
        if (result.canceled || !result.filePath) return { ok: false }
        filePath = result.filePath
        allowPdfWrite(event.sender.id, filePath)
      }
      try {
        const { PDFDocument } = await import('pdf-lib')
        const merged = await PDFDocument.create()
        for (const b64 of base64Parts) {
          const part = await PDFDocument.load(Buffer.from(b64, 'base64'))
          const pages = await merged.copyPages(part, part.getPageIndices())
          for (const page of pages) merged.addPage(page)
        }
        if (linkPlan) {
          try {
            applyPdfLinkPlan(merged, linkPlan)
          } catch (err) {
            // links are best-effort: a malformed plan must not sink the export
            console.warn('pdf link annotations failed:', err)
          }
        }
        await atomicWriteFile(filePath, Buffer.from(await merged.save()))
        if (!isImageExportTemp(event.sender.id, filePath)) openGeneratedFile(filePath)
        return { ok: true, path: filePath }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
  )

  ipcMain.handle('win:new', (_event, openPath: string | null) => {
    // A pathless new tab/window starts as a blank document, not the start screen
    const path = openPath ?? undefined
    if (shellHooks) shellHooks.openTab(path, path ? undefined : { newBlank: true })
    else {
      const win = createDocsWindow(path)
      if (!path) markDocsNewBlank(win.webContents.id)
    }
  })

  ipcMain.handle('win:list', (): DocsTabInfo[] => {
    if (shellHooks) return shellHooks.listTabs()
    return BrowserWindow.getAllWindows().map((w) => ({
      id: String(w.id),
      title: w.getTitle(),
      focused: w.isFocused(),
    }))
  })

  ipcMain.handle('win:focus', (_event, id: string) => {
    if (shellHooks) {
      shellHooks.focusTab(id)
      return
    }
    const win = BrowserWindow.fromId(Number(id))
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })
}

/** hooks injected by the shell in tab mode; standalone mode leaves these unset
 * and falls back to real multi-BrowserWindow behavior. */
interface DocsShellHooks {
  openTab(openPath?: string, options?: { newBlank?: boolean }): void
  /** open a blank docs tab that consumes the queued AI content on boot (create_document) */
  openAiDocTab?(content: AiDocContent): void
  listTabs(): DocsTabInfo[]
  focusTab(id: string): void
  /** closes the calling tab instead of the whole shell window (Cmd+W / role:'close') */
  closeActiveTab(): void
  /** Shell router used to open exported PDFs in a new OfficeVega tab. */
  openGeneratedPath?(path: string): boolean
}
let shellHooks: DocsShellHooks | null = null
export function setDocsShellHooks(hooks: DocsShellHooks | null): void {
  shellHooks = hooks
}

/** After writing an exported/AI-generated file: open it in the right tab
 * (shell) or reveal it in the folder (standalone). Tab-opening failure must
 * not report the write itself as failed — the file is already persisted. */
function openGeneratedFile(path: string): void {
  // Headless export has no tab strip and no user: revealing the file in Finder
  // would be the only visible effect of a run that must stay silent.
  if (isHeadlessMode()) return
  try {
    if (shellHooks?.openGeneratedPath?.(path)) return
  } catch (err) {
    console.warn('[docs] Failed to open generated file:', err)
  }
  shell.showItemInFolder(path)
}

/** Pick a safe file-name stem for an AI-created document. */
export function sanitizeAiDocFileBase(title: string): string {
  // Control characters are intentionally rejected from generated file names.
  const cleaned = String(title ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 80)
    .trim()
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : 'Untitled'
}

/**
 * AI create_document: build a new standalone file in the default folder and
 * open it in a new tab. docx routes through a fresh blank docs tab that
 * inserts the queued content on boot and saves itself (the full-fidelity
 * HTML → docx conversion lives in the docs renderer); pdf and md are written
 * directly here. Also called by other apps' mains via shell-wired hooks.
 */
export async function createAiDocument(
  request: CreateDocumentRequest,
): Promise<CreateDocumentResult> {
  const type = request?.type
  const title = sanitizeAiDocFileBase(request?.title)
  const content = String(request?.content ?? '')
  if (!content.trim()) return { ok: false, error: 'content must not be empty' }
  try {
    if (type === 'docx') {
      const payload: AiDocContent = { title, html: content }
      if (shellHooks?.openAiDocTab) shellHooks.openAiDocTab(payload)
      else {
        const win = createDocsWindow(undefined)
        markDocsNewBlank(win.webContents.id)
        queueDocsAiContent(win.webContents.id, payload)
      }
      return { ok: true }
    }
    if (type === 'pdf') {
      const bytes = await printHtmlToPdf(
        buildPrintableHtml(title, content),
        () => {
          const w = new BrowserWindow({
            show: false,
            webPreferences: { sandbox: true, javascript: false },
          })
          // hidden print window: interface zoom must not leak into the layout (#1913)
          w.webContents.setZoomFactor(1)
          return w
        },
      )
      const filePath = uniquePathIn(defaultSaveDir(), `${title}.pdf`)
      await writeFile(filePath, bytes)
      openGeneratedFile(filePath)
      return { ok: true, path: filePath }
    }
    if (type === 'md' || type === 'html') {
      const filePath = uniquePathIn(defaultSaveDir(), `${title}.${type}`)
      await writeFile(filePath, content, 'utf8')
      openGeneratedFile(filePath)
      return { ok: true, path: filePath }
    }
    return { ok: false, error: `unsupported document type: ${String(type)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ---- application menu ----

function sendCommand(command: MenuCommand, payload?: string): void {
  activeDocsWebContents()?.send('menu:command', command, payload)
}

/**
 * Per-tab View-menu toggle state (AI Sidebar / Dark Mode), reported by each
 * renderer whenever it changes. The template can't hardcode `checked` — the
 * state lives in the renderer and differs per tab — so builds read the active
 * tab's last report, and reports from the active tab patch the built menu in
 * place (buildDocsMenu also re-runs on every tab focus switch).
 * Defaults mirror the renderer's initial state: sidebar shown, light canvas.
 */
const viewMenuStateByWebContents = new Map<number, { aiSidebar: boolean; darkCanvas: boolean }>()

function activeViewMenuState(): { aiSidebar: boolean; darkCanvas: boolean } {
  const id = activeDocsWebContents()?.id
  return (
    (id !== undefined ? viewMenuStateByWebContents.get(id) : undefined) ?? {
      aiSidebar: true,
      darkCanvas: false,
    }
  )
}

/** shell-injected items appended to the File menu (e.g. Back to Home); persists
 * across the internal rebuilds pushRecent() triggers */
let extraFileMenuItems: MenuItemConstructorOptions[] = []

export function setDocsExtraFileMenuItems(items: MenuItemConstructorOptions[]): void {
  extraFileMenuItems = items
}

/** shell-injected top-level items appended after Help (e.g. Settings…); same
 * rebuild persistence as extraFileMenuItems */
let extraAppMenuItems: MenuItemConstructorOptions[] = []

export function setDocsExtraAppMenuItems(items: MenuItemConstructorOptions[]): void {
  extraAppMenuItems = items
}

/** Shell-installed gate: inside the shell the docs menu may only take over the
 * application menu while a docs tab is active — internal rebuilds (pushRecent
 * after opening/saving any file) must not clobber another tab's menu.
 * The standalone docs app registers no gate and always installs. */
let docsMenuGate: (() => boolean) | null = null

export function setDocsMenuGate(gate: () => boolean): void {
  docsMenuGate = gate
}

// electron-vite emits ?asset files under hashed names, which breaks nativeImage's
// automatic `@2x` sibling lookup — attach the retina representation by hand
function loadDocsMenuIcon(path1x: string, path2x: string): NativeImage {
  const icon = nativeImage.createFromPath(path1x)
  icon.addRepresentation({ scaleFactor: 2, buffer: readFileSync(path2x) })
  return icon
}

// loaded once, not on every menu rebuild (pushRecent re-runs buildDocsMenu)
interface DocsMenuIcons {
  plus: NativeImage
  folder: NativeImage
}
let docsMenuIconCache: DocsMenuIcons | null = null
function docsMenuIcons(): DocsMenuIcons {
  docsMenuIconCache ??= {
    plus: loadDocsMenuIcon(menuPlusIcon1x, menuPlusIcon2x),
    folder: loadDocsMenuIcon(menuFolderIcon1x, menuFolderIcon2x),
  }
  return docsMenuIconCache
}

export function buildDocsMenu(): void {
  if (docsMenuGate && !docsMenuGate()) return
  const isMac = process.platform === 'darwin'
  const recent = readJson<string[]>(RECENT_PATH(), [])
    .filter((p) => existsSync(p))
    .slice(0, 10)

  const recentSubmenu: MenuItemConstructorOptions[] =
    recent.length > 0
      ? recent.map((p) => ({
          label: basename(p),
          sublabel: isMac ? undefined : p,
          toolTip: p,
          click: () => sendCommand('open-path', p),
        }))
      : [{ label: tm('menuNoRecent'), enabled: false }]

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { label: tm('menuPreferences'), click: () => sendCommand('preferences') },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: tm('menuFile'),
      submenu: [
        {
          label: tm('menuNewDoc'),
          accelerator: 'CmdOrCtrl+N',
          icon: docsMenuIcons().plus,
          click: () => sendCommand('new'),
        },
        {
          label: tm('menuNewWindow'),
          accelerator: 'Shift+CmdOrCtrl+N',
          click: () => {
            if (shellHooks) shellHooks.openTab(undefined, { newBlank: true })
            else markDocsNewBlank(createDocsWindow().webContents.id)
          },
        },
        {
          label: tm('menuOpen'),
          accelerator: 'CmdOrCtrl+O',
          icon: docsMenuIcons().folder,
          click: () => sendCommand('open'),
        },
        { label: tm('menuOpenRecent'), submenu: recentSubmenu },
        ...(extraFileMenuItems.length > 0
          ? [{ type: 'separator' as const }, ...extraFileMenuItems]
          : []),
        { type: 'separator' },
        shellHooks
          ? {
              label: tm('menuClose'),
              accelerator: 'CmdOrCtrl+W',
              click: () => shellHooks?.closeActiveTab(),
            }
          : { role: 'close' as const, label: tm('menuClose') },
        { label: tm('menuSave'), accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save') },
        {
          label: tm('menuSaveAs'),
          accelerator: 'Shift+CmdOrCtrl+S',
          click: () => sendCommand('save-as'),
        },
        { type: 'separator' },
        { label: tm('menuPageSetup'), click: () => sendCommand('page-setup') },
        { label: tm('menuExportPdf'), click: () => sendCommand('export-pdf') },
        { label: tm('menuExportHtml'), click: () => sendCommand('export-html') },
        { label: tm('menuExportImages'), click: () => sendCommand('export-images') },
        {
          label: tm('menuPrint'),
          accelerator: 'CmdOrCtrl+P',
          // routed through the renderer: it opens the pagination preview first so each
          // printed sheet is exactly one editor page (WYSIWYG), then invokes docs:print
          click: () => sendCommand('print'),
        },
      ],
    },
    {
      label: tm('menuEdit'),
      submenu: [
        { label: tm('menuUndo'), accelerator: 'CmdOrCtrl+Z', click: () => sendCommand('undo') },
        {
          label: tm('menuRedo'),
          accelerator: 'Shift+CmdOrCtrl+Z',
          click: () => sendCommand('redo'),
        },
        { type: 'separator' },
        { role: 'cut', label: tm('menuCut') },
        { role: 'copy', label: tm('menuCopy') },
        { role: 'paste', label: tm('menuPaste') },
        { role: 'pasteAndMatchStyle', label: tm('menuPasteMatch') },
        { type: 'separator' },
        {
          label: tm('menuFindReplace'),
          accelerator: 'CmdOrCtrl+F',
          click: () => sendCommand('find'),
        },
        {
          label: tm('menuGoTo'),
          accelerator: isMac ? 'Alt+Cmd+G' : 'Ctrl+G',
          click: () => sendCommand('goto'),
        },
        { type: 'separator' },
        { role: 'selectAll', label: tm('menuSelectAll') },
      ],
    },
    {
      label: tm('menuView'),
      submenu: [
        {
          label: tm('menuZoomIn'),
          accelerator: 'CmdOrCtrl+=',
          click: () => sendCommand('zoom-in'),
        },
        {
          label: tm('menuZoomOut'),
          accelerator: 'CmdOrCtrl+-',
          click: () => sendCommand('zoom-out'),
        },
        {
          label: tm('menuZoom100'),
          accelerator: 'CmdOrCtrl+0',
          click: () => sendCommand('zoom-100'),
        },
        {
          label: tm('menuZoom'),
          submenu: [
            ...[500, 200, 150, 125, 100, 75, 50, 25, 10].map((pct) => ({
              label: `${pct}%`,
              click: () => sendCommand('zoom-set', String(pct)),
            })),
            { label: tm('menuPageWidth'), click: () => sendCommand('zoom-page-width') },
            { label: tm('menuWholePage'), click: () => sendCommand('zoom-whole-page') },
            { label: tm('menuMultiPage'), click: () => sendCommand('zoom-multi-page') },
          ],
        },
        // interface zoom (genoffice#1913): scales chrome, not the document
        {
          label: tm('menuUiZoom'),
          submenu: [
            {
              label: tm('menuZoomIn'),
              // Ctrl+Shift+= is superscript and Ctrl+Shift+- the non-breaking
              // hyphen here, so interface zoom rides the free Alt triple (#1913);
              // the mouse path is Ctrl+Shift+wheel
              accelerator: 'CmdOrCtrl+Alt+Shift+=',
              click: () => sendCommand('ui-zoom-in'),
            },
            {
              label: tm('menuZoomOut'),
              accelerator: 'CmdOrCtrl+Alt+Shift+-',
              click: () => sendCommand('ui-zoom-out'),
            },
            {
              label: tm('menuZoom100'),
              accelerator: 'CmdOrCtrl+Alt+Shift+0',
              click: () => sendCommand('ui-zoom-100'),
            },
          ],
        },
        { type: 'separator' },
        {
          id: 'docs-menu-ai-sidebar',
          type: 'checkbox',
          checked: activeViewMenuState().aiSidebar,
          label: tm('menuAiSidebar'),
          click: () => sendCommand('toggle-ai'),
        },
        {
          id: 'docs-menu-dark-mode',
          type: 'checkbox',
          checked: activeViewMenuState().darkCanvas,
          label: tm('menuDarkMode'),
          click: () => sendCommand('toggle-dark'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: tm('menuFullscreen') },
        ...(isDev ? [toggleDevToolsItem(appMenuLabels(getUiLang()))] : []),
      ],
    },
    {
      label: tm('menuInsert'),
      submenu: [
        { label: tm('menuInsertTable'), click: () => sendCommand('insert-table') },
        { label: tm('menuInsertImage'), click: () => sendCommand('insert-image') },
        // no CmdOrCtrl+Enter accelerator: a menu accelerator would intercept
        // the key before renderer inputs (comments panel / prompt modal use
        // Cmd+Enter to submit); the editor keymap handles it instead
        { label: tm('menuInsertPageBreak'), click: () => sendCommand('insert-page-break') },
        {
          label: tm('menuInsertLink'),
          accelerator: 'CmdOrCtrl+K',
          click: () => sendCommand('insert-link'),
        },
        { label: tm('menuInsertEquation'), click: () => sendCommand('insert-equation') },
        { type: 'separator' },
        { label: tm('menuComment'), click: () => sendCommand('insert-comment') },
      ],
    },
    {
      label: tm('menuFormat'),
      submenu: [
        { label: tm('menuBold'), accelerator: 'CmdOrCtrl+B', click: () => sendCommand('bold') },
        { label: tm('menuItalic'), accelerator: 'CmdOrCtrl+I', click: () => sendCommand('italic') },
        {
          label: tm('menuUnderline'),
          accelerator: 'CmdOrCtrl+U',
          click: () => sendCommand('underline'),
        },
        { type: 'separator' },
        {
          label: tm('menuAlign'),
          submenu: [
            { label: tm('menuAlignLeft'), click: () => sendCommand('align-left') },
            { label: tm('menuAlignCenter'), click: () => sendCommand('align-center') },
            { label: tm('menuAlignRight'), click: () => sendCommand('align-right') },
            { label: tm('menuAlignJustify'), click: () => sendCommand('align-justify') },
          ],
        },
        { type: 'separator' },
        {
          label: tm('menuFont'),
          accelerator: 'CmdOrCtrl+D',
          click: () => sendCommand('font-dialog'),
        },
        {
          label: tm('menuParagraph'),
          accelerator: 'Alt+CmdOrCtrl+M',
          click: () => sendCommand('paragraph-dialog'),
        },
      ],
    },
    {
      // Word's Table menu; the renderer answers with a hint when the caret is outside a table
      label: tm('menuTable'),
      submenu: [
        {
          label: tm('menuTableInsert'),
          submenu: [
            { label: tm('menuTableInsertTable'), click: () => sendCommand('insert-table') },
            { label: tm('menuTableColsLeft'), click: () => sendCommand('table-insert-cols-left') },
            {
              label: tm('menuTableColsRight'),
              click: () => sendCommand('table-insert-cols-right'),
            },
            {
              label: tm('menuTableRowsAbove'),
              click: () => sendCommand('table-insert-rows-above'),
            },
            {
              label: tm('menuTableRowsBelow'),
              click: () => sendCommand('table-insert-rows-below'),
            },
            { label: tm('menuTableCells'), click: () => sendCommand('table-insert-cells') },
          ],
        },
        {
          label: tm('menuTableDelete'),
          submenu: [
            { label: tm('menuTableDeleteTable'), click: () => sendCommand('table-delete-table') },
            {
              label: tm('menuTableDeleteColumns'),
              click: () => sendCommand('table-delete-columns'),
            },
            { label: tm('menuTableDeleteRows'), click: () => sendCommand('table-delete-rows') },
            { label: tm('menuTableCells'), click: () => sendCommand('table-delete-cells') },
          ],
        },
        {
          label: tm('menuTableSelect'),
          submenu: [
            { label: tm('menuTableSelectTable'), click: () => sendCommand('table-select-table') },
            { label: tm('menuTableSelectColumn'), click: () => sendCommand('table-select-column') },
            { label: tm('menuTableSelectRow'), click: () => sendCommand('table-select-row') },
            { label: tm('menuTableSelectCell'), click: () => sendCommand('table-select-cell') },
          ],
        },
        { type: 'separator' },
        { label: tm('menuTableMergeCells'), click: () => sendCommand('table-merge-cells') },
        { label: tm('menuTableSplitCells'), click: () => sendCommand('table-split-cells') },
        { label: tm('menuTableSplitTable'), click: () => sendCommand('table-split-table') },
        { type: 'separator' },
        {
          label: tm('menuTableAutoFit'),
          submenu: [
            {
              label: tm('menuTableAutoFitContents'),
              click: () => sendCommand('table-autofit-contents'),
            },
            {
              label: tm('menuTableAutoFitWindow'),
              click: () => sendCommand('table-autofit-window'),
            },
            { label: tm('menuTableFixedWidth'), click: () => sendCommand('table-autofit-fixed') },
            { type: 'separator' },
            {
              label: tm('menuTableDistributeRows'),
              click: () => sendCommand('table-distribute-rows'),
            },
            {
              label: tm('menuTableDistributeColumns'),
              click: () => sendCommand('table-distribute-columns'),
            },
          ],
        },
        { label: tm('menuTableRepeatHeader'), click: () => sendCommand('table-repeat-header') },
        { type: 'separator' },
        { label: tm('menuTableGridlines'), click: () => sendCommand('table-gridlines') },
        { label: tm('menuTableProperties'), click: () => sendCommand('table-properties') },
      ],
    },
    {
      // Word for Mac keeps Word Count in the Tools menu, not on the ribbon
      label: tm('menuTools'),
      submenu: [
        { label: tm('menuWordCount'), click: () => sendCommand('word-count') },
        { label: tm('menuAutoCorrect'), click: () => sendCommand('autocorrect-options') },
        // Word for Mac keeps Preferences in the application menu
        ...(isMac
          ? []
          : [{ label: tm('menuPreferences'), click: () => sendCommand('preferences') }]),
        { type: 'separator' },
        // Runs the same AI proofread as Review > Editor (renderer shows the one-time ack)
        { label: tm('menuAiProofread'), click: () => sendCommand('ai-proofread') },
      ],
    },
    windowMenuTemplate(process.platform, appMenuLabels(getUiLang())),
    {
      label: tm('menuHelp'),
      role: 'help',
      submenu: [
        {
          label: tm('menuShortcuts'),
          accelerator: 'CmdOrCtrl+/',
          click: () => sendCommand('shortcuts'),
        },
        { type: 'separator' },
        checkUpdatesMenuItem(appMenuLabels(getUiLang())),
        aboutMenuItem(appMenuLabels(getUiLang()), appTitle(getUiLang())),
        { type: 'separator' },
        licenseMenuItem(appMenuLabels(getUiLang())),
        privacyMenuItem(appMenuLabels(getUiLang())),
      ],
    },
    ...extraAppMenuItems,
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---- headless export ----

/** hidden export windows: webContents id -> what the renderer must write */
const headlessExportTargets = new Map<number, HeadlessExportTarget>()
/** settled by 'docs:headless-export-done' (or by the renderer dying) */
const headlessExportWaiters = new Map<number, (result: HeadlessExportReport) => void>()

interface HeadlessExportReport {
  ok: boolean
  error?: string
}

/**
 * Render `input` to `outPath` (as PDF or standalone HTML) with no visible window.
 *
 * The window is wired exactly like createDocsWindow's (same preload, sandbox
 * and `backgroundThrottling: false`) and the document rides the normal
 * pending-open queue, so the renderer runs its usual load -> paginate ->
 * export pipeline; only the save dialog is skipped, by pre-authorizing
 * `outPath` the way a dialog would. Rejects with the renderer's reason when
 * the export fails or the deadline passes.
 */
export async function exportDocsHeadless(
  input: string,
  outPath: string,
  format: HeadlessExportFormat = 'pdf',
  timeoutMs = 300_000,
): Promise<void> {
  const win = new BrowserWindow({
    show: false,
    width: 1360,
    height: 900,
    webPreferences: {
      preload: runtime.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  // hidden export window: interface zoom must not leak into the layout (#1913)
  win.webContents.setZoomFactor(1)
  const wcId = win.webContents.id
  pendingWindowOpens.set(wcId, input)
  headlessExportTargets.set(wcId, { outPath, format })
  allowPdfWrite(wcId, outPath)
  forwardRendererConsole(win.webContents, 'docs')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const report = await new Promise<HeadlessExportReport>((resolve) => {
      headlessExportWaiters.set(wcId, resolve)
      win.webContents.on('render-process-gone', (_event, details) =>
        resolve({ ok: false, error: `docs renderer stopped (${details.reason})` }),
      )
      timer = setTimeout(
        () => resolve({ ok: false, error: `docs export timed out after ${timeoutMs}ms` }),
        timeoutMs,
      )
      void win.webContents.loadURL(rendererUrl(runtime.rendererUrl, 'docs'))
    })
    if (!report.ok) throw new Error(report.error ?? 'docs export failed')
  } finally {
    if (timer) clearTimeout(timer)
    headlessExportWaiters.delete(wcId)
    headlessExportTargets.delete(wcId)
    pendingWindowOpens.delete(wcId)
    if (!win.isDestroyed()) win.destroy()
  }
}

// ---- window ----

export function createDocsWindow(openPath?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 720,
    minHeight: 550,
    title: appTitle(getUiLang(), 'Docs'),
    backgroundColor: themedSurfaceColor(),
    // Word-like custom title bar (document name centered, quick-access buttons)
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const }
      : {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: nativeTheme.shouldUseDarkColors
            ? { color: '#2a2a2a', symbolColor: '#e4e4e4', height: 40 }
            : { color: '#ffffff', symbolColor: '#444444', height: 40 },
        }),
    // packaged builds embed the icon (build/icon.icns|ico); dev needs the file path
    ...(isDev && process.platform !== 'darwin'
      ? { icon: join(app.getAppPath(), 'build/icon.png') }
      : {}),
    webPreferences: {
      preload: runtime.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  if (!mainWindow) {
    mainWindow = win
    rendererReady = false
  }
  // captured up front: webContents is already destroyed inside the 'closed' handler
  const webContentsId = win.webContents.id
  forwardRendererConsole(win.webContents, 'docs')
  if (openPath) pendingWindowOpens.set(webContentsId, openPath)

  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = safeExternalUrl(url)
    if (target) void shell.openExternal(target)
    return { action: 'deny' }
  })

  void win.loadURL(rendererUrl(runtime.rendererUrl, 'docs'))
  // close guard for standalone-window mode (tab mode goes through the same flow via the shell's tab-manager/window-close path)
  let closeConfirmed = false
  win.on('close', (event) => {
    if (closeConfirmed) return
    event.preventDefault()
    void requestDocsClose(win.webContents, win).then((proceed) => {
      if (proceed && !win.isDestroyed()) {
        closeConfirmed = true
        win.close()
      }
    })
  })
  win.on('closed', () => {
    pendingWindowOpens.delete(webContentsId)
    dropDocWriter(webContentsId)
    // release any close-guard waiter still keyed on the gone webContents
    closeCheckWaiters.get(webContentsId)?.({ dirty: false, autoSave: false })
    closeCheckWaiters.delete(webContentsId)
    closeSaveWaiters.get(webContentsId)?.(false)
    closeSaveWaiters.delete(webContentsId)
    if (mainWindow === win) {
      mainWindow = BrowserWindow.getAllWindows().find((w) => w !== win) ?? null
      if (!mainWindow) rendererReady = false
    }
  })
  return win
}

/** tab-mode equivalent of createDocsWindow: same runtime/IPC wiring, no BrowserWindow of its own. */
// ── Close guard (aligned with sheets/pdf/slides): dirty documents prompt Save/Don't Save/Cancel before closing a tab/window ──
// docs' dirty state is a composite flag in the renderer; the main process doesn't mirror it and queries once at close time.
interface DocsCloseState {
  dirty: boolean
  autoSave: boolean
  /** Open file path (for recovery-copy cleanup on "Don't Save") */
  filePath?: string | null
  /** The renderer never replied to the close check (busy or wedged) */
  unresponsive?: boolean
}
const closeCheckWaiters = new Map<number, (state: DocsCloseState) => void>()
const closeSaveWaiters = new Map<number, (ok: boolean) => void>()

ipcMain.on('docs:view-menu-state', (event, state: unknown) => {
  const s = state as { aiSidebar?: unknown; darkCanvas?: unknown } | null
  const next = { aiSidebar: s?.aiSidebar === true, darkCanvas: s?.darkCanvas === true }
  if (!viewMenuStateByWebContents.has(event.sender.id)) {
    const id = event.sender.id
    event.sender.once('destroyed', () => viewMenuStateByWebContents.delete(id))
  }
  viewMenuStateByWebContents.set(event.sender.id, next)
  // patch the live menu only for the active tab; an inactive tab's state gets
  // picked up by the buildDocsMenu run its next focus triggers
  if (event.sender.id !== activeDocsWebContents()?.id) return
  const menu = Menu.getApplicationMenu()
  const ai = menu?.getMenuItemById('docs-menu-ai-sidebar')
  if (ai) ai.checked = next.aiSidebar
  const dark = menu?.getMenuItemById('docs-menu-dark-mode')
  if (dark) dark.checked = next.darkCanvas
})

ipcMain.on('docs:close-check-result', (event, state: unknown) => {
  const waiter = closeCheckWaiters.get(event.sender.id)
  if (!waiter) return
  closeCheckWaiters.delete(event.sender.id)
  const s = state as { dirty?: unknown; autoSave?: unknown; filePath?: unknown } | boolean
  waiter(
    typeof s === 'boolean'
      ? { dirty: s, autoSave: false }
      : {
          dirty: s?.dirty === true,
          autoSave: s?.autoSave === true,
          filePath: typeof s?.filePath === 'string' ? s.filePath : null,
        },
  )
})

ipcMain.on('docs:close-save-result', (event, ok: unknown) => {
  const waiter = closeSaveWaiters.get(event.sender.id)
  if (!waiter) return
  closeSaveWaiters.delete(event.sender.id)
  waiter(ok === true)
})

/** Ask the renderer for pre-close state (dirty flag + autosave switch); no reply within 2s
 * fails CLOSED — a busy or wedged renderer may well hold unsaved changes, so the caller
 * prompts instead of closing silently. Concurrent callers share one query: a second
 * request must not overwrite the pending waiter (that stranded the first until timeout). */
const closeStateQueries = new Map<number, Promise<DocsCloseState>>()

function queryCloseState(contents: WebContents): Promise<DocsCloseState> {
  if (contents.isDestroyed()) return Promise.resolve({ dirty: false, autoSave: false })
  const pending = closeStateQueries.get(contents.id)
  if (pending) return pending
  const query = new Promise<DocsCloseState>((resolve) => {
    const timer = setTimeout(() => {
      closeCheckWaiters.delete(contents.id)
      resolve({ dirty: true, autoSave: false, unresponsive: true })
    }, 2000)
    closeCheckWaiters.set(contents.id, (state) => {
      clearTimeout(timer)
      resolve(state)
    })
    contents.send('docs:close-check')
  }).finally(() => closeStateQueries.delete(contents.id))
  closeStateQueries.set(contents.id, query)
  return query
}

export async function docsQueryDirty(contents: WebContents): Promise<boolean> {
  return (await queryCloseState(contents)).dirty
}

/** Ask the renderer to run the full save flow and await the result (failure/timeout = false). */
function requestRendererSave(contents: WebContents): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      closeSaveWaiters.delete(contents.id)
      resolve(false)
    }, 120_000)
    closeSaveWaiters.set(contents.id, (ok) => {
      clearTimeout(timer)
      resolve(ok)
    })
    contents.send('docs:close-save-request')
  })
}

/**
 * Close guard for the docs renderer: true means proceed with closing.
 * Clean → true; with changes → Save/Don't Save/Cancel. On Save, ask the renderer
 * to run the full save flow (new documents open Save As) and await the result;
 * failure/cancel/timeout keeps the document open.
 */
export function requestDocsClose(
  contents: WebContents,
  parent?: BrowserWindow | null,
): Promise<boolean> {
  // re-entry (close clicked again while the prompt is up) joins the same flow
  // instead of stacking dialogs / stranding the first waiter
  const pending = docsCloseRequests.get(contents.id)
  if (pending) return pending
  const request = performDocsClose(contents, parent).finally(() =>
    docsCloseRequests.delete(contents.id),
  )
  docsCloseRequests.set(contents.id, request)
  return request
}

const docsCloseRequests = new Map<number, Promise<boolean>>()

async function performDocsClose(
  contents: WebContents,
  parent?: BrowserWindow | null,
): Promise<boolean> {
  const state = await queryCloseState(contents)
  if (!state.dirty || contents.isDestroyed()) return true
  if (state.unresponsive) {
    // No reply: saving through the renderer won't work either — offer Close Anyway / Cancel
    const options = {
      type: 'warning' as const,
      message: tm('closeNoReplyMsg'),
      detail: tm('closeNoReplyDetail'),
      buttons: [tm('btnCloseAnyway'), tm('btnCancel')],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    }
    const { response } =
      parent && !parent.isDestroyed()
        ? await dialog.showMessageBox(parent, options)
        : await dialog.showMessageBox(options)
    return response === 0
  }
  // autosave on (and has a path, already checked when the renderer reported): save silently and proceed; only prompt on failure
  if (state.autoSave && (await requestRendererSave(contents))) return true
  const options = {
    type: 'warning' as const,
    message: tm('closeUnsavedMsg'),
    detail: tm('closeUnsavedDetail'),
    buttons: [tm('menuSave'), tm('btnDontSave'), tm('btnCancel')],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  }
  const { response } =
    parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
  if (response === 2) return false
  if (response === 1) {
    // Explicitly discarded: also drop the recovery copy so the next open doesn't offer it
    if (state.filePath) clearRecoveryCopy(state.filePath)
    return true
  }
  return requestRendererSave(contents)
}

export function createDocsView(openPath?: string): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      preload: runtime.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  forwardRendererConsole(view.webContents, 'docs')
  if (openPath) pendingWindowOpens.set(view.webContents.id, openPath)

  view.webContents.setWindowOpenHandler(({ url }) => {
    const target = safeExternalUrl(url)
    if (target) void shell.openExternal(target)
    return { action: 'deny' }
  })

  // mode=tab: the shell's tab strip owns the traffic lights / caption buttons,
  // so the ribbon must not reserve space for them
  void view.webContents.loadURL(rendererUrl(runtime.rendererUrl, 'docs', { mode: 'tab' }))
  // view.webContents becomes undefined after destroy, so grab the id beforehand
  const wcId = view.webContents.id
  view.webContents.once('destroyed', () => {
    pendingWindowOpens.delete(wcId)
    dropDocWriter(wcId)
    closeCheckWaiters.get(wcId)?.({ dirty: false, autoSave: false })
    closeCheckWaiters.delete(wcId)
    closeSaveWaiters.get(wcId)?.(false)
    closeSaveWaiters.delete(wcId)
  })
  return view
}

/** true when at least one docs window is open (shell menu switching) */
export function hasDocsWindow(): boolean {
  return mainWindow !== null
}

// ---- standalone lifecycle (apps/docs running on its own) ----

export function startDocsStandalone(): void {
  registerRendererScheme()
  installNavigationGuard(app)
  installContextMenu(app, () => contextMenuLabels(getUiLang()))
  // dev runs must not share the packaged app's userData (recent files, AI settings)
  // or its single-instance lock — otherwise `npm run dev` silently quits whenever
  // the installed OfficeVega Docs is open and forwards its argv there instead.
  // AI_OFFICE_USER_DATA: E2E/screenshot runs isolate userData (and the
  // single-instance lock) so parallel automation sessions don't evict each other
  if (process.env.AI_OFFICE_USER_DATA) app.setPath('userData', process.env.AI_OFFICE_USER_DATA)
  else if (isDev) {
    // "OfficeVega Docs Dev" carried a space, against the XDG one-token
    // convention (genoffice#1817); move the old profile once, as the shell does.
    const appData = app.getPath('appData')
    const devDir = join(appData, 'OfficeVega-Docs-Dev')
    const oldDevDir = join(appData, 'OfficeVega Docs Dev')
    let userData = devDir
    if (existsSync(oldDevDir) && !existsSync(devDir)) {
      try {
        renameSync(oldDevDir, devDir)
      } catch {
        // another dev instance holds the directory: keep using the old one so
        // the profile is not lost and the move is retried on the next launch
        userData = oldDevDir
      }
    }
    app.setPath('userData', userData)
  }

  const hasSingleInstanceLock = app.requestSingleInstanceLock()
  if (!hasSingleInstanceLock) {
    app.quit()
    return
  }

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    openExternalDocx(filePath)
  })

  app.on('second-instance', (_event, argv) => {
    openExternalDocx(findDocxPath(argv))
    mainWindow?.show()
    mainWindow?.focus()
  })

  registerAiIpc()
  registerProjectIpc()
  registerDocsIpc()

  app.whenReady().then(() => {
    installRendererProtocol({ docs: join(__dirname, '../renderer') })
    setUiLang(normalizeLang(process.env.OFFICEVEGA_LANG ?? app.getLocale()))
    // packaged builds get the Dock icon from icon.icns; dev shows Electron's default
    if (isDev && process.platform === 'darwin') {
      app.dock?.setIcon(join(app.getAppPath(), 'build/icon.png'))
    }
    buildDocsMenu()
    createDocsWindow()
    initDocsAutoUpdater(() => mainWindow)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createDocsWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
