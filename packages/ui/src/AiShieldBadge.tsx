import React from 'react'

const SHIELD_TEXT: Record<string, string> = {
  ru: 'Персональные данные документов и файлов анонимизируются через сервис ВЕГА перед отправкой в LLM. Промпты (ваши запросы) — нет. Не указывайте в промпте персональную информацию',
  en: 'Personal data in documents and files is anonymized via the VEGA service before being sent to the LLM. Prompts (your requests) are not. Do not include personal information in your prompt',
  zh: '文档和文件中的个人数据在发送至 LLM 前会经由 VEGA 服务进行匿名化处理。提示词（您的请求）不会。请勿在提示词中填写个人信息',
}

function shieldText(): string {
  const lang = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en'
  return SHIELD_TEXT[lang.toLowerCase().split('-')[0]!] ?? SHIELD_TEXT.en!
}

/** Static privacy indicator for the AI composer: not a toggle — VEGA anonymizes
 *  PII server-side, so callers render it only while the effective provider is VEGA. */
export function AiShieldBadge(): React.JSX.Element {
  const text = shieldText()
  return (
    <span className="ai-shield-badge" title={text} aria-label={text} role="img">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  )
}
