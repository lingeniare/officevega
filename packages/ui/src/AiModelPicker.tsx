import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '@genoffice/i18n'
import type {
  AiProviderId,
  AiSettings,
  ModelFilter,
  ProviderModelCatalog,
} from '@genoffice/ai-provider/browser'
import {
  aiModelPickerGroups,
  aiModelPickerSelection,
  healVegaModelSelection,
  withAiModelSelection,
  type AiModelPickerSelection,
} from './ai-model-picker-options'
import { ProviderLogo } from './provider-logos'
import { useDismissablePopover } from './popover-dismiss'
import { AI_MODEL_PICKER_STRINGS } from './strings-ai-model-picker'
import { AiDepositBadge } from './AiDepositBadge'
import type { VegaDepositBadgeData } from './vega-deposit'

/**
 * Same live-catalog filter the AI Model settings pane applies: text-out
 * models only, no image generators, `~` aliases or `:free`/`:batch`
 * duplicates — so the chip's popover lists the same ids as Settings › AI Model.
 */
const CHAT_MODEL_FILTER = {
  output: 'text',
  excludeOutput: ['image'],
  excludePrefixes: ['~'],
  excludeSuffixes: [':free', 'latest', 'meta', ':batch'],
} as const

/** Each app's preload exposes these under its own namespace; the panel adapts them. */
export interface AiModelPickerBridge {
  readonly getSettings: () => Promise<AiSettings>
  readonly setSettings: (settings: AiSettings) => Promise<void>
  /** fires after any renderer (this one, another tab, the shell settings page) saved ai-settings.json */
  readonly onSettingsChanged?: ((handler: () => void) => () => void) | undefined
  readonly gskLoggedIn?: (() => Promise<boolean>) | undefined
  /** shell: switch to Home and open Settings › AI Model */
  readonly openModelSettings?: (() => Promise<void> | void) | undefined
  /**
   * live {base}/models catalog for liveCatalog providers (VEGA, OpenRouter) —
   * feeds display names while the row value stays the model id; absent = ids only
   */
  readonly getProviderModels?:
    | ((
        input: ModelFilter & {
          provider: AiProviderId
          apiKey?: string
          baseUrl?: string
        },
      ) => Promise<ProviderModelCatalog>)
    | undefined
}

/**
 * Composer footer chip showing the active provider + model; the popover lists
 * every usable provider's models for a one-click switch (saved globally, the
 * same ai-settings.json the settings page edits) and ends with a row that
 * opens that page for keys and new vendors.
 */
export function AiModelPicker({
  bridge,
  lang,
  deposit,
}: {
  readonly bridge: AiModelPickerBridge
  readonly lang: Lang
  /** VEGA deposit (from useVegaDeposit) — shown at the right edge of the "AI models" account group head */
  readonly deposit?: VegaDepositBadgeData | null | undefined
}): React.JSX.Element | null {
  const strings = AI_MODEL_PICKER_STRINGS[lang] ?? AI_MODEL_PICKER_STRINGS.en
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [open, setOpen] = useState(false)
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({})
  const chipRef = useRef<HTMLButtonElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)

  // tests render panels without a preload bridge: a throwing getter must not take the panel down
  const refresh = useCallback(() => {
    Promise.resolve()
      .then(() => bridge.getSettings())
      .then(setSettings, () => {})
    Promise.resolve()
      .then(() => bridge.gskLoggedIn?.() ?? false)
      .then(setLoggedIn, () => {})
  }, [bridge])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    let off: (() => void) | undefined
    try {
      off = bridge.onSettingsChanged?.(refresh)
    } catch {
      off = undefined
    }
    return () => {
      window.removeEventListener('focus', refresh)
      off?.()
    }
  }, [bridge, refresh])

  const close = useCallback(() => setOpen(false), [])
  useDismissablePopover(open, close, {
    inside: () => [chipRef.current, popRef.current],
  })

  const groups = useMemo(
    () => (settings ? aiModelPickerGroups(settings, loggedIn) : []),
    [settings, loggedIn],
  )
  const current = settings ? aiModelPickerSelection(settings) : null
  const sameGroup = (g: { id: string; endpoint?: string | undefined }) =>
    g.id === current?.provider && (g.id !== 'custom' || g.endpoint === current?.endpoint)
  const currentGroup = groups.find(sameGroup)
  const currentUsable = !!currentGroup

  /** live catalog: full model ids + display names, keyed by `provider[:endpoint]` (fetched once per key/url pair) */
  const [liveNames, setLiveNames] = useState<Record<string, Record<string, string>>>({})
  const [liveIds, setLiveIds] = useState<Record<string, readonly string[]>>({})
  const catalogKeysRef = useRef<Record<string, string>>({})
  /** freshest settings snapshot — the catalog reply heals against it, not the stale render closure */
  const settingsRef = useRef<AiSettings | null>(null)
  settingsRef.current = settings
  useEffect(() => {
    const getModels = bridge.getProviderModels
    if (!settings || !getModels) return
    let alive = true
    for (const g of groups) {
      // liveCatalog providers (VEGA, OpenRouter) and every saved custom
      // endpoint expose GET {base}/models — the same probe the settings pane runs
      if (!g.liveCatalog && !g.endpoint) continue
      const key = `${g.id}:${g.endpoint ?? ''}`
      const config = g.endpoint
        ? settings.customEndpoints?.find((e) => e.id === g.endpoint)
        : settings.providers?.[g.id]
      const credKey = `${config?.apiKey ?? ''}|${config?.baseUrl ?? ''}`
      if (catalogKeysRef.current[key] === credKey) continue
      // Promise.resolve().then: a sync-throwing stub (panel-less test pages)
      // must not take the picker down — it just keeps showing ids
      void Promise.resolve()
        .then(() =>
          getModels({
            provider: g.id,
            apiKey: config?.apiKey ?? '',
            baseUrl: config?.baseUrl ?? '',
            // the chat filter needs the modality metadata only gateway catalogs
            // carry — a custom endpoint's bare ids list would filter to nothing
            ...(g.liveCatalog ? CHAT_MODEL_FILTER : {}),
          }),
        )
        .then((cat) => {
          // mark fetched only on a non-empty answer: a catalog probed before
          // sign-in / while the gateway was down must retry on the next
          // settings refresh, not stay a one-row list for the window's life
          if (!cat?.models?.length) return
          catalogKeysRef.current[key] = credKey
          // VEGA's catalog is the account's allowlist: a stored id missing from
          // it (picked off the anonymous public catalog pre-sign-in, or
          // hand-edited) can't be served — heal the selection to the default
          if (g.id === 'vega') {
            const healed = healVegaModelSelection(
              settingsRef.current ?? ({} as AiSettings),
              cat.models.map((m) => m.id),
            )
            if (healed) {
              setSettings(healed)
              void bridge.setSettings(healed).catch(() => {})
            }
          }
          if (!alive) return
          setLiveNames((prev) => ({
            ...prev,
            [key]: Object.fromEntries(cat.models.map((m) => [m.id, m.name])),
          }))
          setLiveIds((prev) => ({ ...prev, [key]: cat.models.map((m) => m.id) }))
        })
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [bridge, settings, groups])

  /** catalog name when one was fetched (or the provider ships a static map), else the bare id */
  const displayOf = (
    g: { id: AiProviderId; endpoint?: string | undefined },
    staticNames: Readonly<Record<string, string>> | undefined,
    id: string,
  ) => liveNames[`${g.id}:${g.endpoint ?? ''}`]?.[id] ?? staticNames?.[id] ?? id

  const toggle = () => {
    if (!open) {
      const rect = chipRef.current?.getBoundingClientRect()
      // the composer sits at the panel bottom: open upwards, pinned to the chip
      if (rect) setPopStyle({ left: rect.left, bottom: window.innerHeight - rect.top + 6 })
    }
    setOpen((v) => !v)
  }

  const pick = (sel: AiModelPickerSelection) => {
    setOpen(false)
    if (!settings) return
    const next = withAiModelSelection(settings, sel)
    setSettings(next)
    void bridge.setSettings(next).catch(() => {})
  }

  const manage = () => {
    setOpen(false)
    void bridge.openModelSettings?.()
  }

  /** live list when fetched (stored/default ids pinned on top, like the settings pane), else the static list */
  const modelsOf = (g: (typeof groups)[number]) => {
    const live = g.liveCatalog || g.endpoint ? liveIds[`${g.id}:${g.endpoint ?? ''}`] : undefined
    return live?.length
      ? [...(g.pinned ?? []).filter((p) => !live.includes(p)), ...live]
      : g.models
  }

  if (!settings) return null
  const chipText =
    currentUsable && current
      ? displayOf(
          { id: current.provider, endpoint: current.endpoint },
          currentGroup?.names,
          current.model,
        ) ||
        (currentGroup?.label ?? '')
      : strings.choose

  return (
    <div
      className="ai-model-picker"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          chipRef.current?.focus()
        }
      }}
    >
      <button
        ref={chipRef}
        type="button"
        className={`ai-model-chip${open ? ' open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-tip={strings.title}
        aria-label={`${strings.title}: ${chipText}`}
      >
        {currentUsable && current && <ProviderLogo id={current.provider} />}
        <span className="ai-model-chip-text">{chipText}</span>
        <svg className="ai-model-chip-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path
            d="M2 6.5 5 3.5l3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={popRef}
          className="ai-model-pop"
          role="listbox"
          aria-label={strings.title}
          style={popStyle}
        >
          <div className="ai-model-pop-list">
            {groups.map((g) => (
              <div key={g.endpoint ? `${g.id}:${g.endpoint}` : g.id} className="ai-model-group">
                <div className="ai-model-group-head">
                  <ProviderLogo id={g.id} />
                  <span>{g.account ? strings.aiModels : g.label}</span>
                  {g.account && g.id === 'vega' && deposit && (
                    <AiDepositBadge label={deposit.label} title={deposit.title} />
                  )}
                </div>
                {(() => {
                  const listed = modelsOf(g)
                  return (listed.length > 0 ? listed : ['']).map((m) => {
                    const selected = sameGroup(g) && current?.model === m
                    return (
                      <button
                        key={`${g.id}:${g.endpoint ?? ''}:${m}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`ai-model-item${selected ? ' selected' : ''}`}
                        onClick={() => pick({ provider: g.id, endpoint: g.endpoint, model: m })}
                      >
                        <span className="ai-model-item-text">
                          {m ? displayOf(g, g.names, m) : g.label}
                        </span>
                        {selected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                            <path
                              d="M2.5 6.5 5 9l4.5-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    )
                  })
                })()}
              </div>
            ))}
          </div>
          {bridge.openModelSettings && (
            <button type="button" className="ai-model-item ai-model-manage" onClick={manage}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
              <span className="ai-model-item-text">{strings.manage}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
