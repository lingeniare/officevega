import { useEffect, useState } from 'react'
import type { LicenseActionResult, LicenseErrorCode, LicenseStatus } from '../../shared/license-api'
import type { StringKey, TFunc } from './locale'

const ERROR_KEYS: Record<LicenseErrorCode, StringKey> = {
  bad_request: 'licErrBadRequest',
  invalid_key: 'licErrInvalidKey',
  not_activated: 'licErrInvalidKey',
  expired: 'licErrExpired',
  device_limit: 'licErrDeviceLimit',
  rate_limited: 'licErrRateLimited',
  server_error: 'licErrServer',
  network: 'licErrNetwork',
  untrusted: 'licErrUntrusted',
}

const date = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'

/** Settings → Account: license key entry, state, sign-out. Without a license only VEGA is selectable. */
export function LicenseBlock({ t }: { t: TFunc }) {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<LicenseErrorCode | null>(null)
  const [retrySec, setRetrySec] = useState(0)

  useEffect(() => {
    let alive = true
    void window.aiOffice.getLicenseStatus().then((s) => alive && setStatus(s))
    const off = window.aiOffice.onLicenseChanged((s) => setStatus(s))
    return () => {
      alive = false
      off()
    }
  }, [])

  const run = (action: () => Promise<LicenseActionResult>, onOk?: () => void) => {
    setBusy(true)
    setError(null)
    void action()
      .then((r) => {
        if (r.ok) {
          setStatus(r.status)
          onOk?.()
        } else {
          setError(r.code)
          setRetrySec(r.retryAfterSec ?? 0)
        }
      })
      .catch(() => setError('network'))
      .finally(() => setBusy(false))
  }

  if (!status) return null
  const row = (label: string, value: string) => (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-label">{label}</div>
        <div className="set-field-value">{value}</div>
      </div>
    </div>
  )
  const errorText = error && (
    <div className="set-field-desc set-lic-error" role="alert">
      {t(ERROR_KEYS[error], { sec: String(retrySec) })}
      {error === 'device_limit' && (
        <>
          {' '}
          <button className="set-btn" onClick={() => void window.aiOffice.openLicenseDashboard()}>
            {t('licManage')}
          </button>
        </>
      )}
    </div>
  )

  return (
    <>
      <h3 className="set-pane-title set-lic-title">{t('licTitle')}</h3>
      {status.state === 'none' ? (
        <>
          <div className="set-field-desc set-ai-note">{t('licFreeNote')}</div>
          <form
            className="set-field"
            onSubmit={(e) => {
              e.preventDefault()
              if (key.trim()) run(() => window.aiOffice.activateLicense(key), () => setKey(''))
            }}
          >
            <input
              className="set-input set-lic-key"
              type="text"
              value={key}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              aria-label={t('licKey')}
              spellCheck={false}
              autoComplete="off"
              maxLength={40}
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="set-btn primary" type="submit" disabled={busy || !key.trim()}>
              {busy ? t('licActivating') : t('licActivate')}
            </button>
          </form>
          {errorText}
        </>
      ) : (
        <>
          {row(t('licStatus'), status.state === 'active' ? t('licActive') : t('licLapsed'))}
          {status.holderEmail && row(t('licHolder'), status.holderEmail)}
          {row(t('licExpires'), date(status.expiresAt))}
          {row(t('licOfflineUntil'), date(status.graceUntil))}
          {row(t('licKey'), `•••• ${status.keyHint}`)}
          {errorText}
          <div className="set-lic-actions">
            <button
              className="set-btn"
              disabled={busy}
              onClick={() => run(() => window.aiOffice.refreshLicense())}
            >
              {t('licRefresh')}
            </button>
            <button
              className="set-btn danger"
              disabled={busy}
              onClick={() => run(() => window.aiOffice.deactivateLicense())}
            >
              {t('licDeactivate')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
