import React from 'react'

/**
 * VEGA deposit figure, rendered at the right edge of the "AI models" account
 * group head inside AiModelPicker — muted text, no chrome. `title` carries the
 * full-precision balance (both currencies when the RUB conversion exists) —
 * the same string Settings › Account shows.
 */
export function AiDepositBadge({
  label,
  title,
}: {
  label: string
  title?: string | undefined
}): React.JSX.Element {
  return (
    <span className="ai-deposit-badge" title={title}>
      {label}
    </span>
  )
}
