import { hostname } from 'node:os'
import { join } from 'node:path'
import { setLicenseGetter } from '@genoffice/ai-provider'
import { app, ipcMain, shell, webContents } from 'electron'
import { HOME_CHANNELS } from '../../shared/home-api'
import type { LicenseActionResult, LicenseStatus } from '../../shared/license-api'
import { createLicenseClient } from './client'
import { LICENSE_API_URL, LICENSE_DASHBOARD_URL, LICENSE_PUBLIC_KEYS } from './keys'
import { createLicenseManager } from './manager'
import type { LicenseManager } from './manager'
import { createMockLicenseServer } from './mock-server'
import { createFileLicenseStore } from './store'

let manager: LicenseManager | null = null
let registered = false

const NONE: LicenseStatus = {
  licensed: false,
  state: 'none',
  holderEmail: '',
  accountType: '',
  expiresAt: '',
  graceUntil: '',
  keyHint: '',
}

/** the live manager (null before registerLicenseIpc) */
export const licenseManager = (): LicenseManager | null => manager

/**
 * Wires the licence: manager + daily /validate, the provider gate and the IPC
 * surface. Must run before any AI handler resolves a provider. Dev builds with
 * OFFICEVEGA_LICENSE_MOCK=1 talk to an in-process mock of the server instead;
 * OFFICEVEGA_LICENSE_URL overrides the endpoint (never in packaged builds).
 */
export function registerLicenseIpc(): void {
  if (registered) return
  registered = true
  // fail closed until the manager exists (the package default is permissive for renderers)
  setLicenseGetter(() => false)
  const unlicensed = (): LicenseActionResult => ({
    ok: false,
    code: 'network',
    message: 'License service is not ready',
  })
  ipcMain.handle(HOME_CHANNELS.licenseStatus, () => manager?.status() ?? NONE)
  ipcMain.handle(HOME_CHANNELS.licenseActivate, (_event, key: unknown) =>
    typeof key !== 'string'
      ? { ok: false, code: 'bad_request', message: 'Malformed license key' }
      : (manager?.activate(key) ?? unlicensed()),
  )
  ipcMain.handle(HOME_CHANNELS.licenseDeactivate, () => manager?.deactivate() ?? unlicensed())
  ipcMain.handle(HOME_CHANNELS.licenseRefresh, () => manager?.refresh() ?? unlicensed())
  ipcMain.handle(HOME_CHANNELS.licenseOpenDashboard, () =>
    shell.openExternal(LICENSE_DASHBOARD_URL),
  )
  // safeStorage (Keychain/libsecret) is only usable once the app is ready
  void app.whenReady().then(startLicense)
}

function startLicense(): void {
  const dev = !app.isPackaged
  const mock = dev && process.env.OFFICEVEGA_LICENSE_MOCK === '1' ? createMockLicenseServer() : null
  const baseUrl = (dev && process.env.OFFICEVEGA_LICENSE_URL) || LICENSE_API_URL

  manager = createLicenseManager({
    store: createFileLicenseStore(join(app.getPath('userData'), 'license.json')),
    client: createLicenseClient({
      baseUrl: mock ? 'https://mock.officevega.invalid/api/license' : baseUrl,
      fetchImpl: mock?.fetch,
      allowInsecure: dev && !mock && baseUrl.startsWith('http://'),
    }),
    keys: mock ? { ...LICENSE_PUBLIC_KEYS, ...mock.publicKeys } : LICENSE_PUBLIC_KEYS,
    deviceName: hostname(),
    appVersion: app.getVersion(),
    onChange: (status) => {
      for (const wc of webContents.getAllWebContents()) {
        if (!wc.isDestroyed()) wc.send(HOME_CHANNELS.licenseChanged, status)
      }
    },
  })
  const m = manager
  setLicenseGetter(() => m.isLicensed())

  const stop = m.startScheduler()
  app.once('before-quit', stop)
}
