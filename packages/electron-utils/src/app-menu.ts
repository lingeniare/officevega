/// Localized replacements for Electron role menus, whose built-in labels are
/// English-only and (for role:'windowMenu' on Windows/Linux) follow macOS
/// conventions (Zoom, Ctrl+M minimize, Bring All to Front).
import type { MenuItemConstructorOptions, WebContents } from 'electron'
import { baseLang, contextMenuLabels, type ContextMenuLabels } from './context-menu'

export interface AppMenuLabels extends ContextMenuLabels {
  window: string
  minimize: string
  closeWindow: string
  edit: string
  undo: string
  redo: string
  delete: string
  view: string
  reload: string
  forceReload: string
  toggleDevTools: string
  actualSize: string
  zoomIn: string
  zoomOut: string
  fullscreen: string
  help: string
  about: string
  checkUpdates: string
  version: string
  license: string
  privacy: string
  settings: string
}

type Labels = Omit<AppMenuLabels, keyof ContextMenuLabels>

const EN: Labels = {
  window: 'Window',
  minimize: 'Minimize',
  closeWindow: 'Close Window',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  delete: 'Delete',
  view: 'View',
  reload: 'Reload',
  forceReload: 'Force Reload',
  toggleDevTools: 'Developer Tools',
  actualSize: 'Actual Size',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  fullscreen: 'Full Screen',
  help: 'Help',
  about: 'About OfficeVega',
  checkUpdates: 'Check for Updates…',
  version: 'Version',
  license: 'License',
  privacy: 'Privacy Policy',
  settings: 'Settings…',
}

// Shared table, same rationale as context-menu.ts: one copy instead of
// 15 keys × 20 languages per app dictionary.
const LABELS: Record<string, Labels> = {
  ru: {
    window: 'Окно',
    minimize: 'Свернуть',
    closeWindow: 'Закрыть окно',
    edit: 'Правка',
    undo: 'Отменить',
    redo: 'Повторить',
    delete: 'Удалить',
    view: 'Вид',
    reload: 'Перезагрузить',
    forceReload: 'Принудительно перезагрузить',
    toggleDevTools: 'Инструменты разработчика',
    actualSize: 'Реальный размер',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    fullscreen: 'Полноэкранный режим',
    help: 'Справка',
    about: 'Об «Офис ВЕГА»',
    checkUpdates: 'Проверить обновления…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Политика конфиденциальности',
    settings: 'Настройки…',
  },
  
  
  
  
  
  
  
  uz: {
    window: 'Oyna',
    minimize: 'Kichraytirish',
    closeWindow: 'Oynani yopish',
    edit: 'Tahrirlash',
    undo: 'Bekor qilish',
    redo: 'Qaytarish',
    delete: 'O‘chirish',
    view: 'Ko‘rinish',
    reload: 'Qayta yuklash',
    forceReload: 'Majburiy qayta yuklash',
    toggleDevTools: 'Dasturchi vositalari',
    actualSize: 'Haqiqiy o‘lcham',
    zoomIn: 'Kattalashtirish',
    zoomOut: 'Kichraytirish',
    fullscreen: 'To‘liq ekran',
    help: 'Yordam',
    about: 'OfficeVega haqida',
    checkUpdates: 'Yangilanishlarni tekshirish…',
    version: 'Versiya',
    license: 'Litsenziya',
    privacy: 'Maxfiylik siyosati',
    settings: 'Sozlamalar…',
  },
  kk: {
    window: 'Терезе',
    minimize: 'Терезені жасыру',
    closeWindow: 'Терезені жабу',
    edit: 'Өңдеу',
    undo: 'Болдырмау',
    redo: 'Қайта орындау',
    delete: 'Жою',
    view: 'Көрініс',
    reload: 'Қайта жүктеу',
    forceReload: 'Қайта жүктеуді мәжбүрлеу',
    toggleDevTools: 'Әзірлеуші құралдары',
    actualSize: 'Нақты өлшемі',
    zoomIn: 'Үлкейту',
    zoomOut: 'Кішірейту',
    fullscreen: 'Толық экран',
    help: 'Анықтама',
    about: 'OfficeVega туралы',
    checkUpdates: 'Жаңартуларды тексеру…',
    version: 'Нұсқа',
    license: 'Лицензия',
    privacy: 'Құпиялылық саясаты',
    settings: 'Баптаулар…',
  },
  az: {
    window: 'Pəncərə',
    minimize: 'Kiçilt',
    closeWindow: 'Pəncərəni bağla',
    edit: 'Redaktə edin',
    undo: 'Geri al',
    redo: 'Təkrarla',
    delete: 'Sil',
    view: 'Görünüş',
    reload: 'Yenidən yüklə',
    forceReload: 'Məcburi yenilə',
    toggleDevTools: 'Tərtibatçı alətləri',
    actualSize: 'Həqiqi ölçü',
    zoomIn: 'Böyüt',
    zoomOut: 'Kiçilt',
    fullscreen: 'Tam ekran',
    help: 'Kömək',
    about: 'OfficeVega haqqında',
    checkUpdates: 'Yeniləmələri yoxla…',
    version: 'Versiya',
    license: 'Lisenziya',
    privacy: 'Məxfilik siyasəti',
    settings: 'Parametrlər…',
  },
  tk: {
    window: 'Penjire',
    minimize: 'Kiçelt',
    closeWindow: 'Penjiräni ýap',
    edit: 'Redaktirle',
    undo: 'Yza al',
    redo: 'Gaýtala',
    delete: 'Poz',
    view: 'Görkez',
    reload: 'Täzeden ýükle',
    forceReload: 'Täzeden ýüklemäni mejbur et',
    toggleDevTools: 'Dörediji gurallary',
    actualSize: 'Hakyky ölçeg',
    zoomIn: 'Ulalt',
    zoomOut: 'Kiçelt',
    fullscreen: 'Doly ekran',
    help: 'Kömek',
    about: 'OfficeVega hakda',
    checkUpdates: 'Täzelenmeleri barla…',
    version: 'Wersiýa',
    license: 'Ygtyýarnama',
    privacy: 'Gizlinlik syýasaty',
    settings: 'Sazlamalar…',
  },
  ky: {
    window: 'Терезе',
    minimize: 'Минималдаштыруу',
    closeWindow: 'Терезени жабуу',
    edit: 'Түзөтүү',
    undo: 'Артка кайтаруу',
    redo: 'Кайталоо',
    delete: 'Жок кылуу',
    view: 'Көрүнүш',
    reload: 'Кайра жүктөө',
    forceReload: 'Кайра жүктөөгө мажбурлоо',
    toggleDevTools: 'Иштеп чыгуучунун куралдары',
    actualSize: 'Чыныгы өлчөм',
    zoomIn: 'Чоңойтуу',
    zoomOut: 'Кичирейтүү',
    fullscreen: 'Толук экран',
    help: 'Жардам',
    about: 'OfficeVega жөнүндө',
    checkUpdates: 'Жаңыртууларды текшерүү…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Купуялык саясаты',
    settings: 'Орнотуулар…',
  },
  tt: {
    window: 'Тәрәзә',
    minimize: 'Кечерәйтү',
    closeWindow: 'Тәрәзәне ябу',
    edit: 'Үзгәртү',
    undo: 'Гамәлне кире кайтару',
    redo: 'Кабатлау',
    delete: 'Бетерү',
    view: 'Күренеш',
    reload: 'Яңадан йөкләү',
    forceReload: 'Мәҗбүри яңадан йөкләү',
    toggleDevTools: 'Әзерләүче кораллары',
    actualSize: 'Чынбарлыктагы зурлык',
    zoomIn: 'Зурайту',
    zoomOut: 'Кечерәйтү',
    fullscreen: 'Тулы экран',
    help: 'Ярдәм',
    about: 'Офис ВЕГА турында',
    checkUpdates: 'Яңартуларны тикшерү…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Хосусыйлык сәясәте',
    settings: 'Көйләүләр…',
  },
  ka: {
    window: 'ფანჯარა',
    minimize: 'მინიმიზაცია',
    closeWindow: 'ფანჯრის დახურვა',
    edit: 'რედაქტირება',
    undo: 'გაუქმება',
    redo: 'გამეორება',
    delete: 'წაშლა',
    view: 'ხედი',
    reload: 'ხელახლა ჩატვირთვა',
    forceReload: 'იძულებით გადატვირთვა',
    toggleDevTools: 'დეველოპერის ხელსაწყოები',
    actualSize: 'რეალური ზომა',
    zoomIn: 'გადიდება',
    zoomOut: 'შემცირება',
    fullscreen: 'სრულ ეკრანზე',
    help: 'დახმარება',
    about: 'OfficeVega-ის შესახებ',
    checkUpdates: 'განახლებების შემოწმება…',
    version: 'ვერსია',
    license: 'ლიცენზია',
    privacy: 'კონფიდენციალურობის პოლიტიკა',
    settings: 'პარამეტრები…',
  },
}

export function appMenuLabels(lang: string): AppMenuLabels {
  return { ...contextMenuLabels(lang), ...(LABELS[lang] ?? LABELS[baseLang(lang)] ?? EN) }
}

/** macOS keeps the native role (Minimize/Zoom/Front, window list); Windows/Linux
 * gets only conventional items — no Zoom/Front, and no Ctrl+M accelerator since
 * Windows has no menu shortcut for minimize. */
export function windowMenuTemplate(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
): MenuItemConstructorOptions {
  if (platform === 'darwin') return { role: 'windowMenu', label: labels.window }
  return {
    label: labels.window,
    submenu: [
      { label: labels.minimize, click: (_item, win) => win?.minimize() },
      { type: 'separator' },
      { label: labels.closeWindow, click: (_item, win) => win?.close() },
    ],
  }
}

/** macOS keeps role:'editMenu' (Speech/Substitutions submenus etc.); elsewhere
 * the same items Electron would generate, with localized labels. */
export function editMenuTemplate(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
): MenuItemConstructorOptions {
  if (platform === 'darwin') return { role: 'editMenu', label: labels.edit }
  return {
    label: labels.edit,
    submenu: [
      { role: 'undo', label: labels.undo },
      { role: 'redo', label: labels.redo },
      { type: 'separator' },
      { role: 'cut', label: labels.cut },
      { role: 'copy', label: labels.copy },
      { role: 'paste', label: labels.paste },
      { role: 'delete', label: labels.delete },
      { type: 'separator' },
      { role: 'selectAll', label: labels.selectAll },
    ],
  }
}

let lastDetachedDevToolsTarget: WebContents | undefined

/** role:'toggleDevTools' docks DevTools into the window, where the shell's
 * WebContentsView tabs are stacked above it and occlude it — open detached
 * instead, keeping the role's accelerator and toggle semantics. */
export function toggleDevToolsItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.toggleDevTools,
    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
    click: async () => {
      const { webContents } = await import('electron')
      const focused = webContents.getFocusedWebContents()
      const previous =
        lastDetachedDevToolsTarget && !lastDetachedDevToolsTarget.isDestroyed()
          ? lastDetachedDevToolsTarget
          : undefined
      const wc = !focused || focused === previous?.devToolsWebContents ? previous : focused
      if (!wc) return
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools()
        if (wc === lastDetachedDevToolsTarget) lastDetachedDevToolsTarget = undefined
      } else {
        wc.openDevTools({ mode: 'detach' })
        lastDetachedDevToolsTarget = wc
      }
    },
  }
}

export interface ViewMenuOptions {
  /** Reload / Force Reload / DevTools (default on) */
  readonly devItems?: boolean
  /** Actual Size / Zoom In / Zoom Out page-zoom roles (default on) */
  readonly pageZoom?: boolean
}

/**
 * role:'viewMenu' expands identically on every platform, so no branch. Menu
 * accelerators beat renderer key handlers on macOS, so apps whose document
 * shortcuts collide with ⌘R / ⌘0 / ⌘+ / ⌘- opt those groups out.
 */
export function viewMenuTemplate(
  labels: AppMenuLabels,
  { devItems = true, pageZoom = true }: ViewMenuOptions = {},
): MenuItemConstructorOptions {
  const groups: MenuItemConstructorOptions[][] = []
  if (devItems) {
    groups.push([
      { role: 'reload', label: labels.reload },
      { role: 'forceReload', label: labels.forceReload },
      toggleDevToolsItem(labels),
    ])
  }
  if (pageZoom) {
    groups.push([
      { role: 'resetZoom', label: labels.actualSize },
      { role: 'zoomIn', label: labels.zoomIn },
      { role: 'zoomOut', label: labels.zoomOut },
    ])
  }
  groups.push([{ role: 'togglefullscreen', label: labels.fullscreen }])
  return {
    label: labels.view,
    submenu: groups.flatMap((group, index) =>
      index === 0 ? group : [{ type: 'separator' }, ...group],
    ),
  }
}

/** The manual update check lives in the shell (electron-updater and its
 * result dialogs), while the menus that expose it are built here — the shell
 * injects the check at startup. Read at click time, so registration order
 * relative to menu construction doesn't matter; until registered the menu
 * entry no-ops and the About dialog doesn't offer the button. */
let updateCheckInvoker: (() => void) | null = null

export function setUpdateCheckInvoker(invoke: (() => void) | null): void {
  updateCheckInvoker = invoke
}

/** Help > Check for Updates…: user-triggered update check (sits right above
 * About, like Word). The shell-injected check owns all feedback: the update
 * window when newer exists, "you're up to date (version x)" otherwise. */
export function checkUpdatesMenuItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.checkUpdates,
    click: () => updateCheckInvoker?.(),
  }
}

/** Help > About: a native dialog with the app version — every window's menu
 * gets one, so users can report the exact build they run. productName is the
 * caller's localized app title (i18n appTitle()); defaults to the Latin brand. */
export function aboutMenuItem(
  labels: AppMenuLabels,
  productName = 'OfficeVega',
): MenuItemConstructorOptions {
  return {
    label: labels.about,
    click: async () => {
      const { app, dialog, clipboard } = await import('electron')
      const version = app.getVersion()
      const canCheck = updateCheckInvoker !== null
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: productName,
        message: productName,
        detail: `${labels.version} ${version}`,
        buttons: ['OK', labels.copy, ...(canCheck ? [labels.checkUpdates] : [])],
        defaultId: 0,
        cancelId: 0,
      })
      if (response === 1) clipboard.writeText(`${productName} ${version}`)
      if (response === 2) updateCheckInvoker?.()
    },
  }
}

/** Opens a text file bundled next to the executable (resources/ in packaged
 * builds, apps/shell/build in dev) in the OS default viewer — the same
 * approach as Third-Party Notices, so legal texts are readable everywhere but
 * never editable inside the suite. The second dev candidate covers standalone
 * app dev, where getAppPath() is apps/<app> and the files live in
 * apps/shell/build. */
async function openBundledText(fileName: string): Promise<void> {
  const { app, shell } = await import('electron')
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, fileName)]
    : [
        join(app.getAppPath(), 'build', fileName),
        join(app.getAppPath(), '..', 'shell', 'build', fileName),
      ]
  const target = candidates.find((p) => existsSync(p)) ?? candidates[0]
  if (target) void shell.openPath(target)
}

/** The bundled legal texts ship in two variants: the English UI reads the
 * *-EN.txt file, every other UI language the *-RU.txt one (the installer
 * pages apply the same split — see OfficeVegaLegalLangStrings in
 * apps/shell/build/installer.nsh). */
function legalDocFile(base: 'EULA' | 'PRIVACY-POLICY', lang: string | undefined): string {
  return `${base}-${baseLang(lang ?? '') === 'en' ? 'EN' : 'RU'}.txt`
}

/** Help > License: opens the bundled EULA. */
export function licenseMenuItem(
  labels: AppMenuLabels,
  lang?: string,
): MenuItemConstructorOptions {
  return {
    label: labels.license,
    click: () => openBundledText(legalDocFile('EULA', lang)),
  }
}

/** Help > Privacy Policy: opens the bundled personal-data policy. */
export function privacyMenuItem(
  labels: AppMenuLabels,
  lang?: string,
): MenuItemConstructorOptions {
  return {
    label: labels.privacy,
    click: () => openBundledText(legalDocFile('PRIVACY-POLICY', lang)),
  }
}

/** Help menu with Check for Updates… + About + legal docs; extra app-specific
 * items go before the separator. productName localizes the About dialog (see
 * aboutMenuItem). */
/** The Settings entry, shared by every app: one label, one accelerator
 * (⌘, on macOS and Ctrl+, elsewhere), one action. The shell owns the
 * Settings view, so it registers the action; an app running on its own
 * falls back to its own preferences entry. */
let settingsInvoker: (() => void) | null = null

export function setSettingsInvoker(invoke: (() => void) | null): void {
  settingsInvoker = invoke
}

export function settingsMenuItem(
  labels: AppMenuLabels,
  fallback?: () => void,
): MenuItemConstructorOptions {
  return {
    label: labels.settings,
    accelerator: 'CmdOrCtrl+,',
    click: () => (settingsInvoker ?? fallback)?.(),
  }
}

/** macOS application menu — the one under the app name. Electron's
 * role:'appMenu' is a fixed template, so an entry of our own means spelling
 * the menu out; the native roles keep the standard order and labels. Only
 * macOS has this menu, so every other platform gets undefined. */
export function appMenuTemplate(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
  {
    extra = [],
    appLabel = 'OfficeVega',
  }: { extra?: MenuItemConstructorOptions[]; appLabel?: string } = {},
): MenuItemConstructorOptions | undefined {
  if (platform !== 'darwin') return undefined
  return {
    // Electron rejects a menu item that has neither label, role nor type
    label: appLabel,
    submenu: [
      { role: 'about', label: labels.about },
      ...extra,
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  }
}

/** Help menu with Check for Updates… + About; extra app-specific items go
 * before the separator. */
export function helpMenuTemplate(
  labels: AppMenuLabels,
  extraItems: MenuItemConstructorOptions[] = [],
  productName = 'OfficeVega',
  lang?: string,
): MenuItemConstructorOptions {
  return {
    role: 'help',
    label: labels.help,
    submenu: [
      ...extraItems,
      ...(extraItems.length > 0 ? [{ type: 'separator' } as const] : []),
      checkUpdatesMenuItem(labels),
      aboutMenuItem(labels, productName),
      { type: 'separator' },
      licenseMenuItem(labels, lang),
      privacyMenuItem(labels, lang),
    ],
  }
}
