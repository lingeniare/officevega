import type {
  AiChatResponse,
  AiCustomProtocol,
  AiMediaProviderConfig,
  AiMediaProviderId,
  AiMediaProviderMeta,
  AiProviderId,
  AiProviderMeta,
  AiSearchProviderId,
  AiSearchProviderMeta,
  AiSettings,
  AiStreamChunk,
  AiStreamRequest,
  CodexModelCatalog,
  GenSparkAccountStatus,
  ProviderModelCatalog,
} from '@genoffice/ai-provider'
import type { UpdateChannel, UpdateUiState } from './update-api'
import type { LicenseActionResult, LicenseStatus } from './license-api'
import type { KbFileInfo, KbReadPage, KbSearchHit } from '@genoffice/agent-core'
import type { AiPanelPrefs } from '@genoffice/ui/ai-panel-prefs'

/** UI language; kept self-contained here (mirrors Lang in @genoffice/i18n) */

export type UiLanguage =
  | 'en'
  | 'ru'
  | 'uz'
  | 'kk'
  | 'az'
  | 'tk'
  | 'ky'
  | 'tt'
  | 'ka'

/** UI theme preference */
export type UiTheme = 'light' | 'dark' | 'system'

/** UI design (skin) preference: digital 'Цифровая ВЕГА' (default), retro 'Ретро ВЕГА', 'standard' */
export type UiDesign = 'standard' | 'retro' | 'digital'

/**
 * Document page theme preference (genoffice#1811): what the editors' canvas/paper does
 * relative to the UI theme. 'follow' reproduces the previous single-theme
 * behavior; 'light'/'dark' pin the paper regardless of the UI theme.
 */
export type DocTheme = 'follow' | 'light' | 'dark' | 'eyecare'

/** shell-wide AutoSave default for every editor; updatedAt is 0 until first set */
export interface AutoSaveDefault {
  on: boolean
  updatedAt: number
}

/** local MCP server state (persisted in userData/app-settings.json) */
export interface McpStatus {
  running: boolean
  enabled: boolean
  port: number
  /** headless generation (create_docx without opening the UI) is allowed */
  background: boolean
  /** server/tool activity is recorded to the local log file */
  logging: boolean
  /** base URL when running, else null */
  url: string | null
  /** capability families the running build exposes, e.g. ['docs', 'slides'] */
  capabilities: string[]
  /** present when the last start attempt failed (e.g. port in use) */
  error?: string
}

/** a recent file entry shown on the home screen; type derives from the extension */
export interface RecentEntry {
  path: string
  name: string
  /** lowercased extension without the dot ('docx' | 'xlsx' | 'pptx') */
  ext: string
  /** last-modified time, ms since epoch */
  mtimeMs: number
  /** file size in bytes */
  sizeBytes: number
  /** whether the user starred this file */
  starred: boolean
  /** the starred group this file belongs to (absent when ungrouped); only
      populated by the starred() query — the other list queries omit it */
  group?: string
  /** the path failed to stat (disconnected drive, moved, deleted) — kept
      listed like Word's recents instead of silently dropped (r158) */
  missing?: boolean
}

/** paged query for the home file lists */
export interface RecentQuery {
  /** number of entries to skip (default 0) */
  offset?: number
  /** page size; 0 returns no entries but still reports totals (default 50) */
  limit?: number
  /** restrict to one extension ('docx' | 'xlsx' | 'pptx'); omit for all */
  ext?: string
  /** starred() only: restrict to one starred group; omit for all */
  group?: string
}

export interface RecentPage {
  entries: RecentEntry[]
  /** total matching the query's ext filter */
  total: number
  /** total ignoring the ext filter (for the sidebar counters) */
  totalAll: number
}

/** local file search over names, folders and extracted text */
export interface FileSearchQuery {
  q: string
  /** sidebar filter key ('docx' | 'xlsx' | ...); omit for all */
  ext?: string
  offset?: number
  limit?: number
}

export interface FileSearchSnippetPart {
  text: string
  hit: boolean
}

export interface FileSearchHit extends RecentEntry {
  /** excerpt around the first content match; null when only the name or folder matched */
  snippet: FileSearchSnippetPart[] | null
  /** folded query fragments the file matched; highlight them in the name and folder */
  needles: string[]
}

/**
 * Endpoints the search reranker can judge against. The hosted Jev routes are
 * OpenRouter and TypeSafe's own API; Perplexity, Cloudflare and Liquid AI host
 * their own decision models; Kev and Rizzo Flow are local /v1/systemone
 * servers; `custom` points at any other /v1/systemone-compatible server.
 * `vega` is the api.vega.chat proxy of the OpenRouter route — it rides the
 * sign-in key.
 */
export type DecisionEndpoint =
  'vega' | 'openrouter' | 'direct' | 'perplexity' | 'liquid' | 'cloudflare' | 'kev' | 'rizzo' | 'custom'

/** home search options persisted in app-settings.json under `fileSearch` */
export interface FileSearchSettings {
  /** send the top local hits to a decision model for reranking; default off */
  rerank: boolean
  endpoint: DecisionEndpoint
  /** one API key per endpoint; local endpoints (kev/rizzo/custom) may stay empty */
  keys: Record<DecisionEndpoint, string>
  /** `custom` endpoint only: base URL of a /v1/systemone-compatible server */
  customBaseUrl: string
  /** `custom` endpoint only: model id the server expects */
  customModel: string
  /** `cloudflare` endpoint only: Workers AI account id */
  cloudflareAccountId: string
  /** `cloudflare` endpoint only: Workers AI model path, e.g. @cf/cloudflare/clef or @cf/cloudflare/clef-omni */
  cloudflareModel: string
}

export interface FileSearchRerank {
  /** paths in the decision model's order, most relevant first; paths not judged keep their local order after these */
  order: string[]
  /** calibrated 0–2 relevance per judged path */
  scores: Record<string, number>
}

export interface FileSearchPage {
  hits: FileSearchHit[]
  total: number
  index: {
    indexed: number
    pending: number
    scanning: boolean
  }
}

/**
 * Default-app ownership of the Office document types. `others` lists the apps
 * (display names) currently holding at least one type; `manualOnly` means the
 * platform (Windows) only lets us open the system page.
 */
export interface DefaultAppStatus {
  state: 'unsupported' | 'unknown' | 'default' | 'other'
  others: string[]
  manualOnly: boolean
}

export interface HomeApi {
  /** unified recents across document types, newest first (paged) */
  recents(query?: RecentQuery): Promise<RecentPage>
  /** search indexed files by name, folder and content */
  searchFiles(query: FileSearchQuery): Promise<FileSearchPage>
  /** decision-model order for the hits currently shown (≤ 20 paths); null when reranking is off or unavailable */
  rerankSearch(query: { q: string; paths: string[] }): Promise<FileSearchRerank | null>
  getFileSearchSettings(): Promise<FileSearchSettings>
  setFileSearchSettings(patch: Partial<FileSearchSettings>): Promise<FileSearchSettings>
  /** one two-document judgement against the (possibly unsaved) settings */
  testFileSearchRerank(settings: FileSearchSettings): Promise<{ ok: boolean; error?: string }>
  /** starred files (independent of the recent list), newest first (paged) */
  starred(query?: RecentQuery): Promise<RecentPage>
  /** starred group names that currently have at least one file, in creation order */
  starredGroups(): Promise<string[]>
  /** put each starred path into `group` (null = remove from its group) */
  setStarredGroup(paths: string[], group: string | null): Promise<void>
  /** stat a specific set of paths (project view); unstat-able files come back flagged `missing` */
  statPaths(paths: string[]): Promise<RecentEntry[]>
  /** star / unstar a file */
  toggleStar(path: string): Promise<void>
  // ---- knowledge-base ask panel: the reader's starred corpus, askable ----
  /** the starred corpus as the AI's knowledge base */
  kbList(): Promise<KbFileInfo[]>
  /** full-text search over the corpus */
  kbSearch(query: { q: string; limit?: number }): Promise<KbSearchHit[]>
  /** one page of a corpus file's parsed text (path must be in kbList) */
  kbRead(path: string, offset: number): Promise<KbReadPage>
  /** Saves the Ask AI transcript as a .md file picked through a native dialog */
  kbExportChat(
    markdown: string,
    suggestedName: string,
    dialogTitle: string,
  ): Promise<{ ok: boolean; path?: string; error?: string }>
  /** write the AI's markdown as a new .md / .docx in the save folder; resolves to its path */
  kbCreateDocument(request: {
    title: string
    format: 'md' | 'docx'
    content: string
  }): Promise<{ path: string }>
  /** the user's AI provider settings (shared with every app's panel) */
  aiGetSettings(): Promise<AiSettings>
  /** one streamed model turn over the shared ai:stream handler */
  aiStream(request: AiStreamRequest): Promise<void>
  aiStreamCancel(requestId: string): Promise<void>
  /** subscribe to stream chunks; returns unsubscribe */
  onAiStream(handler: (chunk: AiStreamChunk) => void): () => void
  /** Account state: loggedIn = any usable credential, accountLoggedIn = a VEGA sign-in key exists, gskUsable = the shared gsk CLI login */
  aiGskStatus(): Promise<GenSparkAccountStatus>
  /** open an existing file, routing to the right module by extension */
  openHelp(): Promise<void>
  openPath(path: string): Promise<void>
  /** file picker accepting every supported extension, then routes */
  browse(): Promise<void>
  /** open a docs window at its start screen; `dir` = folder the first save should land in */
  newDoc(opts?: NewFileOpts): Promise<void>
  /** open a sheets window */
  newSheet(opts?: NewFileOpts): Promise<void>
  /** open a slides tab at its start screen (open-a-pptx) */
  newSlide(opts?: NewFileOpts): Promise<void>
  /** open a blank markdown editor tab */
  newMarkdown(opts?: NewFileOpts): Promise<void>
  /** open a blank html editor tab */
  newHtml(opts?: NewFileOpts): Promise<void>
  /** create a blank single-page PDF in the default save folder and open it */
  newPdf(opts?: NewFileOpts): Promise<void>
  /** drop entries from the recent list (does not touch the files) */
  removeRecent(paths: string[]): Promise<void>
  /** unstar files in bulk (Starred view selection bar); the recents list and the files are untouched */
  unstarPaths(paths: string[]): Promise<void>
  /** reveal the file in Finder / Explorer */
  revealPath(path: string): Promise<void>
  /** rename the file on disk (same directory) and update the recent list */
  renameFile(path: string, newName: string): Promise<RenameResult>
  /** copy the file next to itself (localized "copy" suffix before .ext) and record it as recent */
  duplicateFile(path: string): Promise<void>
  /** move files to the trash and drop them from the recent list */
  deleteFiles(paths: string[]): Promise<void>
  /** open the OS trash, where deleted files can be restored */
  openTrash(): Promise<void>
  /** the tree roots: the default save folder first, then the folders the user added */
  folderRoots(): Promise<FolderRoot[]>
  /** directory picker; the chosen folder joins the tree in place (nothing is copied or moved) */
  addFolderRoot(): Promise<FolderRoot | null>
  /** OS paths dropped on the Folders panel: folders join the tree, documents open */
  dropFolderRoots(paths: string[]): Promise<FolderRoot[]>
  /** take an added folder off the list; the disk is untouched */
  removeFolderRoot(path: string): Promise<void>
  /** absolute path of a File from an OS drag (Electron webUtils) */
  pathForFile(file: File): string
  /** one level of the tree: sub-folders + supported files directly inside `dir` */
  listFolder(dir: string): Promise<FolderListing>
  /** create `parent/name`; resolves to the new path */
  createFolder(parent: string, name: string): Promise<RenameResult>
  /** rename a folder in place (files inside keep their recents/stars/chat history) */
  renameFolder(dir: string, newName: string): Promise<RenameResult>
  /** move files and/or folders into `targetDir` */
  movePaths(paths: string[], targetDir: string, onConflict: MoveConflictPolicy): Promise<MoveResult>
  /** move a folder (and everything inside) to the trash */
  deleteFolder(dir: string): Promise<void>
  /** a folder under the root changed on disk (created/renamed/deleted/moved, from anywhere) */
  onFolderChanged(handler: (dirs: string[]) => void): () => void
  /** current UI language (persisted in userData/app-settings.json) */
  getLanguage(): Promise<UiLanguage>
  /** switch + persist the UI language; main rebuilds its menus to match */
  setLanguage(lang: UiLanguage): Promise<void>
  /** current update channel (persisted in userData/app-settings.json; default 'stable') */
  getUpdateChannel(): Promise<UpdateChannel>
  /** switch + persist the update channel; triggers an immediate update check */
  setUpdateChannel(channel: UpdateChannel): Promise<void>
  /** display name for the home greeting (persisted in userData/app-settings.json; '' = derive from the email) */
  getDisplayName(): Promise<string>
  /** persist the display name; broadcasts 'app:display-name-changed' to all web contents */
  setDisplayName(name: string): Promise<void>
  /** the name was changed anywhere (broadcast from the main process) */
  onDisplayNameChanged(handler: (name: string) => void): () => void
  /** VEGA account status (the issued sk-apivega key; deposit included when reachable) */
  accountStatus(): Promise<AccountStatus>
  /** start VEGA login (opens the browser; accountStatus flips to logged-in on completion); returns whether the launch succeeded */
  accountLogin(): Promise<boolean>
  /** progress events for the login started via accountLogin; returns an unsubscribe */
  onAccountLogin(handler: (ev: AccountLoginEvent) => void): () => void
  /** sign-in/out anywhere in the app (including a chat panel's login button); refresh accountStatus */
  onAuthChanged(handler: (status: { loggedIn: boolean }) => void): () => void
  /** a tab asked for the settings modal (composer model chip → AI Model section) */
  onOpenSettings(handler: (target: { section: string }) => void): () => void
  /** app-menu "Welcome" item: re-run the first-run onboarding over the home tab */
  onShowOnboarding(handler: () => void): () => void
  /** ask the main process to open the AI Model settings pane (onboarding "connect VEGA AI" CTA) */
  openModelSettings(): Promise<void>
  /** re-open the pending login auth URL in the default browser (rescue when auto-open failed) */
  openLoginUrl(): Promise<void>
  /** log out (clears the saved API key; the login state is shared globally with the gsk CLI) */
  accountLogout(): Promise<void>
  /** app version (from package.json / electron app.getVersion) */
  getAppVersion(): Promise<string>
  /** live updater state (null until an update was first seen); Settings → About */
  getUpdateState(): Promise<UpdateUiState | null>
  /** re-open the (minimized) update dialog; a not-yet-started download also starts */
  openUpdateDialog(): Promise<boolean>
  onUpdateStateChanged(handler: (state: UpdateUiState) => void): () => void
  /** whether the first-run onboarding has been completed or skipped (persisted in userData/app-settings.json) */
  onboardingSeen(): Promise<boolean>
  /** mark onboarding done */
  setOnboardingSeen(): Promise<boolean>
  /** current UI theme preference (persisted in userData/app-settings.json) */
  getTheme(): Promise<UiTheme>
  /** switch + persist the UI theme; broadcasts 'app:theme-changed' to all web contents */
  setTheme(theme: UiTheme): Promise<void>
  /** current UI design (persisted in userData/app-settings.json) */
  getDesign(): Promise<UiDesign>
  /** switch + persist the UI design; broadcasts 'app:design-changed' to all web contents */
  setDesign(design: UiDesign): Promise<void>
  /** current document page theme preference (#1811, persisted in userData/app-settings.json) */
  getDocumentTheme(): Promise<DocTheme>
  /** switch + persist the document page theme; broadcasts 'app:document-theme-changed' to all web contents */
  setDocumentTheme(theme: DocTheme): Promise<void>
  /** interface zoom factor (#1913, persisted in userData/app-settings.json; default = 1) */
  getUiScale(): Promise<number>
  /** switch + persist the interface zoom; applies it to all web contents and broadcasts 'app:ui-scale-changed' */
  setUiScale(factor: number): Promise<void>
  /** interface zoom changes (fired after setUiScale; also covers menu-driven changes from editor windows) */
  onUiScaleChanged(handler: (factor: number) => void): () => void
  /** AutoSave default applied by every editor window (persisted in userData/app-settings.json) */
  getAutoSaveDefault(): Promise<AutoSaveDefault>
  /** persist the AutoSave default; broadcasts 'app:auto-save-default-changed' to all web contents */
  setAutoSaveDefault(on: boolean): Promise<void>
  /** current local MCP server state (running/enabled/port/url) */
  getMcpStatus(): Promise<McpStatus>
  /** enable/disable the MCP server and/or change its port/background/logging; applies and persists, returns the new state */
  setMcpSettings(patch: {
    enabled?: boolean
    port?: number
    background?: boolean
    logging?: boolean
  }): Promise<McpStatus>
  /** last MCP log lines (empty when logging has never been on) */
  getMcpLogs(): Promise<string[]>
  /** truncate the MCP log file */
  clearMcpLogs(): Promise<void>
  /** reveal the MCP log file in the file manager (created empty when missing) */
  openMcpLogFile(): Promise<void>
  /** AI panel text size + chat-input spellcheck (persisted in userData/app-settings.json) */
  getAiPanelPrefs(): Promise<AiPanelPrefs>
  /** merge + persist; broadcasts 'app:ai-panel-prefs-changed' to all web contents */
  setAiPanelPrefs(patch: Partial<AiPanelPrefs>): Promise<AiPanelPrefs>
  /** broadcast of setAiPanelPrefs to every web contents (incl. this one); returns unsubscribe */
  onAiPanelPrefsChanged?(handler: (prefs: AiPanelPrefs) => void): () => void
  /** effective default save folder for new/untitled files (configured in userData/app-settings.json, falls back to <Documents>/OfficeVega) */
  getDefaultSaveDir(): Promise<string>
  /** directory picker to change the default save folder; resolves to the new folder, or null when canceled or the pick was unusable */
  pickDefaultSaveDir(): Promise<string | null>
  /** who opens .docx/.xlsx/.pptx today (Settings → General "default app" row) */
  getDefaultAppStatus(): Promise<DefaultAppStatus>
  /** claim the Office types (mac/linux) or open the system Default Apps page (win); resolves to the refreshed status */
  setDefaultApp(): Promise<DefaultAppStatus>
  /** theme switched anywhere (broadcast from the main process) */
  onThemeChanged(handler: (theme: UiTheme) => void): () => void
  /** design switched anywhere (broadcast from the main process) */
  onDesignChanged(handler: (design: UiDesign) => void): () => void
  /** document page theme switched anywhere (broadcast from the main process) */
  onDocumentThemeChanged(handler: (theme: DocTheme) => void): () => void
  /** open the VEGA keys/deposit dashboard in the default browser */
  openCreditUsage(): Promise<void>
  /** license state (Settings → Account); without a license only the VEGA provider is selectable */
  getLicenseStatus(): Promise<LicenseStatus>
  /** activate this device with a key (any case, dashes optional) */
  activateLicense(key: string): Promise<LicenseActionResult>
  /** release this device's seat on the server and forget the key */
  deactivateLicense(): Promise<LicenseActionResult>
  /** re-check the license now (/validate) */
  refreshLicense(): Promise<LicenseActionResult>
  /** open the officevega.com dashboard (device_limit hint) */
  openLicenseDashboard(): Promise<void>
  /** license state changed anywhere (activation, daily check, revocation) */
  onLicenseChanged(handler: (status: LicenseStatus) => void): () => void
  /** open the public GitHub repository in the default browser */
  openGitHubRepo(): Promise<void>
  /** open officevega.com in the default browser (Settings → About) */
  openWebsite(): Promise<void>
  /** open api.vega.chat in the default browser (Settings → About) */
  openAiProvider(): Promise<void>
  /** open api.vega.chat/aimodels in the default browser (Settings → AI Model note) */
  openAiModels(): Promise<void>
  /** open the VEGA chat web app in the default browser; ru locale lands on ru.vega.chat */
  openVegaChat(): Promise<void>
  /** open vega.codes in the default browser (Settings → About "Other AI services") */
  openVegaCodes(): Promise<void>
  /** open officevega.com/feedback in the default browser (Settings → About) */
  openFeedback(): Promise<void>
  /** open getmyai.io in the default browser (Settings → About) */
  openDeveloperSite(): Promise<void>
  /** open t.me/getmyai in the default browser (Settings → About) */
  openDeveloperChannel(): Promise<void>
  /** whether the one-time "star us" prompt should show now (show:true also counts as shown);
   * docOpens personalizes the card copy ("you've opened N documents") */
  starPromptShouldShow(): Promise<StarPromptShow>
  /** user reacted to the star prompt; 'starred' resolves it permanently */
  starPromptAction(action: StarPromptAction): Promise<void>
  /** AI settings (userData/ai-settings.json, shared by every editor); the genspark key never appears here */
  getAiSettings(): Promise<AiSettings>
  /** persist AI settings; every renderer gets ai:settings-changed and re-reads */
  setAiSettings(settings: AiSettings): Promise<void>
  /** ai-settings.json was rewritten by any renderer (composer model chip, another window) */
  onAiSettingsChanged(handler: () => void): () => void
  /** provider catalog with each fixed endpoint's default base URL (empty for genspark/custom) */
  getAiProviders(): AiCatalogEntry[]
  /** live Codex model catalog discovered through the current or overridden app-server */
  getCodexModels(cliPath?: string): Promise<CodexModelCatalog>
  /**
   * live model catalog for liveCatalog providers (VEGA, OpenRouter): GET {base}/models
   * filtered by modality ('text' output for chat pickers, 'image' output / 'video' input
   * for the media pickers); falls back to the provider's static list on failure
   */
  getProviderModels(input: {
    provider: AiProviderId
    apiKey?: string
    baseUrl?: string
    input?: string
    output?: string
    /** drop models whose output modalities include any of these ('image' keeps image generators out of text pickers) */
    excludeOutput?: readonly string[]
    /** drop catalog ids starting with any of these prefixes */
    excludePrefixes?: readonly string[]
    /** drop catalog ids ending with any of these suffixes (':free', '-latest', 'meta') */
    excludeSuffixes?: readonly string[]
  }): Promise<ProviderModelCatalog>
  /** live model list advertised by a user-hosted endpoint, probed on the route its declared protocol speaks; empty when it cannot answer */
  getCustomModels(
    baseUrl: string,
    apiKey?: string,
    api?: AiCustomProtocol,
  ): Promise<CodexModelCatalog>
  /** one-shot round trip against the given (possibly unsaved) settings — the settings-UI connection test */
  testAiSettings(settings: AiSettings): Promise<AiChatResponse>
  /** image generation / media analysis provider catalog */
  getAiMediaProviders(): AiMediaProviderMeta[]
  /** credential check for a (possibly unsaved) media provider; genspark reports the gsk login state */
  testAiMediaSettings(input: {
    provider: AiMediaProviderId
    config: AiMediaProviderConfig
  }): Promise<{ ok: boolean; error?: string }>
  /** web search provider catalog */
  getAiSearchProviders(): AiSearchProviderMeta[]
  /** one minimal query against the given key (genspark reports the gsk login state) */
  testAiSearchSettings(input: {
    provider: AiSearchProviderId
    apiKey: string
  }): Promise<{ ok: boolean; error?: string }>
}

/** the preload exposes the API as window.aiOffice — declared here so every
 *  importer (renderers, tests) sees it without pulling in Home.tsx */
declare global {
  interface Window {
    aiOffice: HomeApi
  }
}

export interface AiCatalogEntry extends AiProviderMeta {
  /** default endpoint for fixed-endpoint providers ('' = model-dependent or user-supplied) */
  defaultBaseUrl: string
  /** live-catalog picker options ({id → display name}) filled by the settings refresh; absent = show meta.models ids */
  modelOptions?: ReadonlyArray<{ value: string; label: string }>
}

/** 'starred' = went to GitHub or said "already starred" (never prompt again);
 * 'later' = dismissed this time (already counted as shown by the query) */
export type StarPromptAction = 'starred' | 'later'

/** answer to starPromptShouldShow */
export interface StarPromptShow {
  show: boolean
  /** lifetime documents opened — drives the personalized card title */
  docOpens: number
}

export interface AccountStatus {
  /** a OfficeVega-named VEGA key exists in the local auth file */
  loggedIn: boolean
  email?: string
  /** deposit balance in `currency` (USD); absent when the account query failed */
  balance?: number
  /** the same deposit converted to RUB at VEGA's current rate */
  balanceRub?: number
  currency?: string
  /** lifetime spend, same currency */
  totalUsage?: number
}

/** login flow progress pushed from main (gsk login CLI output) */
export interface AccountLoginEvent {
  phase: 'launched' | 'url' | 'success' | 'error'
  url?: string
  /** device-flow user code (e.g. "ABCD-1234") for the settings sign-in field */
  userCode?: string
  expiresInSec?: number
  /** 'network' | 'expired' | raw CLI error text */
  error?: string
}

export interface RenameResult {
  ok: boolean
  /** the new absolute path when ok */
  path?: string
  error?: string
}

export interface NewFileOpts {
  /** folder the new file's first save should land in (defaults to the save folder root) */
  dir?: string
}

// ── Folder tree (home "Folders" panel: the default save folder plus any folder the user added) ──

export interface FolderRoot {
  path: string
  /** folder name shown on the root row */
  name: string
  /** false when the folder does not exist and cannot be created, or is read-only */
  usable: boolean
  /** the folder exists and can be listed (a read-only or unplugged root is still shown) */
  readable: boolean
  /** an added folder: can be taken off the list; the default save folder cannot */
  removable: boolean
}

export interface FolderEntry {
  path: string
  name: string
  mtimeMs: number
  /** whether it contains at least one visible sub-folder (drives the expand chevron) */
  hasSubfolders: boolean
}

/** a document file listed by the tree (same shape as the home recents rows) */
export interface FileEntry {
  path: string
  name: string
  /** lowercased extension without the dot */
  ext: string
  mtimeMs: number
  sizeBytes: number
  starred: boolean
  /** the path failed to stat */
  missing?: boolean
}

export interface FolderListing {
  dir: string
  folders: FolderEntry[]
  /** supported document files directly inside `dir`, newest first */
  files: FileEntry[]
  /** the directory could not be read (deleted or moved outside the app) */
  missing?: boolean
}

/** what to do when a moved item's name already exists in the target */
export type MoveConflictPolicy = 'ask' | 'replace' | 'keepBoth' | 'skip'

export interface MoveResult {
  /** old path → new path for everything that moved */
  moved: Array<{ from: string; to: string }>
  /** items skipped because the name exists in the target (policy 'ask'/'skip') */
  conflicts: string[]
  /** items that failed for another reason */
  failed: Array<{ path: string; error: string }>
}

export const HOME_CHANNELS = {
  openHelp: 'home:open-help',
  recents: 'home:recents',
  searchFiles: 'home:search-files',
  rerankSearch: 'home:rerank-search',
  getFileSearchSettings: 'home:get-file-search-settings',
  setFileSearchSettings: 'home:set-file-search-settings',
  testFileSearchRerank: 'home:test-file-search-rerank',
  starred: 'home:starred',
  statPaths: 'home:stat-paths',
  toggleStar: 'home:toggle-star',
  unstarPaths: 'home:unstar-paths',
  starredGroups: 'home:starred-groups',
  setStarredGroup: 'home:set-starred-group',
  openPath: 'home:open-path',
  browse: 'home:browse',
  newDoc: 'home:new-doc',
  newSheet: 'home:new-sheet',
  newSlide: 'home:new-slide',
  newMarkdown: 'home:new-markdown',
  newHtml: 'home:new-html',
  newPdf: 'home:new-pdf',
  removeRecent: 'home:remove-recent',
  revealPath: 'home:reveal-path',
  renameFile: 'home:rename-file',
  duplicateFile: 'home:duplicate-file',
  deleteFiles: 'home:delete-files',
  openTrash: 'home:open-trash',
  folderRoots: 'home:folder-roots',
  addFolderRoot: 'home:folder-root-add',
  dropFolderRoots: 'home:folder-root-drop',
  removeFolderRoot: 'home:folder-root-remove',
  listFolder: 'home:folder-list',
  createFolder: 'home:folder-create',
  renameFolder: 'home:folder-rename',
  movePaths: 'home:move-paths',
  deleteFolder: 'home:folder-delete',
  folderChanged: 'home:folder-changed',
  getLanguage: 'home:get-language',
  setLanguage: 'home:set-language',
  getUpdateChannel: 'home:get-update-channel',
  setUpdateChannel: 'home:set-update-channel',
  getDisplayName: 'home:get-display-name',
  setDisplayName: 'home:set-display-name',
  accountStatus: 'home:account-status',
  accountLogin: 'home:account-login',
  accountLoginEvent: 'home:account-login-event',
  // app-wide push: emitted by the AI IPC layer on every VEGA sign-in/out,
  // whichever UI started it (a chat panel's login button included)
  authChanged: 'ai:auth-changed',
  openSettings: 'home:open-settings',
  showOnboarding: 'home:show-onboarding',
  accountLoginOpenUrl: 'home:account-login-open-url',
  accountLogout: 'home:account-logout',
  getAppVersion: 'home:get-app-version',
  onboardingSeen: 'home:onboarding-seen',
  setOnboardingSeen: 'home:set-onboarding-seen',
  getTheme: 'home:get-theme',
  setTheme: 'home:set-theme',
  getDesign: 'home:get-design',
  setDesign: 'home:set-design',
  getDocumentTheme: 'home:get-document-theme',
  setDocumentTheme: 'home:set-document-theme',
  getUiScale: 'home:get-ui-scale',
  setUiScale: 'home:set-ui-scale',
  getAutoSaveDefault: 'home:get-auto-save-default',
  setAutoSaveDefault: 'home:set-auto-save-default',
  getMcpStatus: 'home:get-mcp-status',
  setMcpSettings: 'home:set-mcp-settings',
  getMcpLogs: 'home:get-mcp-logs',
  clearMcpLogs: 'home:clear-mcp-logs',
  openMcpLogFile: 'home:open-mcp-log-file',
  getAiPanelPrefs: 'home:get-ai-panel-prefs',
  setAiPanelPrefs: 'home:set-ai-panel-prefs',
  getDefaultSaveDir: 'home:get-default-save-dir',
  getDefaultAppStatus: 'home:get-default-app-status',
  setDefaultApp: 'home:set-default-app',
  pickDefaultSaveDir: 'home:pick-default-save-dir',
  openCreditUsage: 'home:open-credit-usage',
  openGitHubRepo: 'home:open-github-repo',
  openWebsite: 'home:open-website',
  openAiProvider: 'home:open-ai-provider',
  openAiModels: 'home:open-ai-models',
  openVegaChat: 'home:open-vega-chat',
  openVegaCodes: 'home:open-vega-codes',
  openFeedback: 'home:open-feedback',
  openDeveloperSite: 'home:open-developer-site',
  openDeveloperChannel: 'home:open-developer-channel',
  starPromptShouldShow: 'home:star-prompt-should-show',
  starPromptAction: 'home:star-prompt-action',
  licenseStatus: 'license:status',
  licenseActivate: 'license:activate',
  licenseDeactivate: 'license:deactivate',
  licenseRefresh: 'license:refresh',
  licenseOpenDashboard: 'license:open-dashboard',
  licenseChanged: 'license:changed',
} as const
