import React from 'react'

const SHIELD_TEXT: Record<string, string> = {
  ru: 'Персональные данные документов и файлов обезличиваются в сервисе ВЕГА, для соответствия ФЗ-152',
  en: 'Personal data in your documents and files is anonymized by the VEGA service (Russian Federal Law No. 152-FZ)',
  zh: '文档和文件中的个人数据将由 VEGA 服务进行匿名化处理（符合俄罗斯联邦法 152-FZ）',
}

function shieldText(): string {
  const lang = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en'
  return SHIELD_TEXT[lang.toLowerCase().split('-')[0]!] ?? SHIELD_TEXT.en!
}

/** Static privacy indicator for the AI composer: not a toggle, the shield is always on server-side. */
export function AiShieldBadge(): React.JSX.Element {
  const text = shieldText()
  return (
    <div className="ai-shield-row">
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
    </div>
  )
}
