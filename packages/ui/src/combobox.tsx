/**
 * Editable combobox for large catalogs: the field shows the picked option's
 * label (falling back to the raw value), the caret opens a popover listing
 * every option — a native <datalist> would hide options not containing the
 * typed text — and a search row inside narrows it by label or id. Typed text
 * not on the list is kept as-is on commit, so catalogs too big to browse stay
 * searchable without losing free-form entry.
 *
 * Reuses the gs-dd popover/item styling from dropdown.css plus the .gs-combo*
 * rules there; apps size the control via `className` on the wrapper.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDismissablePopover } from './popover-dismiss'

export interface ComboBoxOption {
  readonly value: string
  readonly label: string
}

export function ComboBox({
  value,
  options,
  onChange,
  className,
  inputClassName,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  id,
}: {
  readonly value: string
  readonly options: ReadonlyArray<string | ComboBoxOption>
  readonly onChange: (value: string) => void
  /** Extra class on the wrapper (apps set width there). */
  readonly className?: string
  /** Extra class on the input (apps match their text-field look). */
  readonly inputClassName?: string
  readonly placeholder?: string
  /** Placeholder of the popover's search row; the row is omitted without it. */
  readonly searchPlaceholder?: string
  readonly ariaLabel?: string
  readonly id?: string
}): React.JSX.Element {
  const opts = useMemo<ComboBoxOption[]>(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  )
  const [open, setOpen] = useState(false)
  /** non-null while the user edits the field: the input shows the raw value, idle shows the label */
  const [draft, setDraft] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)
  const [focusSearch, setFocusSearch] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  /** pick() refocuses the input, which fires onFocus before the new value
   * reaches props — that event must not re-enter edit mode with a stale label */
  const justPicked = useRef(false)
  const listId = `${id ?? 'gs-combo'}-list`
  const close = () => {
    setOpen(false)
    setSearch('')
  }
  useDismissablePopover(open, close, { inside: () => [wrapRef.current] })

  const shown = search
    ? opts.filter((o) => {
        const q = search.toLowerCase()
        return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
      })
    : opts
  const ai = shown.length ? Math.min(active, shown.length - 1) : 0
  useEffect(() => {
    if (!open) return
    popRef.current?.querySelectorAll('.gs-dd-item')[ai]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, ai])
  useEffect(() => {
    if (open && focusSearch) {
      searchRef.current?.focus()
      setFocusSearch(false)
    }
  }, [open, focusSearch])

  const labelOf = (v: string) => opts.find((o) => o.value === v)?.label ?? v
  const openList = (toSearch: boolean) => {
    setSearch('')
    const i = opts.findIndex((o) => o.value === value)
    setActive(i < 0 ? 0 : i)
    setFocusSearch(toSearch)
    setOpen(true)
  }
  const pick = (o: ComboBoxOption) => {
    onChange(o.value)
    setDraft(null)
    close()
    justPicked.current = true
    inputRef.current?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openList(true)
      }
      return
    }
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') setActive((i) => Math.min(shown.length - 1, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(shown.length - 1)
    else if (e.key === 'Enter') {
      const o = shown[ai]
      if (o) pick(o)
      else close()
    } else return
    e.preventDefault()
    // handled keys stay ours while the list is open: a bubbling Escape would
    // close the hosting modal, bubbling arrows would nudge canvas elements
    e.stopPropagation()
  }
  return (
    <span ref={wrapRef} className={`gs-dd gs-combo${className ? ` ${className}` : ''}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown.length ? `${listId}-${ai}` : undefined}
        aria-label={ariaLabel}
        className={`gs-combo-input${inputClassName ? ` ${inputClassName}` : ''}`}
        value={draft ?? labelOf(value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => {
          if (justPicked.current) {
            justPicked.current = false
            return
          }
          setDraft(labelOf(value))
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setDraft(e.target.value)
          setSearch(e.target.value)
          setActive(0)
          if (!open) setOpen(true)
        }}
        onBlur={(e) => {
          if (wrapRef.current?.contains(e.relatedTarget as Node)) return
          // focus left the combobox: a typed label/id match commits the option,
          // anything else stays as the free-typed value
          if (draft !== null) {
            const d = draft.trim().toLowerCase()
            const hit = opts.find((o) => o.value.toLowerCase() === d || o.label.toLowerCase() === d)
            if (hit) onChange(hit.value)
            setDraft(null)
          }
          close()
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="gs-dd-caret gs-combo-toggle"
        tabIndex={-1}
        aria-hidden="true"
        // menu-button pattern: the caret never takes focus from the input
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? close() : openList(true))}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M5.5 9.25 12 15.75l6.5-6.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div ref={popRef} className="gs-dd-pop gs-combo-pop">
          {searchPlaceholder !== undefined && (
            <input
              ref={searchRef}
              type="text"
              className="gs-combo-search"
              value={search}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setSearch(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
            />
          )}
          <div id={listId} role="listbox" className="gs-combo-list">
            {shown.map((o, i) => (
              <button
                key={o.value}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={o.value === value}
                data-value={o.value}
                title={o.label}
                className={`gs-dd-item${o.value === value ? ' selected' : ''}${i === ai ? ' active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                <span className="gs-combo-label">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}
