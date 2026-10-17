import React from 'react'

/**
 * The signed-out call-to-action docked under the empty-state starter list:
 * one quiet line plus the same accent "Connect AI" button the failed-run
 * bubble uses (.ai-login-btn). Rendered only while useAiDisconnected holds.
 */
export function AiConnectPrompt({
  text,
  label,
  tip,
  onConnect,
}: {
  /** "Connect VEGA AI or your own AI provider…" — the muted explanation line */
  readonly text: string
  /** button label ("Connect AI") */
  readonly label: string
  /** hover tooltip + aria-label ("Sign in with VEGA") */
  readonly tip: string
  readonly onConnect: () => void
}): React.JSX.Element {
  return (
    <div className="ai-connect">
      <div className="ai-connect-text">{text}</div>
      <button
        type="button"
        className="ai-login-btn"
        onClick={onConnect}
        data-tip={tip}
        aria-label={tip}
      >
        {label}
      </button>
    </div>
  )
}
