import { existsSync, readFileSync } from 'node:fs'
import { writeJsonAtomic } from '@genoffice/electron-utils'
import { safeStorage } from 'electron'
import type { LicenseState, LicenseStore } from './manager'

/**
 * userData/license.json holding the whole state (deviceId, key, token) sealed
 * with Electron's safeStorage — Keychain / DPAPI / libsecret. Where the OS has
 * no keyring (headless Linux) the state is stored as plain JSON instead.
 */
export function createFileLicenseStore(path: string): LicenseStore {
  return {
    load() {
      try {
        if (!existsSync(path)) return null
        const file = JSON.parse(readFileSync(path, 'utf8')) as { sealed?: string; plain?: LicenseState }
        const state =
          typeof file.sealed === 'string'
            ? (JSON.parse(safeStorage.decryptString(Buffer.from(file.sealed, 'base64'))) as LicenseState)
            : file.plain
        return state && typeof state.deviceId === 'string' && state.deviceId.length >= 16
          ? state
          : null
      } catch {
        return null
      }
    },
    save(state) {
      writeJsonAtomic(
        path,
        safeStorage.isEncryptionAvailable()
          ? { sealed: safeStorage.encryptString(JSON.stringify(state)).toString('base64') }
          : { plain: state },
      )
    },
  }
}
