import { useEffect, useRef, useState } from 'react'
import type { GenSparkAccountStatus } from '@genoffice/ai-provider'

/** What the deposit badge renders; `title` is the full-precision tooltip */
export interface VegaDepositBadgeData {
  label: string
  title: string
}

/**
 * Deposit label for the AI panel header badge. RU/TT locales show whole rubles
 * ("14 561 ₽"), every other locale whole dollars ("156 $"); the title keeps
 * the exact Settings › Account precision ("14 561,22 ₽ (156,00 $)").
 * null when no deposit figure is available.
 */
export function formatVegaDeposit(
  status: Partial<GenSparkAccountStatus> | null | undefined,
  lang: string,
): VegaDepositBadgeData | null {
  const balance = status?.balance
  if (balance === undefined || !Number.isFinite(balance)) return null
  const rub = lang === 'ru' || lang === 'tt'
  const fmt = (n: number, digits: number, locale: string) =>
    n.toLocaleString(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  const currency =
    status?.currency === undefined || status.currency === 'USD' ? '$' : status.currency
  const usd = `${fmt(balance, 2, rub ? 'ru-RU' : 'en-US')} ${currency}`
  if (rub) {
    const rubValue = status?.balanceRub
    if (rubValue === undefined || !Number.isFinite(rubValue)) {
      // no RUB conversion — show the dollar figure like Settings › Account does
      return { label: `${fmt(Math.round(balance), 0, 'en-US')} ${currency}`, title: usd }
    }
    return {
      label: `${fmt(Math.round(rubValue), 0, 'ru-RU')} ₽`,
      title: `${fmt(rubValue, 2, 'ru-RU')} ₽ (${usd})`,
    }
  }
  return { label: `${fmt(Math.round(balance), 0, 'en-US')} ${currency}`, title: usd }
}

/**
 * VEGA deposit for the AI model picker. `enabled` gates both the fetch and
 * the badge (callers pass provider === 'vega'); `fetchStatus` is the app's
 * account-status bridge (called with details so the deposit fields come back).
 * Refetches on mount, on window focus, and whenever `refreshKey` changes —
 * callers pass `busy` so the figure updates after each agent run.
 */
export function useVegaDeposit(
  enabled: boolean,
  lang: string,
  fetchStatus: () => Promise<GenSparkAccountStatus | null | undefined>,
  refreshKey?: unknown,
): VegaDepositBadgeData | null {
  const [status, setStatus] = useState<GenSparkAccountStatus | null>(null)
  // callers pass an inline arrow (fresh identity per render); keep it in a ref
  // so it can't retrigger the fetch effect
  const fetchRef = useRef(fetchStatus)
  fetchRef.current = fetchStatus
  useEffect(() => {
    if (!enabled) {
      setStatus(null)
      return
    }
    let alive = true
    const refresh = () => {
      void fetchRef
        .current()
        .then((s) => {
          if (alive) setStatus(s ?? null)
        })
        .catch(() => {})
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      alive = false
      window.removeEventListener('focus', refresh)
    }
    // refreshKey is intentionally opaque (e.g. `busy`) — any change refetches
  }, [enabled, refreshKey])
  return enabled ? formatVegaDeposit(status, lang) : null
}
