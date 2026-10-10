import { useEffect, useRef } from 'react'
import { useDismissablePopover } from './popover-dismiss'

/** one row in the chat-history menu */
export interface AiHistoryItem {
  projectId: string
  chatId: string
  title: string
  preview: string
  fileName: string
  updatedAt: string
  /** the session currently open in the panel */
  current?: boolean
}

export interface AiHistoryMenuStrings {
  menuTitle: string
  searchPlaceholder: string
  empty: string
  loading: string
  newChat: string
  currentBadge: string
  /** shown when the provider is not VEGA: old entries stay visible, new ones are not saved */
  vegaOnlyNote: string
}

export interface AiHistoryMenuProps {
  open: boolean
  onClose: () => void
  items: AiHistoryItem[]
  loading: boolean
  query: string
  onQueryChange: (q: string) => void
  onSelect: (item: AiHistoryItem) => void
  onNewChat: () => void
  /** non-null while the provider is not VEGA */
  disabledReason?: string | null
  strings: AiHistoryMenuStrings
  /** label for the trigger button (aria + tooltip) */
  buttonLabel: string
  trigger: React.ReactNode
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  if (d.toDateString() === yesterday.toDateString()) return `вчера ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

/**
 * "История" menu for the AI panel header: a trigger button plus a popover
 * with search and titled chat sessions. Styling lives in ai-history-menu.css.
 * The parent owns the data (IPC list) and the open state anchor.
 */
export function AiHistoryMenu(props: AiHistoryMenuProps) {
  const { open, onClose } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  useDismissablePopover(open, onClose, {
    inside: () => [wrapRef.current, panelRef.current],
  })
  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  return (
    <div ref={wrapRef} className="ai-history-wrap">
      {props.trigger}
      {open && (
        <div ref={panelRef} className="ai-history-pop" role="dialog" aria-label={props.strings.menuTitle}>
          <div className="ai-history-head">
            <span className="ai-history-title">{props.strings.menuTitle}</span>
            <button className="ai-history-new" onClick={props.onNewChat}>
              {props.strings.newChat}
            </button>
          </div>
          <input
            ref={searchRef}
            className="ai-history-search"
            type="text"
            value={props.query}
            placeholder={props.strings.searchPlaceholder}
            onChange={(e) => props.onQueryChange(e.target.value)}
          />
          {props.disabledReason && <div className="ai-history-note">{props.strings.vegaOnlyNote}</div>}
          <div className="ai-history-list">
            {props.loading ? (
              <div className="ai-history-empty">{props.strings.loading}</div>
            ) : props.items.length === 0 ? (
              <div className="ai-history-empty">{props.strings.empty}</div>
            ) : (
              props.items.map((item) => (
                <button
                  key={`${item.projectId}:${item.chatId}`}
                  className={`ai-history-row${item.current ? ' ai-history-row-current' : ''}`}
                  onClick={() => props.onSelect(item)}
                >
                  <span className="ai-history-row-title">
                    {item.title}
                    {item.current && (
                      <span className="ai-history-current">{props.strings.currentBadge}</span>
                    )}
                  </span>
                  <span className="ai-history-row-meta">
                    {item.fileName} • {formatDate(item.updatedAt)}
                  </span>
                  {item.preview && <span className="ai-history-row-preview">{item.preview}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** clock-arrow trigger matching the .ai-header-btn look */
export function AiHistoryButton(props: { label: string; onClick: () => void }) {
  return (
    <button className="ai-header-btn" onClick={props.onClick} data-tip={props.label} aria-label={props.label}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2.5 8a5.5 5.5 0 1 1 1.61 3.89"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M2.5 12.5v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M8 5.5V8l2 1.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
