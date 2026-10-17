import { useCallback, useEffect, useState } from 'react'
import type { AiSettings, GenSparkAccountStatus } from '@genoffice/ai-provider/browser'
import { aiModelPickerGroups } from './ai-model-picker-options'

/**
 * The AI surface a chat panel needs to decide "is anything usable at all":
 * the same bridge the model picker talks to, plus the optional auth push.
 */
export interface AiConnectionBridge {
  readonly getSettings: () => Promise<AiSettings>
  /** ai:gsk-status split bits (accountLoggedIn / gskUsable) — same contract as the model picker's bridge */
  readonly accountStatus?:
    | (() => Promise<GenSparkAccountStatus | null | undefined>)
    | undefined
  /** deprecated: any-credential boolean — used only when accountStatus is absent */
  readonly gskLoggedIn?: (() => Promise<boolean>) | undefined
  readonly onSettingsChanged?: ((handler: () => void) => () => void) | undefined
  /** pushed by main on every VEGA sign-in/out; refresh without waiting for focus */
  readonly onAuthChanged?:
    ((handler: (status: { loggedIn: boolean }) => void) => () => void) | undefined
}

/**
 * true once settings + sign-in resolve to NO usable chat provider: the user is
 * signed out of VEGA and no BYOK pick passes the same usability test the model
 * picker applies (`aiModelPickerGroups` is empty). Stays false while still
 * loading, so the panel never flashes the muted state on mount — and a missing
 * or throwing bridge (tests render panels without a preload) reads as connected
 * rather than locking the composer.
 */
export function useAiDisconnected(bridge: AiConnectionBridge): boolean {
  const [disconnected, setDisconnected] = useState(false)
  const refresh = useCallback(() => {
    Promise.resolve()
      .then(() => bridge.getSettings())
      .then(async (settings) => {
        const auth = await Promise.resolve()
          .then(async () => {
            const status = await bridge.accountStatus?.()
            if (status) return status
            const loggedIn = await bridge.gskLoggedIn?.()
            return { loggedIn: loggedIn ?? false }
          })
          .catch(() => ({ loggedIn: false }))
        return aiModelPickerGroups(settings, auth).length === 0
      })
      .then(setDisconnected, () => {})
  }, [bridge])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    let off: (() => void) | undefined
    let offAuth: (() => void) | undefined
    try {
      off = bridge.onSettingsChanged?.(refresh)
    } catch {
      /* a throwing settings push must not take the auth push down with it */
    }
    try {
      offAuth = bridge.onAuthChanged?.(refresh)
    } catch {
      /* symmetric — keep the settings unsubscribe that already succeeded */
    }
    return () => {
      window.removeEventListener('focus', refresh)
      off?.()
      offAuth?.()
    }
  }, [bridge, refresh])

  return disconnected
}
