import { execSync, spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import {
  BrowserWindow,
  Menu,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  nativeTheme,
  screen,
  session,
  shell,
  webContents,
} from 'electron'
import type { MenuItemConstructorOptions, NativeImage, WebContents } from 'electron'
import { atomicCopyFile, atomicWriteFile } from './atomic-write'
import { registerLicenseIpc } from './license/service'
import { tabStripOverlay } from './title-bar-overlay'
import {
  applyUiScaleTo,
  applyUiScaleToAll,
  changeUiScale,
  onUiScaleChanged,
  readUiScale,
  setUiScale,
} from './ui-scale'
import menuDocxIcon1x from './assets/menu-docx.png?asset'
import menuDocxIcon2x from './assets/menu-docx@2x.png?asset'
import menuXlsxIcon1x from './assets/menu-xlsx.png?asset'
import menuXlsxIcon2x from './assets/menu-xlsx@2x.png?asset'
import menuPptxIcon1x from './assets/menu-pptx.png?asset'
import menuPptxIcon2x from './assets/menu-pptx@2x.png?asset'
import menuPdfIcon1x from './assets/menu-pdf.png?asset'
import menuPdfIcon2x from './assets/menu-pdf@2x.png?asset'
import menuMdIcon1x from './assets/menu-md.png?asset'
import menuMdIcon2x from './assets/menu-md@2x.png?asset'
import menuHtmlIcon1x from './assets/menu-html.png?asset'
import menuHtmlIcon2x from './assets/menu-html@2x.png?asset'
import menuHomeIcon1x from './assets/menu-home.png?asset'
import menuHomeIcon2x from './assets/menu-home@2x.png?asset'
import menuPlusIcon1x from './assets/menu-plus.png?asset'
import menuPlusIcon2x from './assets/menu-plus@2x.png?asset'
import menuFolderIcon1x from './assets/menu-folder.png?asset'
import menuFolderIcon2x from './assets/menu-folder@2x.png?asset'
import {
  appTitle,
  createI18n,
  isLang,
  normalizeLang,
  setUiLang,
  type Lang,
} from '@genoffice/i18n'
import {
  DEFAULT_SAVE_DIR_KEY,
  DROP_OPEN_CHANNEL,
  OPEN_FILE_DIALOG_CHANNEL,
  GITHUB_REPO_URL,
  appMenuLabels,
  contextMenuLabels,
  editMenuTemplate,
  installContextMenu,
  installNavigationGuard,
  isUsableSaveDir,
  HEADLESS_EXIT,
  formatHeadlessEnvelope,
  headlessExitCode,
  parseHeadlessExportArgv,
  setHeadlessMode,
  type HeadlessArgvParse,
  showOpenDialogWithMemory,
  showSaveDialogWithMemory,
  saveTextFileWithDialog,
  windowMenuTemplate,
  aboutMenuItem,
  checkUpdatesMenuItem,
  licenseMenuItem,
  privacyMenuItem,
  setUpdateCheckInvoker,
  installRendererProtocol,
  installFetchProxy,
  themedSurfaceColor,
  forwardRendererConsole,
} from '@genoffice/electron-utils'
import {
  readAppSettings,
  writeAppSetting,
  writeAppSettings,
  writeAppSettingThen,
} from './app-settings'
import { OPEN_DOCUMENTS_FILE, clearOpenDocuments, publishOpenDocuments } from './open-documents'
import { startControlServer, type ControlServer } from './control-server'
import { controlHandler } from './control-handlers'
import { installCliLinkBestEffort } from './cli-link'
import { createDefaultAppService, execFileRunner } from './default-app'
import { registerIntegrationsIpc } from './integrations-ipc'
import {
  LAST_RUN_VERSION_KEY,
  STAR_PROMPT_ENABLED,
  STAR_PROMPT_KEY,
  asStarPromptState,
  isUpgradeLaunch,
  shouldShowStarPrompt,
  shouldShowUpgradeStarPrompt,
  withDocOpen,
  withFirstRun,
  withResolved,
  withShown,
} from './star-prompt'
import { handleDroppedFiles } from './dropped-files'
import { collectLaunchPaths } from './launch-paths'
import { openRouterSafeHeaders } from '@genoffice/ai-provider'
import {
  officeVegaLogout,
  loadOfficeVegaAuth,
  setGskProxyUrl,
  startOfficeVegaLogin,
  vegaAccountInfo,
  watchOfficeVegaApiKey,
} from '@genoffice/ai-search'

import {
  buildDocsMenu,
  configureDocsRuntime,
  docsFileRenamed,
  readRecentFiles,
  readStarredFiles,
  readStarredGroupMap,
  readStarredGroups,
  recordRecentFile,
  removeRecentFiles,
  removeStarredFiles,
  replaceRecentFile,
  registerAiIpc,
  registerProjectIpc,
  setStarredGroup,
  toggleStarredFile,
  registerDocsIpc,
  exportDocsHeadless,
  setDocsExtraFileMenuItems,
  setDocsExtraAppMenuItems,
  setDocsMenuGate,
  setDocsShellHooks,
  createAiDocument,
  projectFilePaths,
  projectFileRenamed,
  setDocsHostWindowHook,
  setDocsShellWindow,
  setDocsFileSavedHook,
  setDocsFileOpenedHook,
  setSessionPathResolver,
  defaultSaveDir,
  uniquePathIn,
  authorizeMcpDocWrite,
} from '../../../docs/src/main/docs-main'
import { blankXlsxBuffer } from '@genoffice/xlsx-gateway/gateway/csv-import'
import { blankPdfBuffer } from '../../../pdf/src/main/blank-pdf'
import {
  applyMcpSettings,
  clearMcpLogs,
  configureMcpRuntime,
  getMcpRecentLogs,
  mcpLogFilePath,
  mcpStatus,
  revealMcpLogFile,
  startMcpFromSettings,
  stopMcpSync,
  type McpSettings,
} from './mcp/app-mcp'
import { createCliRunner } from './mcp/cli-runner'
import { DEFAULT_MCP_PORT } from './mcp/mcp-server'
import { createDocsControl, installDocsBridge } from './mcp/docs-bridge'
import { createSlidesControl } from './mcp/slides-bridge'
import { createSheetsControl, installSheetsBridge } from './mcp/sheets-bridge'
import { createOpenDocumentsControl, createOpenTargetResolver } from './mcp/open-documents-bridge'
import {
  configureSheetsRuntime,
  exportSheetsPdfHeadless,
  hasActiveQueuedWorkbook,
  installSheetsMenu,
  markSheetsShuttingDown,
  resolveSheetsSessionPath,
  markSheetsUnsavedNew,
  markSheetsUntitledPath,
  pendingUnsavedNewRecoveries,
  unmarkSheetsUnsavedNew,
  sheetsSuggestedPathTaken,
  authorizeMcpSheetWrite,
  sendSheetsMenuAction,
  sheetsFileRenamed,
  setSheetsCloseTabHook,
  setSheetsExtraFileMenuItems,
  setSheetsExtraAppMenuItems,
  setSheetsHostWindowHook,
  setSheetsShellWindow,
  setSheetsWorkbookOpenedHook,
  startSheetsCaptureServer,
  stopSheetsSidecar,
} from '../../../sheets/src/main/sheets-main'
import {
  configureSlidesRuntime,
  discardSlidesRecovery,
  exportSlidesPdfHeadless,
  installSlidesMenu,
  readSlidesRecentFiles,
  replaceSlidesRecentFile,
  setSlidesCloseTabHook,
  setSlidesExtraFileMenuItems,
  setSlidesExtraAppMenuItems,
  setSlidesOpenedHook,
  setSlidesHostWindowHook,
  setSlidesShellWindow,
  setSlidesShowBleed,
  slidesFileRenamed,
} from '../../../slides/src/main/slides-main'
import {
  configurePdfRuntime,
  flushPdfSave,
  markPdfUntitledPath,
  pdfFileRenamed,
  pdfIsDirty,
  requestPdfSaveAs,
  sendPdfPrintRequest,
  setPdfRenamedHook,
  setPdfRedactionSavedHook,
  setPdfSaveAsInFlight,
} from '../../../pdf/src/main/pdf-main'
import { PDF_CHANNELS } from '../../../pdf/src/shared/ipc'
import { convertPdfFileToDocxLocalWithPrompt, PdfLoadError } from './pdf2docx-local'
import { convertPdfFileToPptxLocalWithPrompt } from './pdf2pptx-local'
import { convertPdfFileToXlsxLocalWithPrompt } from './pdf2xlsx-local'
import { closePdfPasswordDialog, promptPdfPassword } from './pdf-password-dialog'
import {
  configureMarkdownRuntime,
  exportMarkdownPdfHeadless,
  markdownDiscardPendingAssets,
  markdownFileRenamed,
  markdownReadText,
  markdownSaveToPath,
  requestMarkdownSave,
  sendMarkdownExportRequest,
  sendMarkdownPrintRequest,
  setMarkdownDocxExportedHook,
  setMarkdownFileSavedHook,
} from '../../../markdown/src/main/markdown-main'
import {
  configureHtmlRuntime,
  exportHtmlHeadless,
  htmlDiscardPendingAssets,
  htmlFileRenamed,
  htmlReadText,
  htmlSaveToPath,
  registerPrivilegedSchemes,
  requestHtmlSave,
  sendHtmlExportRequest,
  sendHtmlPrintRequest,
  setHtmlDocxExportPrepareHook,
  setHtmlDocxExportedHook,
  setHtmlFileSavedHook,
  setHtmlPresentHooks,
  setHtmlProvisionalTitleHook,
} from '../../../html/src/main/html-main'
import type {
  AccountLoginEvent,
  AutoSaveDefault,
  FolderListing,
  FolderRoot,
  MoveConflictPolicy,
  MoveResult,
  NewFileOpts,
  RecentEntry,
  RecentPage,
  RenameResult,
  DocTheme,
  StarPromptShow,
  UiDesign,
  UiTheme,
  FileSearchPage,
  FileSearchQuery,
  FileSearchRerank,
  FileSearchSettings,
} from '../shared/home-api'
import { HOME_CHANNELS } from '../shared/home-api'
import {
  normalizeAiPanelPrefs,
  sameAiPanelPrefs,
  type AiPanelPrefs,
} from '@genoffice/ui/ai-panel-prefs'
import type { TabKind } from '../shared/tabs-api'
import { TABS_CHANNELS } from '../shared/tabs-api'
import { showErrorDialog } from './error-dialog'
import { startRendererWatchdog } from './renderer-watchdog'
import {
  capStatPaths,
  matchesExtFamily,
  normalizeRecentQuery,
  pageRecentPaths,
  statPathEntries,
} from './recent-files'
import { isMoveSource, isUserVisibleFile, type FileTargetSources } from './file-targets'
import {
  DOCX_RE,
  HTML_RE,
  PDF_RE,
  PPTX_RE,
  TEXT_RE,
  XLSX_RE,
  renameStaysInApp,
} from './app-routing'
import { isSameFile, pdfSaveAsTarget, isValidRawRenameName } from './rename-validation'
import {
  FolderWatcher,
  createFolder,
  describeRoot,
  isInsideRoot,
  pathsUnder,
  listFolder,
  movePathsInto,
  rebasePath,
  renameFolder,
  uniqueNameIn,
  type FolderErrors,
} from './folder-tree'
import {
  FOLDER_ROOTS_KEY,
  describeExtraRoot,
  readExtraRoots,
  withExtraRoot,
  withoutExtraRoot,
} from './folder-roots'
import extractWorkerPath from './file-index/extract-worker?modulePath'
import { FileIndexer } from './file-index/indexer'
import { FileIndexStore } from './file-index/store'
import { normalizeFileSearchSettings, probeDecision, SearchReranker } from './file-index/rerank'
import {
  createKnowledgeDocument,
  listKnowledgeFiles,
  parseKbCreateRequest,
  readKnowledgeFilePage,
  searchKnowledgeBase,
} from './knowledge-base'
import { createFileViaCli } from './mcp/headless-cli'
import { sanitizeFileBase } from './mcp/tools/document-tools'
import { runHeadlessExport, type HeadlessExporters } from './headless-export'
import { TabManager } from './tab-manager'
import { tabMenuTemplate, type TabMenuActions, isProgramFile } from './tab-menu'
import { runTabDocumentAction, type TabDocumentAction } from './tab-document-actions'
import { duplicateDocumentFile } from './tab-duplicate'
import { closeTabsInOrder, createRecentlyClosedTracker } from './tab-lifecycle'
import { installShellCloseGuard } from './window-close-guard'
import {
  activateDetached,
  closeDetachedWithoutPrompt,
  createDetachedEditorWindow,
  detachedFilePaths,
  detachedOpenDocuments,
  detachedRenameFile,
  detachedSetFileFor,
  detachedWebContentsFor,
  detachedSetTitleFor,
  detachedWindowForWebContents,
  dockBandFor,
  dragTornWindow,
  endTornDrag,
  findDetachedTabByPath,
  focusDetachedByPath,
  focusedDetachedKind,
  focusedDetachedTab,
  isDetachedEditorWindow,
  isDetachedTabId,
  isTearingOff,
  setDetachedChangedListener,
  setDockHost,
  takeTornTab,
} from './detached-windows'
import { applyUpdateChannel, checkForUpdatesNow, initAutoUpdater } from './updater'
import { isUpdateChannel, type UpdateChannel } from '../shared/update-api'

/**
 * OfficeVega unified shell: ONE Electron app, ONE BrowserWindow, hosting the
 * docs and sheets modules as WebContentsView tabs behind a WPS-style tab
 * strip. The shell owns the lifecycle — single-instance lock, file-
 * association routing by extension, and per-active-tab menu switching.
 * Renderers load from each module's build output (apps/docs/out,
 * apps/sheets/out), so build those before running the shell.
 */

// When the launcher (the CLI's export spawn, a terminal, a script) has gone away,
// the inherited stdio pipes are closed and the next console.* or Node warning
// write fails with EPIPE. Node's console drops its error listener before the
// async failure fires, so without a persistent one Electron shows an
// "Uncaught Exception: write EPIPE" dialog on quit.
for (const stream of [process.stdout, process.stderr]) {
  stream?.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code !== 'EPIPE') throw err
  })
}

// ANY unpacked run (`npm run shell`, `npm run dev`, `npx electron .`) must not
// share the installed app's userData or single-instance lock — otherwise a dev
// run silently quits and forwards its argv to the running installed OfficeVega.
// OFFICEVEGA_USER_DATA: test drivers point this at a scratch dir so an
// automated instance can run alongside the dev instance (separate lock).
if (!app.isPackaged) {
  const envUserData = process.env.OFFICEVEGA_USER_DATA ?? process.env.VEGAOFFICE_USER_DATA
  if (envUserData) {
    app.setPath('userData', envUserData)
  } else {
    // The dev profile used to live in "OfficeVega Dev"; the space breaks
    // unquoted shell expansions, rsync targets and .desktop Exec= lines, and
    // XDG config entries are single tokens (genoffice#1817). "OfficeVega-Dev" keeps the
    // family naming of the packaged profile ("OfficeVega"). The old directory
    // moves once — it sits on the same volume as appData, so the rename is
    // atomic, and a concurrent dev instance keeps its open file handles.
    const appData = app.getPath('appData')
    const devDir = join(appData, 'OfficeVega-Dev')
    const oldDevDir = join(appData, 'OfficeVega Dev')
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
}

/**
 * `--headless-export <file> --to <format> --out <path> [--json]`: one document, no
 * window, one stdout line, then exit. Parsed at module scope so the dock icon
 * is gone before the app can bounce it and so every editor module sees the
 * headless flag before it registers anything.
 */
const headlessArgv = parseHeadlessExportArgv(process.argv)
if (headlessArgv.kind !== 'none') {
  setHeadlessMode(true)
  app.dock?.hide()
}

// The product renames ("AI Office" → OfficeVega → GetOffice → VegaOffice → OfficeVega) changed the userData path; migrate old user data once
{
  const newDir = app.getPath('userData')
  const newEmpty = !existsSync(newDir) || readdirSync(newDir).length === 0
  if (newEmpty) {
    // packaged installs used "<name>", dev checkouts "<name> Dev"
    const suffix = app.isPackaged ? '' : ' Dev'
    for (const legacy of ['VegaOffice', 'GetOffice', 'GenOffice', 'AI Office']) {
      const oldDir = join(app.getPath('appData'), `${legacy}${suffix}`)
      if (existsSync(oldDir)) {
        cpSync(oldDir, newDir, { recursive: true })
        break
      }
    }
  }
}

// module build outputs: packaged builds carry them as extraResources
// (resources/modules/*, resources/native/*); dev/unpacked resolves them
// relative to apps/shell in the monorepo layout.
const SIDECAR_EXE = process.platform === 'win32' ? 'xlsx-sidecar.exe' : 'xlsx-sidecar'
const APPS_ROOT = join(app.getAppPath(), '..')
const DOCS_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'docs')
  : join(APPS_ROOT, 'docs', 'out')
const SHEETS_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'sheets')
  : join(APPS_ROOT, 'sheets', 'out')
const SLIDES_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'slides')
  : join(APPS_ROOT, 'slides', 'out')
const PDF_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'pdf')
  : join(APPS_ROOT, 'pdf', 'out')
let cliRunner: ReturnType<typeof createCliRunner> | null = null
/** the bundled officevega CLI on the app's own Node runtime (MCP headless tools, Ask AI create_document) */
function bundledCliRunner(): ReturnType<typeof createCliRunner> {
  cliRunner ??= createCliRunner({
    executable: process.execPath,
    entry: app.isPackaged
      ? join(process.resourcesPath, 'cli', 'officevega.cjs')
      : join(APPS_ROOT, '..', 'packages', 'cli', 'dist', 'officevega.cjs'),
  })
  return cliRunner
}

const MARKDOWN_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'markdown')
  : join(APPS_ROOT, 'markdown', 'out')
const HTML_OUT = app.isPackaged
  ? join(process.resourcesPath, 'modules', 'html')
  : join(APPS_ROOT, 'html', 'out')
const SIDECAR_BIN = app.isPackaged
  ? join(process.resourcesPath, 'native', SIDECAR_EXE)
  : join(APPS_ROOT, 'sheets', 'native', 'xlsx-engine', 'target', 'release', SIDECAR_EXE)

configureDocsRuntime({
  preloadPath: join(DOCS_OUT, 'preload', 'index.js'),
  rendererUrl: process.env.DOCS_RENDERER_URL,
  rendererFile: join(DOCS_OUT, 'renderer', 'index.html'),
})
configureSheetsRuntime({
  preloadPath: join(SHEETS_OUT, 'preload', 'index.js'),
  rendererUrl: process.env.SHEETS_RENDERER_URL,
  rendererFile: join(SHEETS_OUT, 'renderer', 'index.html'),
  sidecarPath: SIDECAR_BIN,
  openGeneratedPath: (path) => openGeneratedDocument(path),
  // The sheets AI's create_document (docx/pdf/md) funnels into the docs-owned
  // creation flow, like the pdf app below.
  createDocument: createAiDocument,
})
configureSlidesRuntime({
  preloadPath: join(SLIDES_OUT, 'preload', 'index.js'),
  rendererDevUrl: process.env.SLIDES_RENDERER_URL,
  rendererFilePath: join(SLIDES_OUT, 'renderer', 'index.html'),
  openGeneratedPath: (path) => openGeneratedDocument(path),
})
configurePdfRuntime({
  preloadPath: join(PDF_OUT, 'preload', 'index.js'),
  rendererUrl: process.env.PDF_RENDERER_URL,
  rendererFile: join(PDF_OUT, 'renderer', 'index.html'),
  openGeneratedPath: (path) => openGeneratedDocument(path),
  createDocument: createAiDocument,
})
configureMarkdownRuntime({
  preloadPath: join(MARKDOWN_OUT, 'preload', 'index.js'),
  rendererUrl: process.env.MARKDOWN_RENDERER_URL,
  rendererFile: join(MARKDOWN_OUT, 'renderer', 'index.html'),
  openGeneratedPath: (path) => openGeneratedDocument(path),
})
configureHtmlRuntime({
  preloadPath: join(HTML_OUT, 'preload', 'index.js'),
  rendererUrl: process.env.HTML_RENDERER_URL,
  rendererFile: join(HTML_OUT, 'renderer', 'index.html'),
  openGeneratedPath: (path) => openGeneratedDocument(path),
})
// privileged-scheme registration is only legal before app ready
registerPrivilegedSchemes()

// ---- UI language ----
// Persisted in userData/app-settings.json so the editor modules can read the
// same file when they pick up i18n later. OFFICEVEGA_LANG overrides for tests.

const APP_SETTINGS_PATH = () => join(app.getPath('userData'), 'app-settings.json')
const OPEN_DOCUMENTS_PATH = () => join(app.getPath('userData'), OPEN_DOCUMENTS_FILE)
/** only the instance holding the single-instance lock may write or remove the registry */
let ownsOpenDocumentsRegistry = false
let stopAuthWatch: (() => void) | null = null
const publishOpenDocumentsIfOwner = (paths: readonly string[]) => {
  if (ownsOpenDocumentsRegistry) publishOpenDocuments(OPEN_DOCUMENTS_PATH(), paths)
}

/** every open file: the shell's tabs plus the detached editor windows */
function publishAllOpenDocuments(): void {
  publishOpenDocumentsIfOwner([...(tabManager?.openFilePaths() ?? []), ...detachedFilePaths()])
}
setDetachedChangedListener(publishAllOpenDocuments)

let uiLang: Lang | null = null

function currentLang(): Lang {
  if (uiLang) return uiLang
  if (process.env.OFFICEVEGA_LANG) {
    uiLang = normalizeLang(process.env.OFFICEVEGA_LANG)
    setUiLang(uiLang)
    return uiLang
  }
  const saved = readAppSettings(APP_SETTINGS_PATH()).language
  if (isLang(saved)) uiLang = saved
  uiLang ??= normalizeLang(app.getLocale())
  setUiLang(uiLang)
  return uiLang
}

function persistLang(lang: Lang): void {
  // write first: app-settings.json can be unwritable, and a language committed to
  // memory before the write survives only until the next launch
  writeAppSettingThen(APP_SETTINGS_PATH(), 'language', lang, (persisted) => {
    uiLang = persisted
    setUiLang(persisted)
  })
}

let cachedUpdateChannel: UpdateChannel | null = null

function currentUpdateChannel(): UpdateChannel {
  if (cachedUpdateChannel) return cachedUpdateChannel
  const saved = readAppSettings(APP_SETTINGS_PATH()).updateChannel
  cachedUpdateChannel = isUpdateChannel(saved) ? saved : 'stable'
  return cachedUpdateChannel
}

let cachedTheme: UiTheme | null = null

function currentTheme(): UiTheme {
  if (cachedTheme) return cachedTheme
  const saved = readAppSettings(APP_SETTINGS_PATH()).theme
  cachedTheme = saved === 'light' || saved === 'dark' ? saved : 'system'
  return cachedTheme
}

let cachedDesign: UiDesign | null = null

function currentDesign(): UiDesign {
  if (cachedDesign) return cachedDesign
  const saved = readAppSettings(APP_SETTINGS_PATH()).design
  cachedDesign = saved === 'standard' || saved === 'retro' || saved === 'digital' ? saved : 'digital'
  return cachedDesign
}

let cachedUiScale: number | null = null

/**
 * Interface zoom factor (genoffice#1913): applied via webContents.setZoomFactor
 * so every chrome element scales; the editors divide their document zoom by it.
 * Defaults to 100% — the Windows display scale is not inherited (a 125% desktop
 * made every first launch oversized); explicit user choice persists in
 * app-settings.json.
 */
function currentUiScale(): number {
  if (cachedUiScale == null) cachedUiScale = readUiScale(APP_SETTINGS_PATH())
  return cachedUiScale
}

let cachedDocTheme: DocTheme | null = null

function currentDocTheme(): DocTheme {
  if (cachedDocTheme) return cachedDocTheme
  const saved = readAppSettings(APP_SETTINGS_PATH()).documentTheme
  cachedDocTheme =
    saved === 'light' || saved === 'dark' || saved === 'eyecare' ? saved : 'follow'
  return cachedDocTheme
}

/** user-chosen name for the home greeting; '' = derive it from the account email */
function currentDisplayName(): string {
  const saved = readAppSettings(APP_SETTINGS_PATH()).displayName
  return typeof saved === 'string' ? saved : ''
}

let cachedAutoSaveDefault: AutoSaveDefault | null = null

function currentAutoSaveDefault(): AutoSaveDefault {
  if (cachedAutoSaveDefault) return cachedAutoSaveDefault
  const saved = readAppSettings(APP_SETTINGS_PATH())
  const updatedAt = saved.autoSaveDefaultUpdatedAt
  cachedAutoSaveDefault = {
    on: saved.autoSaveDefault === true,
    updatedAt: typeof updatedAt === 'number' && updatedAt > 0 ? updatedAt : 0,
  }
  return cachedAutoSaveDefault
}

/** MCP server settings (persisted in userData/app-settings.json; default off). */
function currentMcpSettings(): McpSettings {
  const saved = readAppSettings(APP_SETTINGS_PATH())
  const port = saved.mcpPort
  return {
    enabled: saved.mcpEnabled === true,
    port:
      typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536
        ? port
        : DEFAULT_MCP_PORT,
    background: saved.mcpBackground === true,
    logging: saved.mcpLogging === true,
  }
}

let cachedAiPanelPrefs: AiPanelPrefs | null = null
function currentAiPanelPrefs(): AiPanelPrefs {
  if (cachedAiPanelPrefs) return cachedAiPanelPrefs
  const saved = readAppSettings(APP_SETTINGS_PATH())
  cachedAiPanelPrefs = normalizeAiPanelPrefs({
    side: saved.aiPanelSide,
    fontSize: saved.aiPanelFontSize,
    customFontSize: saved.aiPanelCustomFontSize,
    spellcheck: saved.aiPanelSpellcheck,
    openInNewDocs: saved.aiPanelOpenInNewDocs,
    showAiSidebar: saved.aiPanelShowSidebar ?? saved.aiPanelEnabled,
  })
  return cachedAiPanelPrefs
}

// VEGA keys/deposit dashboard opened from the account menu's deposit row.
// Kept main-side so the renderer never supplies the URL.
const CREDIT_USAGE_URL = 'https://api.vega.chat/dashboard'
// Settings → About link rows; kept main-side so the renderer never supplies the URL.
const OFFICEVEGA_SITE_URL = 'https://officevega.com'
const VEGA_API_URL = 'https://api.vega.chat'
const VEGA_MODELS_URL = 'https://api.vega.chat/aimodels'
// Settings → Account "Other AI services" row; the ru locale gets its own host.
const VEGA_CHAT_URL = 'https://vega.chat'
const VEGA_CHAT_RU_URL = 'https://ru.vega.chat'
// Settings → About "Other AI services" agent/editor rows share the VEGA Codes host.
const VEGA_CODES_URL = 'https://vega.codes'
const FEEDBACK_URL = 'https://officevega.com/feedback'
// Settings → About developer rows.
const DEVELOPER_SITE_URL = 'https://getmyai.io'
const DEVELOPER_CHANNEL_URL = 'https://t.me/getmyai'

// ---- "star us on GitHub" prompt (see star-prompt.ts for the rules) ----

const readStarPrompt = () =>
  asStarPromptState(readAppSettings(APP_SETTINGS_PATH())[STAR_PROMPT_KEY])
const writeStarPrompt = (state: ReturnType<typeof readStarPrompt>) =>
  writeAppSetting(APP_SETTINGS_PATH(), STAR_PROMPT_KEY, state)

/** set at startup when this is the first launch after an upgrade; consumed by
 * the first starPromptShouldShow query of the session */
let upgradeStarPromptPending = false

/** a granted show, cached for the session: repeated queries (React StrictMode
 * double-effects, AppFrame remounts) must return the same answer instead of
 * burning another lifetime show or flipping to a snoozed "false" */
let starPromptSessionGrant: StarPromptShow | null = null

/** every successful document open counts toward the prompt's value threshold */
function recordStarPromptDocOpen(): void {
  try {
    const state = readStarPrompt()
    const next = withDocOpen(state)
    if (next !== state) writeStarPrompt(next)
  } catch {
    // settings write failures must never break opening a document
  }
}

const tMain = createI18n({
  en: {
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    dlgAddFolderRoot: 'Add Folder to Home',
    watchdogTitle: 'Document is using too many resources',
    watchdogBody:
      '"{title}" has been using a lot of memory or CPU for several minutes ({memory} MB, {cpu}% CPU). You can keep waiting, or close the document (you will be asked to save unsaved changes first). Diagnostics have been recorded.',
    watchdogWait: 'Keep Waiting',
    watchdogClose: 'Close Document',
    errFolderRootUnusable: 'The selected folder cannot be read',
    menuFile: 'File',
    menuSectionNew: 'New',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    menuOpenInNewWindow: 'Open in New Window',
    menuNewDoc: 'Document',
    menuNewSheet: 'Spreadsheet',
    untitledSheet: 'Untitled Spreadsheet',
    untitledDoc: 'Untitled Document',
    untitledDeck: 'Untitled Presentation',
    untitledMarkdown: 'Untitled Markdown',
    untitledHtml: 'Untitled HTML',
    untitledPdf: 'Untitled PDF',
    menuNewSlide: 'Slides',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'Export as PDF…',
    menuExportImages: 'Export as Images…',
    menuExportHtml: 'Export as Single-File HTML…',
    menuOpenInDocs: 'Convert and Open in Docs',
    menuPrint: 'Print…',
    menuOpen: 'Open…',
    menuSave: 'Save',
    menuSaveAs: 'Save As…',
    menuClose: 'Close',
    menuEdit: 'Edit',
    menuWindow: 'Window',
    menuHome: 'Home',
    backToHome: 'Back to Home',
    dlgOpenTitle: 'Open File',
    filterSupported: 'Supported Files',
    filterWord: 'Word Documents',
    filterExcel: 'Excel Workbooks',
    filterPpt: 'PowerPoint Presentations',
    filterMarkdown: 'Text Files (Markdown, TXT, JSON)',
    filterHtml: 'HTML Documents',
    filterPdf: 'PDF Documents',
    errBadArgs: 'Invalid arguments',
    errBadName: 'Invalid file name',
    errBadExtension: 'That extension is not supported, and the file would no longer open',
    errMissing: 'File not found',
    errExists: 'A file with that name already exists',
    errRenameFailed: 'Rename failed',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    errNewTabFailed: 'Could not create the new document',
    errDuplicateFailed: 'Could not duplicate the file',
    errUnsupportedExt: '.{ext} files are not supported',
    copySuffix: 'copy',
    menuHelp: 'Help',
    menuUserGuide: 'User Guide',
    thirdPartyNotices: 'Third-Party Notices',
    menuExportDocx: 'Export as Word…',
    btnCancel: 'Cancel',
    pdfDocxFailedMsg: 'Export as Word failed',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfDocxBusyMsg: 'A Word export is already in progress. Please wait for it to finish.',
    menuExportPptx: 'Export as PowerPoint…',
    pdfPptxFailedMsg: 'Export as PowerPoint failed',
    pdfPptxBusyMsg: 'An export is already in progress. Please wait for it to finish.',
    pdfPptxLocalScannedDetail:
      'Each page was exported as a full-page image; the text on the slides is not editable.',
    menuExportXlsx: 'Export as Excel…',
    pdfXlsxFailedMsg: 'Export as Excel failed',
    pdfXlsxBusyMsg: 'An export is already in progress. Please wait for it to finish.',
    pdfXlsxLocalScannedDetail:
      "Scanned pages cannot be converted to cells; each page's worksheet carries a notice row instead.",
    pdfXlsxLocalSkippedMsg: 'Some pages were not converted to cells',
    pdfXlsxLocalSkippedDetail:
      'Pages {pages} could not be converted to cells; their worksheets carry a notice row instead.',
    pdfDocxLocalScannedMsg: 'Scanned document detected',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
    pdfDocxLocalScannedDetail:
      'The pages were exported as images to preserve their appearance; no editable text could be recognized.',
    pdfDocxLocalDegradedMsg: 'Some pages were exported as images',
    pdfDocxLocalDegradedDetail:
      'Page(s) {pages} could not be reliably reconstructed and were exported as full-page images.',
    pdfDocxLocalOcrMsg: 'Scanned pages converted to editable text',
    pdfDocxLocalOcrDetail:
      'Page(s) {pages} were scans; their text was recovered with on-device OCR. Please proofread the result.',
    pdfDocxLocalEncryptedDetail:
      'This PDF is encrypted and could not be opened without the correct password.',
    pdfDocxLocalUnsupportedEncDetail:
      'This PDF uses certificate-based or otherwise unsupported encryption and cannot be converted.',
    pdfPwdTitle: 'Enter Password',
    pdfPwdPrompt: 'This PDF is encrypted. Enter the password to open it:',
    pdfPwdRetryPrompt: 'Incorrect password. Please try again.',
    pdfPwdOk: 'OK',
    pdfPwdVerifying: 'Verifying password…',
    pdfPwdLabel: 'Password',
    pdfPwdPlaceholder: 'Enter the open password',
    pdfPwdShow: 'Show password',
    pdfPwdHide: 'Hide password',
    pdfDocxLocalCorruptDetail: 'The file is damaged or not a valid PDF and cannot be converted.',
    dlgPickSaveDir: 'Choose Default Save Location',
    errSaveDirUnusable:
      'The selected folder is not writable and cannot be used as the default save location',
    menuSettings: 'Settings…',
    menuWelcome: 'Welcome',
  },
  ru: {
    menuTabSave: 'Сохранить',
    menuTabSaveAs: 'Сохранить как…',
    menuTabPrint: 'Печать…',
    menuTabRename: 'Переименовать',
    menuTabDuplicate: 'Создать копию (сохранённый файл)',
    menuTabSplitBeside: 'Разделить экран',
    menuTabCopyPath: 'Копировать путь',
    menuTabCopyName: 'Копировать имя файла',
    menuTabReveal: 'Показать в папке',
    menuTabOpenDefault: 'Открыть в приложении по умолчанию',
    menuTabMoveLeft: 'Переместить влево',
    menuTabMoveRight: 'Переместить вправо',
    menuTabCloseOthers: 'Закрыть другие вкладки',
    menuTabCloseRight: 'Закрыть вкладки справа',
    menuTabCloseAll: 'Закрыть все вкладки',
    menuTabReopen: 'Открыть закрытую вкладку',
    dlgAddFolderRoot: 'Добавить папку на главную',
    watchdogTitle: 'Документ потребляет слишком много ресурсов',
    watchdogBody:
      '«{title}» уже несколько минут использует много памяти или процессора ({memory} МБ, {cpu}% CPU). Можно подождать ещё или закрыть документ (при несохранённых изменениях сначала будет предложено сохранить). Диагностика записана.',
    watchdogWait: 'Подождать',
    watchdogClose: 'Закрыть документ',
    errFolderRootUnusable: 'Не удалось прочитать выбранную папку',
    menuFile: 'Файл',
    menuSectionNew: 'Создать',
    menuOpenInNewWindow: 'Открыть в новом окне',
    menuNewDoc: 'Документ',
    menuNewSheet: 'Таблица',
    untitledSheet: 'Таблица без названия',
    untitledDoc: 'Документ без названия',
    untitledDeck: 'Презентация без названия',
    untitledMarkdown: 'Markdown без названия',
    untitledHtml: 'HTML без названия',
    untitledPdf: 'PDF без названия',
    menuNewSlide: 'Слайды',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'Экспортировать в PDF…',
    menuExportImages: 'Экспорт в изображения…',
    menuExportHtml: 'Экспортировать в один файл HTML…',
    menuOpenInDocs: 'Преобразовать и открыть в Docs',
    menuPrint: 'Печать…',
    menuOpen: 'Открыть…',
    menuSave: 'Сохранить',
    menuSaveAs: 'Сохранить как…',
    menuClose: 'Закрыть',
    menuEdit: 'Правка',
    menuView: 'Вид',
    menuUiZoomIn: 'Увеличить интерфейс',
    menuUiZoomOut: 'Уменьшить интерфейс',
    menuUiZoomReset: 'Сбросить масштаб интерфейса к 100%',
    menuWindow: 'Окно',
    menuHome: 'Главная',
    backToHome: 'Вернуться на главную',
    dlgOpenTitle: 'Открытие файла',
    filterSupported: 'Поддерживаемые файлы',
    filterWord: 'Документы Word',
    filterExcel: 'Книги Excel',
    filterPpt: 'Презентации PowerPoint',
    filterMarkdown: 'Текстовые файлы (Markdown, TXT, JSON)',
    filterHtml: 'Документы HTML',
    filterPdf: 'Документы PDF',
    errBadArgs: 'Недопустимые аргументы',
    errBadName: 'Недопустимое имя файла',
    errBadExtension: 'Это расширение не поддерживается, и файл больше не откроется',
    errMissing: 'Файл не найден',
    errExists: 'Файл с таким именем уже существует',
    errRenameFailed: 'Не удалось переименовать',
    errPdfSaveAsFailed: 'Не удалось сохранить копию PDF',
    errNewTabFailed: 'Не удалось создать новый документ',
    errDuplicateFailed: 'Не удалось создать копию файла',
    errUnsupportedExt: 'файлы .{ext} не поддерживаются',
    copySuffix: 'копия',
    menuHelp: 'Справка',
    menuUserGuide: 'Руководство пользователя',
    thirdPartyNotices: 'Уведомления о стороннем ПО',
    menuExportDocx: 'Экспортировать в Word…',
    btnCancel: 'Отмена',
    pdfDocxFailedMsg: 'Не удалось экспортировать в Word',
    pdfConvertFailedMsg: 'Не удалось экспортировать в Markdown / HTML',
    pdfDocxBusyMsg: 'Экспорт в Word уже выполняется. Дождитесь его завершения.',
    menuExportPptx: 'Экспортировать в PowerPoint…',
    pdfPptxFailedMsg: 'Не удалось экспортировать в PowerPoint',
    pdfPptxBusyMsg: 'Экспорт уже выполняется. Дождитесь его завершения.',
    pdfPptxLocalScannedDetail:
      'Каждая страница экспортирована как изображение; текст на слайдах нельзя редактировать.',
    menuExportXlsx: 'Экспортировать в Excel…',
    pdfXlsxFailedMsg: 'Не удалось экспортировать в Excel',
    pdfXlsxBusyMsg: 'Экспорт уже выполняется. Дождитесь его завершения.',
    pdfXlsxLocalScannedDetail:
      'Отсканированные страницы нельзя преобразовать в ячейки; на листе каждой страницы добавлена строка с уведомлением.',
    pdfXlsxLocalSkippedMsg: 'Некоторые страницы не были преобразованы в ячейки',
    pdfXlsxLocalSkippedDetail:
      'Страницы {pages} не удалось преобразовать в ячейки; на их листах добавлена строка с уведомлением.',
    pdfDocxLocalScannedMsg: 'Обнаружен отсканированный документ',
    pdfMdLocalMissingMsg: 'В Markdown отсутствует часть содержимого',
    pdfMdLocalScannedDetail:
      'Редактируемый текст распознать не удалось, поэтому файл Markdown не содержит полезного содержимого.',
    pdfMdLocalDroppedDetail:
      'Страницы {pages} не удалось надёжно восстановить; Markdown не может содержать изображения, поэтому их содержимое отсутствует.',
    pdfDocxLocalScannedDetail:
      'Страницы экспортированы как изображения, чтобы сохранить их вид. Редактируемый текст распознать не удалось.',
    pdfDocxLocalDegradedMsg: 'Некоторые страницы экспортированы как изображения',
    pdfDocxLocalDegradedDetail:
      'Страницы {pages} не удалось надёжно реконструировать; они экспортированы как полностраничные изображения.',
    pdfDocxLocalOcrMsg: 'Отсканированные страницы преобразованы в редактируемый текст',
    pdfDocxLocalOcrDetail:
      'Страницы {pages} были сканами; текст восстановлен локальным OCR. Проверьте результат.',
    pdfDocxLocalEncryptedDetail:
      'Этот PDF зашифрован, и его не удалось открыть без правильного пароля.',
    pdfDocxLocalUnsupportedEncDetail:
      'Этот PDF использует шифрование на основе сертификата или другое неподдерживаемое шифрование и не может быть преобразован.',
    pdfPwdTitle: 'Введите пароль',
    pdfPwdPrompt: 'Этот PDF зашифрован. Введите пароль, чтобы открыть его:',
    pdfPwdRetryPrompt: 'Неверный пароль. Попробуйте ещё раз.',
    pdfPwdOk: 'ОК',
    pdfPwdVerifying: 'Проверка пароля…',
    pdfPwdLabel: 'Пароль',
    pdfPwdPlaceholder: 'Введите пароль для открытия',
    pdfPwdShow: 'Показать пароль',
    pdfPwdHide: 'Скрыть пароль',
    pdfDocxLocalCorruptDetail:
      'Файл повреждён или не является корректным PDF, преобразование невозможно.',
    dlgPickSaveDir: 'Выбрать папку сохранения по умолчанию',
    errSaveDirUnusable:
      'Выбранная папка недоступна для записи и не может использоваться как папка сохранения по умолчанию',
    menuSettings: 'Настройки…',
    menuWelcome: 'Приветствие',
  },
  uz: {
    menuFile: 'Fayl',
    menuSectionNew: 'Yangi',
    menuNewDoc: 'Hujjat',
    menuNewSheet: 'Elektron jadval',
    untitledSheet: 'Nomsiz elektron jadval',
    untitledDoc: 'Nomsiz hujjat',
    untitledDeck: 'Nomsiz taqdimot',
    untitledMarkdown: 'Nomsiz Markdown',
    untitledHtml: 'Nomsiz HTML',
    untitledPdf: 'Nomsiz PDF',
    menuNewSlide: 'Slaydlar',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF sifatida eksport qilish…',
    menuExportHtml: 'Bitta faylli HTML sifatida eksport qilish…',
    menuOpenInDocs: 'O‘zgartirish va Docs’da ochish',
    menuPrint: 'Chop etish…',
    menuOpen: 'Ochish…',
    menuSave: 'Saqlash',
    menuSaveAs: 'Boshqa nom bilan saqlash…',
    menuClose: 'Yopish',
    menuEdit: 'Tahrirlash',
    menuWindow: 'Oyna',
    menuHome: 'Bosh sahifa',
    backToHome: 'Bosh sahifaga qaytish',
    menuSettings: 'Sozlamalar…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Faylni ochish',
    filterSupported: 'Qo‘llab-quvvatlanadigan fayllar',
    filterWord: 'Word hujjatlari',
    filterExcel: 'Excel ish kitoblari',
    filterPpt: 'PowerPoint taqdimotlari',
    filterMarkdown: 'Markdown hujjatlari',
    filterHtml: 'HTML hujjatlari',
    filterPdf: 'PDF hujjatlari',
    errBadArgs: 'Noto‘g‘ri argumentlar',
    errBadName: 'Noto‘g‘ri fayl nomi',
    errMissing: 'Fayl topilmadi',
    errExists: 'Bu nomdagi fayl allaqachon mavjud',
    errRenameFailed: 'Qayta nomlash amalga oshmadi',
    errNewTabFailed: 'Yangi hujjat yaratib bo‘lmadi',
    errUnsupportedExt: '.{ext} fayllar qo‘llab-quvvatlanmaydi',
    errBadExtension: 'Bu kengaytma qo‘llab-quvvatlanmaydi, fayl endi ochilmaydi',
    copySuffix: 'nusxa olish',
    menuHelp: 'Yordam',
    menuWelcome: 'Xush kelibsiz',
    menuUserGuide: 'Foydalanuvchi qoʻllanmasi',
    thirdPartyNotices: 'Uchinchi tomon bildirishnomalari',
    menuExportDocx: 'Word sifatida eksport qilish…',
    btnCancel: 'Bekor qilish',
    pdfDocxFailedMsg: 'Word sifatida eksport qilish muvaffaqiyatsiz tugadi',
    pdfDocxBusyMsg: 'Word sifatida eksport qilish allaqachon davom etmoqda. Tugashini kuting.',
    menuExportPptx: 'PowerPoint sifatida eksport qilish…',
    pdfPptxFailedMsg: 'PowerPoint sifatida eksport qilish muvaffaqiyatsiz tugadi',
    pdfPptxBusyMsg: 'Eksport qilish allaqachon davom etmoqda. Tugashini kuting.',
    pdfPptxLocalScannedDetail:
      'Har bir sahifa to‘liq sahifa tasviri sifatida eksport qilindi; slaydlardagi matnni tahrirlab bo‘lmaydi.',
    menuExportXlsx: 'Excel sifatida eksport qilish…',
    pdfXlsxFailedMsg: 'Excel sifatida eksport qilish muvaffaqiyatsiz tugadi',
    pdfXlsxBusyMsg: 'Eksport qilish allaqachon davom etmoqda. Tugashini kuting.',
    pdfXlsxLocalScannedDetail:
      'Skanerlangan sahifalarni kataklarga aylantirib bo‘lmaydi; buning o‘rniga har bir sahifaning ish varag‘iga bildirishnoma qatori qo‘shildi.',
    pdfXlsxLocalSkippedMsg: 'Ayrim sahifalar kataklarga aylantirilmadi',
    pdfXlsxLocalSkippedDetail:
      '{pages} sahifani kataklarga aylantirib bo‘lmadi; ularning ish varaqlariga bildirishnoma qatori qo‘shildi.',
    pdfDocxLocalScannedMsg: 'Skanerlangan hujjat aniqlandi',
    pdfDocxLocalScannedDetail:
      'Ko‘rinishini saqlash uchun sahifalar tasvirlar sifatida eksport qilindi; tahrirlanadigan matn aniqlanmadi.',
    pdfDocxLocalDegradedMsg: 'Ayrim sahifalar tasvirlar sifatida eksport qilindi',
    pdfDocxLocalDegradedDetail:
      '{pages} sahifani ishonchli tarzda qayta tiklab bo‘lmadi va ular to‘liq sahifa tasvirlari sifatida eksport qilindi.',
    pdfDocxLocalOcrMsg: 'Skanerlangan sahifalar tahrirlanadigan matnga aylantirildi',
    pdfDocxLocalOcrDetail:
      '{pages} sahifa skanerlangan edi; ularning matni qurilmadagi OCR yordamida tiklandi. Natijani tekshirib chiqing.',
    pdfDocxLocalEncryptedDetail: 'Bu PDF shifrlangan va to‘g‘ri parolsiz ochib bo‘lmaydi.',
    pdfDocxLocalUnsupportedEncDetail:
      'Bu PDF sertifikat asosidagi yoki boshqa qo‘llab-quvvatlanmaydigan shifrlashdan foydalanadi va uni aylantirib bo‘lmaydi.',
    pdfPwdTitle: 'Parolni kiriting',
    pdfPwdPrompt: 'Bu PDF shifrlangan. Uni ochish uchun parolni kiriting:',
    pdfPwdRetryPrompt: 'Parol noto‘g‘ri. Qaytadan urinib ko‘ring.',
    pdfPwdOk: 'OK',
    pdfPwdVerifying: 'Parol tekshirilmoqda…',
    pdfPwdLabel: 'Parol',
    pdfPwdPlaceholder: 'Ochish parolini kiriting',
    pdfPwdShow: 'Parolni ko‘rsatish',
    pdfPwdHide: 'Parolni yashirish',
    pdfDocxLocalCorruptDetail:
      'Fayl shikastlangan yoki yaroqli PDF emas va uni aylantirib bo‘lmaydi.',
    dlgPickSaveDir: 'Standart saqlash joyini tanlang',
    errSaveDirUnusable:
      'Tanlangan jildga yozib bo‘lmaydi va undan standart saqlash joyi sifatida foydalanib bo‘lmaydi',
    dlgAddFolderRoot: 'Jildni Bosh sahifaga qoʻshish',
    errFolderRootUnusable: 'Tanlangan jild oʻqilmaydi',
    menuExportImages: 'Rasmlar sifatida eksport qilish…',
    menuOpenInNewWindow: 'Yangi oynada ochish',
    watchdogTitle: 'Hujjat juda koʻp resursdan foydalanmoqda',
    watchdogBody:
      '"{title}" bir necha daqiqa davomida koʻp xotira yoki CPU ishlatmoqda ({memory} MB, {cpu}% CPU). Kutilishda davom etish yoki hujjatni yopish mumkin (saqlanmagan oʻzgarishlarni saqlash taklif etiladi). Diagnostika yozib olindi.',
    watchdogWait: 'Kutishda davom etish',
    watchdogClose: 'Hujjatni yopish',
    errDuplicateFailed: 'Fayl nusxasi yaratilmadi',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  kk: {
    menuFile: 'Файл',
    menuSectionNew: 'Жаңа',
    menuNewDoc: 'Құжат',
    menuNewSheet: 'Электрондық кесте',
    untitledSheet: 'Атаусыз электрондық кесте',
    untitledDoc: 'Атаусыз құжат',
    untitledDeck: 'Атаусыз презентация',
    untitledMarkdown: 'Атаусыз Markdown',
    untitledHtml: 'Атаусыз HTML',
    untitledPdf: 'Атаусыз PDF',
    menuNewSlide: 'Слайдтар',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF ретінде экспорттау…',
    menuExportHtml: 'Бір файлды HTML ретінде экспорттау…',
    menuOpenInDocs: 'Docs ішінде түрлендіріп ашу',
    menuPrint: 'Басып шығару…',
    menuOpen: 'Ашу…',
    menuSave: 'Сақтау',
    menuSaveAs: 'Басқаша сақтау…',
    menuClose: 'Жабу',
    menuEdit: 'Өңдеу',
    menuWindow: 'Терезе',
    menuHome: 'Басты',
    backToHome: 'Басты бетке оралу',
    menuSettings: 'Параметрлер…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Файлды ашу',
    filterSupported: 'Қолдау көрсетілетін файлдар',
    filterWord: 'Word құжаттары',
    filterExcel: 'Excel жұмыс кітаптары',
    filterPpt: 'PowerPoint презентациялары',
    filterMarkdown: 'Markdown құжаттары',
    filterHtml: 'HTML құжаттары',
    filterPdf: 'PDF құжаттары',
    errBadArgs: 'Жарамсыз аргументтер',
    errBadName: 'Жарамсыз файл атауы',
    errMissing: 'Файл табылмады',
    errExists: 'Бұл атаумен файл бұрыннан бар',
    errRenameFailed: 'Атын өзгерту сәтсіз аяқталды',
    errNewTabFailed: 'Жаңа құжатты жасау мүмкін болмады',
    errUnsupportedExt: '.{ext} файлдарына қолдау көрсетілмейді',
    errBadExtension: 'Бұл кеңейтімге қолдау көрсетілмейді, файл енді ашылмайды',
    copySuffix: 'көшірме',
    menuHelp: 'Анықтама',
    menuWelcome: 'Қош келдіңіз',
    menuUserGuide: 'Пайдаланушы нұсқаулығы',
    thirdPartyNotices: 'Үшінші тарап туралы ескертулер',
    menuExportDocx: 'Word ретінде экспорттау…',
    btnCancel: 'Бас тарту',
    pdfDocxFailedMsg: 'Word ретінде экспорттау сәтсіз аяқталды',
    pdfDocxBusyMsg: 'Word ретінде экспорттау орындалып жатыр. Аяқталғанша күтіңіз.',
    menuExportPptx: 'PowerPoint ретінде экспорттау…',
    pdfPptxFailedMsg: 'PowerPoint ретінде экспорттау сәтсіз аяқталды',
    pdfPptxBusyMsg: 'Экспорттау орындалып жатыр. Аяқталғанша күтіңіз.',
    pdfPptxLocalScannedDetail:
      'Әр бет толық бет суреті ретінде экспортталды; слайдтардағы мәтінді өңдеу мүмкін емес.',
    menuExportXlsx: 'Excel ретінде экспорттау…',
    pdfXlsxFailedMsg: 'Excel ретінде экспорттау сәтсіз аяқталды',
    pdfXlsxBusyMsg: 'Экспорттау орындалып жатыр. Аяқталғанша күтіңіз.',
    pdfXlsxLocalScannedDetail:
      'Сканерленген беттерді ұяшықтарға түрлендіру мүмкін емес; оның орнына әр беттің жұмыс парағында ескерту жолы бар.',
    pdfXlsxLocalSkippedMsg: 'Кейбір беттер ұяшықтарға түрлендірілмеді',
    pdfXlsxLocalSkippedDetail:
      '{pages} беті ұяшықтарға түрлендірілмеді; олардың жұмыс парақтарында ескерту жолы бар.',
    pdfDocxLocalScannedMsg: 'Сканерленген құжат анықталды',
    pdfDocxLocalScannedDetail:
      'Беттер сыртқы көрінісін сақтау үшін суреттер ретінде экспортталды; өңделетін мәтін танылмады.',
    pdfDocxLocalDegradedMsg: 'Кейбір беттер суреттер ретінде экспортталды',
    pdfDocxLocalDegradedDetail:
      '{pages} беті сенімді түрде қайта жасалмады және толық бет суреттері ретінде экспортталды.',
    pdfDocxLocalOcrMsg: 'Сканерленген беттер өңделетін мәтінге түрлендірілді',
    pdfDocxLocalOcrDetail:
      '{pages} беті сканерленген; олардың мәтіні құрылғыдағы OCR арқылы қалпына келтірілді. Нәтижені тексеріңіз.',
    pdfDocxLocalEncryptedDetail: 'Бұл PDF шифрланған және дұрыс құпиясөзсіз ашылмады.',
    pdfDocxLocalUnsupportedEncDetail:
      'Бұл PDF сертификатқа негізделген немесе басқа да қолдау көрсетілмейтін шифрлауды пайдаланады, сондықтан оны түрлендіру мүмкін емес.',
    pdfPwdTitle: 'Құпиясөзді енгізу',
    pdfPwdPrompt: 'Бұл PDF шифрланған. Оны ашу үшін құпиясөзді енгізіңіз:',
    pdfPwdRetryPrompt: 'Құпиясөз дұрыс емес. Қайталап көріңіз.',
    pdfPwdOk: 'OK',
    pdfPwdVerifying: 'Құпиясөз тексерілуде…',
    pdfPwdLabel: 'Құпиясөз',
    pdfPwdPlaceholder: 'Ашу құпиясөзін енгізіңіз',
    pdfPwdShow: 'Құпиясөзді көрсету',
    pdfPwdHide: 'Құпиясөзді жасыру',
    pdfDocxLocalCorruptDetail:
      'Файл зақымдалған немесе жарамды PDF емес, сондықтан оны түрлендіру мүмкін емес.',
    dlgPickSaveDir: 'Әдепкі сақтау орнын таңдау',
    errSaveDirUnusable:
      'Таңдалған қалтаға жазу мүмкін емес, оны әдепкі сақтау орны ретінде пайдалану мүмкін емес',
    dlgAddFolderRoot: 'Қалтаны Басты бетке қосу',
    errFolderRootUnusable: 'Таңдалған қалта оқылмайды',
    menuExportImages: 'Суреттер түрінде экспорттау…',
    menuOpenInNewWindow: 'Жаңа терезеде ашу',
    watchdogTitle: 'Құжат тым көп ресурс пайдалануда',
    watchdogBody:
      '«{title}» бірнеше минут бойы жад немесе CPU-ды көп пайдаланып келеді ({memory} МБ, {cpu}% CPU). Күте беруге немесе құжатты жабуға болады (сақталмаған өзгерістерді сақтау ұсынылады). Диагностика жазылды.',
    watchdogWait: 'Күте беру',
    watchdogClose: 'Құжатты жабу',
    errDuplicateFailed: 'Файлдың көшірмесін жасау мүмкін болмады',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  az: {
    menuFile: 'Fayl',
    menuSectionNew: 'Yeni',
    menuNewDoc: 'Sənəd',
    menuNewSheet: 'Elektron cədvəl',
    untitledSheet: 'Adsız cədvəl',
    untitledDoc: 'Adsız sənəd',
    untitledDeck: 'Adsız təqdimat',
    untitledMarkdown: 'Adsız Markdown',
    untitledHtml: 'Adsız HTML',
    untitledPdf: 'Adsız PDF',
    menuNewSlide: 'Slaydlar',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF kimi ixrac et…',
    menuExportHtml: 'Tək fayllı HTML kimi ixrac et…',
    menuOpenInDocs: 'Çevir və Docs-da aç',
    menuPrint: 'Çap et…',
    menuOpen: 'Aç…',
    menuSave: 'Saxla',
    menuSaveAs: 'Başqa adla saxla…',
    menuClose: 'Bağla',
    menuEdit: 'Redaktə edin',
    menuWindow: 'Pəncərə',
    menuHome: 'Əsas',
    backToHome: 'Əsas səhifəyə qayıt',
    menuSettings: 'Ayarlar…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Faylı aç',
    filterSupported: 'Dəstəklənən fayllar',
    filterWord: 'Word sənədləri',
    filterExcel: 'Excel iş kitabları',
    filterPpt: 'PowerPoint təqdimatları',
    filterMarkdown: 'Markdown sənədləri',
    filterHtml: 'HTML sənədləri',
    filterPdf: 'PDF sənədləri',
    errBadArgs: 'Arqumentlər etibarsızdır',
    errBadName: 'Fayl adı etibarsızdır',
    errMissing: 'Fayl tapılmadı',
    errExists: 'Bu adda fayl artıq mövcuddur',
    errRenameFailed: 'Ad dəyişdirilmədi',
    errNewTabFailed: 'Yeni sənəd yaratmaq mümkün olmadı',
    errUnsupportedExt: '.{ext} faylları dəstəklənmir',
    errBadExtension: 'Bu genişlənmə dəstəklənmir və fayl artıq açılmayacaq',
    copySuffix: 'surət',
    menuHelp: 'Kömək',
    menuWelcome: 'Xoş gəldiniz',
    menuUserGuide: 'İstifadəçi təlimatı',
    thirdPartyNotices: 'Üçüncü tərəf bildirişləri',
    menuExportDocx: 'Word kimi ixrac et…',
    btnCancel: 'Ləğv et',
    pdfDocxFailedMsg: 'Word kimi ixrac etmək alınmadı',
    pdfDocxBusyMsg: 'Word ixracı artıq davam edir. Tamamlanmasını gözləyin.',
    menuExportPptx: 'PowerPoint kimi ixrac et…',
    pdfPptxFailedMsg: 'PowerPoint kimi ixrac etmək alınmadı',
    pdfPptxBusyMsg: 'İxrac artıq davam edir. Tamamlanmasını gözləyin.',
    pdfPptxLocalScannedDetail:
      'Hər səhifə tam səhifə şəkli kimi ixrac edildi; slaydlardakı mətn redaktə edilə bilməz.',
    menuExportXlsx: 'Excel kimi ixrac et…',
    pdfXlsxFailedMsg: 'Excel kimi ixrac etmək alınmadı',
    pdfXlsxBusyMsg: 'İxrac artıq davam edir. Tamamlanmasını gözləyin.',
    pdfXlsxLocalScannedDetail:
      'Skan edilmiş səhifələr xanalara çevrilə bilməz; bunun əvəzinə hər səhifənin iş vərəqinə bildiriş sətri əlavə edilir.',
    pdfXlsxLocalSkippedMsg: 'Bəzi səhifələr xanalara çevrilmədi',
    pdfXlsxLocalSkippedDetail:
      '{pages} səhifəsi xanalara çevrilə bilmədi; bunun əvəzinə onların iş vərəqlərinə bildiriş sətri əlavə edilir.',
    pdfDocxLocalScannedMsg: 'Skan edilmiş sənəd aşkarlandı',
    pdfDocxLocalScannedDetail:
      'Səhifələr görünüşü qorumaq üçün şəkil kimi ixrac edildi; redaktə edilə bilən mətn tanınmadı.',
    pdfDocxLocalDegradedMsg: 'Bəzi səhifələr şəkil kimi ixrac edildi',
    pdfDocxLocalDegradedDetail:
      '{pages} səhifəsi etibarlı şəkildə yenidən qurula bilmədi və tam səhifə şəkli kimi ixrac edildi.',
    pdfDocxLocalOcrMsg: 'Skan edilmiş səhifələr redaktə edilə bilən mətnə çevrildi',
    pdfDocxLocalOcrDetail:
      '{pages} səhifəsi skan edilmişdi; mətnləri cihazdaxili OCR ilə bərpa edildi. Nəticəni yoxlayın.',
    pdfDocxLocalEncryptedDetail: 'Bu PDF şifrələnib və düzgün parol olmadan açıla bilmədi.',
    pdfDocxLocalUnsupportedEncDetail:
      'Bu PDF sertifikat əsaslı və ya başqa şəkildə dəstəklənməyən şifrələmədən istifadə edir və çevrilə bilməz.',
    pdfPwdTitle: 'Parolu daxil edin',
    pdfPwdPrompt: 'Bu PDF şifrələnib. Açmaq üçün parolu daxil edin:',
    pdfPwdRetryPrompt: 'Parol səhvdir. Yenidən cəhd edin.',
    pdfPwdOk: 'OK',
    pdfPwdVerifying: 'Parol yoxlanılır…',
    pdfPwdLabel: 'Parol',
    pdfPwdPlaceholder: 'Açılış parolunu daxil edin',
    pdfPwdShow: 'Parolu göstər',
    pdfPwdHide: 'Parolu gizlət',
    pdfDocxLocalCorruptDetail: 'Fayl zədələnib və ya etibarlı PDF deyil; çevrilə bilməz.',
    dlgPickSaveDir: 'Defolt yadda saxlama məkanını seçin',
    errSaveDirUnusable:
      'Seçilmiş qovluğa yazmaq mümkün deyil və o, standart saxlama yeri kimi istifadə edilə bilməz',
    dlgAddFolderRoot: 'Qovluğu Ana səhifəyə əlavə et',
    errFolderRootUnusable: 'Seçilmiş qovluq oxuna bilmir',
    menuExportImages: 'Şəkillər kimi ixrac et…',
    menuOpenInNewWindow: 'Yeni pəncərədə aç',
    watchdogTitle: 'Sənəd çoxlu resurs istifadə edir',
    watchdogBody:
      '«{title}» bir neçə dəqiqədir çoxlu yaddaş və ya CPU istifadə edir ({memory} MB, {cpu}% CPU). Gözləməyə davam edə və ya sənədi bağlaya bilərsiniz (əvvəlcə saxlanılmamış dəyişiklikləri saxlamaq təklif olunacaq). Diaqnostika qeydə alındı.',
    watchdogWait: 'Gözləməyə davam et',
    watchdogClose: 'Sənədi bağla',
    errDuplicateFailed: 'Faylın dublikatını yaratmaq alınmadı',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  tk: {
    menuFile: 'Faýl',
    menuSectionNew: 'Täze',
    menuNewDoc: 'Resminama',
    menuNewSheet: 'Elektron tablisasy',
    untitledSheet: 'Atlandyrylmadyk elektron tablisa',
    untitledDoc: 'Atlandyrylmadyk resminama',
    untitledDeck: 'Ady bolmadyk prezentasiýa',
    untitledMarkdown: 'Atlandyrylmadyk Markdown',
    untitledHtml: 'Atlandyrylmadyk HTML',
    untitledPdf: 'Atlandyrylmadyk PDF',
    menuNewSlide: 'Slaýdlar',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF hökmünde eksport et…',
    menuExportHtml: 'Ýeke faýlly HTML görnüşinde eksport et…',
    menuOpenInDocs: 'Docs-da öwür we aç',
    menuPrint: 'Çap et…',
    menuOpen: 'Aç…',
    menuSave: 'Sakla',
    menuSaveAs: 'Başga at bilen ýatda sakla…',
    menuClose: 'Ýap',
    menuEdit: 'Redaktirle',
    menuWindow: 'Penjire',
    menuHome: 'Baş sahypa',
    backToHome: 'Baş sahypa dolan',
    menuSettings: 'Sazlamalar…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Faýly aç',
    filterSupported: 'Goldanýan faýllar',
    filterWord: 'Word resminamalary',
    filterExcel: 'Excel iş kitaplary',
    filterPpt: 'PowerPoint prezentasiýalary',
    filterMarkdown: 'Markdown resminamalary',
    filterHtml: 'HTML resminamalary',
    filterPdf: 'PDF resminamalary',
    errBadArgs: 'Nädogry argumentler',
    errBadName: 'Nädogry faýl ady',
    errMissing: 'Faýl tapylmady',
    errExists: 'Bu atly faýl eýýäm bar',
    errRenameFailed: 'Ady üýtgetmek başartmady',
    errNewTabFailed: 'Täze resminamany döredip bolmady',
    errUnsupportedExt: '.{ext} faýllary goldanylmaýar',
    errBadExtension: 'Bu giňeltme goldanylmaýar, faýl indi açylmaz',
    copySuffix: 'göçürme',
    menuHelp: 'Kömek',
    menuWelcome: 'Hoş geldiňiz',
    menuUserGuide: 'Ulanyjy gollanmasy',
    thirdPartyNotices: 'Üçünji tarap bildirişleri',
    menuExportDocx: 'Word görnüşinde eksport et…',
    btnCancel: 'Ýatyr',
    pdfDocxFailedMsg: 'Word görnüşinde eksport şowsuz boldy',
    pdfDocxBusyMsg: 'Word eksporty eýýäm dowam edýär. Gutararyna garaşyň.',
    menuExportPptx: 'PowerPoint görnüşinde eksport et…',
    pdfPptxFailedMsg: 'PowerPoint görnüşinde eksport şowsuz boldy',
    pdfPptxBusyMsg: 'Eksport eýýäm dowam edýär. Gutararyna garaşyň.',
    pdfPptxLocalScannedDetail:
      'Her sahypa doly sahypa suraty hökmünde eksport edildi; slaýdlardaky tekst redaktirlenip bilinmez.',
    menuExportXlsx: 'Excel görnüşinde eksport et…',
    pdfXlsxFailedMsg: 'Excel görnüşinde eksport şowsuz boldy',
    pdfXlsxBusyMsg: 'Eksport eýýäm dowam edýär. Gutararyna garaşyň.',
    pdfXlsxLocalScannedDetail:
      'Skanirlenen sahypalary öýjüklere öwürmek mümkin däl; her sahypanyň iş sahypasynda onuň ýerine bildiriş setiri bar.',
    pdfXlsxLocalSkippedMsg: 'Käbir sahypalar öýjüklere öwrülmedi',
    pdfXlsxLocalSkippedDetail:
      '{pages} sahypalary öýjüklere öwrüp bolmady; olaryň iş sahypalarynda bildiriş setiri bar.',
    pdfDocxLocalScannedMsg: 'Skanirlenen resminama tapyldy',
    pdfDocxLocalScannedDetail:
      'Görnüşini saklamak üçin sahypalar surat hökmünde eksport edildi; redaktirlenýän tekst tanalmady.',
    pdfDocxLocalDegradedMsg: 'Käbir sahypalar surat hökmünde eksport edildi',
    pdfDocxLocalDegradedDetail:
      '{pages} sahypany ygtybarly täzeden gurup bolmady we olar doly sahypa suratlary hökmünde eksport edildi.',
    pdfDocxLocalOcrMsg: 'Skanirlenen sahypalar redaktirlenýän tekste öwrüldi',
    pdfDocxLocalOcrDetail:
      '{pages} sahypa skanirlenipdi; olaryň teksti enjamdaky OCR arkaly dikeldildi. Netijäni barlaň.',
    pdfDocxLocalEncryptedDetail: 'Bu PDF şifrlenen we dogry parol bolmazdan açylyp bilinmedi.',
    pdfDocxLocalUnsupportedEncDetail:
      'Bu PDF şahadatnama esasly ýa-da başga görnüşde goldanylmaýan şifrlemäni ulanýar we öwrülip bilinmez.',
    pdfPwdTitle: 'Paroly giriziň',
    pdfPwdPrompt: 'Bu PDF şifrlenen. Açmak üçin paroly giriziň:',
    pdfPwdRetryPrompt: 'Parol nädogry. Täzeden synanyşyň.',
    pdfPwdOk: 'Bolýar',
    pdfPwdVerifying: 'Parol barlanýar…',
    pdfPwdLabel: 'Parol',
    pdfPwdPlaceholder: 'Açmak üçin paroly giriziň',
    pdfPwdShow: 'Paroly görkez',
    pdfPwdHide: 'Paroly gizle',
    pdfDocxLocalCorruptDetail: 'Faýl zaýalanan ýa-da dogry PDF däl, ony öwrüp bolmaýar.',
    dlgPickSaveDir: 'Bellenen ýatda saklama ýerini saýla',
    errSaveDirUnusable:
      'Saýlanan bukja ýazmak mümkin däl we ony deslapky ýatda saklama ýeri hökmünde ulanyp bolmaýar',
    dlgAddFolderRoot: 'Bujany Baş sahypa goşuň',
    errFolderRootUnusable: 'Saýlanan buja okalmaýar',
    menuExportImages: 'Suratlar hökmünde eksport ediň…',
    menuOpenInNewWindow: 'Täze penjirä açyň',
    watchdogTitle: 'Resminama gaty köp çeşme ulanyp dur',
    watchdogBody:
      '«{title}» birnäçe minutlap köp ýat ýa-da CPU ulanyp dur ({memory} MB, {cpu}% CPU). Garaşyp bilersiňiz ýa-da resminamany ýapyp bilersiňiz (saklanylmadyk üýtgeşmeleri saklamak teklip ediler). Diagnostika ýazyldy.',
    watchdogWait: 'Garaşyp durmak',
    watchdogClose: 'Resminamany ýap',
    errDuplicateFailed: 'Faýly göçürip bolmady',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  ky: {
    menuFile: 'Файл',
    menuSectionNew: 'Жаңы',
    menuNewDoc: 'Документ',
    menuNewSheet: 'Электрондук жадыбал',
    untitledSheet: 'Аталышы жок электрондук жадыбал',
    untitledDoc: 'Аталышы жок документ',
    untitledDeck: 'Аталышы жок презентация',
    untitledMarkdown: 'Аталышы жок Markdown',
    untitledHtml: 'Аталышы жок HTML',
    untitledPdf: 'Аталышы жок PDF',
    menuNewSlide: 'Слайддар',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF катары экспорттоо…',
    menuExportHtml: 'Бир файлдуу HTML катары экспорттоо…',
    menuOpenInDocs: 'Docs ичинде өзгөртүп, ачуу',
    menuPrint: 'Басып чыгаруу…',
    menuOpen: 'Ачуу…',
    menuSave: 'Сактоо',
    menuSaveAs: 'Башкача сактоо…',
    menuClose: 'Жабуу',
    menuEdit: 'Түзөтүү',
    menuWindow: 'Терезе',
    menuHome: 'Башкы бет',
    backToHome: 'Башкы бетке кайтуу',
    menuSettings: 'Жөндөөлөр…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Файлды ачуу',
    filterSupported: 'Колдоого алынган файлдар',
    filterWord: 'Word документтери',
    filterExcel: 'Excel иш китептери',
    filterPpt: 'PowerPoint презентациялары',
    filterMarkdown: 'Markdown документтери',
    filterHtml: 'HTML документтери',
    filterPdf: 'PDF документтери',
    errBadArgs: 'Жараксыз аргументтер',
    errBadName: 'Файлдын аты жараксыз',
    errMissing: 'Файл табылган жок',
    errExists: 'Мындай аталыштагы файл мурунтан бар',
    errRenameFailed: 'Атын өзгөртүү ишке ашкан жок',
    errNewTabFailed: 'Жаңы документти түзүү мүмкүн болгон жок',
    errUnsupportedExt: '.{ext} файлдары колдоого алынбайт',
    errBadExtension: 'Бул кеңейтме колдоого алынбайт, файл энди ачылбайт',
    copySuffix: 'көчүрмө',
    menuHelp: 'Жардам',
    menuWelcome: 'Кош келиңиз',
    menuUserGuide: 'Колдонуучу колдонмосу',
    thirdPartyNotices: 'Үчүнчү тараптын эскертүүлөрү',
    menuExportDocx: 'Word катары экспорттоо…',
    btnCancel: 'Жокко чыгаруу',
    pdfDocxFailedMsg: 'Word катары экспорттоо ишке ашкан жок',
    pdfDocxBusyMsg: 'Word катары экспорттоо мурунтан жүрүп жатат. Анын бүтүшүн күтө туруңуз.',
    menuExportPptx: 'PowerPoint катары экспорттоо…',
    pdfPptxFailedMsg: 'PowerPoint катары экспорттоо ишке ашкан жок',
    pdfPptxBusyMsg: 'Экспорттоо мурунтан жүрүп жатат. Анын бүтүшүн күтө туруңуз.',
    pdfPptxLocalScannedDetail:
      'Ар бир бет толук беттик сүрөт катары экспорттолду; слайддардагы текстти түзөтүү мүмкүн эмес.',
    menuExportXlsx: 'Excel катары экспорттоо…',
    pdfXlsxFailedMsg: 'Excel катары экспорттоо ишке ашкан жок',
    pdfXlsxBusyMsg: 'Экспорттоо мурунтан жүрүп жатат. Анын бүтүшүн күтө туруңуз.',
    pdfXlsxLocalScannedDetail:
      'Сканерленген беттерди уячаларга айландыруу мүмкүн эмес; анын ордуна ар бир беттин иш барагында эскертүү сабы бар.',
    pdfXlsxLocalSkippedMsg: 'Айрым беттер уячаларга айландырылган жок',
    pdfXlsxLocalSkippedDetail:
      '{pages} бетин уячаларга айландыруу мүмкүн болгон жок; алардын иш барактарында эскертүү сабы бар.',
    pdfDocxLocalScannedMsg: 'Сканерленген документ аныкталды',
    pdfDocxLocalScannedDetail:
      'Көрүнүшүн сактоо үчүн беттер сүрөттөр катары экспорттолду; түзөтүлүүчү текст таанылган жок.',
    pdfDocxLocalDegradedMsg: 'Айрым беттер сүрөттөр катары экспорттолду',
    pdfDocxLocalDegradedDetail:
      '{pages} бетин ишенимдүү түрдө кайра түзүү мүмкүн болгон жок жана алар толук беттик сүрөттөр катары экспорттолду.',
    pdfDocxLocalOcrMsg: 'Сканерленген беттер түзөтүлүүчү текстке айландырылды',
    pdfDocxLocalOcrDetail:
      '{pages} бет сканерленген; алардын тексти түзмөктөгү OCR аркылуу калыбына келтирилди. Натыйжаны текшерип чыгыңыз.',
    pdfDocxLocalEncryptedDetail: 'Бул PDF шифрленген жана туура сырсөзсүз ачылган жок.',
    pdfDocxLocalUnsupportedEncDetail:
      'Бул PDF сертификатка негизделген же башка колдоого алынбаган шифрлөөнү колдонот жана аны айландыруу мүмкүн эмес.',
    pdfPwdTitle: 'Сырсөздү киргизүү',
    pdfPwdPrompt: 'Бул PDF шифрленген. Аны ачуу үчүн сырсөздү киргизиңиз:',
    pdfPwdRetryPrompt: 'Сырсөз туура эмес. Кайра аракет кылыңыз.',
    pdfPwdOk: 'ОК',
    pdfPwdVerifying: 'Сырсөз текшерилүүдө…',
    pdfPwdLabel: 'Сырсөз',
    pdfPwdPlaceholder: 'Ачуу сырсөзүн киргизиңиз',
    pdfPwdShow: 'Сырсөздү көрсөтүү',
    pdfPwdHide: 'Сырсөздү жашыруу',
    pdfDocxLocalCorruptDetail: 'Файл бузулган же жарактуу PDF эмес, аны айландыруу мүмкүн эмес.',
    dlgPickSaveDir: 'Демейки сактоо ордун тандоо',
    errSaveDirUnusable:
      'Тандалган папкага жазууга болбойт, аны демейки сактоо жайгашкан жери катары колдонууга мүмкүн эмес',
    dlgAddFolderRoot: 'Папканы Башкы бетке кошуу',
    errFolderRootUnusable: 'Тандалган папка окулбайт',
    menuExportImages: 'Сүрөттөр катары экспорттоо…',
    menuOpenInNewWindow: 'Жаңа терезеде ачуу',
    watchdogTitle: 'Документ өтө көп ресурс колдонуп жатат',
    watchdogBody:
      '«{title}» бир нече мүнөттөн бери эс тутумду же CPU-ду көп колдонуп келет ({memory} МБ, {cpu}% CPU). Күтө берсеңиз же документти жапсаңыз болот (сакталбаган өзгөртүүлөрдү сактоо сунушталат). Диагностика жазылды.',
    watchdogWait: 'Күтө берүү',
    watchdogClose: 'Документти жабуу',
    errDuplicateFailed: 'Файлдын көчүрмөсүн түзүү мүмкүн болбоду',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  tt: {
    menuFile: 'Файл',
    menuSectionNew: 'Яңа',
    menuNewDoc: 'Документ',
    menuNewSheet: 'Электрон таблица',
    untitledSheet: 'Исемсез электрон таблица',
    untitledDoc: 'Исемсез документ',
    untitledDeck: 'Исемсез презентация',
    untitledMarkdown: 'Исемсез Markdown',
    untitledHtml: 'Исемсез HTML',
    untitledPdf: 'Исемсез PDF',
    menuNewSlide: 'Слайдлар',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF итеп экспортлау…',
    menuExportHtml: 'Бер файллы HTML итеп экспортлау…',
    menuOpenInDocs: 'Docs-та конвертацияләү һәм ачу',
    menuPrint: 'Бастыру…',
    menuOpen: 'Ачу…',
    menuSave: 'Саклау',
    menuSaveAs: 'Башкача сакларга…',
    menuClose: 'Ябу',
    menuEdit: 'Үзгәртү',
    menuWindow: 'Тәрәзә',
    menuHome: 'Баш бит',
    backToHome: 'Баш биткә кайтырга',
    menuSettings: 'Көйләүләр…',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    dlgOpenTitle: 'Файл ачарга',
    filterSupported: 'Ярдәм ителгән файллар',
    filterWord: 'Word документлары',
    filterExcel: 'Excel эш дәфтәрләре',
    filterPpt: 'PowerPoint презентацияләре',
    filterMarkdown: 'Markdown документлары',
    filterHtml: 'HTML документлары',
    filterPdf: 'PDF документлары',
    errBadArgs: 'Аргументлар дөрес түгел',
    errBadName: 'Файл исеме дөрес түгел',
    errMissing: 'Файл табылмады',
    errExists: 'Бу исемле файл инде бар',
    errRenameFailed: 'Исемне үзгәртү мөмкин булмады',
    errNewTabFailed: 'Яңа документ булдырып булмады',
    errUnsupportedExt: '.{ext} файлларына ярдәм ителми',
    errBadExtension: 'Бу киңәйтмә ярдәм ителми, файл энди ачылмаячак',
    copySuffix: 'күчермәсен ясарга',
    menuHelp: 'Ярдәм',
    menuWelcome: 'Рәхим итегез',
    menuUserGuide: 'Кулланучы кулланмасы',
    thirdPartyNotices: 'Өченче яклар турындагы белдерүләр',
    menuExportDocx: 'Word форматында экспортлау…',
    btnCancel: 'Баш тарту',
    pdfDocxFailedMsg: 'Word форматында экспортлау уңышсыз',
    pdfDocxBusyMsg: 'Word форматында экспортлау инде бара. Тәмамланганын көтегез.',
    menuExportPptx: 'PowerPoint форматында экспортларга…',
    pdfPptxFailedMsg: 'PowerPoint форматында экспортлау уңышсыз',
    pdfPptxBusyMsg: 'Экспортлау инде бара. Тәмамланганын көтегез.',
    pdfPptxLocalScannedDetail:
      'Һәр бит тулы бит рәсеме буларак экспортланды; слайдлардагы текстны үзгәртеп булмый.',
    menuExportXlsx: 'Excel форматында экспортларга…',
    pdfXlsxFailedMsg: 'Excel форматында экспортлау уңышсыз',
    pdfXlsxBusyMsg: 'Экспортлау инде бара. Тәмамланганын көтегез.',
    pdfXlsxLocalScannedDetail:
      'Сканланган битләрне күзәнәкләргә әйләндереп булмый; һәр битнең эш таблицасында аның урынына искәрмә юлы бар.',
    pdfXlsxLocalSkippedMsg: 'Кайбер битләр күзәнәкләргә әйләндерелмәде',
    pdfXlsxLocalSkippedDetail:
      '{pages} битләрен күзәнәкләргә әйләндереп булмады; аларның эш таблицаларында аның урынына искәрмә юлы бар.',
    pdfDocxLocalScannedMsg: 'Сканланган документ ачыкланды',
    pdfDocxLocalScannedDetail:
      'Битләр тышкы күренешен саклау өчен рәсемнәр буларак экспортланды; үзгәртелә торган текст табылмады.',
    pdfDocxLocalDegradedMsg: 'Кайбер битләр рәсемнәр буларак экспортланды',
    pdfDocxLocalDegradedDetail:
      '{pages} битен ышанычлы рәвештә торгызып булмады һәм алар тулы бит рәсемнәре буларак экспортланды.',
    pdfDocxLocalOcrMsg: 'Сканланган битләр үзгәртелә торган текстка әйләндерелде',
    pdfDocxLocalOcrDetail:
      '{pages} бит сканланган иде; алардагы текст җайланмадагы OCR ярдәмендә торгызылды. Нәтиҗәне тикшерегез.',
    pdfDocxLocalEncryptedDetail: 'Бу PDF шифрланган һәм дөрес серсүзсез ачылмады.',
    pdfDocxLocalUnsupportedEncDetail:
      'Бу PDF сертификатка нигезләнгән яки башкача тәэмин ителмәгән шифрлау куллана, шуңа күрә аны әйләндереп булмый.',
    pdfPwdTitle: 'Серсүзне кертегез',
    pdfPwdPrompt: 'Бу PDF шифрланган. Ачу өчен серсүзне кертегез:',
    pdfPwdRetryPrompt: 'Серсүз дөрес түгел. Кабатлап карагыз.',
    pdfPwdOk: 'ОК',
    pdfPwdVerifying: 'Серсүз тикшерелә…',
    pdfPwdLabel: 'Серсүз',
    pdfPwdPlaceholder: 'Ачу серсүзен кертегез',
    pdfPwdShow: 'Серсүзне күрсәтү',
    pdfPwdHide: 'Серсүзне яшерү',
    pdfDocxLocalCorruptDetail:
      'Файл бозылган яки дөрес PDF түгел, шуңа күрә аны әйләндереп булмый.',
    dlgPickSaveDir: 'Килешү буенча саклау урынын сайлагыз',
    errSaveDirUnusable:
      'Сайланган папкага язу мөмкин түгел, аны килешү буенча саклау урыны итеп кулланып булмый',
    dlgAddFolderRoot: 'Папканы Баш биткә өстәү',
    errFolderRootUnusable: 'Сайланган папка укылмый',
    menuExportImages: 'Рәсемнәр итеп экспортлау…',
    menuOpenInNewWindow: 'Яңа тәрәзәдә ачу',
    watchdogTitle: 'Документ бик күп ресурс тота',
    watchdogBody:
      '«{title}» берничә минут дәвамында күп хәтер яки CPU куллана ({memory} МБ, {cpu}% CPU). Көтәргә дәвам итә яисә документны япарга була (сакланмаган үзгәрешләрне саклау тәкъдим ителер). Диагностика язып куелды.',
    watchdogWait: 'Көтүдә дәвам итү',
    watchdogClose: 'Документны ябу',
    errDuplicateFailed: 'Файлның күчермәсен ясап булмады',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
  ka: {
    menuFile: 'ფაილი',
    menuSectionNew: 'ახალი',
    menuNewDoc: 'დოკუმენტი',
    menuNewSheet: 'ელცხრილი',
    untitledSheet: 'უსათაურო Spreadsheet',
    untitledDoc: 'უსათაურო დოკუმენტი',
    untitledDeck: 'უსათაურო პრეზენტაცია',
    untitledMarkdown: 'უსათაურო Markdown',
    untitledHtml: 'უსათაურო HTML',
    untitledPdf: 'უსათაურო PDF',
    menuNewSlide: 'სლაიდები',
    menuNewMarkdown: 'Markdown',
    menuNewHtml: 'HTML',
    menuNewPdf: 'PDF',
    menuExportPdf: 'PDF-ად ექსპორტი…',
    menuExportHtml: 'ერთფაილიან HTML-ად ექსპორტი…',
    menuOpenInDocs: 'გადაყვანა და გახსნა Docs-ში',
    menuPrint: 'ბეჭდვა…',
    menuOpen: 'გახსნა…',
    menuSave: 'შენახვა',
    menuSaveAs: 'შენახვა როგორც…',
    menuClose: 'დახურვა',
    menuEdit: 'რედაქტირება',
    menuWindow: 'ფანჯარა',
    menuHome: 'მთავარი',
    backToHome: 'მთავარ გვერდზე დაბრუნება',
    menuSettings: 'პარამეტრები…',
    dlgOpenTitle: 'ფაილის გახსნა',
    filterSupported: 'მხარდაჭერილი ფაილები',
    filterWord: 'Word-ის დოკუმენტები',
    filterExcel: 'Excel-ის სამუშაო წიგნები',
    filterPpt: 'PowerPoint პრეზენტაციები',
    filterMarkdown: 'Markdown დოკუმენტები',
    filterHtml: 'HTML დოკუმენტები',
    filterPdf: 'PDF დოკუმენტები',
    errBadArgs: 'არასწორი არგუმენტები',
    errBadName: 'ფაილის სახელი არასწორია',
    errMissing: 'ფაილი ვერ მოიძებნა',
    errExists: 'ამ სახელის მქონე ფაილი უკვე არსებობს',
    errRenameFailed: 'სახელის გადარქმევა ვერ მოხერხდა',
    errNewTabFailed: 'ახალი დოკუმენტის შექმნა ვერ მოხერხდა',
    errUnsupportedExt: '.{ext} ფაილები მხარდაჭერილი არ არის',
    errBadExtension: 'ეს გაფართოება არ არის მხარდაჭერილი და ფაილი ვეღარ გაიხსნება',
    copySuffix: 'ასლი',
    menuHelp: 'დახმარება',
    menuWelcome: 'მოგესალმებით',
    menuUserGuide: 'მომხმარებლის სახელმძღვანელო',
    thirdPartyNotices: 'მესამე მხარის შეტყობინებები',
    menuExportDocx: 'Word-ად ექსპორტი…',
    btnCancel: 'გაუქმება',
    pdfDocxFailedMsg: 'Word-ად ექსპორტი ვერ მოხერხდა',
    pdfDocxBusyMsg: 'Word-ად ექსპორტი უკვე მიმდინარეობს. გთხოვთ, დაელოდოთ დასრულებას.',
    menuExportPptx: 'PowerPoint-ად ექსპორტი…',
    pdfPptxFailedMsg: 'PowerPoint-ად ექსპორტი ვერ მოხერხდა',
    pdfPptxBusyMsg: 'ექსპორტი უკვე მიმდინარეობს. გთხოვთ, დაელოდოთ დასრულებას.',
    pdfPptxLocalScannedDetail:
      'თითოეული გვერდი ექსპორტირებულია სრულგვერდიან სურათად; სლაიდებზე ტექსტის რედაქტირება შეუძლებელია.',
    menuExportXlsx: 'Excel-ად ექსპორტი…',
    pdfXlsxFailedMsg: 'Excel-ად ექსპორტი ვერ მოხერხდა',
    pdfXlsxBusyMsg: 'ექსპორტი უკვე მიმდინარეობს. გთხოვთ, დაელოდოთ დასრულებას.',
    pdfXlsxLocalScannedDetail:
      'დასკანერებული გვერდები უჯრებად ვერ გარდაიქმნა; თითოეული გვერდის worksheet-ის ნაცვლად დამატებულია შეტყობინების მწკრივი.',
    pdfXlsxLocalSkippedMsg: 'ზოგიერთი გვერდი უჯრებად ვერ გარდაიქმნა',
    pdfXlsxLocalSkippedDetail:
      'გვერდები {pages} უჯრებად ვერ გარდაიქმნა; მათ worksheet-ებში დამატებულია შეტყობინების მწკრივი.',
    pdfDocxLocalScannedMsg: 'დასკანერებული დოკუმენტი აღმოჩნდა',
    pdfDocxLocalScannedDetail:
      'გვერდები ექსპორტირებულია სურათებად მათი იერსახის შესანარჩუნებლად; რედაქტირებადი ტექსტი ვერ იქნა ამოცნობილი.',
    pdfDocxLocalDegradedMsg: 'ზოგიერთი გვერდი სურათებად იქნა ექსპორტირებული',
    pdfDocxLocalDegradedDetail:
      'გვერდების {pages} საიმედოდ აღდგენა ვერ მოხერხდა და ისინი სრულგვერდიან სურათებად იქნა ექსპორტირებული.',
    pdfDocxLocalOcrMsg: 'დასკანერებული გვერდები რედაქტირებად ტექსტად გარდაიქმნა',
    pdfDocxLocalOcrDetail:
      'გვერდები {pages} დასკანერებული იყო; მათი ტექსტი აღდგენილია მოწყობილობაზე შესრულებული OCR-ით. გთხოვთ, გადაამოწმოთ შედეგი.',
    pdfDocxLocalEncryptedDetail: 'ეს PDF დაშიფრულია და სწორი პაროლის გარეშე ვერ გაიხსნა.',
    pdfDocxLocalUnsupportedEncDetail:
      'ეს PDF იყენებს სერტიფიკატზე დაფუძნებულ ან სხვაგვარად მხარდაუჭერელ დაშიფვრას და მისი გარდაქმნა შეუძლებელია.',
    pdfPwdTitle: 'შეიყვანეთ პაროლი',
    pdfPwdPrompt: 'ეს PDF დაშიფრულია. მის გასახსნელად შეიყვანეთ პაროლი:',
    pdfPwdRetryPrompt: 'პაროლი არასწორია. გთხოვთ, სცადოთ ხელახლა.',
    pdfPwdOk: 'OK',
    pdfPwdVerifying: 'პაროლის დადასტურება…',
    pdfPwdLabel: 'პაროლი',
    pdfPwdPlaceholder: 'გასახსნელი პაროლი შეიყვანეთ',
    pdfPwdShow: 'პაროლის ჩვენება',
    pdfPwdHide: 'პაროლის დამალვა',
    pdfDocxLocalCorruptDetail:
      'ფაილი დაზიანებულია ან ვალიდური PDF არ არის და მისი გარდაქმნა შეუძლებელია.',
    dlgPickSaveDir: 'აირჩიეთ ნაგულისხმევი შენახვის მდებარეობა',
    errSaveDirUnusable:
      'არჩეულ საქაღალდეში ჩაწერა შეუძლებელია და ის ნაგულისხმევ შენახვის ადგილად ვერ გამოიყენება',
    dlgAddFolderRoot: 'საქაღალდის დამატება მთავარში',
    errFolderRootUnusable: 'არჩეული საქაღალდე ვერ იკითხება',
    menuExportImages: 'სურათებად ექსპორტი…',
    menuOpenInNewWindow: 'ახალ ფანჯარაში გახსნა',
    errPdfSaveAsFailed: 'Could not save the PDF copy',
    watchdogTitle: 'დოკუმენტი ბევრ რესურსს იყენებს',
    watchdogBody:
      '«{title}» რამდენიმე წუთის განმავლობაში ბევრ მეხსიერებას ან CPU-ს იყენებს ({memory} MB, {cpu}% CPU). შეგიძლიათ გააგრძელოთ ლოდინი ან დახუროთ დოკუმენტი (შეუნახავი ცვლილებების შენახვა შემოგთავაზდებათ). დიაგნოსტიკა ჩაიწერა.',
    watchdogWait: 'ლოდინის გაგრძელება',
    watchdogClose: 'დოკუმენტის დახურვა',
    errDuplicateFailed: 'ფაილის დუბლირება ვერ მოხერხდა',
    menuTabSave: 'Save',
    menuTabSaveAs: 'Save As…',
    menuTabPrint: 'Print…',
    menuTabRename: 'Rename',
    menuTabDuplicate: 'Duplicate (copy the saved file)',
    menuTabSplitBeside: 'Split side by side',
    menuTabCopyPath: 'Copy path',
    menuTabCopyName: 'Copy file name',
    menuTabReveal: 'Show in folder',
    menuTabOpenDefault: 'Open with the default app',
    menuTabMoveLeft: 'Move left',
    menuTabMoveRight: 'Move right',
    menuTabCloseOthers: 'Close other tabs',
    menuTabCloseRight: 'Close tabs to the right',
    menuTabCloseAll: 'Close all tabs',
    menuTabReopen: 'Reopen closed tab',
    menuView: 'View',
    menuUiZoomIn: 'Interface Zoom In',
    menuUiZoomOut: 'Interface Zoom Out',
    menuUiZoomReset: 'Reset Interface Zoom',
    pdfConvertFailedMsg: 'Export as Markdown / HTML failed',
    pdfMdLocalMissingMsg: 'Some content is missing from the Markdown',
    pdfMdLocalScannedDetail:
      'No editable text could be recognized, so the Markdown file has no usable content.',
    pdfMdLocalDroppedDetail:
      'Page(s) {pages} could not be reliably reconstructed; Markdown cannot carry images, so their content is missing.',
  },
})

const tm = (key: Parameters<typeof tMain>[1], params?: Parameters<typeof tMain>[2]) =>
  tMain(currentLang(), key, params)

// ---- the shell window + its tab manager (recreated if the user closes it on macOS) ----

let shellWindow: BrowserWindow | null = null
let tabManager: TabManager | null = null

/**
 * New file from a folder view: the click remembers the folder per kind, the
 * new-tab code consumes it right away. Sheets / PDF write their blank file
 * straight into that folder; the editors that save untitled files themselves
 * (docs, slides, markdown, html) get the folder bound to the tab that was just
 * created, and the tab's first save moves the fresh file there.
 * key: 'doc' | 'sheet' | 'slide' | 'markdown' | 'html' | 'pdf'
 */
/** folders the user added to the home tree beside the default save folder */
function extraFolderRoots(): string[] {
  return readExtraRoots(readAppSettings(APP_SETTINGS_PATH()), defaultSaveDir())
}

function folderRootPaths(): string[] {
  return [defaultSaveDir(), ...extraFolderRoots()]
}

function insideAnyRoot(path: string): boolean {
  return folderRootPaths().some((root) => isInsideRoot(root, path))
}

function isAnyRoot(path: string): boolean {
  const key = resolve(path)
  return folderRootPaths().some((root) => resolve(root) === key)
}

const pendingNewFileDir = new Map<string, { dir: string; setAt: number }>()
/** folder bound to a freshly created editor tab, keyed by its webContents id; consumed by the first save */
const pendingDirByWc = new Map<number, { dir: string; setAt: number }>()
/** a pending folder only applies to a file created within this window after the click */
const PENDING_DIR_TTL_MS = 30 * 60 * 1000

function rememberPendingDir(kind: string, opts?: NewFileOpts): void {
  const dir = opts?.dir
  if (!dir || resolve(dir) === resolve(defaultSaveDir()) || !insideAnyRoot(dir)) {
    pendingNewFileDir.delete(kind)
    return
  }
  pendingNewFileDir.set(kind, { dir, setAt: Date.now() })
}

/** the folder remembered for this kind, consumed; null when none, expired or gone */
function takePendingDir(kind: string): { dir: string; setAt: number } | null {
  const pending = pendingNewFileDir.get(kind)
  pendingNewFileDir.delete(kind)
  if (!pending) return null
  if (Date.now() - pending.setAt > PENDING_DIR_TTL_MS) return null
  return existsSync(pending.dir) ? pending : null
}

/** where a shell-created blank file (sheet, pdf) lands: the remembered folder, else the root */
function newFileDir(kind: string): string {
  return takePendingDir(kind)?.dir ?? defaultSaveDir()
}

/** hand the remembered folder to the tab that was just opened for it */
function bindPendingDir(kind: string, tabId: string | undefined): void {
  const pending = takePendingDir(kind)
  const wc = tabId ? tabManager?.webContentsForTab(tabId) : undefined
  if (pending && wc) pendingDirByWc.set(wc.id, pending)
}

/**
 * A tab's file first hit disk (silent first save, Save As, or an open): if a
 * folder is bound to that tab and the file is a fresh one in the root, move
 * it there. A pre-existing file opened in the tab never qualifies: its birth
 * time (or, where the filesystem reports none, its mtime) predates the click.
 */
function applyPendingDir(wcId: number, filePath: string): string {
  const pending = pendingDirByWc.get(wcId)
  if (!pending) return filePath
  if (Date.now() - pending.setAt > PENDING_DIR_TTL_MS) {
    pendingDirByWc.delete(wcId)
    return filePath
  }
  if (resolve(dirname(filePath)) !== resolve(defaultSaveDir())) return filePath
  try {
    const stat = statSync(filePath)
    const born = stat.birthtimeMs || stat.mtimeMs
    if (born < pending.setAt - 2000) return filePath
  } catch {
    return filePath
  }
  pendingDirByWc.delete(wcId)
  if (!existsSync(pending.dir)) return filePath
  // a clash with an existing name takes the "(2)" suffix rather than staying in the root
  const target = join(pending.dir, uniqueNameIn(pending.dir, basename(filePath)))
  try {
    renameSync(filePath, target)
  } catch (err) {
    console.warn('[shell] move new file into folder failed:', err)
    return filePath
  }
  afterFileMoved(filePath, target)
  return target
}

/**
 * Everything that keys on a file path follows a rename/move: recents, stars,
 * the AI chat history (project-store), the slides start-screen list and any
 * open tab (which re-grants the new path and refreshes its title).
 */
function afterFileMoved(oldPath: string, newPath: string): void {
  replaceRecentFile(oldPath, newPath)
  projectFileRenamed(oldPath, newPath)
  if (/\.pptx$/i.test(newPath)) void replaceSlidesRecentFile(oldPath, newPath)
  const affected = tabManager?.renameTabFile(oldPath, newPath) ?? []
  const detachedAffected = detachedRenameFile(oldPath, newPath)
  if (detachedAffected) affected.push(detachedAffected)
  for (const t of affected) {
    if (t.kind === 'slides') slidesFileRenamed(t.webContents, oldPath, newPath)
    else if (t.kind === 'docs') docsFileRenamed(t.webContents, oldPath, newPath)
    else if (t.kind === 'sheets') sheetsFileRenamed(t.webContents, oldPath, newPath)
    else if (t.kind === 'markdown') markdownFileRenamed(t.webContents, oldPath, newPath)
    else if (t.kind === 'html') htmlFileRenamed(t.webContents, oldPath, newPath)
    else if (t.kind === 'pdf') pdfFileRenamed(t.webContents, oldPath, newPath)
  }
}

function trackedFilesUnder(dir: string): string[] {
  return pathsUnder(dir, [
    ...readRecentFiles(),
    ...readStarredFiles(),
    ...projectFilePaths(),
    ...readSlidesRecentFiles(),
    ...(tabManager?.openFilePaths() ?? []),
    ...detachedFilePaths(),
  ])
}

function statMaybeFile(path: string): { isFile: () => boolean } | null {
  try {
    return statSync(path)
  } catch {
    return null
  }
}

function fileTargetSources(): FileTargetSources {
  return {
    insideAnyRoot: (p) => insideAnyRoot(p),
    trackedPaths: [
      ...readRecentFiles(),
      ...readStarredFiles(),
      ...projectFilePaths(),
      ...readSlidesRecentFiles(),
      ...(tabManager?.openFilePaths() ?? []),
      ...detachedFilePaths(),
    ],
  }
}

/** a folder moved/renamed: re-key every tracked file that lived under it */
function afterFolderMoved(oldDir: string, newDir: string, filesBefore: readonly string[]): void {
  for (const file of filesBefore) afterFileMoved(file, rebasePath(file, oldDir, newDir))
}

const folderWatchers = new Map<string, FolderWatcher>()

let fileIndexStore: FileIndexStore | null = null
let fileIndexer: FileIndexer | null = null
let searchReranker: SearchReranker | null = null

function readFileSearchSettings(): FileSearchSettings {
  return normalizeFileSearchSettings(readAppSettings(APP_SETTINGS_PATH()).fileSearch)
}

/** the search index lives in userData and follows the save folder plus recents/starred */
function ensureFileIndexer(): FileIndexer | null {
  if (fileIndexer) return fileIndexer
  try {
    fileIndexStore = new FileIndexStore(join(app.getPath('userData'), 'file-index.db'))
  } catch (e) {
    console.warn('[file-index] unavailable:', e instanceof Error ? e.message : e)
    return null
  }
  fileIndexer = new FileIndexer(fileIndexStore, extractWorkerPath, {
    roots: () => folderRootPaths().filter((root) => existsSync(root)),
    extraPaths: () => [...readRecentFiles(), ...readStarredFiles()],
  })
  return fileIndexer
}

const SEARCH_EXT_FAMILY: Record<string, readonly string[]> = {
  docx: ['docx', 'doc', 'odt', 'ott'],
  xlsx: ['xlsx', 'xlsm', 'xls', 'csv', 'tsv', 'ods', 'ots'],
  pptx: ['pptx', 'ppt', 'odp', 'otp'],
  md: ['md', 'markdown', 'txt', 'json'],
  html: ['html', 'htm'],
}

/** one recursive watcher per tree root; follows the save-folder setting and the added folders */
function ensureFolderWatchers(): void {
  const wanted = new Set(folderRootPaths().filter((root) => existsSync(root)))
  for (const [root, watcher] of folderWatchers) {
    if (wanted.has(root) && watcher.active) continue
    watcher.close()
    folderWatchers.delete(root)
  }
  for (const root of wanted) {
    if (folderWatchers.has(root)) continue
    const watcher = new FolderWatcher(root, (dirs) => {
      fileIndexer?.refresh()
      for (const wc of webContents.getAllWebContents()) {
        if (!wc.isDestroyed()) wc.send(HOME_CHANNELS.folderChanged, dirs)
      }
    })
    folderWatchers.set(root, watcher)
  }
}

/**
 * Put the manual in whatever menu is currently installed.
 *
 * Every tab kind builds its own application menu, which is how File and Edit
 * stay tab-shaped — and which is also why an item added to one builder is
 * missing from the other six. F1 worked from Home and nowhere else, and the
 * manual's own shortcut table was wrong for six of the seven tab kinds.
 *
 * Injecting after the builder has run is the one place that cannot be
 * forgotten: a new tab kind gets the manual for free, and a builder that
 * already has it is left alone rather than getting a second copy.
 */
function withUserGuide(): void {
  const menu = Menu.getApplicationMenu()
  if (!menu) return
  const userGuide = {
    label: tm('menuUserGuide'),
    accelerator: 'F1',
    click: () => tabManager?.openHelpTab(),
  }
  const help = menu.items.find((item) => item.role === 'help')
  // Slides and Sheets build a File/Edit/View template with no Help menu at
  // all, so there is nothing to insert into — one is created instead. Without
  // this the manual would be reachable from four of the seven tab kinds.
  if (!help) {
    menu.append(
      Menu.buildFromTemplate([{ role: 'help', label: tm('menuHelp'), submenu: [userGuide] }])
        .items[0]!,
    )
    return
  }
  const submenu = help.submenu
  if (!submenu || submenu.items.some((i) => i.accelerator === 'F1')) return
  // A separator survives a template only *between* two real items — Electron
  // drops one at either end, so `[userGuide, separator]` builds a single item
  // and the destructure below used to hand `undefined` to `insert`, which threw
  // "Invalid item" and took the main process down on the next tab switch. The
  // third entry is filler, discarded; the type check is what stops this from
  // silently regressing if Electron's rule ever changes again.
  const [item, separator] = Menu.buildFromTemplate([
    userGuide,
    { type: 'separator' },
    { role: 'undo' },
  ]).items
  if (!item) return
  submenu.insert(0, item)
  if (separator?.type === 'separator') submenu.insert(1, separator)
}

function applyMenuFor(kind: TabKind): void {
  switch (kind) {
    case 'docs':
      buildDocsMenu()
      break
    case 'sheets':
      installSheetsMenu()
      break
    case 'slides':
      installSlidesMenu()
      break
    case 'pdf':
      buildPdfMenu()
      break
    case 'markdown':
      buildMarkdownMenu()
      break
    case 'html':
      buildHtmlMenu()
      break
    default:
      buildHomeMenu()
  }
  withUserGuide()
  withViewMenu()
}

/**
 * The View › interface-scale items, shared by the home menu and every editor
 * tab. CmdOrCtrl+Alt (not Shift): Shift+= is Sheets insert-cells and Docs
 * superscript, and the View menu now exists on editor tabs too, where those
 * accelerators are taken.
 */
function uiScaleMenuItems(): MenuItemConstructorOptions[] {
  return [
    {
      label: tm('menuUiZoomIn'),
      accelerator: 'CmdOrCtrl+Alt+=',
      click: () => changeUiScale(APP_SETTINGS_PATH(), 1),
    },
    {
      label: tm('menuUiZoomOut'),
      accelerator: 'CmdOrCtrl+Alt+-',
      click: () => changeUiScale(APP_SETTINGS_PATH(), -1),
    },
    { type: 'separator' },
    {
      label: tm('menuUiZoomReset'),
      accelerator: 'CmdOrCtrl+Alt+0',
      click: () => changeUiScale(APP_SETTINGS_PATH(), 0),
    },
  ]
}

function viewMenuTemplate(): MenuItemConstructorOptions {
  return { label: tm('menuView'), submenu: uiScaleMenuItems() }
}

/**
 * Interface-scale items in the View menu of every tab kind. Editor menus are
 * built in the editor apps (docs/sheets/slides) or by the three shell-owned
 * builders, so rather than teaching seven menu builders about the scale, the
 * current menu is post-processed here — the same shape as withUserGuide below.
 * An existing View menu (docs, slides: document zoom) gains the items after a
 * separator; the rest get a fresh View menu inserted before the Help menu that
 * withUserGuide has just guaranteed.
 */
function withViewMenu(): void {
  const menu = Menu.getApplicationMenu()
  if (!menu) return
  const hasScale = menu.items.some((item) =>
    item.submenu?.items.some((i) => i.accelerator === 'CmdOrCtrl+Alt+='),
  )
  if (hasScale) return
  const view = menu.items.find((item) => item.label === tm('menuView'))
  if (view?.submenu) {
    // build the separator together with the items: Electron drops a separator
    // that sits alone in a template
    for (const item of Menu.buildFromTemplate([{ type: 'separator' }, ...uiScaleMenuItems()])
      .items) {
      view.submenu.append(item)
    }
    return
  }
  const viewItem = Menu.buildFromTemplate([viewMenuTemplate()]).items[0]!
  const helpIdx = menu.items.findIndex((item) => item.role === 'help')
  if (helpIdx === -1) menu.append(viewItem)
  else menu.insert(helpIdx, viewItem)
}

/**
 * Stamp the stored interface scale into every renderer — now, and for any
 * window created later.
 *
 * `web-contents-created` is the hook that covers all three window kinds at
 * once: the shell window, every tab's WebContentsView, and a detached editor
 * window. Each gets it on `did-finish-load`, because a stylesheet inserted
 * before the document exists is thrown away.
 */
function installUiScale(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', () => applyUiScaleTo(contents, currentUiScale()))
  })
  applyUiScaleToAll(currentUiScale())
  // A scale change moves the tab strip, so the editor views below it have to
  // move too — and the Windows/Linux caption band is sized from it.
  onUiScaleChanged((scale) => {
    cachedUiScale = scale
    tabManager?.layout()
    refreshTitleBarOverlay()
  })
}

function refreshTitleBarOverlay(): void {
  if (process.platform === 'darwin' || !shellWindow || shellWindow.isDestroyed()) return
  shellWindow.setTitleBarOverlay(
    tabStripOverlay(nativeTheme.shouldUseDarkColors, currentUiScale()),
  )
}

function createShellWindow(): void {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 720,
    minHeight: 550,
    title: appTitle(currentLang()),
    // painted until the home renderer's first frame; matches --surface so a
    // cold start under the dark theme doesn't flash white
    backgroundColor: themedSurfaceColor(),
    // vibrancy: editor modules punch translucent regions (e.g. the slides
    // thumbnail pane) through to the desktop
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, vibrancy: 'sidebar' as const }
      : {
          // the tab strip is the title bar, as on macOS; the application menu
          // stays registered for its accelerators and opens from the strip's
          // menu button (Alt still reveals the native bar where one exists)
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: tabStripOverlay(nativeTheme.shouldUseDarkColors, currentUiScale()),
          autoHideMenuBar: true,
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  shellWindow = win
  forwardRendererConsole(win.webContents, 'shell')
  nativeTheme.on('updated', refreshTitleBarOverlay)
  win.once('closed', () => nativeTheme.off('updated', refreshTitleBarOverlay))
  // dragging the window by the tab strip's blank (draggable) area produces no
  // DOM event anywhere — will-move is the only signal to dismiss popovers
  win.on('will-move', () => broadcastChromePressed())
  // A detached editor window claims the process-global menu/active-editor targets
  // while focused; take them back when the shell window regains focus. Keyboard
  // focus must land back on the active tab's view too — regaining window focus
  // gives it to the chrome webContents, leaving typing dead in the document.
  win.on('focus', () => {
    tabManager?.refreshActiveTargets()
    tabManager?.focusActiveView()
  })

  const manager = new TabManager(
    win,
    () => {
      win.webContents.send(TABS_CHANNELS.changed, manager.list())
      publishOpenDocumentsIfOwner([...manager.openFilePaths(), ...detachedFilePaths()])
    },
    applyMenuFor,
    // no extension: these tabs have no file on disk yet; the title becomes the
    // real filename (the localized untitled default + .docx etc.) once the first save lands
    (kind) =>
      kind === 'help'
        ? tm('menuUserGuide')
        : kind === 'docs'
          ? tm('untitledDoc')
          : kind === 'slides'
            ? tm('untitledDeck')
            : kind === 'markdown'
              ? tm('untitledMarkdown')
              : kind === 'html'
                ? tm('untitledHtml')
                : tm('untitledSheet'),
    // the tab strip is interface chrome, so its height follows the scale
    () => currentUiScale(),
  )
  tabManager = manager
  manager.setClosedListener((closed) => recentlyClosed.push(closed))

  // Docking: a detached window dragged over this window's tab strip hands its
  // document back. The strip reports the insertion slot for each preview
  // (lastDockIndex); the slot is consumed by the dock that follows.
  setDockHost({
    band: () => dockBandFor(win, currentUiScale()),
    preview: (x) => {
      if (!win.isDestroyed())
        win.webContents.send(TABS_CHANNELS.dockPreview, x === null ? null : { x })
    },
    dock: (tab) => {
      const index = lastDockIndex
      lastDockIndex = undefined
      if (!win.isDestroyed()) win.webContents.send(TABS_CHANNELS.dockPreview, null)
      manager.attachTab(tab, index)
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    },
  })

  // pushRecent-triggered docs menu rebuilds must not clobber the active tab's
  // menu; a focused detached docs window owns the menu just like an active tab
  setDocsMenuGate(
    () =>
      focusedDetachedKind() === 'docs' || manager.list().some((t) => t.active && t.kind === 'docs'),
  )

  setDocsShellWindow(win)
  setSheetsShellWindow(win)
  setDocsHostWindowHook((wc) => detachedWindowForWebContents(wc.id))
  setSheetsHostWindowHook((wc) => detachedWindowForWebContents(wc.id))
  setSlidesShellWindow(win)
  setSlidesHostWindowHook((wc) => detachedWindowForWebContents(wc.id))
  setSlidesShowBleed((wc, on) => manager.setContentBleed(wc, on))
  setHtmlPresentHooks({
    setBleed: (wc, on) => manager.setContentBleed(wc, on),
    hostWindow: (wc) => detachedWindowForWebContents(wc.id) ?? win,
    openTab: (owner, title) => {
      manager.openHtmlPresentTab(owner, title)
      return true
    },
    closeTab: (wc) => {
      const id = manager.tabIdForWebContents(wc.id)
      if (id) void manager.closeTab(id)
      return !!id
    },
  })
  // A detached docs/sheets window can outlive the shell window; its hooks must
  // then reach the live tab manager (recreating the shell), never this closure's.
  setDocsShellHooks({
    openTab: (openPath, options) => ensureTabManager().openDocsTab(openPath, options),
    openAiDocTab: (content) =>
      ensureTabManager().openDocsTab(undefined, { newBlank: true, aiContent: content }),
    listTabs: () =>
      (tabManager?.list() ?? [])
        .filter((t) => t.kind === 'docs')
        .map((t) => ({ id: t.id, title: t.title, focused: t.active })),
    focusTab: (id) => tabManager?.activateTab(id),
    // ⌘W in a detached docs window closes that window (its own close guard runs)
    closeActiveTab: () => {
      const focused = BrowserWindow.getFocusedWindow()
      if (focused && focused !== win) focused.close()
      else tabManager?.closeActiveTab()
    },
    openGeneratedPath: (path) => openGeneratedDocument(path),
  })
  setSheetsCloseTabHook(() => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused && focused !== win) focused.close()
    else tabManager?.closeActiveTab()
  })
  // ⌘W targets the focused window: in a detached slides editor window it closes
  // that window (running its own close guard), not the shell's active tab
  setSlidesCloseTabHook(() => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused && focused !== win) focused.close()
    else manager.closeActiveTab()
  })
  // When ⌘O opens a file inside a tab, sync the tab title/path (used for de-dup by path) and record it as recent.
  // The first save / save-as fires this too, so applyPendingDir also runs here.
  setSheetsWorkbookOpenedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
  })
  setSlidesOpenedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
    applyPendingDir(wc.id, path)
  })
  // docs' save-as / silent first save lands on a new path → sync the tab title too
  setDocsFileSavedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
    return applyPendingDir(wc.id, path)
  })
  // ⌘O / open-path inside a docs tab: sync the tab title immediately, same
  // contract as the sheets/slides opened hooks (a plain save to the original
  // path never renames the tab, so the open must — r115)
  setDocsFileOpenedHook((wcId, path) => {
    manager.setTabFileFor(wcId, path)
    detachedSetFileFor(wcId, path)
    recordRecentFile(path)
    applyPendingDir(wcId, path)
  })
  // markdown untitled first save / Save As lands on a new path
  setMarkdownFileSavedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
    applyPendingDir(wc.id, path)
  })
  setHtmlFileSavedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
    applyPendingDir(wc.id, path)
  })
  setHtmlProvisionalTitleHook((wc, title) => {
    manager.setTabTitleFor(wc.id, title)
    detachedSetTitleFor(wc.id, title)
  })
  // A redacted copy becomes this tab's document; the source still exists.
  setPdfRedactionSavedHook((wc, path) => {
    manager.setTabFileFor(wc.id, path)
    detachedSetFileFor(wc.id, path)
    recordRecentFile(path)
    applyPendingDir(wc.id, path)
  })
  // pdf content-derived auto-rename: the file moved on disk, follow it everywhere
  setPdfRenamedHook((wc, oldPath, newPath) => {
    manager.setTabFileFor(wc.id, newPath)
    detachedSetFileFor(wc.id, newPath)
    replaceRecentFile(oldPath, newPath)
    projectFileRenamed(oldPath, newPath)
  })
  // markdown "convert & open in Docs" → route the fresh .docx to a docs tab
  setMarkdownDocxExportedHook((path) => {
    openDocumentPath(path)
  })
  // Word export to a path already open in a docs tab: close that tab before the file is
  // written (its unsaved-changes prompt applies, and a later save of the stale document
  // could otherwise overwrite the export); a cancelled close aborts the export.
  setHtmlDocxExportPrepareHook(async (path) => {
    const stale = manager.findDocsTabByPath(path)
    if (!stale) return true
    const active = manager.list().find((t) => t.active)?.id
    await manager.closeTab(stale)
    if (active && active !== stale) manager.activateTab(active)
    return !manager.findDocsTabByPath(path)
  })
  setHtmlDocxExportedHook((path) => {
    openDocumentPath(path)
  })

  // Closing the whole window walks every dirty sheets/pdf/slides/docs tab through
  // the same save/don't-save/cancel prompt; any cancel aborts the close. An
  // all-clean close is left untouched, so ⌘Q keeps quitting the app.
  installShellCloseGuard(win, manager)

  win.on('closed', () => {
    if (shellWindow === win) shellWindow = null
    if (tabManager === manager) {
      tabManager = null
      setDockHost(null)
      publishAllOpenDocuments()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---- routing: one dispatch function for every open path ----

/**
 * Single source of truth for the open-dialog filter. Includes the
 * legacy .doc/.ppt binaries so they are selectable and surface the explicit
 * "not supported" dialog via openDocumentPath instead of being grayed out.
 */
const OPEN_DIALOG_EXTENSIONS = [
  'docx',
  'doc',
  'xlsx',
  'xlsm',
  'xls',
  'csv',
  'tsv',
  'ods',
  'ots',
  'pptx',
  'ppt',
  'odt',
  'odp',
  'otp',
  'pdf',
  'md',
  'markdown',
  'txt',
  'json',
  'html',
  'htm',
]

function notifyUnsupportedFile(filePath: string): void {
  const ext = extname(filePath).slice(1).toLowerCase() || basename(filePath)
  showAppWarning(tm('errUnsupportedExt', { ext }))
}

/** shell-hosted warning box; focused when a shell window exists, standalone otherwise */
function showAppWarning(message: string): void {
  const options = { type: 'warning' as const, message }
  if (shellWindow) {
    shellWindow.show()
    shellWindow.focus()
    void dialog.showMessageBox(shellWindow, options)
  } else {
    void dialog.showMessageBox(options)
  }
}

/**
 * Files dropped from the OS into any renderer arrive via installDropOpenBridge
 * and route through the normal File > Open pipeline; detached editor windows
 * can host the drop target, so the shell must reveal itself after opening.
 */
const droppedFilesDeps = () => ({
  openDocumentPath,
  revealShellWindow,
  showWarning: showAppWarning,
  unsupportedMessage: (exts: string[]) => tm('errUnsupportedExt', { ext: exts.join(', ') }),
})

function registerDroppedFilesIpc(): void {
  ipcMain.on(DROP_OPEN_CHANNEL, (_event, raw: unknown) =>
    handleDroppedFiles(raw, droppedFilesDeps()),
  )
  // Ribbon File > Open inside any app view: same dialog + routing as the
  // native File > Open menu item.
  ipcMain.on(OPEN_FILE_DIALOG_CHANNEL, () => void openFileViaDialog())
}

/** the single router: extension decides which module owns the file; false = nothing opened */
function openDocumentPath(filePath: string): boolean {
  const opened = routeDocumentPath(filePath)
  if (opened) recordStarPromptDocOpen()
  return opened
}

/**
 * Open a just-written export. Unlike File > Open, an already-open PDF tab is
 * reloaded from disk so a re-export to the same path shows the new bytes
 * instead of the previous in-memory document (which may also hold unsaved
 * annotations). In-memory edits on that tab are discarded — Save would
 * overwrite the file we just exported.
 */
function openGeneratedDocument(filePath: string): boolean {
  if (tabManager && PDF_RE.test(filePath)) {
    const existing = tabManager.findPdfTabByPath(filePath)
    if (existing) {
      tabManager.reloadTab(existing)
      tabManager.activateTab(existing)
      return true
    }
  }
  return openDocumentPath(filePath)
}

function routeDocumentPath(filePath: string): boolean {
  if (!existsSync(filePath)) return false
  // a detached editor window already shows this file — focus it, never a second copy
  if (focusDetachedByPath(filePath)) return true
  if (!tabManager) return false
  if (DOCX_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findDocsTabByPath(filePath)
    if (existing) tabManager.activateTab(existing)
    else tabManager.openDocsTab(filePath)
    return true
  }
  if (XLSX_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findSheetsTabByPath(filePath)
    if (existing) {
      tabManager.activateTab(existing)
    } else {
      tabManager.openSheetsTab(filePath)
      startQueuedWorkbookNudge()
    }
    return true
  }
  if (PPTX_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findSlidesTabByPath(filePath)
    if (existing) {
      tabManager.activateTab(existing)
    } else {
      // For a new tab the path goes through the pending queue; the renderer consumes it after mounting
      tabManager.openSlidesTab(filePath)
    }
    return true
  }
  if (PDF_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findPdfTabByPath(filePath)
    if (existing) tabManager.activateTab(existing)
    else tabManager.openPdfTab(filePath)
    return true
  }
  if (TEXT_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findMarkdownTabByPath(filePath)
    if (existing) tabManager.activateTab(existing)
    else tabManager.openMarkdownTab(filePath)
    return true
  }
  if (HTML_RE.test(filePath)) {
    recordRecentFile(filePath)
    const existing = tabManager.findHtmlTabByPath(filePath)
    if (existing) tabManager.activateTab(existing)
    else tabManager.openHtmlTab(filePath)
    return true
  }
  notifyUnsupportedFile(filePath)
  return false
}

/**
 * "New spreadsheet" no longer drops a file in the default folder up front: the
 * blank workbook is created in a temp directory and its first Save goes through
 * Save As (the same path an .xls/.tsv import takes), so a new tab that is
 * closed without saving leaves nothing behind to delete by hand — the temp
 * directory is discarded with the session. The save pipeline still needs a real
 * file to edit, hence the backing workbook rather than the in-memory blank grid.
 * Falls back to a file in the default folder, then to the in-memory blank tab.
 */
async function newSheetTab(recoverAs?: string): Promise<void> {
  // recoverAs: the would-be path of a new workbook whose recovery copy
  // survived a crash; the sheets module offers it under that name
  const dir = newFileDir('sheet')
  let suggestedPath = recoverAs ?? uniquePathIn(dir, `${tm('untitledSheet')}.xlsx`)
  // nothing is on disk yet, so two new tabs would otherwise be promised the same name
  for (let i = 2; !recoverAs && sheetsSuggestedPathTaken(suggestedPath); i++)
    suggestedPath = uniquePathIn(dir, `${tm('untitledSheet')} ${i}.xlsx`)
  try {
    // under the import root so the session-close cleanup removes it like an import copy
    const tempDir = join(app.getPath('temp'), 'officevega-imports', randomUUID())
    mkdirSync(tempDir, { recursive: true })
    const backingPath = join(tempDir, basename(suggestedPath))
    // reserve the name before the first await so a second new tab picks another;
    // the first Save As starts from the name the file would have had
    markSheetsUnsavedNew(backingPath, suggestedPath, tempDir)
    try {
      await atomicWriteFile(backingPath, await blankXlsxBuffer())
    } catch (err) {
      unmarkSheetsUnsavedNew(backingPath)
      throw err
    }
    // eligible for content-derived auto-rename after the first AI generation
    markSheetsUntitledPath(backingPath)
    tabManager?.openSheetsTab(backingPath)
    startQueuedWorkbookNudge()
    // no recent-file entry yet: there is no user-visible file until it is saved
    recordStarPromptDocOpen()
  } catch (err) {
    console.warn('[shell] temp workbook create failed, writing to the default folder:', err)
    try {
      await atomicWriteFile(suggestedPath, await blankXlsxBuffer())
      markSheetsUntitledPath(suggestedPath)
      // route directly (not via openDocumentPath) so creating a sheet emits
      // only file_new — the file_open event is reserved for opening existing files
      if (routeDocumentPath(suggestedPath)) recordStarPromptDocOpen()
    } catch (fallbackErr) {
      console.warn(
        '[shell] blank workbook create failed, opening in-memory blank tab:',
        fallbackErr,
      )
      try {
        tabManager?.openSheetsTab(undefined, { newBlank: true })
      } catch (finalErr) {
        surfaceNewTabError(finalErr)
      }
    }
  }
}

/**
 * A throw anywhere in the create-tab path (view creation, sidecar resolution,
 * renderer load) used to be swallowed by `void`-ed promises and ipc-invoke
 * rejections, so the click looked like a pure no-op — the exact "Sheets /
 * Slides do nothing" alpha report. Surface the failure instead.
 */
function surfaceNewTabError(err: unknown): void {
  console.error('[shell] new tab failed:', err)
  showErrorDialog(shellWindow, tm('errNewTabFailed'), err)
}

function newDocTab(): void {
  try {
    bindPendingDir('doc', tabManager?.openDocsTab(undefined, { newBlank: true }))
    // creating a document is as much a value moment as opening one
    recordStarPromptDocOpen()
  } catch (err) {
    surfaceNewTabError(err)
  }
}

/** MCP: open a blank docs tab and return its webContents id, for the visible-editor bridge */
function openBlankDocsTabForMcp(): number {
  if (!tabManager) throw new Error('OfficeVega is not ready')
  const tabId = tabManager.openDocsTab(undefined, { newBlank: true })
  const view = tabManager.docsTabs().find((t) => t.id === tabId)
  if (!view) throw new Error('the new document tab could not be opened')
  recordStarPromptDocOpen()
  return view.webContents.id
}

/**
 * MCP: open a blank sheets tab and return its webContents id, for the
 * visible-grid bridge. Like the app's own "new spreadsheet", a real blank
 * .xlsx is created up front (the save pipeline needs an on-disk workbook;
 * the fallback in-memory demo grid cannot save) — but the AI auto-rename
 * marking is skipped, the file name is the agent's business.
 */
async function openBlankSheetsTabForMcp(): Promise<number> {
  if (!tabManager) throw new Error('OfficeVega is not ready')
  const filePath = uniquePathIn(defaultSaveDir(), `${tm('untitledSheet')}.xlsx`)
  await atomicWriteFile(filePath, await blankXlsxBuffer())
  const tabId = tabManager.openSheetsTab(filePath)
  const view = tabManager.sheetsTabs().find((t) => t.id === tabId)
  if (!view) {
    // the tab never appeared, so nothing will ever consume this file
    try {
      rmSync(filePath)
    } catch (error) {
      console.warn('[mcp] could not remove the unused blank workbook:', error)
    }
    throw new Error('the new spreadsheet tab could not be opened')
  }
  const wcId = view.webContents.id
  mcpBlankSheetPaths.set(wcId, filePath)
  view.webContents.once('destroyed', () => mcpBlankSheetPaths.delete(wcId))
  // Same nudge the interactive path uses: the renderer subscribes to the open
  // action only after Univer mounts, so a single push can land in the void on a
  // cold start and leave the tab sitting on a blank in-memory workbook.
  startQueuedWorkbookNudge()
  recordStarPromptDocOpen()
  return view.webContents.id
}

/** backing files of blank sheets tabs created by the MCP session tools */
const mcpBlankSheetPaths = new Map<number, string>()

/**
 * MCP: drop a blank sheets tab whose session never became ready, and delete the
 * empty workbook created for it. Without this a failed `create_session` leaves
 * an orphan tab plus an .xlsx in the default save folder that the user never
 * asked for — and nothing in the MCP surface can clean either one up.
 */
function abandonBlankSheetsTabForMcp(wcId: number): void {
  const manager = tabManager
  const filePath = mcpBlankSheetPaths.get(wcId)
  mcpBlankSheetPaths.delete(wcId)
  if (!manager) return
  // the grid may already be usable while the MCP bridge is not: keep anything the user typed
  if (manager.dirtySheetsTabs().some((t) => t.webContents.id === wcId)) return
  if (!abandonBlankTabForMcp(manager.sheetsTabs(), wcId)) return
  if (!filePath) return
  try {
    if (existsSync(filePath)) rmSync(filePath)
  } catch (error) {
    console.warn('[mcp] could not remove the unused blank workbook:', error)
  }
}

/**
 * MCP: close a tab whose session never became ready. Returns false when the
 * tab could not be closed (it is already gone, or the close failed).
 */
function abandonBlankTabForMcp(
  tabs: Array<{ id: string; webContents: WebContents }>,
  wcId: number,
): boolean {
  const tab = tabs.find((t) => t.webContents.id === wcId)
  if (!tab || !tabManager) return false
  try {
    return tabManager.closeTabWithoutPrompt(tab.id)
  } catch (error) {
    console.warn('[mcp] could not close the unused tab:', error)
    return false
  }
}

/** MCP: open a blank slides tab and return its webContents id, for the visible-deck bridge */
function openBlankSlidesTabForMcp(): number {
  if (!tabManager) throw new Error('OfficeVega is not ready')
  const tabId = tabManager.openSlidesTab()
  const view = tabManager.slidesTabs().find((t) => t.id === tabId)
  if (!view) throw new Error('the new presentation tab could not be opened')
  recordStarPromptDocOpen()
  return view.webContents.id
}

function newSlideTab(): void {
  try {
    bindPendingDir('slide', tabManager?.openSlidesTab())
    recordStarPromptDocOpen()
  } catch (err) {
    surfaceNewTabError(err)
  }
}

function newMarkdownTab(): void {
  try {
    bindPendingDir('markdown', tabManager?.openMarkdownTab())
    recordStarPromptDocOpen()
  } catch (err) {
    surfaceNewTabError(err)
  }
}

function newHtmlTab(): void {
  try {
    bindPendingDir('html', tabManager?.openHtmlTab())
    recordStarPromptDocOpen()
  } catch (err) {
    surfaceNewTabError(err)
  }
}

/**
 * "New PDF" creates a blank single-page .pdf in the default folder up front and
 * opens it as a regular file tab — the PDF module has no in-memory blank mode
 * (openPdfTab requires a path), same pattern as the blank workbook above.
 */
async function newPdfTab(): Promise<void> {
  try {
    const filePath = uniquePathIn(newFileDir('pdf'), `${tm('untitledPdf')}.pdf`)
    await atomicWriteFile(filePath, await blankPdfBuffer())
    // Opt the file into content-derived auto-naming on its first save
    markPdfUntitledPath(filePath)
    // route directly (not via openDocumentPath) so creating a pdf counts one
    // doc-open — same as the blank workbook above
    if (routeDocumentPath(filePath)) recordStarPromptDocOpen()
  } catch (err) {
    surfaceNewTabError(err)
  }
}

/**
 * The sheets renderer subscribes to menu actions only after Univer finishes
 * mounting (seconds on cold start), so a single 'open' can fire into the
 * void. Re-send until the queued workbook is consumed; consumption clears the
 * queue entry main-side (sheets-main), which stops the loop. The nudge only
 * reaches the active tab, so it gates on that tab's own queue entry —
 * background tabs from a multi-select Open pull their path themselves via the
 * renderer's has-queued-workbook poll.
 */
let workbookNudgeTimer: ReturnType<typeof setInterval> | null = null

function startQueuedWorkbookNudge(): void {
  if (workbookNudgeTimer) clearInterval(workbookNudgeTimer)
  const startedAt = Date.now()
  sendSheetsMenuAction('open')
  workbookNudgeTimer = setInterval(() => {
    if (
      !hasActiveQueuedWorkbook() ||
      Date.now() - startedAt > 30_000 ||
      !tabManager?.findSheetsTab()
    ) {
      if (workbookNudgeTimer) clearInterval(workbookNudgeTimer)
      workbookNudgeTimer = null
      return
    }
    sendSheetsMenuAction('open')
  }, 700)
}

// ---- home IPC ----

function statEntries(paths: string[]): RecentEntry[] {
  return statPathEntries(paths, new Set(readStarredFiles()))
}

function registerHomeIpc(): void {
  // signed-in means OfficeVega's own VEGA device login (the issued
  // sk-apivega-… key); GET /api/v1/account supplies the deposit
  ipcMain.handle(HOME_CHANNELS.accountStatus, async () => {
    if (!loadOfficeVegaAuth()) return { loggedIn: false }
    await proxyBootstrap
    const info = await vegaAccountInfo()
    return info
      ? {
          loggedIn: true,
          email: info.email,
          balance: info.balance,
          balanceRub: info.balanceRub,
          currency: info.currency,
          totalUsage: info.totalUsage,
        }
      : { loggedIn: true }
  })

  // login progress is streamed to the requesting renderer; the auth URL is
  // kept main-side so the "open manually" rescue never opens a renderer-supplied URL
  let pendingLoginUrl = ''
  ipcMain.handle(HOME_CHANNELS.accountLogin, async (event) => {
    const sender = event.sender
    pendingLoginUrl = ''
    await proxyBootstrap
    const send = (payload: AccountLoginEvent) => {
      if (!sender.isDestroyed()) sender.send(HOME_CHANNELS.accountLoginEvent, payload)
    }
    // open the browser on the first url event only; later events refresh the rescue URL
    let opened = false
    const launched = startOfficeVegaLogin((progress) => {
      if (progress.url) {
        pendingLoginUrl = progress.url
        if (!opened) {
          opened = true
          void shell.openExternal(progress.url)
        }
      }
      send(progress)
    })
    if (launched) send({ phase: 'launched' })
    return launched
  })

  ipcMain.handle(HOME_CHANNELS.accountLoginOpenUrl, () => {
    if (pendingLoginUrl) void shell.openExternal(pendingLoginUrl)
  })

  ipcMain.handle(HOME_CHANNELS.accountLogout, async () => {
    await officeVegaLogout()
  })

  ipcMain.handle(HOME_CHANNELS.getAppVersion, (): string => app.getVersion())

  ipcMain.handle(HOME_CHANNELS.recents, (_event, query: unknown): RecentPage =>
    pageRecentPaths(readRecentFiles(), query, new Set(readStarredFiles())),
  )

  ipcMain.handle(HOME_CHANNELS.searchFiles, (_event, raw: unknown): FileSearchPage => {
    const query = (raw && typeof raw === 'object' ? raw : {}) as Partial<FileSearchQuery>
    const indexer = ensureFileIndexer()
    if (!indexer || !fileIndexStore) {
      return { hits: [], total: 0, index: { indexed: 0, pending: 0, scanning: false } }
    }
    // an open search box is the moment a stale index shows; rescan at most once a minute
    indexer.refreshIfStale(60_000)
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 200) : ''
    const filter = typeof query.ext === 'string' ? query.ext : ''
    const exts = filter && filter !== 'all' ? (SEARCH_EXT_FAMILY[filter] ?? [filter]) : undefined
    const offset = Number.isFinite(query.offset) ? Math.max(0, Math.floor(query.offset!)) : 0
    const limit = Number.isFinite(query.limit) ? Math.max(0, Math.floor(query.limit!)) : 50
    const starred = new Set(readStarredFiles())
    const result = q ? fileIndexStore.search(q, { exts, offset, limit }) : { hits: [], total: 0 }
    return {
      hits: result.hits.map((h) => ({ ...h, starred: starred.has(h.path) })),
      total: result.total,
      index: indexer.progress(),
    }
  })

  // Knowledge-base channel: the AI-side read access to the reader's starred
  // files (docs wires these into its panel; see knowledge-base.ts). Path
  // arguments are validated against the starred set — a corpus file is the
  // only thing a knowledge tool may read.
  ipcMain.handle('kb:list', (): unknown => listKnowledgeFiles(readStarredFiles()))

  ipcMain.handle('kb:search', (_event, raw: unknown): unknown => {
    const query = (raw && typeof raw === 'object' ? raw : {}) as { q?: unknown; limit?: unknown }
    const q = typeof query.q === 'string' ? query.q : ''
    const limitRaw = Number(query.limit)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.floor(limitRaw)) : 8
    const store = fileIndexStore
    if (!q.trim() || !store) return []
    ensureFileIndexer()?.refreshIfStale(60_000)
    const starred = readStarredFiles()
    const hits = searchKnowledgeBase(
      (qq, pool) =>
        store.search(qq, { limit: pool }).hits.map((h) => ({
          path: h.path,
          name: h.name,
          ext: h.ext,
          snippetText: (h.snippet ?? []).map((part) => part.text).join(''),
        })),
      q,
      starred,
      Math.min(limit, 20),
    )
    return hits
  })

  ipcMain.handle('kb:read', async (_event, raw: unknown): Promise<unknown> => {
    const req = (raw && typeof raw === 'object' ? raw : {}) as {
      path?: unknown
      offset?: unknown
    }
    const path = typeof req.path === 'string' ? req.path : ''
    const offsetRaw = Number(req.offset)
    const offset = Number.isFinite(offsetRaw) ? Math.floor(offsetRaw) : 0
    if (!path || !readStarredFiles().includes(path)) {
      throw new Error('path is not in the knowledge base')
    }
    return readKnowledgeFilePage(path, offset)
  })

  // Ask AI transcript export (#1974): the Home renderer serializes to Markdown
  // and picks the file name; main owns the save dialog + write
  ipcMain.handle(
    'kb:export-chat',
    async (event, markdown: unknown, name: unknown, title: unknown) => {
      if (typeof markdown !== 'string' || !markdown) return { ok: false }
      const win = BrowserWindow.fromWebContents(event.sender) ?? shellWindow
      const defaultName = typeof name === 'string' && name ? name : 'ai-chat.md'
      const dialogTitle = typeof title === 'string' ? title : ''
      return saveTextFileWithDialog(win, {
        title: dialogTitle,
        defaultName,
        ext: 'md',
        filterName: 'Markdown',
        content: markdown,
        fallbackDir: defaultSaveDir(),
      })
    },
  )

  ipcMain.handle('kb:create-document', async (_event, raw: unknown): Promise<unknown> => {
    const req = parseKbCreateRequest(raw)
    return createKnowledgeDocument(
      {
        dir: defaultSaveDir,
        uniquePath: uniquePathIn,
        sanitizeBase: sanitizeFileBase,
        writeText: (path, text) => atomicWriteFile(path, Buffer.from(text, 'utf8')),
        markdownToDocx: async (markdown, out) => {
          await createFileViaCli(bundledCliRunner(), {
            type: 'docx',
            input: { name: 'content.md', content: markdown },
            out,
          })
        },
        recordRecent: recordRecentFile,
      },
      req,
    )
  })

  ipcMain.handle(
    HOME_CHANNELS.rerankSearch,
    async (_event, raw: unknown): Promise<FileSearchRerank | null> => {
      const settings = readFileSearchSettings()
      if (!settings.rerank) return null
      const query = (raw && typeof raw === 'object' ? raw : {}) as { q?: unknown; paths?: unknown }
      const q = typeof query.q === 'string' ? query.q.trim().slice(0, 200) : ''
      const paths = Array.isArray(query.paths)
        ? query.paths.filter((p): p is string => typeof p === 'string').slice(0, 20)
        : []
      if (!q || paths.length < 2 || !ensureFileIndexer() || !fileIndexStore) return null
      searchReranker ??= new SearchReranker(fileIndexStore)
      return searchReranker.rerank(q, paths, settings)
    },
  )

  ipcMain.handle(HOME_CHANNELS.getFileSearchSettings, (): FileSearchSettings =>
    readFileSearchSettings(),
  )

  ipcMain.handle(
    HOME_CHANNELS.setFileSearchSettings,
    (_event, patch: unknown): FileSearchSettings => {
      const current = readFileSearchSettings()
      const p = (patch && typeof patch === 'object' ? patch : {}) as Partial<FileSearchSettings>
      const next = normalizeFileSearchSettings({
        ...current,
        ...p,
        keys: { ...current.keys, ...(p.keys ?? {}) },
      })
      writeAppSetting(APP_SETTINGS_PATH(), 'fileSearch', next)
      return next
    },
  )

  ipcMain.handle(HOME_CHANNELS.testFileSearchRerank, (_event, input: unknown) =>
    probeDecision(normalizeFileSearchSettings(input)),
  )

  // Starred files sort by mtime, which requires stat-ing them all first; they are hand-picked and few, so this is fine
  ipcMain.handle(HOME_CHANNELS.starred, (_event, query: unknown): RecentPage => {
    const { offset, limit, ext } = normalizeRecentQuery(query)
    // the Starred view's group pills scope the whole query (totals included)
    const raw = (query && typeof query === 'object' ? query : {}) as { group?: unknown }
    const group = typeof raw.group === 'string' && raw.group ? raw.group : undefined
    const groupOf = readStarredGroupMap()
    const paths = readStarredFiles()
    const scoped = group ? paths.filter((p) => groupOf.get(p) === group) : paths
    const all = statEntries(scoped)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .map((entry) => {
        const g = groupOf.get(entry.path)
        return g ? { ...entry, group: g } : entry
      })
    const filtered = ext ? all.filter((entry) => matchesExtFamily(entry.ext, ext)) : all
    return {
      entries: limit === 0 ? [] : filtered.slice(offset, offset + limit),
      total: filtered.length,
      totalAll: all.length,
    }
  })

  ipcMain.handle(HOME_CHANNELS.starredGroups, (): string[] => readStarredGroups())

  ipcMain.handle(HOME_CHANNELS.setStarredGroup, (_event, paths: unknown, group: unknown) => {
    setStarredGroup(stringPaths(paths), typeof group === 'string' && group ? group : null)
  })

  ipcMain.handle(HOME_CHANNELS.statPaths, (_event, paths: unknown): RecentEntry[] =>
    statEntries(capStatPaths(stringPaths(paths))),
  )

  ipcMain.handle(HOME_CHANNELS.toggleStar, (_event, path: unknown) => {
    if (typeof path === 'string') toggleStarredFile(path)
  })

  ipcMain.handle(HOME_CHANNELS.openPath, (_event, path: unknown) => {
    if (typeof path !== 'string' || !path || path.length > 4096) return
    openDocumentPath(path)
    fileIndexer?.refresh()
  })

  ipcMain.handle(HOME_CHANNELS.browse, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? shellWindow
    if (!win) return
    const result = await showOpenDialogWithMemory(dialog, win, {
      title: tm('dlgOpenTitle'),
      filters: [
        { name: tm('filterSupported'), extensions: OPEN_DIALOG_EXTENSIONS },
        { name: tm('filterWord'), extensions: ['docx', 'doc', 'odt', 'ott'] },
        {
          name: tm('filterExcel'),
          extensions: ['xlsx', 'xlsm', 'xls', 'csv', 'tsv', 'ods', 'ots'],
        },
        { name: tm('filterPpt'), extensions: ['pptx', 'ppt', 'odp', 'otp'] },
        { name: tm('filterPdf'), extensions: ['pdf'] },
        { name: tm('filterMarkdown'), extensions: ['md', 'markdown', 'txt', 'json'] },
        { name: tm('filterHtml'), extensions: ['html', 'htm'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (!result.canceled) for (const path of result.filePaths) openDocumentPath(path)
  })

  ipcMain.handle(HOME_CHANNELS.newDoc, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('doc', opts)
    newDocTab()
  })

  ipcMain.handle(HOME_CHANNELS.newSheet, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('sheet', opts)
    void newSheetTab()
  })

  ipcMain.handle(HOME_CHANNELS.newSlide, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('slide', opts)
    newSlideTab()
  })

  ipcMain.handle(HOME_CHANNELS.newMarkdown, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('markdown', opts)
    newMarkdownTab()
  })

  ipcMain.handle(HOME_CHANNELS.newHtml, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('html', opts)
    newHtmlTab()
  })

  ipcMain.handle(HOME_CHANNELS.newPdf, (_event, opts?: NewFileOpts) => {
    rememberPendingDir('pdf', opts)
    void newPdfTab()
  })

  ipcMain.handle(HOME_CHANNELS.removeRecent, (_event, paths: unknown) => {
    const list = stringPaths(paths)
    removeRecentFiles(list)
    // an unavailable entry's star must go with it, or the Starred view keeps
    // a dead dimmed row the recents list no longer shows
    removeStarredFiles(list.filter((p) => !existsSync(p)))
  })

  // Bulk unstar from the Starred view: every row there is a favorite, so the
  // selection action is "unstar", not "remove from recents" — removeRecent
  // keeps existing files' stars on purpose, which made the Starred view's
  // bulk removal a no-op for anything still on disk
  ipcMain.handle(HOME_CHANNELS.unstarPaths, (_event, paths: unknown) => {
    removeStarredFiles(stringPaths(paths))
  })

  ipcMain.handle(HOME_CHANNELS.revealPath, (_event, path: unknown) => {
    if (typeof path === 'string' && existsSync(path)) shell.showItemInFolder(path)
  })

  ipcMain.handle(
    HOME_CHANNELS.renameFile,
    (_event, path: unknown, newName: unknown): RenameResult => {
      if (typeof path !== 'string' || typeof newName !== 'string')
        return { ok: false, error: tm('errBadArgs') }
      // Validate the raw name before trimming: trimming first would
      // silently turn "report " into "report" and make the
      // trailing-space gate in isValidRenameName unreachable. Reject
      // with the localized gate instead of renaming to a different
      // name than requested.
      if (!isValidRawRenameName(newName)) return { ok: false, error: tm('errBadName') }
      if (!renameStaysInApp(path, newName.trim()))
        return { ok: false, error: tm('errBadExtension') }
      if (!isUserVisibleFile(path, fileTargetSources()))
        return { ok: false, error: tm('errBadArgs') }
      const name = newName.trim()
      if (!existsSync(path)) return { ok: false, error: tm('errMissing') }
      const target = join(dirname(path), name)
      if (target === path) return { ok: true, path }
      // A case-only rename (Report.pdf -> report.pdf) hits the source itself on
      // case-insensitive filesystems; only a genuinely different file blocks.
      if (existsSync(target) && !isSameFile(path, target)) {
        return { ok: false, error: tm('errExists') }
      }
      try {
        renameSync(path, target)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : tm('errRenameFailed') }
      }
      afterFileMoved(path, target)
      return { ok: true, path: target }
    },
  )

  ipcMain.handle(HOME_CHANNELS.duplicateFile, async (_event, path: unknown) => {
    if (typeof path !== 'string' || !existsSync(path)) return
    if (!isUserVisibleFile(path, fileTargetSources())) return
    await duplicateFile(path)
  })

  ipcMain.handle(HOME_CHANNELS.deleteFiles, async (_event, paths: unknown) => {
    const targets = fileTargetSources()
    // a missing path still passes so the ghost recent/star entry gets cleaned up
    const list = stringPaths(paths).filter(
      (p) => isUserVisibleFile(p, targets) && statMaybeFile(p)?.isFile() !== false,
    )
    for (const p of list) {
      try {
        await shell.trashItem(p)
      } catch {
        // file already gone or trash unavailable; still drop it from the list
      }
    }
    removeRecentFiles(list)
    // the files were deliberately destroyed — stars must not survive as ghosts
    removeStarredFiles(list)
  })

  ipcMain.handle(HOME_CHANNELS.openTrash, () => {
    if (process.platform === 'darwin') {
      void shell.openPath(join(app.getPath('home'), '.Trash'))
    } else if (process.platform === 'win32') {
      spawn('explorer.exe', ['shell:RecycleBin'], { detached: true }).unref()
    } else {
      void shell.openPath(join(app.getPath('home'), '.local', 'share', 'Trash', 'files'))
    }
  })

  ipcMain.handle(HOME_CHANNELS.openHelp, () => {
    tabManager?.openHelpTab()
  })
  ipcMain.handle(HOME_CHANNELS.getLanguage, (): Lang => currentLang())

  ipcMain.handle(HOME_CHANNELS.setLanguage, (_event, lang: unknown) => {
    if (!isLang(lang) || lang === currentLang()) return
    persistLang(lang)
    // the switcher lives on the home page, so the home menu is the active one
    buildHomeMenu()
    installDockMenu()
    installBackToHomeItems()
    for (const wc of webContents.getAllWebContents()) wc.send('app:language-changed', lang)
  })

  ipcMain.handle(HOME_CHANNELS.getUpdateChannel, (): UpdateChannel => currentUpdateChannel())

  ipcMain.handle(HOME_CHANNELS.setUpdateChannel, (_event, channel: unknown) => {
    if (!isUpdateChannel(channel) || channel === currentUpdateChannel()) return
    cachedUpdateChannel = channel
    writeAppSetting(APP_SETTINGS_PATH(), 'updateChannel', channel)
    applyUpdateChannel(channel)
  })

  ipcMain.handle(
    HOME_CHANNELS.onboardingSeen,
    (): boolean => readAppSettings(APP_SETTINGS_PATH()).onboardingSeen === true,
  )

  ipcMain.handle(HOME_CHANNELS.setOnboardingSeen, (): boolean => {
    try {
      writeAppSetting(APP_SETTINGS_PATH(), 'onboardingSeen', true)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(HOME_CHANNELS.getTheme, (): UiTheme => currentTheme())
  // editor tabs ask via the app-wide channel (symmetric with app:get-language)
  ipcMain.handle('app:get-theme', (): UiTheme => currentTheme())

  ipcMain.handle(HOME_CHANNELS.setTheme, (_event, theme: unknown) => {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return
    if (theme === currentTheme()) return
    cachedTheme = theme
    writeAppSetting(APP_SETTINGS_PATH(), 'theme', theme)
    nativeTheme.themeSource = theme
    refreshTitleBarOverlay()
    for (const wc of webContents.getAllWebContents()) wc.send('app:theme-changed', theme)
  })

  ipcMain.handle(HOME_CHANNELS.getDesign, (): UiDesign => currentDesign())
  // editor tabs ask via the app-wide channel (symmetric with app:get-theme)
  ipcMain.handle('app:get-design', (): UiDesign => currentDesign())

  ipcMain.handle(HOME_CHANNELS.setDesign, (_event, design: unknown) => {
    if (design !== 'standard' && design !== 'retro' && design !== 'digital') return
    if (design === currentDesign()) return
    cachedDesign = design
    writeAppSetting(APP_SETTINGS_PATH(), 'design', design)
    for (const wc of webContents.getAllWebContents()) wc.send('app:design-changed', design)
  })

  ipcMain.handle(HOME_CHANNELS.getDisplayName, (): string => currentDisplayName())

  ipcMain.handle(HOME_CHANNELS.setDisplayName, (_event, name: unknown) => {
    if (typeof name !== 'string') return
    const next = name.trim().slice(0, 80)
    if (next === currentDisplayName()) return
    writeAppSetting(APP_SETTINGS_PATH(), 'displayName', next)
    for (const wc of webContents.getAllWebContents())
      wc.send('app:display-name-changed', next)
  })

  ipcMain.handle(HOME_CHANNELS.getDocumentTheme, (): DocTheme => currentDocTheme())
  // editor tabs ask via the app-wide channel (symmetric with app:get-theme)
  ipcMain.handle('app:get-document-theme', (): DocTheme => currentDocTheme())

  ipcMain.handle(HOME_CHANNELS.setDocumentTheme, (_event, theme: unknown) => {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'follow' && theme !== 'eyecare')
      return
    if (theme === currentDocTheme()) return
    cachedDocTheme = theme
    writeAppSetting(APP_SETTINGS_PATH(), 'documentTheme', theme)
    // the native theme is untouched — only the editors' canvas/paper follows this
    for (const wc of webContents.getAllWebContents()) wc.send('app:document-theme-changed', theme)
  })

  ipcMain.handle(HOME_CHANNELS.getAutoSaveDefault, (): AutoSaveDefault => currentAutoSaveDefault())
  ipcMain.handle('app:get-auto-save-default', (): AutoSaveDefault => currentAutoSaveDefault())

  ipcMain.handle(HOME_CHANNELS.setAutoSaveDefault, (_event, on: unknown) => {
    if (typeof on !== 'boolean') return
    if (on === currentAutoSaveDefault().on) return
    const next: AutoSaveDefault = { on, updatedAt: Date.now() }
    cachedAutoSaveDefault = next
    writeAppSettings(APP_SETTINGS_PATH(), {
      autoSaveDefault: next.on,
      autoSaveDefaultUpdatedAt: next.updatedAt,
    })
    for (const wc of webContents.getAllWebContents()) wc.send('app:auto-save-default-changed', next)
  })

  ipcMain.handle(HOME_CHANNELS.getUiScale, (): number => currentUiScale())
  // editor tabs ask via the app-wide channel (symmetric with app:get-theme)
  ipcMain.handle('app:get-ui-scale', (): number => currentUiScale())

  ipcMain.handle(HOME_CHANNELS.setUiScale, (_event, factor: unknown) => {
    if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0.5 || factor > 3)
      return
    const next = Math.round(factor * 1000) / 1000
    if (next === currentUiScale()) return
    cachedUiScale = next
    setUiScale(APP_SETTINGS_PATH(), next)
    for (const wc of webContents.getAllWebContents()) wc.send('app:ui-scale-changed', next)
  })
  // the editors' View-menu interface zoom uses the same setter (#1913)
  ipcMain.handle('app:set-ui-scale', (_event, factor: unknown) => {
    if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0.5 || factor > 3)
      return
    const next = Math.round(factor * 1000) / 1000
    if (next === currentUiScale()) return
    cachedUiScale = next
    setUiScale(APP_SETTINGS_PATH(), next)
    for (const wc of webContents.getAllWebContents()) wc.send('app:ui-scale-changed', next)
  })

  ipcMain.handle(HOME_CHANNELS.getMcpStatus, () => mcpStatus())

  ipcMain.handle(HOME_CHANNELS.setMcpSettings, async (_event, patch: unknown) => {
    if (!patch || typeof patch !== 'object') return mcpStatus()
    const request = patch as {
      enabled?: unknown
      port?: unknown
      background?: unknown
      logging?: unknown
    }
    const current = currentMcpSettings()
    const enabled = typeof request.enabled === 'boolean' ? request.enabled : current.enabled
    const port =
      typeof request.port === 'number' &&
      Number.isInteger(request.port) &&
      request.port > 0 &&
      request.port < 65536
        ? request.port
        : current.port
    const background =
      typeof request.background === 'boolean' ? request.background : current.background
    const logging = typeof request.logging === 'boolean' ? request.logging : current.logging
    writeAppSettings(APP_SETTINGS_PATH(), {
      mcpEnabled: enabled,
      mcpPort: port,
      mcpBackground: background,
      mcpLogging: logging,
    })
    try {
      return await applyMcpSettings({ enabled, port, background, logging })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ...mcpStatus(), error: message }
    }
  })

  ipcMain.handle(HOME_CHANNELS.getMcpLogs, () => getMcpRecentLogs())

  ipcMain.handle(HOME_CHANNELS.clearMcpLogs, () => {
    clearMcpLogs()
  })

  ipcMain.handle(HOME_CHANNELS.openMcpLogFile, () => {
    revealMcpLogFile()
    const logPath = mcpLogFilePath()
    if (logPath) shell.showItemInFolder(logPath)
  })

  ipcMain.handle(HOME_CHANNELS.getAiPanelPrefs, (): AiPanelPrefs => currentAiPanelPrefs())
  ipcMain.handle('app:get-ai-panel-prefs', (): AiPanelPrefs => currentAiPanelPrefs())

  const setAiPanelPrefs = (patch: unknown): AiPanelPrefs => {
    const prev = currentAiPanelPrefs()
    const raw =
      patch !== null && typeof patch === 'object' ? (patch as Record<string, unknown>) : {}
    // unknown/malformed fields fall back to the previous value, not the default
    const next = normalizeAiPanelPrefs({
      side: raw.side === 'left' || raw.side === 'right' ? raw.side : prev.side,
      fontSize: 'fontSize' in raw ? raw.fontSize : prev.fontSize,
      customFontSize: 'customFontSize' in raw ? raw.customFontSize : prev.customFontSize,
      spellcheck: 'spellcheck' in raw ? raw.spellcheck : prev.spellcheck,
      openInNewDocs: 'openInNewDocs' in raw ? raw.openInNewDocs : prev.openInNewDocs,
      showAiSidebar:
        'showAiSidebar' in raw
          ? raw.showAiSidebar
          : 'enabled' in raw
            ? raw.enabled
            : prev.showAiSidebar,
    })
    if (sameAiPanelPrefs(next, prev)) return prev
    cachedAiPanelPrefs = next
    writeAppSettings(APP_SETTINGS_PATH(), {
      aiPanelSide: next.side,
      aiPanelFontSize: next.fontSize,
      aiPanelCustomFontSize: next.customFontSize,
      aiPanelSpellcheck: next.spellcheck,
      aiPanelOpenInNewDocs: next.openInNewDocs,
      aiPanelShowSidebar: next.showAiSidebar,
    })
    for (const wc of webContents.getAllWebContents()) wc.send('app:ai-panel-prefs-changed', next)
    return next
  }
  ipcMain.handle(HOME_CHANNELS.setAiPanelPrefs, (_event, patch) => setAiPanelPrefs(patch))
  ipcMain.handle('app:set-ai-panel-prefs', (_event, patch) => setAiPanelPrefs(patch))

  // effective folder where new/untitled files land; the editor mains resolve
  // the same setting themselves (configuredDefaultSaveDir via docs' defaultSaveDir)
  // ── folder tree over the default save folder ──
  const folderErrors = (): FolderErrors => ({
    badArgs: tm('errBadArgs'),
    badName: tm('errBadName'),
    missing: tm('errMissing'),
    exists: tm('errExists'),
    failed: tm('errRenameFailed'),
  })
  const insideRoot = (path: unknown): path is string =>
    typeof path === 'string' && insideAnyRoot(path)
  const isRoot = (path: string) => isAnyRoot(path)

  ipcMain.handle(HOME_CHANNELS.folderRoots, (): FolderRoot[] => {
    // describeRoot creates a missing save folder, so its watcher has something to attach to
    const roots = [describeRoot(defaultSaveDir()), ...extraFolderRoots().map(describeExtraRoot)]
    ensureFolderWatchers()
    return roots
  })

  // an added folder joins the tree where it is: nothing on disk is created, copied or moved
  const addFolderRoot = (path: string): FolderRoot | null => {
    const extras = withExtraRoot(extraFolderRoots(), defaultSaveDir(), path)
    if (!extras) return null
    writeAppSetting(APP_SETTINGS_PATH(), FOLDER_ROOTS_KEY, extras)
    ensureFolderWatchers()
    fileIndexer?.refresh()
    return describeExtraRoot(path)
  }

  ipcMain.handle(HOME_CHANNELS.addFolderRoot, async (): Promise<FolderRoot | null> => {
    const result = await showOpenDialogWithMemory(dialog, shellWindow, {
      title: tm('dlgAddFolderRoot'),
      properties: ['openDirectory'],
    })
    const picked = result.filePaths[0]
    if (result.canceled || !picked) return null
    if (!describeExtraRoot(picked).readable) {
      showErrorDialog(shellWindow, tm('errFolderRootUnusable'), picked)
      return null
    }
    return addFolderRoot(picked)
  })

  ipcMain.handle(HOME_CHANNELS.dropFolderRoots, (_event, paths: unknown): FolderRoot[] => {
    const added: FolderRoot[] = []
    const files: string[] = []
    for (const path of stringPaths(paths)) {
      if (!describeExtraRoot(path).readable) {
        files.push(path)
        continue
      }
      const root = addFolderRoot(path)
      if (root) added.push(root)
    }
    if (files.length > 0) handleDroppedFiles(files, droppedFilesDeps())
    return added
  })

  ipcMain.handle(HOME_CHANNELS.removeFolderRoot, (_event, path: unknown) => {
    if (typeof path !== 'string') return
    const extras = withoutExtraRoot(extraFolderRoots(), path)
    writeAppSetting(APP_SETTINGS_PATH(), FOLDER_ROOTS_KEY, extras)
    ensureFolderWatchers()
    fileIndexer?.refresh()
  })

  ipcMain.handle(HOME_CHANNELS.listFolder, (_event, dir: unknown): FolderListing => {
    if (!insideRoot(dir)) return { dir: String(dir), folders: [], files: [] }
    return listFolder(dir, new Set(readStarredFiles()))
  })

  ipcMain.handle(
    HOME_CHANNELS.createFolder,
    (_event, parent: unknown, name: unknown): RenameResult => {
      if (!insideRoot(parent) || typeof name !== 'string')
        return { ok: false, error: tm('errBadArgs') }
      return createFolder(parent, name, folderErrors())
    },
  )

  ipcMain.handle(
    HOME_CHANNELS.renameFolder,
    (_event, dir: unknown, newName: unknown): RenameResult => {
      if (!insideRoot(dir) || isRoot(dir) || typeof newName !== 'string')
        return { ok: false, error: tm('errBadArgs') }
      const filesBefore = trackedFilesUnder(dir)
      const result = renameFolder(dir, newName, folderErrors())
      if (result.ok && result.path && result.path !== dir) {
        afterFolderMoved(dir, result.path, filesBefore)
      }
      return result
    },
  )

  ipcMain.handle(
    HOME_CHANNELS.movePaths,
    async (_event, paths: unknown, targetDir: unknown, policy: unknown): Promise<MoveResult> => {
      const list = stringPaths(paths)
      if (!insideRoot(targetDir)) {
        const error = tm('errBadArgs')
        return { moved: [], conflicts: [], failed: list.map((path) => ({ path, error })) }
      }
      const conflictPolicy: MoveConflictPolicy =
        policy === 'replace' || policy === 'keepBoth' || policy === 'skip' ? policy : 'ask'
      const isDir = (p: string) => {
        try {
          return statSync(p).isDirectory()
        } catch {
          return false
        }
      }
      // files may come from anywhere the UI can show (the Recent list); folders only from inside the tree, never a root itself
      const moveSources = { ...fileTargetSources(), isDirectory: isDir, isAnyRoot }
      const sources = list.filter((p) => isMoveSource(p, moveSources))
      const dirFiles = new Map(sources.filter(isDir).map((p) => [p, trackedFilesUnder(p)]))
      // 'replace' must not destroy data: the displaced target goes to the trash,
      // and everything keyed on its path (recents, stars, chat history) leaves
      // with it so the incoming file does not inherit another document's record
      const displaced: string[] = []
      const result = movePathsInto(sources, targetDir, conflictPolicy, folderErrors(), {
        replaceExisting: (path) => {
          const parked = join(dirname(path), `.officevega-replaced-${Date.now()}-${basename(path)}`)
          const files = isDir(path) ? trackedFilesUnder(path) : [path]
          renameSync(path, parked)
          return {
            commit: () => {
              displaced.push(parked)
              removeRecentFiles(files)
              removeStarredFiles(files)
              for (const file of files) projectFileRenamed(file, rebasePath(file, path, parked))
            },
            rollback: () => renameSync(parked, path),
          }
        },
      })
      for (const parked of displaced) {
        try {
          await shell.trashItem(parked)
        } catch {
          rmSync(parked, { recursive: true, force: true })
        }
      }
      for (const { from, to } of result.moved) {
        const files = dirFiles.get(from)
        if (files) afterFolderMoved(from, to, files)
        else afterFileMoved(from, to)
      }
      return result
    },
  )

  ipcMain.handle(HOME_CHANNELS.deleteFolder, async (_event, dir: unknown) => {
    if (!insideRoot(dir) || isRoot(dir)) return
    const files = trackedFilesUnder(dir)
    try {
      await shell.trashItem(dir)
    } catch {
      return
    }
    removeRecentFiles(files)
    removeStarredFiles(files)
  })

  ipcMain.handle(HOME_CHANNELS.getDefaultSaveDir, (): string => defaultSaveDir())

  const defaultApp = createDefaultAppService({
    platform: process.platform,
    packaged: app.isPackaged,
    exePath: app.getPath('exe'),
    run: execFileRunner,
    openExternal: (url) => shell.openExternal(url),
  })
  ipcMain.handle(HOME_CHANNELS.getDefaultAppStatus, () => defaultApp.status())
  ipcMain.handle(HOME_CHANNELS.setDefaultApp, () => defaultApp.set())

  ipcMain.handle(HOME_CHANNELS.pickDefaultSaveDir, async (): Promise<string | null> => {
    const result = await showOpenDialogWithMemory(dialog, shellWindow, {
      title: tm('dlgPickSaveDir'),
      defaultPath: defaultSaveDir(),
      properties: ['openDirectory', 'createDirectory'],
    })
    const picked = result.filePaths[0]
    if (result.canceled || !picked) return null
    if (!isUsableSaveDir(picked)) {
      showErrorDialog(shellWindow, tm('errSaveDirUnusable'), picked)
      return null
    }
    writeAppSetting(APP_SETTINGS_PATH(), DEFAULT_SAVE_DIR_KEY, picked)
    ensureFolderWatchers()
    return picked
  })

  ipcMain.handle(HOME_CHANNELS.openCreditUsage, () => {
    shell.openExternal(CREDIT_USAGE_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openGitHubRepo, () => {
    shell.openExternal(GITHUB_REPO_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openWebsite, () => {
    shell.openExternal(OFFICEVEGA_SITE_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openAiProvider, () => {
    shell.openExternal(VEGA_API_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openAiModels, () => {
    shell.openExternal(VEGA_MODELS_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openVegaChat, () => {
    shell.openExternal(currentLang() === 'ru' ? VEGA_CHAT_RU_URL : VEGA_CHAT_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openVegaCodes, () => {
    shell.openExternal(VEGA_CODES_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openFeedback, () => {
    shell.openExternal(FEEDBACK_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openDeveloperSite, () => {
    shell.openExternal(DEVELOPER_SITE_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  ipcMain.handle(HOME_CHANNELS.openDeveloperChannel, () => {
    shell.openExternal(DEVELOPER_CHANNEL_URL).catch(() => {
      // no browser handler available; nothing actionable for the user here
    })
  })

  // returning true also counts as "shown": the renderer displays it
  // unconditionally, so no separate mark-shown round-trip is needed
  ipcMain.handle(HOME_CHANNELS.starPromptShouldShow, (): StarPromptShow => {
    if (starPromptSessionGrant) return starPromptSessionGrant
    const now = Date.now()
    const state = readStarPrompt()
    const docOpens = state.docOpens ?? 0
    // dev preview of the card without waiting out the value thresholds
    // (same pattern as OFFICEVEGA_FAKE_UPDATE); nothing is recorded
    if (!app.isPackaged && process.env.OFFICEVEGA_FORCE_STAR_PROMPT) return { show: true, docOpens }
    if (!STAR_PROMPT_ENABLED) return { show: false, docOpens }
    const grant = (): StarPromptShow => {
      writeStarPrompt(withShown(state, now))
      starPromptSessionGrant = { show: true, docOpens }
      return starPromptSessionGrant
    }
    // first launch after an upgrade: skip the value gates once for a
    // never-prompted user (they are a proven repeat user already)
    if (upgradeStarPromptPending) {
      upgradeStarPromptPending = false
      if (shouldShowUpgradeStarPrompt(state)) return grant()
    }
    if (!shouldShowStarPrompt(state, now)) return { show: false, docOpens }
    return grant()
  })

  ipcMain.handle(HOME_CHANNELS.starPromptAction, (_event, action: unknown) => {
    if (action !== 'starred' && action !== 'later') return
    // the card was reacted to — drop the session grant so a later query (new
    // shell window on macOS) re-evaluates the real rules (snooze / resolved)
    starPromptSessionGrant = null
    // 'later' needs no write: the display was already counted by the query
    if (action === 'starred') writeStarPrompt(withResolved(readStarPrompt()))
  })
}

function stringPaths(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : []
}

// electron-vite emits ?asset files under hashed names, which breaks nativeImage's
// automatic `@2x` sibling lookup — attach the retina representation by hand
function loadMenuIcon(path1x: string, path2x: string): NativeImage {
  const icon = nativeImage.createFromPath(path1x)
  icon.addRepresentation({ scaleFactor: 2, buffer: readFileSync(path2x) })
  return icon
}

// loaded once, not on every menu open
interface MenuIconSet {
  docx: NativeImage
  xlsx: NativeImage
  pptx: NativeImage
  pdf: NativeImage
  md: NativeImage
  html: NativeImage
  home: NativeImage
  plus: NativeImage
  folder: NativeImage
}
let menuIconCache: MenuIconSet | null = null
function menuIcons(): MenuIconSet {
  menuIconCache ??= {
    docx: loadMenuIcon(menuDocxIcon1x, menuDocxIcon2x),
    xlsx: loadMenuIcon(menuXlsxIcon1x, menuXlsxIcon2x),
    pptx: loadMenuIcon(menuPptxIcon1x, menuPptxIcon2x),
    pdf: loadMenuIcon(menuPdfIcon1x, menuPdfIcon2x),
    md: loadMenuIcon(menuMdIcon1x, menuMdIcon2x),
    html: loadMenuIcon(menuHtmlIcon1x, menuHtmlIcon2x),
    home: loadMenuIcon(menuHomeIcon1x, menuHomeIcon2x),
    plus: loadMenuIcon(menuPlusIcon1x, menuPlusIcon2x),
    folder: loadMenuIcon(menuFolderIcon1x, menuFolderIcon2x),
  }
  return menuIconCache
}

const TAB_MENU_ICON: Record<TabKind, keyof MenuIconSet> = {
  home: 'home',
  docs: 'docx',
  sheets: 'xlsx',
  slides: 'pptx',
  pdf: 'pdf',
  markdown: 'md',
  html: 'html',
  help: 'home',
}

// tab views see neither DOM events nor a focus change when the user clicks the
// shell chrome — relay the press so open popovers in documents can dismiss.
// The pressed document must be excluded: it already dismissed (or is opening)
// its own popovers via its local pointerdown listeners, and the async IPC
// round-trip would otherwise close a popover that very press just opened
// (home row menus died this way: pointerdown → broadcast → menu unmounts
// before the click event ever reached the menu item).
function broadcastChromePressed(exclude?: WebContents): void {
  for (const wc of webContents.getAllWebContents()) {
    if (wc !== exclude) wc.send('app:chrome-pressed')
  }
}

/** the shell's tab manager, recreating the shell window when a detached editor outlived it */
function ensureTabManager(): TabManager {
  if (!tabManager) createShellWindow()
  if (!tabManager) throw new Error('the shell window could not be created')
  return tabManager
}

/** "Open in New Window": reparent the tab's live view into a detached editor
 *  window — the document moves as-is, unsaved edits included. */
function detachTabToWindow(id: string): void {
  if (!tabManager) return
  const record = tabManager.detachTab(id)
  if (!record) return
  const win = createDetachedEditorWindow({ ...record, applyMenuFor })
  win.focus()
}

/** Tear-off: the tab leaves the strip for a window created under the held
 *  pointer at (x, y); the strip keeps steering it until release. */
function tearOffTabToWindow(id: string, x: number, y: number): boolean {
  if (!tabManager || isTearingOff() || !tabManager.canDetachTab(id)) return false
  const record = tabManager.detachTab(id)
  if (!record) return false
  createDetachedEditorWindow({ ...record, applyMenuFor, tearOffAt: { x, y } })
  return true
}

/** insertion slot the shell strip reported for the current dock preview */
let lastDockIndex: number | undefined

/** Menu-command target for the editors whose menus resolve through the shell
 *  (pdf / markdown / html): the focused detached window of that kind first,
 *  else the shell's active tab of that kind. */
function activeEditorTarget(
  kind: TabKind,
  fromTabs: () => { id: string; webContents: WebContents; filePath?: string } | undefined,
): { id: string; webContents: WebContents; filePath?: string } | undefined {
  const detachedTab = focusedDetachedTab()
  if (detachedTab?.kind === kind) return detachedTab
  return fromTabs()
}
function activePdfTarget() {
  return activeEditorTarget('pdf', () => tabManager?.activePdfTab())
}

/** ⌘W / File > Close targets the focused window: a detached editor closes
 *  itself (its own unsaved-changes guard runs), otherwise the shell's active tab
 *  — the same rule the docs / sheets / slides close hooks follow */
function closeFocusedEditor(): void {
  const focused = BrowserWindow.getFocusedWindow()
  if (focused && focused !== shellWindow && isDetachedEditorWindow(focused)) focused.close()
  else tabManager?.closeActiveTab()
}

/** the window a pdf command's dialogs and progress belong to: the detached
 *  editor hosting the tab when there is one, else the shell */
function pdfHostWindow(tab: { webContents: WebContents } | undefined): BrowserWindow | null {
  if (!tab) return null
  return detachedWindowForWebContents(tab.webContents.id) ?? shellWindow
}
function activeMarkdownTarget() {
  return activeEditorTarget('markdown', () => tabManager?.activeMarkdownTab())
}
function activeHtmlTarget() {
  return activeEditorTarget('html', () => tabManager?.activeHtmlTab())
}

/** files of tabs that were closed, newest last, so "Reopen closed tab" can bring them back */
const recentlyClosed = createRecentlyClosedTracker()

function duplicateFile(path: string): Promise<string | undefined> {
  return duplicateDocumentFile(path, {
    copySuffix: tm('copySuffix'),
    recordRecentFile,
    onError: (error) => showErrorDialog(shellWindow, tm('errDuplicateFailed'), error),
  })
}

/** The shell's side of every entry of the tab menu (see tab-menu.ts for what is offered). */
function tabMenuActions(): TabMenuActions {
  const documentAction = (id: string, action: TabDocumentAction) => {
    if (!tabManager) return
    runTabDocumentAction(
      {
        tabs: tabManager,
        savePdf: (contents) => {
          void flushPdfSave(contents)
        },
        savePdfAs: (target) => {
          void savePdfAs(target)
        },
        printPdf: sendPdfPrintRequest,
        saveMarkdown: (contents, mode) => {
          void requestMarkdownSave(contents, mode)
        },
        printMarkdown: sendMarkdownPrintRequest,
        saveHtml: (contents, mode) => {
          void requestHtmlSave(contents, mode)
        },
        printHtml: sendHtmlPrintRequest,
      },
      id,
      action,
    )
  }
  return {
    save: (id) => documentAction(id, 'save'),
    saveAs: (id) => documentAction(id, 'saveAs'),
    print: (id) => documentAction(id, 'print'),
    openInNewWindow: (id) => detachTabToWindow(id),
    // two windows side by side, each on its own half of the screen the tab is on
    splitBeside: (id) => {
      if (!tabManager || !shellWindow) return
      const record = tabManager.detachTab(id)
      if (!record) return
      const win = createDetachedEditorWindow({ ...record, applyMenuFor })
      const area = screen.getDisplayMatching(shellWindow.getBounds()).workArea
      const half = Math.floor(area.width / 2)
      if (shellWindow.isMaximized()) shellWindow.unmaximize()
      if (shellWindow.isFullScreen()) shellWindow.setFullScreen(false)
      shellWindow.setBounds({ x: area.x, y: area.y, width: half, height: area.height })
      win.setBounds({ x: area.x + half, y: area.y, width: area.width - half, height: area.height })
      win.focus()
    },
    rename: (id) => {
      if (shellWindow && !shellWindow.isDestroyed())
        shellWindow.webContents.send(TABS_CHANNELS.startRename, id)
    },
    duplicate: (path) => {
      void duplicateFile(path).then((target) => {
        if (target) openDocumentPath(target)
      })
    },
    copyText: (text) => clipboard.writeText(text),
    reveal: (path) => shell.showItemInFolder(path),
    openDefault: (path) => {
      // a document tab is a document, never a program; keep it that way for a renamed one
      if (!isProgramFile(path)) void shell.openPath(path)
    },
    move: (id, toIndex) => tabManager?.reorderTab(id, toIndex),
    closeTabs: (ids) => void (tabManager && closeTabsInOrder(tabManager, ids)),
    reopenClosed: () => recentlyClosed.reopenNext(openDocumentPath, existsSync),
  }
}

function registerTabsIpc(): void {
  ipcMain.on(TABS_CHANNELS.chromePressed, (event) => broadcastChromePressed(event.sender))
  ipcMain.handle(TABS_CHANNELS.list, () => tabManager?.list() ?? [])
  ipcMain.handle(TABS_CHANNELS.activate, (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) return
    tabManager?.activateTab(id)
  })
  ipcMain.handle(TABS_CHANNELS.close, (_event, id: unknown) => {
    if (typeof id !== 'string' || !id) return
    return tabManager?.closeTab(id)
  })
  ipcMain.handle(TABS_CHANNELS.reorder, (_event, id: string, toIndex: number) => {
    if (typeof id === 'string' && Number.isInteger(toIndex)) tabManager?.reorderTab(id, toIndex)
  })
  // "all tabs" overflow menu — native popup because the editors' WebContentsView
  // would cover any DOM dropdown the shell renderer draws below the tab strip
  ipcMain.handle(TABS_CHANNELS.showAppMenu, (_event, x: unknown, y: unknown) => {
    if (!shellWindow) return
    Menu.getApplicationMenu()?.popup({
      window: shellWindow,
      ...(typeof x === 'number' && typeof y === 'number'
        ? { x: Math.round(x), y: Math.round(y) }
        : {}),
    })
  })
  ipcMain.handle(TABS_CHANNELS.showMenu, (_event, x: unknown, y: unknown) => {
    if (!tabManager || !shellWindow) return
    const menu = Menu.buildFromTemplate(
      tabManager.list().map((tab) => ({
        label: tab.title,
        type: 'checkbox' as const,
        checked: tab.active,
        icon: menuIcons()[TAB_MENU_ICON[tab.kind]],
        click: () => tabManager?.activateTab(tab.id),
      })),
    )
    menu.popup({
      window: shellWindow,
      ...(typeof x === 'number' && typeof y === 'number'
        ? { x: Math.round(x), y: Math.round(y) }
        : {}),
    })
  })
  ipcMain.handle(TABS_CHANNELS.detach, (_event, id: unknown) => {
    if (typeof id !== 'string' || !tabManager?.canDetachTab(id)) return
    detachTabToWindow(id)
  })
  // drag-to-tear-off: the strip drives the window until the pointer lifts
  ipcMain.handle(TABS_CHANNELS.tearOff, (_event, id: unknown, x: unknown, y: unknown) => {
    if (typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') return false
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false
    return tearOffTabToWindow(id, x, y)
  })
  ipcMain.on(TABS_CHANNELS.dragTornWindow, (_event, x: unknown, y: unknown) => {
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y))
      dragTornWindow(x, y)
  })
  ipcMain.handle(TABS_CHANNELS.dockTornWindow, (_event, index: unknown) => {
    const tab = takeTornTab()
    if (!tab) return
    ensureTabManager().attachTab(tab, typeof index === 'number' ? index : undefined)
  })
  ipcMain.handle(TABS_CHANNELS.endTornDrag, () => endTornDrag())
  ipcMain.on(TABS_CHANNELS.dockIndex, (_event, index: unknown) => {
    lastDockIndex = typeof index === 'number' && Number.isInteger(index) ? index : undefined
  })
  // per-tab context menu — native for the same reason as the tab list above
  ipcMain.handle(TABS_CHANNELS.showTabMenu, (_event, id: unknown, x: unknown, y: unknown) => {
    if (!tabManager || !shellWindow || typeof id !== 'string') return
    const tab = tabManager.list().find((t) => t.id === id)
    if (!tab || tab.kind === 'home') return
    const template = tabMenuTemplate({
      tab,
      tabs: tabManager.list(),
      canDetach: tabManager.canDetachTab(id),
      fileExists: !!tab.filePath && existsSync(tab.filePath),
      canReopen: recentlyClosed.getEntries().length > 0,
      tm,
      actions: tabMenuActions(),
    })
    Menu.buildFromTemplate(template).popup({
      window: shellWindow,
      ...(typeof x === 'number' && typeof y === 'number'
        ? { x: Math.round(x), y: Math.round(y) }
        : {}),
    })
  })
  // "+" new-file menu — native for the same reason as the tab list above
  ipcMain.handle(TABS_CHANNELS.showNewMenu, (_event, x: unknown, y: unknown) => {
    if (!tabManager || !shellWindow) return
    const menu = Menu.buildFromTemplate([
      // enabled:false so pre-Sonoma macOS / Windows (no 'header' support) degrade
      // to an inert label instead of a clickable no-op item
      { label: tm('menuSectionNew'), type: 'header', enabled: false, icon: menuIcons().plus },
      {
        label: tm('menuNewDoc'),
        icon: menuIcons().docx,
        click: () => newDocTab(),
      },
      {
        label: tm('menuNewSheet'),
        icon: menuIcons().xlsx,
        click: () => void newSheetTab(),
      },
      {
        label: tm('menuNewSlide'),
        icon: menuIcons().pptx,
        click: () => newSlideTab(),
      },
      {
        label: tm('menuNewMarkdown'),
        icon: menuIcons().md,
        click: () => newMarkdownTab(),
      },
      {
        label: tm('menuNewHtml'),
        icon: menuIcons().html,
        click: () => newHtmlTab(),
      },
      {
        label: tm('menuNewPdf'),
        icon: menuIcons().pdf,
        click: () => void newPdfTab(),
      },
      { type: 'separator' },
      {
        label: tm('menuOpen'),
        icon: menuIcons().folder,
        click: () => void openFileViaDialog(),
      },
    ])
    menu.popup({
      window: shellWindow,
      ...(typeof x === 'number' && typeof y === 'number'
        ? { x: Math.round(x), y: Math.round(y) }
        : {}),
    })
  })
}

// ---- home menu ----

/** Menu → Settings…: the modal lives in the home renderer, so the home tab
 * must be active before the push lands (a just-created window queues the
 * send on did-finish-load) */
function openHomeSettings(): void {
  revealShellWindow()
  tabManager?.openHomeTab()
  const wc = shellWindow?.webContents
  if (!wc) return
  if (wc.isLoadingMainFrame()) {
    wc.once('did-finish-load', () => wc.send(HOME_CHANNELS.openSettings))
  } else {
    wc.send(HOME_CHANNELS.openSettings)
  }
}

/** top-level Settings… entry appended after Help in every shell-built menu:
 * the tab strip's menu button pops the application menu, so a top-level item
 * is directly clickable there (and on the macOS menu bar). No accelerator —
 * CmdOrCtrl+, is the docs editor's subscript chord. */
function settingsMenuItem(): MenuItemConstructorOptions {
  return { label: tm('menuSettings'), click: openHomeSettings }
}

async function openFileViaDialog(): Promise<void> {
  const win = shellWindow ?? BrowserWindow.getFocusedWindow()
  if (!win) return
  const result = await showOpenDialogWithMemory(dialog, win, {
    filters: [{ name: tm('filterSupported'), extensions: OPEN_DIALOG_EXTENSIONS }],
    properties: ['openFile', 'multiSelections'],
  })
  if (!result.canceled) for (const path of result.filePaths) openDocumentPath(path)
}

function buildHomeMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: tm('menuFile'),
      submenu: [
        {
          label: tm('menuSectionNew'),
          type: 'header',
          enabled: false,
          icon: menuIcons().plus,
        },
        {
          label: tm('menuNewDoc'),
          accelerator: 'CmdOrCtrl+N',
          icon: menuIcons().docx,
          click: () => newDocTab(),
        },
        {
          label: tm('menuNewSheet'),
          icon: menuIcons().xlsx,
          click: () => void newSheetTab(),
        },
        {
          label: tm('menuNewSlide'),
          icon: menuIcons().pptx,
          click: () => newSlideTab(),
        },
        {
          label: tm('menuNewMarkdown'),
          icon: menuIcons().md,
          click: () => newMarkdownTab(),
        },
        {
          label: tm('menuNewHtml'),
          icon: menuIcons().html,
          click: () => newHtmlTab(),
        },
        {
          label: tm('menuNewPdf'),
          icon: menuIcons().pdf,
          click: () => void newPdfTab(),
        },
        { type: 'separator' },
        {
          label: tm('menuOpen'),
          accelerator: 'CmdOrCtrl+O',
          icon: menuIcons().folder,
          click: () => void openFileViaDialog(),
        },
        { type: 'separator' },
        { role: 'close', label: tm('menuClose') },
      ],
    },
    viewMenuTemplate(),
    editMenuTemplate(process.platform, appMenuLabels(currentLang())),
    windowMenuTemplate(process.platform, appMenuLabels(currentLang())),
    {
      role: 'help',
      label: tm('menuHelp'),
      submenu: [
        { label: tm('menuWelcome'), click: () => showWelcomeOnboarding() },
        { label: tm('menuUserGuide'), accelerator: 'F1', click: () => tabManager?.openHelpTab() },
        { type: 'separator' },
        { label: tm('thirdPartyNotices'), click: () => void openThirdPartyNotices() },
        { type: 'separator' },
        checkUpdatesMenuItem(appMenuLabels(currentLang())),
        aboutMenuItem(appMenuLabels(currentLang()), appTitle(currentLang())),
        { type: 'separator' },
        licenseMenuItem(appMenuLabels(currentLang()), currentLang()),
        privacyMenuItem(appMenuLabels(currentLang()), currentLang()),
      ],
    },
    settingsMenuItem(),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---- pdf menu (pdf-main has no menu of its own; the shell owns pdf tabs, so it builds one) ----

function buildPdfMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: tm('menuFile'),
      submenu: [
        {
          label: tm('menuOpen'),
          accelerator: 'CmdOrCtrl+O',
          click: () => void openFileViaDialog(),
        },
        { type: 'separator' },
        {
          label: tm('backToHome'),
          accelerator: 'Shift+CmdOrCtrl+H',
          click: () => tabManager?.openHomeTab(),
        },
        { type: 'separator' },
        {
          label: tm('menuSave'),
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const tab = activePdfTarget()
            if (tab) void flushPdfSave(tab.webContents)
          },
        },
        {
          label: tm('menuSaveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => void savePdfAs(),
        },
        { type: 'separator' },
        // local pdf2docx (P4): in-process PDFium wasm, no cloud counterpart
        {
          label: tm('menuExportDocx'),
          click: () => void exportPdfAsDocxLocal(),
        },
        // local pdf2pptx (P25): one slide per page, no cloud counterpart
        {
          label: tm('menuExportPptx'),
          click: () => void exportPdfAsPptxLocal(),
        },
        // local pdf2xlsx (P26): one worksheet per page, no cloud counterpart
        {
          label: tm('menuExportXlsx'),
          click: () => void exportPdfAsXlsxLocal(),
        },
        { type: 'separator' },
        {
          label: tm('menuPrint'),
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            const tab = activePdfTarget()
            if (tab) sendPdfPrintRequest(tab.webContents)
          },
        },
        { type: 'separator' },
        {
          label: tm('menuClose'),
          accelerator: 'CmdOrCtrl+W',
          click: () => closeFocusedEditor(),
        },
      ],
    },
    editMenuTemplate(process.platform, appMenuLabels(currentLang())),
    windowMenuTemplate(process.platform, appMenuLabels(currentLang())),
    {
      role: 'help',
      label: tm('menuHelp'),
      submenu: [
        { label: tm('thirdPartyNotices'), click: () => void openThirdPartyNotices() },
        { type: 'separator' },
        checkUpdatesMenuItem(appMenuLabels(currentLang())),
        aboutMenuItem(appMenuLabels(currentLang()), appTitle(currentLang())),
        { type: 'separator' },
        licenseMenuItem(appMenuLabels(currentLang()), currentLang()),
        privacyMenuItem(appMenuLabels(currentLang()), currentLang()),
      ],
    },
    settingsMenuItem(),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---- markdown menu (markdown-main has no menu of its own; the shell owns markdown tabs) ----

function buildMarkdownMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: tm('menuFile'),
      submenu: [
        {
          label: tm('menuOpen'),
          accelerator: 'CmdOrCtrl+O',
          click: () => void openFileViaDialog(),
        },
        { type: 'separator' },
        {
          label: tm('backToHome'),
          accelerator: 'Shift+CmdOrCtrl+H',
          click: () => tabManager?.openHomeTab(),
        },
        { type: 'separator' },
        {
          label: tm('menuSave'),
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) void requestMarkdownSave(tab.webContents, 'save')
          },
        },
        {
          label: tm('menuSaveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) void requestMarkdownSave(tab.webContents, 'saveAs')
          },
        },
        { type: 'separator' },
        {
          label: tm('menuExportDocx'),
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) sendMarkdownExportRequest(tab.webContents, 'docx')
          },
        },
        {
          label: tm('menuExportPdf'),
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) sendMarkdownExportRequest(tab.webContents, 'pdf')
          },
        },
        {
          label: tm('menuExportImages'),
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) sendMarkdownExportRequest(tab.webContents, 'png')
          },
        },
        {
          label: tm('menuOpenInDocs'),
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) sendMarkdownExportRequest(tab.webContents, 'docs')
          },
        },
        { type: 'separator' },
        {
          label: tm('menuPrint'),
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            const tab = activeMarkdownTarget()
            if (tab) sendMarkdownPrintRequest(tab.webContents)
          },
        },
        { type: 'separator' },
        {
          label: tm('menuClose'),
          accelerator: 'CmdOrCtrl+W',
          click: () => closeFocusedEditor(),
        },
      ],
    },
    editMenuTemplate(process.platform, appMenuLabels(currentLang())),
    windowMenuTemplate(process.platform, appMenuLabels(currentLang())),
    {
      role: 'help',
      label: tm('menuHelp'),
      submenu: [
        { label: tm('thirdPartyNotices'), click: () => void openThirdPartyNotices() },
        { type: 'separator' },
        checkUpdatesMenuItem(appMenuLabels(currentLang())),
        aboutMenuItem(appMenuLabels(currentLang()), appTitle(currentLang())),
        { type: 'separator' },
        licenseMenuItem(appMenuLabels(currentLang()), currentLang()),
        privacyMenuItem(appMenuLabels(currentLang()), currentLang()),
      ],
    },
    settingsMenuItem(),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---- html menu (html-main has no menu of its own; the shell owns html tabs) ----

function buildHtmlMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: tm('menuFile'),
      submenu: [
        {
          label: tm('menuOpen'),
          accelerator: 'CmdOrCtrl+O',
          click: () => void openFileViaDialog(),
        },
        { type: 'separator' },
        {
          label: tm('backToHome'),
          accelerator: 'Shift+CmdOrCtrl+H',
          click: () => tabManager?.openHomeTab(),
        },
        { type: 'separator' },
        {
          label: tm('menuSave'),
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) void requestHtmlSave(tab.webContents, 'save')
          },
        },
        {
          label: tm('menuSaveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) void requestHtmlSave(tab.webContents, 'saveAs')
          },
        },
        { type: 'separator' },
        {
          label: tm('menuExportDocx'),
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) sendHtmlExportRequest(tab.webContents, 'docx')
          },
        },
        {
          label: tm('menuExportPdf'),
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) sendHtmlExportRequest(tab.webContents, 'pdf')
          },
        },
        {
          label: tm('menuExportHtml'),
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) sendHtmlExportRequest(tab.webContents, 'html')
          },
        },
        { type: 'separator' },
        {
          label: tm('menuPrint'),
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            const tab = activeHtmlTarget()
            if (tab) sendHtmlPrintRequest(tab.webContents)
          },
        },
        { type: 'separator' },
        {
          label: tm('menuClose'),
          accelerator: 'CmdOrCtrl+W',
          click: () => closeFocusedEditor(),
        },
      ],
    },
    editMenuTemplate(process.platform, appMenuLabels(currentLang())),
    windowMenuTemplate(process.platform, appMenuLabels(currentLang())),
    {
      role: 'help',
      label: tm('menuHelp'),
      submenu: [
        { label: tm('thirdPartyNotices'), click: () => void openThirdPartyNotices() },
        { type: 'separator' },
        checkUpdatesMenuItem(appMenuLabels(currentLang())),
        aboutMenuItem(appMenuLabels(currentLang()), appTitle(currentLang())),
        { type: 'separator' },
        licenseMenuItem(appMenuLabels(currentLang()), currentLang()),
        privacyMenuItem(appMenuLabels(currentLang()), currentLang()),
      ],
    },
    settingsMenuItem(),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * Save As for pdf tabs: write pending edits to the picked path only, then open the copy.
 * Non-destructive: the original file is never written, and a cancelled dialog changes
 * nothing on disk (dialog first, no flush into the source).
 */
/** In-flight guard (same pattern as exportPdfAsDocxLocal): a re-trigger while the dialog
    or write is active must not start a second flow that overwrites the first one's
    waiter/target grant or clears its autosave pause early */
let savingPdfAs = false

async function savePdfAs(tab = activePdfTarget()): Promise<void> {
  const host = pdfHostWindow(tab)
  if (!tab?.filePath || !host || savingPdfAs) return
  savingPdfAs = true
  // Pause renderer autosave for the whole flow: the dialog blurs the window, and a
  // blur-triggered autosave would write the pending edits into the original file
  setPdfSaveAsInFlight(tab.webContents, true)
  try {
    const picked = await showSaveDialogWithMemory(dialog, host, {
      defaultPath: tab.filePath,
      filters: [{ name: tm('filterPdf'), extensions: ['pdf'] }],
    })
    const target = pdfSaveAsTarget(picked, tab.filePath)
    if (!target) return
    if (pdfIsDirty(tab.webContents.id)) {
      // Renderer applies its pending edits onto the source bytes; the pdf main
      // process writes the result to the picked path only
      if (!(await requestPdfSaveAs(tab.webContents, target))) return
    } else {
      // No pending edits → a byte-identical copy
      await atomicCopyFile(tab.filePath, target)
    }
    openDocumentPath(target)
  } catch (err) {
    console.error('[shell] pdf save as failed:', err)
    showErrorDialog(host, tm('errPdfSaveAsFailed'), err)
  } finally {
    savingPdfAs = false
    setPdfSaveAsInFlight(tab.webContents, false)
  }
}

/**
 * In-flight guard: covers the whole flow (dialogs included) so re-triggering
 * from the menu can never start a second conversion
 */
let exportingPdfDocx = false

/**
 * Export as Word for pdf tabs, fully local (pdf2docx P4): flush pending
 * edits, pick the destination, convert in-process via PDFium wasm, write the
 * file and open it in a Docs tab. No login, no credits.
 */
async function exportPdfAsDocxLocal(format: 'docx' | 'md' | 'html' = 'docx'): Promise<void> {
  const tab = activePdfTarget()
  const host = pdfHostWindow(tab)
  if (!tab?.filePath || !host) return
  if (exportingPdfDocx) {
    void dialog.showMessageBox(host, {
      type: 'info',
      message: tm('pdfDocxBusyMsg'),
    })
    return
  }
  exportingPdfDocx = true
  try {
    if (!(await flushPdfSave(tab.webContents, true))) return
    const picked = await showSaveDialogWithMemory(dialog, host, {
      defaultPath: tab.filePath.replace(/\.pdf$/i, `.${format}`),
      filters: [
        format === 'docx'
          ? { name: tm('filterWord'), extensions: ['docx'] }
          : format === 'md'
            ? { name: 'Markdown', extensions: ['md'] }
            : { name: tm('filterHtml'), extensions: ['html'] },
      ],
    })
    if (picked.canceled || !picked.filePath) return
    // If the destination is already open in a docs tab, close it first (its
    // normal unsaved-changes guard applies) so the converted file opens fresh
    // instead of leaving a stale tab whose next save would clobber the result.
    const findStaleTab = () =>
      format === 'docx'
        ? tabManager?.findDocsTabByPath(picked.filePath)
        : format === 'md'
          ? tabManager?.findMarkdownTabByPath(picked.filePath)
          : tabManager?.findHtmlTabByPath(picked.filePath)
    const staleTabId = findStaleTab()
    if (staleTabId) {
      await tabManager?.closeTab(staleTabId)
      tabManager?.activateTab(tab.id)
      if (findStaleTab()) return
    }
    host.setProgressBar(2)
    // encrypted PDFs prompt for the password (P23), looping on wrong entries;
    // null result = user cancelled the prompt → abort silently
    const pdfPath = tab.filePath
    const result = await convertPdfFileToDocxLocalWithPrompt(
      pdfPath,
      (retry) =>
        promptPdfPassword(host, {
          fileName: basename(pdfPath),
          retry,
          busy: false,
          lang: currentLang(),
          strings: {
            title: tm('pdfPwdTitle'),
            prompt: tm('pdfPwdPrompt'),
            retryPrompt: tm('pdfPwdRetryPrompt'),
            ok: tm('pdfPwdOk'),
            cancel: tm('btnCancel'),
            verifying: tm('pdfPwdVerifying'),
            label: tm('pdfPwdLabel'),
            placeholder: tm('pdfPwdPlaceholder'),
            show: tm('pdfPwdShow'),
            hide: tm('pdfPwdHide'),
          },
        }),
      (page, total) => {
        if (host && !host.isDestroyed() && total > 0) {
          host.setProgressBar(page / total)
        }
      },
    )
    if (result === null) return
    if (format === 'docx') await atomicWriteFile(picked.filePath, result.docx)
    else await exportDocxBytesHeadless(result.docx, picked.filePath, format, basename(pdfPath))

    // degrade transparency (plan §7.6 dual-track split): whole scan → say so
    // once; individual image-fallback pages → name them;
    // OCR-recovered scans ('ocr') are SUCCESSES — announce the recovery (the
    // user should proofread machine-read text), never the image-export notice
    const ocrPages = result.pageResults.filter((r) => r.status === 'ocr').map((r) => r.page)
    const imagePages = result.pageResults
      .filter((r) => r.status !== 'ok' && r.status !== 'ocr')
      .map((r) => r.page)
    // Markdown cannot carry the image fallback, so for it those pages are
    // missing rather than "exported as images"; HTML keeps them like Word
    const imagesLost = format === 'md'
    // scannedDocument means "mostly scanned"; for Markdown only a document
    // where every page is an unrecognized scan is really empty (degraded
    // pages had text, so even a fully degraded file is reported page by page)
    const nothingLeft = imagesLost
      ? result.pageResults.every((r) => r.status === 'scanned')
      : result.scannedDocument
    if (nothingLeft) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm(imagesLost ? 'pdfMdLocalMissingMsg' : 'pdfDocxLocalScannedMsg'),
        detail: tm(imagesLost ? 'pdfMdLocalScannedDetail' : 'pdfDocxLocalScannedDetail'),
      })
    } else if (imagePages.length > 0 && ocrPages.length > 0) {
      // mixed documents surface BOTH facts in one dialog: which pages shipped
      // as images and which carry machine-read text the user should proofread
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm(imagesLost ? 'pdfMdLocalMissingMsg' : 'pdfDocxLocalDegradedMsg'),
        detail:
          tm(imagesLost ? 'pdfMdLocalDroppedDetail' : 'pdfDocxLocalDegradedDetail', {
            pages: imagePages.join(', '),
          }) +
          '\n\n' +
          tm('pdfDocxLocalOcrDetail', { pages: ocrPages.join(', ') }),
      })
    } else if (imagePages.length > 0) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm(imagesLost ? 'pdfMdLocalMissingMsg' : 'pdfDocxLocalDegradedMsg'),
        detail: tm(imagesLost ? 'pdfMdLocalDroppedDetail' : 'pdfDocxLocalDegradedDetail', {
          pages: imagePages.join(', '),
        }),
      })
    } else if (ocrPages.length > 0) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm('pdfDocxLocalOcrMsg'),
        detail: tm('pdfDocxLocalOcrDetail', { pages: ocrPages.join(', ') }),
      })
    }
    openDocumentPath(picked.filePath)
  } catch (err) {
    if (host && !host.isDestroyed()) {
      // structured load failures (P22): password-protected / damaged PDFs get
      // a human-readable explanation instead of the raw PDFium error string
      const detail =
        err instanceof PdfLoadError
          ? err.code === 'password-required'
            ? tm('pdfDocxLocalEncryptedDetail')
            : err.code === 'unsupported'
              ? // certificate-based or otherwise unsupported security (FPDF
                // error 5): a hard PDFium boundary — no password can open it
                // locally, so the message must NOT suggest one (P24 C)
                tm('pdfDocxLocalUnsupportedEncDetail')
              : tm('pdfDocxLocalCorruptDetail')
          : err instanceof Error
            ? err.message
            : String(err)
      void dialog.showMessageBox(host, {
        type: 'error',
        message: tm(format === 'docx' ? 'pdfDocxFailedMsg' : 'pdfConvertFailedMsg'),
        detail,
      })
    }
  } finally {
    // the prompt window may still be open when the loop exits through cancel
    // or a non-password error thrown mid-retry
    closePdfPasswordDialog()
    exportingPdfDocx = false
    if (host && !host.isDestroyed()) host.setProgressBar(-1)
  }
}

/**
 * Markdown / HTML come out of the Word reconstruction: the in-memory .docx
 * is parked in a temp dir and the hidden Docs exporter serializes it.
 */
async function exportDocxBytesHeadless(
  docx: Uint8Array,
  outPath: string,
  format: 'md' | 'html',
  sourceName: string,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'genoffice-pdf-convert-'))
  try {
    const docxPath = join(dir, sourceName.replace(/\.pdf$/i, '') + '.docx')
    await atomicWriteFile(docxPath, docx)
    await exportDocsHeadless(docxPath, outPath, format)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Export as PowerPoint for pdf tabs, fully local (pdf2pptx P25): flush
 * pending edits, pick the destination, convert in-process via PDFium wasm,
 * write the file and open it in a Slides tab. No login, no credits. Shares
 * the in-flight guard with the Word exports so pdfium never runs two
 * conversions at once.
 */
async function exportPdfAsPptxLocal(): Promise<void> {
  const tab = activePdfTarget()
  const host = pdfHostWindow(tab)
  if (!tab?.filePath || !host) return
  if (exportingPdfDocx) {
    void dialog.showMessageBox(host, {
      type: 'info',
      message: tm('pdfPptxBusyMsg'),
    })
    return
  }
  exportingPdfDocx = true
  try {
    if (!(await flushPdfSave(tab.webContents, true))) return
    const picked = await showSaveDialogWithMemory(dialog, host, {
      defaultPath: tab.filePath.replace(/\.pdf$/i, '.pptx'),
      filters: [{ name: tm('filterPpt'), extensions: ['pptx'] }],
    })
    if (picked.canceled || !picked.filePath) return
    // same stale-tab handling as the Word export (see exportPdfAsDocxLocal),
    // against the slides tab that may already show the destination file
    const staleTabId = tabManager?.findSlidesTabByPath(picked.filePath)
    if (staleTabId) {
      await tabManager?.closeTab(staleTabId)
      tabManager?.activateTab(tab.id)
      if (tabManager?.findSlidesTabByPath(picked.filePath)) return
    }
    host.setProgressBar(2)
    // encrypted PDFs prompt for the password (P23), looping on wrong entries;
    // null result = user cancelled the prompt → abort silently
    const pdfPath = tab.filePath
    const result = await convertPdfFileToPptxLocalWithPrompt(
      pdfPath,
      (retry) =>
        promptPdfPassword(host, {
          fileName: basename(pdfPath),
          retry,
          busy: false,
          lang: currentLang(),
          strings: {
            title: tm('pdfPwdTitle'),
            prompt: tm('pdfPwdPrompt'),
            retryPrompt: tm('pdfPwdRetryPrompt'),
            ok: tm('pdfPwdOk'),
            cancel: tm('btnCancel'),
            verifying: tm('pdfPwdVerifying'),
            label: tm('pdfPwdLabel'),
            placeholder: tm('pdfPwdPlaceholder'),
            show: tm('pdfPwdShow'),
            hide: tm('pdfPwdHide'),
          },
        }),
      (page, total) => {
        if (host && !host.isDestroyed() && total > 0) {
          host.setProgressBar(page / total)
        }
      },
    )
    if (result === null) return
    await atomicWriteFile(picked.filePath, result.pptx)

    // degrade transparency (same split as the Word export): whole scan vs
    // individual image-fallback pages
    const imagePages = result.pageResults.filter((r) => r.status !== 'ok').map((r) => r.page)
    if (result.scannedDocument) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm('pdfDocxLocalScannedMsg'),
        detail: tm('pdfPptxLocalScannedDetail'),
      })
    } else if (imagePages.length > 0) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm('pdfDocxLocalDegradedMsg'),
        detail: tm('pdfDocxLocalDegradedDetail', { pages: imagePages.join(', ') }),
      })
    }
    openDocumentPath(picked.filePath)
  } catch (err) {
    if (host && !host.isDestroyed()) {
      // structured load failures (P22): same explanations as the Word export
      const detail =
        err instanceof PdfLoadError
          ? err.code === 'password-required'
            ? tm('pdfDocxLocalEncryptedDetail')
            : err.code === 'unsupported'
              ? tm('pdfDocxLocalUnsupportedEncDetail')
              : tm('pdfDocxLocalCorruptDetail')
          : err instanceof Error
            ? err.message
            : String(err)
      void dialog.showMessageBox(host, {
        type: 'error',
        message: tm('pdfPptxFailedMsg'),
        detail,
      })
    }
  } finally {
    closePdfPasswordDialog()
    exportingPdfDocx = false
    if (host && !host.isDestroyed()) host.setProgressBar(-1)
  }
}

/**
 * Export as Excel for pdf tabs, fully local (pdf2xlsx P26): flush pending
 * edits, pick the destination, convert in-process via PDFium wasm, write the
 * file and open it in a Sheets tab. No login, no credits. Shares the
 * in-flight guard with the Word/PowerPoint exports so pdfium never runs two
 * conversions at once.
 */
async function exportPdfAsXlsxLocal(): Promise<void> {
  const tab = activePdfTarget()
  const host = pdfHostWindow(tab)
  if (!tab?.filePath || !host) return
  if (exportingPdfDocx) {
    void dialog.showMessageBox(host, {
      type: 'info',
      message: tm('pdfXlsxBusyMsg'),
    })
    return
  }
  exportingPdfDocx = true
  try {
    if (!(await flushPdfSave(tab.webContents, true))) return
    const picked = await showSaveDialogWithMemory(dialog, host, {
      defaultPath: tab.filePath.replace(/\.pdf$/i, '.xlsx'),
      filters: [{ name: tm('filterExcel'), extensions: ['xlsx'] }],
    })
    if (picked.canceled || !picked.filePath) return
    // same stale-tab handling as the Word export (see exportPdfAsDocxLocal),
    // against the sheets tab that may already show the destination file
    const staleTabId = tabManager?.findSheetsTabByPath(picked.filePath)
    if (staleTabId) {
      await tabManager?.closeTab(staleTabId)
      tabManager?.activateTab(tab.id)
      if (tabManager?.findSheetsTabByPath(picked.filePath)) return
    }
    host.setProgressBar(2)
    // encrypted PDFs prompt for the password (P23), looping on wrong entries;
    // null result = user cancelled the prompt → abort silently
    const pdfPath = tab.filePath
    const result = await convertPdfFileToXlsxLocalWithPrompt(
      pdfPath,
      (retry) =>
        promptPdfPassword(host, {
          fileName: basename(pdfPath),
          retry,
          busy: false,
          lang: currentLang(),
          strings: {
            title: tm('pdfPwdTitle'),
            prompt: tm('pdfPwdPrompt'),
            retryPrompt: tm('pdfPwdRetryPrompt'),
            ok: tm('pdfPwdOk'),
            cancel: tm('btnCancel'),
            verifying: tm('pdfPwdVerifying'),
            label: tm('pdfPwdLabel'),
            placeholder: tm('pdfPwdPlaceholder'),
            show: tm('pdfPwdShow'),
            hide: tm('pdfPwdHide'),
          },
        }),
      (page, total) => {
        if (host && !host.isDestroyed() && total > 0) {
          host.setProgressBar(page / total)
        }
      },
    )
    if (result === null) return
    await atomicWriteFile(picked.filePath, result.xlsx)

    // degrade transparency: pages that could not become cells got a notice
    // row on their worksheet instead of an image (a spreadsheet has none)
    const noticePages = result.pageResults.filter((r) => r.status !== 'ok').map((r) => r.page)
    if (result.scannedDocument) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm('pdfDocxLocalScannedMsg'),
        detail: tm('pdfXlsxLocalScannedDetail'),
      })
    } else if (noticePages.length > 0) {
      await dialog.showMessageBox(host, {
        type: 'info',
        message: tm('pdfXlsxLocalSkippedMsg'),
        detail: tm('pdfXlsxLocalSkippedDetail', { pages: noticePages.join(', ') }),
      })
    }
    openDocumentPath(picked.filePath)
  } catch (err) {
    if (host && !host.isDestroyed()) {
      // structured load failures (P22): same explanations as the Word export
      const detail =
        err instanceof PdfLoadError
          ? err.code === 'password-required'
            ? tm('pdfDocxLocalEncryptedDetail')
            : err.code === 'unsupported'
              ? tm('pdfDocxLocalUnsupportedEncDetail')
              : tm('pdfDocxLocalCorruptDetail')
          : err instanceof Error
            ? err.message
            : String(err)
      void dialog.showMessageBox(host, {
        type: 'error',
        message: tm('pdfXlsxFailedMsg'),
        detail,
      })
    }
  } finally {
    closePdfPasswordDialog()
    exportingPdfDocx = false
    if (host && !host.isDestroyed()) host.setProgressBar(-1)
  }
}

// The pdf renderer's converter dropdown funnels into the same local conversion
// flows as the File menu items (dialogs, password prompt, in-flight guard included)
ipcMain.handle(PDF_CHANNELS.convertOffice, async (e, format: unknown) => {
  // only the active pdf tab may trigger a conversion (its file is the source)
  if (activePdfTarget()?.webContents.id !== e.sender.id) return
  if (format === 'docx' || format === 'md' || format === 'html') await exportPdfAsDocxLocal(format)
  else if (format === 'xlsx') await exportPdfAsXlsxLocal()
  else if (format === 'pptx') await exportPdfAsPptxLocal()
})

// Ribbon File > Save As inside a pdf view: same flow as the native menu item
// (save dialog, non-destructive copy, open the result in a new tab)
ipcMain.on(PDF_CHANNELS.saveAsDialog, (e) => {
  if (tabManager?.activePdfTab()?.webContents.id !== e.sender.id) return
  void savePdfAs()
})

function openThirdPartyNotices(): Promise<string> {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'THIRD-PARTY-NOTICES.txt')
    : join(app.getAppPath(), 'build', 'THIRD-PARTY-NOTICES.txt')
  return shell.openPath(path)
}

/** every module's File menu gets a way back to the launcher, and every menu
 * bar a trailing Settings… entry (the tab strip's menu button pops whatever
 * menu the active tab installed) */
function installBackToHomeItems(): void {
  const backToHomeItem: MenuItemConstructorOptions = {
    label: tm('backToHome'),
    accelerator: 'Shift+CmdOrCtrl+H',
    click: () => tabManager?.openHomeTab(),
  }
  setDocsExtraFileMenuItems([backToHomeItem])
  setSheetsExtraFileMenuItems([backToHomeItem])
  setSlidesExtraFileMenuItems([backToHomeItem])
  const settings = settingsMenuItem()
  setDocsExtraAppMenuItems([settings])
  setSheetsExtraAppMenuItems([settings])
  setSlidesExtraAppMenuItems([settings])
}

function installDockMenu(): void {
  if (process.platform !== 'darwin') return
  app.dock?.setMenu(
    Menu.buildFromTemplate([
      { label: tm('menuHome'), click: () => tabManager?.openHomeTab() },
      {
        label: tm('menuNewDoc'),
        click: () => newDocTab(),
      },
      {
        label: tm('menuNewSheet'),
        click: () => void newSheetTab(),
      },
      { label: tm('menuNewSlide'), click: () => newSlideTab() },
      { label: tm('menuNewMarkdown'), click: () => newMarkdownTab() },
      { label: tm('menuNewPdf'), click: () => void newPdfTab() },
    ]),
  )
}

// On mainland-China networks the main process's Node fetch (undici) bypasses the system proxy,
// so direct calls to overseas LLM/image-search APIs time out or get region-blocked (403).
// Prefer proxy env vars (terminal launch); a packaged app launched from Finder inherits no shell
// env vars, so fall back to the system HTTP proxy. The renderer uses Chromium's system proxy and
// is unaffected. Same bootstrap as slides-main startSlidesStandalone.
// awaited by login IPC so the first status probe / login click cannot race the proxy resolution
let proxyBootstrap: Promise<void> = Promise.resolve()

async function installMainProcessProxy(): Promise<void> {
  let proxyUrl = [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
  ].find((v) => v && /^https?:\/\//.test(v))
  if (!proxyUrl) {
    try {
      // PAC/rule proxies answer per-host: probe the host the login flow, the
      // Genspark LLM proxy and the gsk CLI actually target
      const resolved = await session.defaultSession.resolveProxy('https://api.vega.chat/')
      const m = /PROXY\s+([^;\s]+)/.exec(resolved)
      if (m) proxyUrl = `http://${m[1]}`
    } catch {
      /* no system proxy */
    }
  }
  if (!proxyUrl) return
  // spawned gsk CLI children (login/search/…) do their own fetch and never see
  // the dispatcher below — forward the proxy to them via env
  setGskProxyUrl(proxyUrl)
  try {
    // NO_PROXY and loopback bypass the proxy — a local endpoint must not leave the machine
    await installFetchProxy(proxyUrl)
    // strip user:pass credentials before logging
    console.log('[proxy] main-process fetch via', proxyUrl.replace(/\/\/[^@/]*@/, '//***@'))
  } catch (e) {
    console.warn('[proxy] failed to set proxy dispatcher:', e)
  }
}

// ---- lifecycle (the shell is the only owner) ----

let pendingLaunchPaths = collectLaunchPaths(process.argv)
let controlServer: ControlServer | null = null

// show() does not un-minimize, and on macOS ⌘W destroys the shell window while the
// app keeps running — either way a file opened from Finder would land out of sight.
function revealShellWindow(): void {
  if (!shellWindow) createShellWindow()
  if (shellWindow?.isMinimized()) shellWindow.restore()
  shellWindow?.show()
  shellWindow?.focus()
}

function openLaunchPaths(paths: readonly string[]): void {
  let opened = false
  for (const filePath of paths) opened = openDocumentPath(filePath) || opened
  if (!opened) tabManager?.openHomeTab()
}

// On macOS a file opened from Finder is not in argv; it arrives via the open-file event (before ready).
// If another instance already holds the lock, this process exits, and the path must ride along in
// the lock request's additionalData to the surviving instance — so the lock request is deferred
// until ready, after the path is known.
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (!app.isReady()) {
    if (!pendingLaunchPaths.includes(filePath)) pendingLaunchPaths.push(filePath)
    return
  }
  revealShellWindow()
  openLaunchPaths([filePath])
})

app.on('second-instance', (_event, argv, _cwd, additionalData) => {
  const paths = collectLaunchPaths(argv, additionalData)
  revealShellWindow()
  openLaunchPaths(paths)
})

installNavigationGuard(app)
installContextMenu(app, () => contextMenuLabels(currentLang()))
registerLicenseIpc()
registerAiIpc()
// Help → "Welcome": replay the first-run onboarding over the home tab
// (the shell renderer keeps it mounted; this just flips its state back on)
function showWelcomeOnboarding(): void {
  const win = shellWindow
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  tabManager?.openHomeTab()
  const contents = win.webContents
  const send = () => contents.send(HOME_CHANNELS.showOnboarding)
  if (contents.isLoading()) contents.once('did-finish-load', send)
  else send()
}

ipcMain.handle('ai:open-model-settings', () => {
  const win = shellWindow
  if (!win || win.isDestroyed()) return
  // the request may come from a detached window or while the shell is minimized
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  tabManager?.openHomeTab()
  win.webContents.send(HOME_CHANNELS.openSettings, { section: 'aiModel' })
})
registerProjectIpc()
registerDocsIpc()
registerHomeIpc()
registerIntegrationsIpc({
  settingsPath: APP_SETTINGS_PATH,
  window: () => shellWindow,
  cliDir: app.isPackaged
    ? join(process.resourcesPath, 'cli')
    : join(APPS_ROOT, '..', 'packages', 'cli', 'bin'),
  skillPath: app.isPackaged
    ? join(process.resourcesPath, 'cli', 'skills', 'officevega', 'SKILL.md')
    : join(APPS_ROOT, '..', 'skills', 'officevega', 'SKILL.md'),
  cliPackageJson: app.isPackaged
    ? join(process.resourcesPath, 'cli', 'package.json')
    : join(APPS_ROOT, '..', 'packages', 'cli', 'package.json'),
})
registerTabsIpc()
registerDroppedFilesIpc()

// sheets' project:resolveChat goes through the handler registered by docs-main; the sessionId reverse lookup hooks in here
setSessionPathResolver(resolveSheetsSessionPath)

/** Dev-only pid marker for the takeover below; scoped to userData like the lock itself. */
const devPidFile = () => join(app.getPath('userData'), 'dev-instance.pid')

/** Hidden-window exporters, one per editor module (HEADLESS_TARGETS says which formats each takes). */
const headlessExporters: HeadlessExporters = {
  docs: exportDocsHeadless,
  sheets: (input, outPath) => exportSheetsPdfHeadless(input, outPath),
  slides: (input, outPath) => exportSlidesPdfHeadless(input, outPath),
  markdown: (input, outPath) => exportMarkdownPdfHeadless(input, outPath),
  html: exportHtmlHeadless,
}

/**
 * The whole `--headless-export` run: no shell window, no menus, no updater,
 * no single-instance lock (a GUI instance may well be running). Prints
 * exactly one line and exits with the officevega convention (0/1/2/3).
 */
async function runHeadlessExportEntry(
  parsed: Exclude<HeadlessArgvParse, { kind: 'none' }>,
): Promise<void> {
  const outcome =
    parsed.kind === 'error'
      ? ({ ok: false, code: HEADLESS_EXIT.badArgs, message: parsed.message } as const)
      : await runHeadlessExport(parsed.request, headlessExporters)
  const json = parsed.kind === 'error' ? parsed.json : parsed.request.json
  stopSheetsSidecar()
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.destroy()
  // Writing to a pipe can finish asynchronously, and app.exit() would cut the
  // envelope off mid-line; wait for the flush (but never longer than 2s).
  const line = formatHeadlessEnvelope(outcome, json) + '\n'
  await new Promise<void>((resolve) => {
    const bail = setTimeout(resolve, 2000)
    process.stdout.write(line, () => {
      clearTimeout(bail)
      resolve()
    })
  })
  // app.quit() always exits 0; the officevega envelope needs the real code, and
  // every teardown this run owns has already happened.
  app.exit(headlessExitCode(outcome))
}

app.whenReady().then(async () => {
  // openrouter.ai's edge 403s any User-Agent containing "vega". Request sites
  // pin a neutral UA via withUserAgent, but some stacks cannot set it: a
  // renderer's fetch drops the forbidden header name and the session UA goes
  // out instead, net.fetch re-derives one from the app name. The session hook
  // is the wire-level catch-all so no stack can leak the blocked token.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.openrouter.ai/*'] },
    (details, callback) => {
      callback({ requestHeaders: openRouterSafeHeaders(details.url, details.requestHeaders) })
    },
  )
  // interface zoom (genoffice#1913): every visible webContents — shell windows,
  // editor WebContentsView tabs, dialogs — boots at the persisted UI scale.
  // Print/export is unaffected: printToPDF ignores the page zoom factor.
  app.on('web-contents-created', (_event, contents) => {
    // zoom at creation too — did-finish-load (installUiScale) would flash at 1x
    applyUiScaleTo(contents, currentUiScale())
  })
  // first scan waits for the windows to come up; later ones follow folder changes
  setTimeout(() => ensureFileIndexer()?.refresh(), 4000)
  installRendererProtocol({
    docs: join(DOCS_OUT, 'renderer'),
    sheets: join(SHEETS_OUT, 'renderer'),
    slides: join(SLIDES_OUT, 'renderer'),
    pdf: join(PDF_OUT, 'renderer'),
    markdown: join(MARKDOWN_OUT, 'renderer'),
    html: join(HTML_OUT, 'renderer'),
    // the manual shares the shell's own renderer bundle (help mode)
    help: join(__dirname, '../renderer'),
  })
  if (headlessArgv.kind !== 'none') {
    await runHeadlessExportEntry(headlessArgv)
    return
  }
  const lockData = () =>
    pendingLaunchPaths.length > 0
      ? { launchPath: pendingLaunchPaths[0], launchPaths: pendingLaunchPaths }
      : {}
  let hasLock = app.requestSingleInstanceLock(lockData())
  if (!hasLock && !app.isPackaged) {
    // Dev watch restart: electron-vite SIGTERMs the previous instance and spawns this
    // one immediately. Chromium turns that SIGTERM into a graceful quit (Node's
    // process.on('SIGTERM') never fires in the main process), and the quit can wedge
    // in the close-confirmation flow — the zombie then keeps the single-instance lock,
    // this instance quits, and electron-vite's on-close handler exits with it, killing
    // the renderer dev server (blank shell window until a manual dev restart).
    // The previous instance is doomed either way: kill it and take over the lock.
    try {
      const oldPid = Number(readFileSync(devPidFile(), 'utf-8').trim())
      if (Number.isFinite(oldPid) && oldPid > 0 && oldPid !== process.pid) {
        // pid-recycling guard: only kill if that pid is still an Electron process
        const cmd = execSync(`ps -o command= -p ${oldPid}`).toString()
        if (cmd.includes('Electron')) process.kill(oldPid, 'SIGKILL')
      }
    } catch {
      // no previous instance recorded / already gone (ps exits non-zero)
    }
    for (let i = 0; i < 20 && !hasLock; i++) {
      await new Promise((r) => setTimeout(r, 150))
      hasLock = app.requestSingleInstanceLock(lockData())
    }
  }
  if (!hasLock) {
    app.quit()
    return
  }
  // another OfficeVega-family app re-logging in rotates the shared key; the
  // home page re-reads its account status. A logout that clears the key is
  // not a login
  stopAuthWatch = watchOfficeVegaApiKey((key) => {
    if (!key) return
    for (const w of BrowserWindow.getAllWindows())
      w.webContents.send(HOME_CHANNELS.accountLoginEvent, { phase: 'success' })
    // panel WebContentsViews are not BrowserWindows — a cross-app re-login must
    // reach them too or their muted composer waits for a refocus to unmute
    for (const wc of webContents.getAllWebContents())
      if (!wc.isDestroyed()) wc.send('ai:auth-changed', { loggedIn: true })
  })
  // a registry left by a crashed instance must not block officevega writes
  ownsOpenDocumentsRegistry = true
  publishOpenDocuments(OPEN_DOCUMENTS_PATH(), [])
  if (!app.isPackaged) {
    try {
      writeFileSync(devPidFile(), String(process.pid))
    } catch {
      // best-effort: without the marker the next restart just retries the lock
    }
  }

  proxyBootstrap = installMainProcessProxy()
  app.setAccessibilitySupportEnabled(true)
  // Settle the shared uiLang from saved settings BEFORE any tab renderer can
  // ask 'app:get-language': the editor handlers return the i18n module's
  // mutable lang, whose 'en' default otherwise wins the race for whichever
  // tab loads first (e.g. sheets booting in English while docs shows Russian).
  currentLang()
  // native menus/dialogs/scrollbars follow the persisted theme from first paint
  nativeTheme.themeSource = currentTheme()
  // stamp the star-prompt install-age clock on the first launch carrying the feature,
  // and detect upgrade launches (version changed since the previous run)
  try {
    const settings = readAppSettings(APP_SETTINGS_PATH())
    const starState = readStarPrompt()
    const stamped = withFirstRun(starState, Date.now())
    if (stamped !== starState) writeStarPrompt(stamped)

    const prevVersion =
      typeof settings[LAST_RUN_VERSION_KEY] === 'string'
        ? (settings[LAST_RUN_VERSION_KEY] as string)
        : null
    const currentVersion = app.getVersion()
    upgradeStarPromptPending = isUpgradeLaunch(
      prevVersion,
      currentVersion,
      settings.onboardingSeen === true,
    )
    if (prevVersion !== currentVersion)
      writeAppSetting(APP_SETTINGS_PATH(), LAST_RUN_VERSION_KEY, currentVersion)
  } catch {
    // settings write failures must never block startup
  }
  // off the startup path: a symlink / registry write nobody is waiting for
  setTimeout(() => installCliLinkBestEffort(APP_SETTINGS_PATH()), 3000)
  startSheetsCaptureServer()
  // Register the docs renderer bridge listeners before the MCP server can take
  // a visible-editing request.
  installDocsBridge()
  installSheetsBridge()
  // MCP server: localhost-only, docx generation for external agents. Deps are
  // injected so the mcp module never imports this file back.
  // family controls are referenced twice (their own tools + the open-documents
  // tool), so create them once here
  const mcpDocsControl = createDocsControl({
    openBlankTab: () => openBlankDocsTabForMcp(),
    authorizeSave: authorizeMcpDocWrite,
    abandonBlankTab: (wcId) => {
      if (tabManager) abandonBlankTabForMcp(tabManager.docsTabs(), wcId)
    },
  })
  const mcpSlidesControl = createSlidesControl({
    openBlankTab: () => openBlankSlidesTabForMcp(),
    abandonBlankTab: (wcId) => {
      if (tabManager) abandonBlankTabForMcp(tabManager.slidesTabs(), wcId)
    },
  })
  const mcpSheetsControl = createSheetsControl({
    openBlankTab: () => openBlankSheetsTabForMcp(),
    authorizeSave: authorizeMcpSheetWrite,
    abandonBlankTab: (wcId) => abandonBlankSheetsTabForMcp(wcId),
  })
  configureMcpRuntime({
    version: app.getVersion(),
    defaultSaveDir: () => defaultSaveDir(),
    openPath: (filePath) => routeDocumentPath(filePath),
    docsControl: mcpDocsControl,
    slidesControl: mcpSlidesControl,
    sheetsControl: mcpSheetsControl,
    // documents the user has open: the tab list plus each family's own bridge,
    // so an agent reaches a tab nobody but the user opened
    openDocumentsControl: createOpenDocumentsControl({
      list: async () => {
        const tabs = tabManager ? await tabManager.openDocuments() : []
        return [...tabs, ...(await detachedOpenDocuments())]
      },
      webContentsFor: (tabId) =>
        tabManager?.webContentsForTab(tabId) ?? detachedWebContentsFor(tabId),
      closeTab: (tabId) =>
        closeDetachedWithoutPrompt(tabId) || (tabManager?.closeTabWithoutPrompt(tabId) ?? false),
      defaultSaveDir: () => defaultSaveDir(),
      docs: mcpDocsControl,
      sheets: mcpSheetsControl,
      slides: mcpSlidesControl,
      slidesDiscard: discardSlidesRecovery,
      markdown: {
        read: markdownReadText,
        save: markdownSaveToPath,
        discard: markdownDiscardPendingAssets,
      },
      html: {
        read: htmlReadText,
        save: htmlSaveToPath,
        discard: htmlDiscardPendingAssets,
      },
    }),
    // the headless create_*/read_* tools delegate to the bundled officevega CLI
    // (the same engines, no second implementation); it runs on the app's own
    // Node runtime via ELECTRON_RUN_AS_NODE
    cliRunner: bundledCliRunner(),
    // lets the content tools take a `document` argument (tab id or path) and edit
    // a tab the *user* has open, with no create_session involved
    resolveTarget: createOpenTargetResolver({
      list: async () => {
        const tabs = tabManager ? await tabManager.openDocuments() : []
        return [...tabs, ...(await detachedOpenDocuments())]
      },
      webContentsFor: (tabId) =>
        tabManager?.webContentsForTab(tabId) ?? detachedWebContentsFor(tabId),
      // an agent editing a background tab would otherwise work where nobody can
      // see it: switch to that tab and bring its window forward first
      activate: (tabId) => {
        if (!activateDetached(tabId)) tabManager?.activateTab(tabId)
      },
      revealWindow: (tabId) => {
        if (!isDetachedTabId(tabId)) revealShellWindow()
      },
    }),
    logFilePath: join(app.getPath('userData'), 'mcp-log.txt'),
  })
  void startMcpFromSettings(currentMcpSettings()).catch((error) => {
    console.error('[mcp] failed to start on boot:', error)
  })
  installUiScale()
  createShellWindow()
  // deferred to ready: labels need currentLang(), which reads app.getLocale()
  installBackToHomeItems()
  installDockMenu()
  setUpdateCheckInvoker(() => void checkForUpdatesNow())
  initAutoUpdater(() => shellWindow, currentUpdateChannel())
  // resource watchdog: a renderer that stays hot for minutes gets diagnostics
  // recorded and the user an offer to close the document (headless exports
  // are short-lived and unattended)
  if (headlessArgv.kind === 'none') {
    startRendererWatchdog({
      describe: (wc) => tabManager?.describeWebContents(wc.id) ?? null,
      parentWindow: (wc) => BrowserWindow.fromWebContents(wc) ?? shellWindow,
      closeDocument: async (wc) => {
        const id = tabManager?.tabIdForWebContents(wc.id)
        if (id && tabManager) await tabManager.closeTab(id)
        else BrowserWindow.fromWebContents(wc)?.close()
      },
      t: (key, params) => tm(key, params),
    })
  }

  openLaunchPaths(pendingLaunchPaths)
  pendingLaunchPaths = []
  for (const recoverAs of pendingUnsavedNewRecoveries()) void newSheetTab(recoverAs)

  startControlServer(
    app.getPath('userData'),
    controlHandler({
      reveal: revealShellWindow,
      openDocument: openDocumentPath,
      activateTab: (id) => {
        if (!activateDetached(id)) tabManager?.activateTab(id)
      },
      findTab: (path) => tabManager?.findTabByPath(path) ?? findDetachedTabByPath(path),
    }),
  ).then(
    (server) => {
      controlServer = server
    },
    (err: unknown) => console.warn('[control] not listening:', err),
  )

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createShellWindow()
  })
})

app.on('window-all-closed', () => {
  // A headless export destroys its hidden window between documents; only
  // runHeadlessExportEntry decides when that run is over.
  if (headlessArgv.kind !== 'none') return
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // No close prompt may fall through to "Save" during shutdown
  markSheetsShuttingDown()
  stopSheetsSidecar()
  // release the MCP port synchronously (macOS keeps the process alive after
  // the last window closes, so window-all-closed is not enough)
  stopMcpSync()
})

// after every window has closed, so the shell window's own 'closed' republish cannot revive the file
app.on('will-quit', () => {
  fileIndexer?.stop()
  fileIndexStore?.close()
  stopAuthWatch?.()
  for (const watcher of folderWatchers.values()) watcher.close()
  controlServer?.close()
  // a second instance that lost the lock quits too; it must not delete the running editor's list
  if (ownsOpenDocumentsRegistry) clearOpenDocuments(OPEN_DOCUMENTS_PATH())
})
