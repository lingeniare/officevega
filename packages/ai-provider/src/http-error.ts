/**
 * Detail text for a non-OK HTTP response body. Real API errors (JSON/plain
 * text) are surfaced as-is, truncated. HTML bodies — an edge/WAF block page or
 * a login page served instead of an API response (e.g. Genspark's SPA shell on
 * a 403) — are replaced with a short readable note, since dumping raw markup
 * into the chat UI is useless to the user.
 */
export function httpBodyDetail(body: string): string {
  const pii = piiShieldError(body)
  if (pii) return pii.message
  const head = body.trimStart().slice(0, 30).toLowerCase()
  const isHtml = ['<!doctype', '<html', '<head', '<body'].some((tag) => head.startsWith(tag))
  if (isHtml) {
    return `the service returned a web page${describeBlockPage(body)} instead of an API response (likely a temporary network or gateway block) — check your connection and retry`
  }
  return body.slice(0, 500)
}

const PII_FALLBACK_MESSAGES: Record<string, string> = {
  pii_unavailable:
    'Защита персональных данных временно недоступна. Запрос не отправлен, повторите позже',
  pii_image_no_text: 'Изображение без текста нельзя отправить в режиме защиты ПДн',
  pii_attachment_not_allowed: 'Вложения этого типа не поддерживаются в режиме защиты ПДн',
  pii_too_large:
    'Слишком большой объём для обезличивания. Уменьшите документ или выделите фрагмент',
  pii_extract_failed: 'Не удалось прочитать файл',
}

/**
 * The VEGA gateway's PII-shield failure (`{error:{code,message,type:'pii_shield_error'}}`):
 * the request was NOT forwarded to a model. The gateway message is already
 * localized; a known code without one falls back to the table above.
 */
export function piiShieldError(body: string): { code: string; message: string } | null {
  if (!body.includes('pii_shield_error')) return null
  try {
    const err = (JSON.parse(body) as { error?: Record<string, unknown> } | null)?.error
    if (!err || err.type !== 'pii_shield_error') return null
    const code = typeof err.code === 'string' ? err.code : ''
    const message =
      (typeof err.message === 'string' && err.message) ||
      PII_FALLBACK_MESSAGES[code] ||
      'Запрос отклонён защитой персональных данных'
    return { code, message }
  } catch {
    return null
  }
}

/** page title plus Cloudflare's error code / Ray ID when present: enough to tell who blocked the call */
function describeBlockPage(body: string): string {
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1]?.replace(/\s+/g, ' ').trim()
  const code = /error code:?\s*(?:<[^>]+>\s*)*(\d{3,5})/i.exec(body)?.[1]
  const ray = /ray id:?\s*(?:<[^>]+>\s*)*([a-f0-9]{16})/i.exec(body)?.[1]
  const parts = [
    title && `"${title.slice(0, 60)}"`,
    code && `error code ${code}`,
    ray && `ray ${ray}`,
  ].filter(Boolean)
  return parts.length ? ` (${parts.join(', ')})` : ''
}
