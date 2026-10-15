import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AI_CUSTOM_FONT_MAX_PX,
  AI_CUSTOM_FONT_MIN_PX,
  ComboBox,
  DEFAULT_AI_PANEL_PREFS,
  Dropdown,
  IconCrown,
  aiPanelFontPx,
  clampAiCustomFontSize,
  healVegaModelSelection,
  UI_SCALE_PRESETS,
  uiScalePercent,
} from '@genoffice/ui'
import type { AiFontSize, AiPanelPrefs, AiPanelSide } from '@genoffice/ui'
import type { DecisionEndpoint, DefaultAppStatus, FileSearchSettings } from '../../shared/home-api'
import type { UpdateUiState } from '../../shared/update-api'
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  activeCustomEndpoint,
  clampMaxOutputTokens,
  customEndpointLabel,
  newCustomEndpointId,
  removeCustomEndpoint,
  selectCustomEndpoint,
  upsertCustomEndpoint,
  AI_CUSTOM_PROTOCOLS,
} from '@genoffice/ai-provider/browser'
import type {
  AiCustomCompat,
  AiCustomEndpoint,
  AiCustomModelProfile,
  AiCustomProtocol,
  AiMediaProviderId,
  AiMediaProviderMeta,
  AiMediaSettings,
  AiProviderId,
  AiSearchProviderMeta,
  AiSearchSettings,
  AiSettings,
  ProviderModel,
} from '@genoffice/ai-provider'
import { useI18n } from './locale'
import type { StringKey, TFunc } from './locale'
import type {
  AccountStatus,
  AiCatalogEntry,
  DocTheme,
  UiDesign,
  UiTheme,
} from '../../shared/home-api'
import { LicenseBlock } from './LicenseBlock'
import { ProviderLogo } from './provider-logos'
import { IntegrationsPane, skillUpdateDue } from './IntegrationsPane'
import { SHOW_FAST_MODEL } from './featureFlags'
import './settings.css'

// ── Settings modal (opened from the account menu) ─────────
// Two-pane dialog: section nav on the left, fields on the right.
// All values go through the existing home IPC; nothing is stored locally.

// sorted by ISO 639 language code — native-script labels have no natural
// shared alphabet, so the code is the ordering key
const LANG_OPTIONS = [
  { value: 'az', label: 'Azərbaycanca' },
  { value: 'en', label: 'English' },
  { value: 'ka', label: 'ქართული' },
  { value: 'kk', label: 'Қазақша' },
  { value: 'ky', label: 'Кыргызча' },
  { value: 'ru', label: 'Русский' },
  { value: 'tk', label: 'Türkmençe' },
  { value: 'tt', label: 'Татарча' },
  { value: 'uz', label: 'Oʻzbekcha' },
] as const

// GenMail's option order: follow-system first, then the manual picks
const THEME_OPTIONS = [
  { value: 'system', labelKey: 'themeSystem' },
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
] as const satisfies readonly { value: UiTheme; labelKey: StringKey }[]

const DESIGN_OPTIONS = [
  { value: 'digital', labelKey: 'designDigital' },
  { value: 'retro', labelKey: 'designRetro' },
  { value: 'standard', labelKey: 'designStandard' },
] as const satisfies readonly { value: UiDesign; labelKey: StringKey }[]

// Document page theme (#1811): the canvas/paper preference the editors follow;
// 'follow' keeps the pre-existing behavior of riding the UI theme
const DOC_THEME_OPTIONS = [
  { value: 'follow', labelKey: 'docThemeFollowApp' },
  { value: 'light', labelKey: 'themeLight' },
  { value: 'eyecare', labelKey: 'docThemeEyeCare' },
  { value: 'dark', labelKey: 'themeDark' },
] as const satisfies readonly { value: DocTheme; labelKey: StringKey }[]

const AI_FONT_SIZE_OPTIONS = [
  { value: 'default', labelKey: 'aiFontSizeDefault' },
  { value: 'large', labelKey: 'aiFontSizeLarge' },
  { value: 'xlarge', labelKey: 'aiFontSizeXLarge' },
  { value: 'custom', labelKey: 'aiFontSizeCustom' },
] as const satisfies readonly { value: AiFontSize; labelKey: StringKey }[]

const CHANNEL_OPTIONS = [
  { value: 'stable', labelKey: 'channelStable' },
  { value: 'beta', labelKey: 'channelBeta' },
] as const satisfies readonly { value: 'stable' | 'beta'; labelKey: StringKey }[]

/** px stepper for the custom AI panel text size; in-range values apply live,
 * out-of-range or partial input is clamped on blur */
function CustomFontSizeInput({
  value,
  label,
  onCommit,
}: {
  value: number
  label: string
  onCommit: (px: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const shown = editing ? draft : String(value)
  const commit = (raw: string) => {
    const px = clampAiCustomFontSize(raw)
    if (px !== null && px !== value) onCommit(px)
  }
  return (
    <label className="set-num">
      <input
        type="number"
        className="set-input set-num-input"
        aria-label={label}
        min={AI_CUSTOM_FONT_MIN_PX}
        max={AI_CUSTOM_FONT_MAX_PX}
        step={1}
        value={shown}
        onFocus={() => {
          setDraft(String(value))
          setEditing(true)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = Number(e.target.value)
          if (Number.isInteger(n) && n >= AI_CUSTOM_FONT_MIN_PX && n <= AI_CUSTOM_FONT_MAX_PX) {
            onCommit(n)
          }
        }}
        onBlur={() => {
          commit(draft)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <span className="set-num-unit">px</span>
    </label>
  )
}

export type SectionId = 'account' | 'aiModel' | 'aiMedia' | 'general' | 'integrations' | 'about'

const SECTIONS: readonly { id: SectionId; labelKey: StringKey }[] = [
  { id: 'account', labelKey: 'setSecAccount' },
  { id: 'aiModel', labelKey: 'setSecAiModel' },
  { id: 'aiMedia', labelKey: 'setSecAiMedia' },
  { id: 'general', labelKey: 'setSecGeneral' },
  { id: 'integrations', labelKey: 'setSecIntegrations' },
  { id: 'about', labelKey: 'setSecAbout' },
]

function SectionIcon({ id }: { id: SectionId }) {
  if (id === 'aiModel') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.8 9.5 6l4.2 1.5L9.5 9 8 13.2 6.5 9 2.3 7.5 6.5 6 8 1.8Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M12.8 11.2v3M11.3 12.7h3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'aiMedia') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2.5 11.5 6 8l2.5 2.5L10.5 9l3 2.8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="6" r="1.1" fill="currentColor" />
      </svg>
    )
  }
  if (id === 'account') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.2" r="2.9" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2.7 13.6a5.5 5.5 0 0 1 10.6 0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'integrations') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5.5 2v3M10.5 2v3M4 5h8v2.5a4 4 0 0 1-8 0V5ZM8 11.5V14"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (id === 'general') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 5h8M13 5h1M2 11h1M6 11h8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="11.5" cy="5" r="1.7" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="4.5" cy="11" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.4v3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.8" fill="currentColor" />
    </svg>
  )
}

/** label-over-value field row with an optional right-aligned action */
function Field({
  label,
  value,
  valueTitle,
  action,
}: {
  label: string
  value: string
  valueTitle?: string
  action?: ReactNode
}) {
  return (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-label">{label}</div>
        <div className="set-field-value" data-tip={valueTitle}>
          {value}
        </div>
      </div>
      {action}
    </div>
  )
}

/**
 * Long enough that typing an address does not fire a request per keystroke,
 * short enough that the picker is populated by the time the eye reaches it.
 */
const CUSTOM_MODELS_DEBOUNCE_MS = 400

/** replace one catalog entry's model list, leaving every other entry untouched */
function foldModels(providerId: string, models: string[]) {
  return (current: AiCatalogEntry[]): AiCatalogEntry[] =>
    current.map((entry) =>
      entry.id === providerId ? { ...entry, models, defaultModel: '' } : entry,
    )
}

/** AI model pane: provider / model / key / base URL, saved to userData/ai-settings.json */
// ai:get-settings reports the *effective* provider (a half-configured BYOK pick
// falls back to genspark); the picker must show the stored choice so a save
// can't clobber it
const storedPick = (s: AiSettings): AiSettings =>
  s.storedProvider ? { ...s, provider: s.storedProvider, storedProvider: undefined } : s

const AI_SETTINGS_AUTOSAVE_MS = 600

/**
 * Debounced autosave for the AI panes — there is no Save button: each mutation
 * of `settings` is written to ai-settings.json ~600 ms after the last change,
 * and unmounting the pane (switching sections or closing the dialog) flushes
 * the pending tail so no edit is lost. `confirmLoaded` must be called with the
 * freshly-read snapshot so the initial get-settings load doesn't echo back as
 * a write. `saved`/`saveError` feed the footer's status pill.
 */
function useAiSettingsAutosave(
  settings: AiSettings | null,
  /** last-pass transform applied only to the payload sent to the main process
      (acknowledgement bookkeeping still tracks the untransformed snapshot) */
  beforePersist?: (s: AiSettings) => AiSettings,
) {
  /** last snapshot the main process holds — the load or an acknowledged write */
  const confirmed = useRef<AiSettings | null>(null)
  const latest = useRef<AiSettings | null>(null)
  /** edits the main process hasn't acknowledged — external-change reloads must not clobber them */
  const pendingRef = useRef(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    latest.current = settings
    pendingRef.current = !!settings && settings !== confirmed.current
    if (!settings || settings === confirmed.current) return
    const timer = setTimeout(() => {
      const snapshot = settings
      window.aiOffice
        .setAiSettings?.(beforePersist?.(snapshot) ?? snapshot)
        .then(() => {
          confirmed.current = snapshot
          pendingRef.current = latest.current !== snapshot
          setSaveError(null)
          // 'Saved' only when the acknowledged write covers the newest edits
          if (latest.current === snapshot) setSaved(true)
        })
        .catch((error) => {
          setSaveError(error instanceof Error ? error.message : String(error))
        })
    }, AI_SETTINGS_AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [settings])

  useEffect(
    () => () => {
      const s = latest.current
      if (s && s !== confirmed.current)
        void window.aiOffice.setAiSettings?.(beforePersist?.(s) ?? s).catch(() => {})
    },
    [],
  )

  const confirmLoaded = useCallback((s: AiSettings) => {
    confirmed.current = s
    pendingRef.current = latest.current !== s
  }, [])
  const clearFeedback = useCallback(() => {
    setSaved(false)
    setSaveError(null)
  }, [])

  return { confirmLoaded, saved, saveError, clearFeedback, pendingRef }
}

/**
 * Chat-model picker filter for the live catalog (VEGA, OpenRouter): text-out
 * models, minus free and batch duplicates (`:free`/`:batch`), `-latest`
 * aliases (`~`-prefixed on VEGA), `*-meta` ids and image generators — their
 * `output_modalities` carry `text` alongside `image` (gemini-*-image,
 * gpt-*-image, openrouter/auto), so `output:'text'` alone lets them in.
 * The default/stored ids are pinned back on top when the filter hides them.
 */
const CHAT_MODEL_FILTER = {
  output: 'text',
  excludeOutput: ['image'],
  excludePrefixes: ['~'],
  excludeSuffixes: [':free', 'latest', 'meta', ':batch'],
} as const

/**
 * Image-generation picker filter for the VEGA live catalog: models that accept
 * image input and emit image output (image-to-image / editing), minus '~'
 * alias rows and ':free' duplicates — same exclusions as the chat picker.
 */
const VEGA_IMAGE_MODEL_FILTER = {
  input: 'image',
  output: 'image',
  excludePrefixes: ['~'],
  excludeSuffixes: [':free'],
} as const

/** the model-pricing page every setAiVegaNote translation points at */
const AIMODELS_NOTE_URL = 'api.vega.chat/aimodels'

/**
 * Wrap the api.vega.chat/aimodels mention inside a note with a real link that
 * opens in the system browser (window.open is denied in this renderer).
 */
function noteWithLink(note: string): ReactNode {
  const at = note.indexOf(AIMODELS_NOTE_URL)
  if (at < 0) return note
  return (
    <>
      {note.slice(0, at)}
      <button
        type="button"
        className="set-text-link"
        onClick={() => void window.aiOffice.openAiModels?.()}
      >
        {AIMODELS_NOTE_URL}
      </button>
      {note.slice(at + AIMODELS_NOTE_URL.length)}
    </>
  )
}

/** crown marker after a license-gated option's label; the tip explains the lock */
function LicenseCrown({ tip }: { tip: string }) {
  return (
    <span className="set-lic-crown" title={tip}>
      <IconCrown size={12} />
    </span>
  )
}

function AiModelPane({
  t,
  account,
}: {
  t: TFunc
  /** VEGA sign-in state (the flow itself lives on the Account pane) */
  account: {
    loggedIn: boolean
    email: string
  }
}) {
  const [catalog, setCatalog] = useState<AiCatalogEntry[]>(
    () => window.aiOffice.getAiProviders?.() ?? [],
  )
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const { confirmLoaded, saved, saveError, clearFeedback, pendingRef } =
    useAiSettingsAutosave(settings, withProbedCache)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  /** free-typed value of the output-cap field; committed (and clamped) on blur */
  const [maxTokensDraft, setMaxTokensDraft] = useState<string | null>(null)
  /** without a license only the VEGA provider is selectable */
  const [licensed, setLicensed] = useState(false)
  useEffect(() => {
    void window.aiOffice.getLicenseStatus().then((s) => setLicensed(s.licensed))
    return window.aiOffice.onLicenseChanged((s) => setLicensed(s.licensed))
  }, [])

  const refreshCodexModels = useCallback(async (cliPath = '', selectedModel = '') => {
    if (!window.aiOffice.getCodexModels) return
    const live = await window.aiOffice.getCodexModels(cliPath)
    setCatalog((current) =>
      current.map((entry) => {
        if (entry.id !== 'codex') return entry
        const models =
          selectedModel && !live.models.includes(selectedModel)
            ? [selectedModel, ...live.models]
            : live.models
        return { ...entry, models, defaultModel: live.defaultModel }
      }),
    )
  }, [])

  /** live-catalog providers (VEGA, OpenRouter): pull {base}/models filtered to text output */
  const refreshLiveModels = useCallback(
    async (id: AiProviderId, apiKey = '', baseUrl = '', selectedModel = '') => {
      if (!window.aiOffice.getProviderModels) return
      const live = await window.aiOffice.getProviderModels({
        provider: id,
        apiKey,
        baseUrl,
        ...CHAT_MODEL_FILTER,
      })
      // VEGA's catalog is the account's allowlist: a stored id missing from it
      // (picked off the anonymous public catalog pre-sign-in) can't be served —
      // heal the selection to the provider default; the autosave persists it
      if (id === 'vega' && live.models.length) {
        const ids = live.models.map((m) => m.id)
        setSettings((current) =>
          current ? (healVegaModelSelection(current, ids) ?? current) : current,
        )
      }
      setCatalog((current) =>
        current.map((entry) => {
          if (entry.id !== id) return entry
          // a failed or fully-filtered catalog leaves live.models empty —
          // fall back to the provider's static ids so the pickers (main and
          // fast) never open an empty popover
          const listed = live.models.length
            ? live.models.map((m) => ({ value: m.id, label: m.name }))
            : entry.models.map((m) => ({ value: m, label: m }))
          // the default and stored ids stay pickable even when the catalog
          // filter hides them (e.g. openrouter/auto fails the modality check)
          const pinned = [...new Set([entry.defaultModel, selectedModel])]
            .filter((m): m is string => !!m)
            .filter((m) => !listed.some((o) => o.value === m))
            .map((m) => ({ value: m, label: m }))
          return { ...entry, modelOptions: [...pinned, ...listed] }
        }),
      )
    },
    [],
  )

  // Re-read on every outside write (composer model chip) while the form has no
  // unconfirmed autosave edits; a pending draft keeps the user's edits.
  /** bumped on every outside reload so a connection test that was still running reports nothing */
  const testSeqRef = useRef(0)
  useEffect(() => {
    let alive = true
    const load = () => {
      void window.aiOffice.getAiSettings?.().then((s) => {
        if (!alive || !s) return
        testSeqRef.current += 1
        setTesting(false)
        setTestResult(null)
        clearFeedback()
        const shown = storedPick(s)
        confirmLoaded(shown)
        setSettings(shown)
        const codex = s.providers.codex
        if (codex) {
          void refreshCodexModels(codex.cliPath ?? '', codex.model).catch(() => undefined)
        }
        const active = s.providers[shown.provider]
        const meta = catalog.find((c) => c.id === shown.provider)
        if (meta?.liveCatalog && active) {
          void refreshLiveModels(
            shown.provider,
            active.apiKey,
            active.baseUrl ?? '',
            active.model,
          ).catch(() => undefined)
        }
      })
    }
    load()
    const off = window.aiOffice.onAiSettingsChanged?.(() => {
      if (!pendingRef.current) load()
    })
    return () => {
      alive = false
      off?.()
    }
    // catalog is only read once on mount for the liveCatalog flag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCodexModels, refreshLiveModels, confirmLoaded, clearFeedback])

  // A user-hosted endpoint gets the same live model list as Codex, asked of the
  // endpoint itself. Keyed on the catalog's `needsBaseUrl` flag rather than on
  // the literal 'custom' id, so it follows the slot rather than the name, and
  // stays a no-op while any other provider is selected — a local server saved
  // months ago is never contacted while Genspark is in use.
  const endpointProvider = catalog.find(
    (entry) => entry.id === settings?.provider && entry.needsBaseUrl,
  )?.id
  const endpointConfig = settings ? settings.providers[settings.provider] : undefined
  const endpointBaseUrl = (endpointConfig?.baseUrl ?? '').trim()
  const endpointApiKey = endpointConfig?.apiKey ?? ''
  // The probe speaks the endpoint's declared protocol: an Anthropic- or
  // Gemini-shaped gateway answers a different route, and the list it returns
  // is the only model source the picker has.
  const endpointApi = endpointConfig?.profile?.api
  // The stored model decides where the pin goes below, but changing it must not
  // send another request, so it is read when the reply lands rather than keyed on.
  const selectedModelRef = useRef('')
  useEffect(() => {
    selectedModelRef.current = endpointConfig?.model ?? ''
  })
  /** the address that produced the list currently folded in; '' when none is */
  const listedForRef = useRef('')
  /** the probe-fold inputs mirrored past the `if (!settings) return null`
   * early return: the autosave's unmount flush closes over the first render's
   * scope, where those consts never initialized */
  const endpointRef = useRef<AiCustomEndpoint | undefined>(undefined)
  const metaRef = useRef<AiCatalogEntry | undefined>(undefined)
  /** the capability declarations that probe answered with, for the save merge */
  const probedProfilesRef = useRef<AiCustomModelProfile[] | undefined>(undefined)

  useEffect(() => {
    if (!endpointProvider) return
    // A list belonging to a different server — or to no server, once the address
    // is cleared — is misinformation, so it goes the moment the address changes:
    // the free-text box is the honest thing to show while the answer is unknown.
    if (listedForRef.current && listedForRef.current !== endpointBaseUrl) {
      listedForRef.current = ''
      probedProfilesRef.current = undefined
      setCatalog(foldModels(endpointProvider, []))
    }
    if (!endpointBaseUrl || !window.aiOffice.getCustomModels) return
    let cancelled = false
    const timer = setTimeout(() => {
      void window.aiOffice
        .getCustomModels(endpointBaseUrl, endpointApiKey, endpointApi)
        .then((live) => {
          // A server that will not answer leaves the current list alone: a blip
          // must not wipe a picker mid-use.
          if (cancelled || !live || live.models.length === 0) return
          // A hand-typed id is pinned to the top so it never vanishes from the
          // picker. The catalog is the only thing written — writing settings
          // here would revert whatever the user typed while the probe was in
          // flight, since `updateConfig` rebuilds them from its own render.
          const selected = selectedModelRef.current.trim()
          const models =
            selected && !live.models.includes(selected) ? [selected, ...live.models] : live.models
          listedForRef.current = endpointBaseUrl
          probedProfilesRef.current = live.profiles
          setCatalog(foldModels(endpointProvider, models))
        })
        .catch(() => undefined)
    }, CUSTOM_MODELS_DEBOUNCE_MS)
    // React's own cleanup drops a superseded reply, so a slow answer from the
    // previous address can never overwrite a fast one from the current address.
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [endpointProvider, endpointBaseUrl, endpointApiKey, endpointApi])

  if (!settings) return null
  const provider = settings.provider
  const meta = catalog.find((c) => c.id === provider)
  metaRef.current = meta
  const config = settings.providers[provider] ?? {
    apiKey: '',
    model: meta?.defaultModel ?? '',
    baseUrl: undefined,
    cliPath: undefined,
  }
  const isAccountSignIn = provider === 'genspark'
  const isCodex = provider === 'codex'
  const isVega = provider === 'vega'

  // the fast-model list opens with an explicit "same as main" row (picking it
  // clears fastModel — the pick is never one-way) and pins the stored fast id
  // when the catalog filter hides it
  const modelChoices = meta?.modelOptions ?? meta?.models ?? []
  const fastModelOptions: (string | { value: string; label: string })[] = [
    { value: '', label: t('setAiFastModelSame') },
    ...(config.fastModel &&
    !modelChoices.some((o) => (typeof o === 'string' ? o : o.value) === config.fastModel)
      ? [{ value: config.fastModel, label: config.fastModel }]
      : []),
    ...modelChoices,
  ]

  const touch = () => {
    clearFeedback()
    setTestResult(null)
  }
  const endpoint = meta?.needsBaseUrl ? activeCustomEndpoint(settings) : undefined
  endpointRef.current = endpoint
  /** Patch the active endpoint's declarative profile (protocol, headers, timeouts, switches). */
  const updateEndpointProfile = (patch: Partial<AiCustomEndpoint>) => {
    if (!endpoint) return
    setSettings(upsertCustomEndpoint(settings, { ...endpoint, ...patch }))
    touch()
  }
  /** Remove a key from the endpoint entirely, so the shipped heuristic answers again. */
  const clearEndpointProfileKey = (
    key: 'compat' | 'modelProfiles' | 'apiKeyEnv' | 'idleTimeoutMs',
  ) => {
    if (!endpoint) return
    const next = { ...endpoint }
    delete next[key]
    setSettings(upsertCustomEndpoint(settings, next))
    touch()
  }
  const endpointCompat = endpoint?.compat ?? {}
  /** The tri-state image-input control: undefined keeps the shipped heuristic. */
  const endpointVision = endpointCompat.vision
  const headersText = Object.entries(endpoint?.headers ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  const modelsText = JSON.stringify(endpoint?.modelProfiles ?? [], null, 2)
  const updateConfig = (patch: Partial<typeof config>) => {
    if (meta?.needsBaseUrl) {
      // the slot mirrors the active endpoint, so the edit lands on the endpoint
      const base = endpoint ?? {
        id: newCustomEndpointId(),
        name: '',
        baseUrl: config.baseUrl ?? '',
        apiKey: config.apiKey,
        model: config.model,
      }
      const { cliPath: _cli, ...fields } = patch
      setSettings(upsertCustomEndpoint(settings, { ...base, ...fields }, true))
    } else {
      setSettings({
        ...settings,
        providers: { ...settings.providers, [provider]: { ...config, ...patch } },
      })
    }
    touch()
  }
  const addEndpoint = () => {
    setSettings(
      upsertCustomEndpoint(
        settings,
        { id: newCustomEndpointId(), name: '', baseUrl: '', apiKey: '', model: '' },
        true,
      ),
    )
    touch()
  }
  const renameEndpoint = (name: string) => {
    if (!endpoint) return
    setSettings(upsertCustomEndpoint(settings, { ...endpoint, name }))
    touch()
  }
  const pickEndpoint = (id: string) => {
    setSettings(selectCustomEndpoint(settings, id))
    touch()
  }
  const deleteEndpoint = () => {
    if (!endpoint) return
    setSettings(removeCustomEndpoint(settings, endpoint.id))
    touch()
  }
  /** Commit the output-cap input: clamp what was typed and drop a no-op edit */
  const commitMaxTokens = () => {
    if (maxTokensDraft === null) return
    setMaxTokensDraft(null)
    const next = clampMaxOutputTokens(Number.parseInt(maxTokensDraft, 10))
    if (next === (settings.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS)) return
    setSettings({ ...settings, maxOutputTokens: next })
    touch()
  }
  const selectProvider = (id: AiSettings['provider']) => {
    setSettings({ ...settings, provider: id })
    touch()
    const picked = catalog.find((c) => c.id === id)
    const cfg = settings.providers[id]
    if (picked?.liveCatalog && cfg) {
      void refreshLiveModels(id, cfg.apiKey, cfg.baseUrl ?? '', cfg.model).catch(() => undefined)
    }
  }
  /**
   * Fold the last probe's facts into the endpoint record of the settings about
   * to be persisted. The probe's answers live in refs (not state) so a reply
   * landing mid-edit cannot revert typed text; the persist path bakes them in.
   * (function declaration: hoisted above the autosave-hook call site)
   */
  function withProbedCache(toSave: AiSettings): AiSettings {
    const endpointNow = endpointRef.current
    if (!endpointNow || !listedForRef.current || listedForRef.current !== endpointNow.baseUrl)
      return toSave
    const live = (metaRef.current?.models ?? []).filter((m) => m !== endpointNow.model)
    // The probe's capability facts refresh the cache beside the id list —
    // never the user's declarations, which stay exactly as typed. A model
    // the server stops serving stops being described on the next probe.
    const probed = probedProfilesRef.current
    const { models: _models, probedProfiles: _probedProfiles, ...declarations } = endpointNow
    return upsertCustomEndpoint(toSave, {
      ...declarations,
      ...(live.length > 0 ? { models: live } : {}),
      ...(probed && probed.length > 0 ? { probedProfiles: probed } : {}),
    })
  }
  const test = () => {
    const seq = ++testSeqRef.current
    setTesting(true)
    setTestResult(null)
    window.aiOffice
      .testAiSettings?.(settings)
      .then((r) => {
        if (seq !== testSeqRef.current) return
        setTestResult(r ?? { ok: false })
        if (r?.ok && isCodex) {
          void refreshCodexModels(config.cliPath ?? '', config.model).catch(() => undefined)
        }
        if (r?.ok && meta?.liveCatalog) {
          void refreshLiveModels(provider, config.apiKey, config.baseUrl ?? '', config.model).catch(
            () => undefined,
          )
        }
      })
      .catch((error) => {
        if (seq !== testSeqRef.current) return
        setTestResult({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        if (seq === testSeqRef.current) setTesting(false)
      })
  }

  return (
    <>
      <div className="set-pane-head">
        <h3 className="set-pane-title">{t('setSecAiModel')}</h3>
        <div className="set-pane-actions">
          <AiStatusPill
            status={
              testing
                ? { kind: 'testing', text: t('setAiTesting') }
                : testResult
                  ? testResult.ok
                    ? { kind: 'ok', text: t('setAiTestOk') }
                    : { kind: 'err', text: testResult.error || t('setAiTestFail') }
                  : saveError
                    ? { kind: 'err', text: saveError }
                    : saved
                      ? { kind: 'ok', text: t('setAiSaved') }
                      : null
            }
          />
          <button className="set-btn" disabled={testing} onClick={test}>
            {t('setAiTest')}
          </button>
        </div>
      </div>
      <div className="set-field">
        <div className="set-field-text">
          <label className="set-field-label">{t('setAiProvider')}</label>
        </div>
        <Dropdown
          className="set-dd"
          value={provider}
          ariaLabel={t('setAiProvider')}
          options={catalog
            .filter((c) => c.id !== 'genspark' || c.id === provider)
            .map((c) => {
              const locked = !licensed && c.id !== 'vega' && c.id !== 'genspark'
              return {
                value: c.id,
                label: c.label,
                disabled: locked,
                render: (
                  <>
                    <ProviderLogo id={c.id} />
                    {c.label}
                    {locked && <LicenseCrown tip={t('licProviderLocked')} />}
                  </>
                ),
              }
            })}
          onPick={(v) => selectProvider(v as AiSettings['provider'])}
        />
      </div>
      {!licensed && <div className="set-field-desc set-ai-note">{t('licProviderLocked')}</div>}
      <div className="set-field-desc set-ai-note">
        {isAccountSignIn
          ? t('setAiAccountHint')
          : isCodex
            ? t('setAiCodexHint')
            : provider === 'vega'
              ? noteWithLink(t('setAiVegaNote'))
              : t('setAiByokNote')}
      </div>
      {meta?.needsBaseUrl && (
        <>
          <div className="set-field">
            <div className="set-field-text">
              <div className="set-field-stack">
                <label className="set-field-label">{t('setAiEndpoint')}</label>
                <div className="set-field-desc">{t('setAiEndpointHint')}</div>
              </div>
            </div>
            <div className="set-ai-endpoint-row">
              {endpoint && (
                <Dropdown
                  className="set-dd"
                  value={endpoint.id}
                  ariaLabel={t('setAiEndpoint')}
                  options={(settings.customEndpoints ?? []).map((e) => ({
                    value: e.id,
                    label: customEndpointLabel(e, meta.label),
                  }))}
                  onPick={pickEndpoint}
                />
              )}
              <button className="set-btn" type="button" onClick={addEndpoint}>
                {t('setAiEndpointAdd')}
              </button>
              {endpoint && (
                <button className="set-btn" type="button" onClick={deleteEndpoint}>
                  {t('setAiEndpointRemove')}
                </button>
              )}
            </div>
          </div>
          {endpoint && (
            <div className="set-field">
              <div className="set-field-text">
                <label className="set-field-label" htmlFor="set-ai-endpoint-name">
                  {t('setAiEndpointName')}
                </label>
              </div>
              <input
                id="set-ai-endpoint-name"
                className="set-input"
                type="text"
                value={endpoint.name}
                placeholder={customEndpointLabel(endpoint, meta.label)}
                spellCheck={false}
                onChange={(e) => renameEndpoint(e.target.value)}
              />
            </div>
          )}
        </>
      )}
      <div className="set-field">
        <div className="set-field-text">
          <label className="set-field-label">{t('setAiModelId')}</label>
        </div>
        {meta?.liveCatalog ? (
          // a live catalog holds hundreds of ids — editable combobox: the caret
          // opens the whole list, typing narrows it, off-list ids still type in
          <ComboBox
            id="set-ai-model"
            className="set-combo"
            ariaLabel={t('setAiModelId')}
            value={config.model}
            options={meta.modelOptions ?? meta.models}
            placeholder={meta.defaultModel || 'model-id'}
            searchPlaceholder={t('setAiModelSearch')}
            onChange={(m) => updateConfig({ model: m })}
          />
        ) : meta && meta.models.length > 0 ? (
          <Dropdown
            className="set-dd"
            value={config.model || meta.defaultModel}
            ariaLabel={t('setAiModelId')}
            options={meta.models.map((m) => ({ value: m, label: m }))}
            onPick={(m) => updateConfig({ model: m })}
          />
        ) : (
          <input
            id="set-ai-model"
            className="set-input"
            type="text"
            value={config.model}
            placeholder="model-id"
            spellCheck={false}
            onChange={(e) => updateConfig({ model: e.target.value })}
          />
        )}
      </div>
      {SHOW_FAST_MODEL ? (
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <label className="set-field-label">{t('setAiFastModelId')}</label>
              <div className="set-field-desc">{t('setAiFastModelDesc')}</div>
            </div>
          </div>
          {meta?.liveCatalog ? (
            // same editable combobox as the main model; the first row reverts to
            // "same as main" (empty fastModel) so the pick is never one-way, and
            // an unset field reads that state instead of a bare id
            <ComboBox
              id="set-ai-fast-model"
              className="set-combo"
              ariaLabel={t('setAiFastModelId')}
              value={config.fastModel ?? ''}
              options={fastModelOptions}
              placeholder={config.model || meta.defaultModel || 'model-id'}
              searchPlaceholder={t('setAiModelSearch')}
              onChange={(m) => updateConfig({ fastModel: m || undefined })}
            />
          ) : meta && meta.models.length > 0 ? (
            <Dropdown
              className="set-dd"
              value={config.fastModel ?? ''}
              ariaLabel={t('setAiFastModelId')}
              options={[
                { value: '', label: t('setAiFastModelSame') },
                ...meta.models.map((m) => ({ value: m, label: m })),
              ]}
              onPick={(m) => updateConfig({ fastModel: m || undefined })}
            />
          ) : (
            <input
              id="set-ai-fast-model"
              className="set-input"
              type="text"
              value={config.fastModel ?? ''}
              placeholder={config.model || 'model-id'}
              spellCheck={false}
              onChange={(e) => updateConfig({ fastModel: e.target.value || undefined })}
            />
          )}
        </div>
      ) : null}
      {isCodex ? (
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <label className="set-field-label" htmlFor="set-ai-cli-path">
                {t('setAiCodexPath')}
              </label>
              <div className="set-field-desc">{t('setAiCodexPathHint')}</div>
            </div>
          </div>
          <input
            id="set-ai-cli-path"
            className="set-input"
            type="text"
            value={config.cliPath ?? ''}
            placeholder={t('setAiCodexAutoPlaceholder')}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => updateConfig({ cliPath: e.target.value.trim() })}
            onBlur={(e) => {
              const cliPath = e.target.value.trim()
              void refreshCodexModels(cliPath, config.model).catch(() => undefined)
            }}
          />
        </div>
      ) : isVega ? (
        // VEGA credentials never enter the UI: the sign-in issues the API key
        // into the main-process auth store and requests pick it up from there —
        // no key/Base URL fields, nothing to delete or leak
        account.loggedIn ? (
          <Field label={t('setEmail')} value={account.email || t('setAiVegaSignedIn')} />
        ) : null
      ) : !isAccountSignIn ? (
        <>
          <div className="set-field">
            <div className="set-field-text">
              <div className="set-field-stack">
                <label className="set-field-label" htmlFor="set-ai-key">
                  {t('setAiApiKey')}
                </label>
                <div className="set-field-desc">{t('setAiKeyHint')}</div>
              </div>
            </div>
            <input
              id="set-ai-key"
              className="set-input"
              type="password"
              value={config.apiKey}
              placeholder={meta?.keyPlaceholder ?? 'API Key'}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => updateConfig({ apiKey: e.target.value.trim() })}
            />
          </div>
          <div className="set-field">
            <div className="set-field-text">
              <div className="set-field-stack">
                <label className="set-field-label" htmlFor="set-ai-base-url">
                  {t('setAiBaseUrl')}
                </label>
                {!meta?.needsBaseUrl && (
                  <div className="set-field-desc">{t('setAiBaseUrlHint')}</div>
                )}
              </div>
            </div>
            <input
              id="set-ai-base-url"
              className="set-input"
              type="text"
              value={config.baseUrl ?? ''}
              placeholder={meta?.needsBaseUrl ? 'https://…/v1' : meta?.defaultBaseUrl}
              spellCheck={false}
              onChange={(e) => updateConfig({ baseUrl: e.target.value.trim() })}
            />
          </div>

          {endpoint && (
            <>
              <div className="set-field">
                <div className="set-field-text">
                  <div className="set-field-stack">
                    <label className="set-field-label">{t('setAiApiProtocol')}</label>
                    <div className="set-field-desc">{t('setAiApiProtocolHint')}</div>
                  </div>
                </div>
                <Dropdown
                  className="set-dd"
                  value={endpoint.api ?? 'openai-compatible'}
                  ariaLabel={t('setAiApiProtocol')}
                  options={AI_CUSTOM_PROTOCOLS.map((api) => ({
                    value: api,
                    label: t(PROTOCOL_LABEL_KEYS[api]),
                  }))}
                  onPick={(api) => updateEndpointProfile({ api: api as AiCustomProtocol })}
                />
              </div>
              <div className="set-field set-ai-profile-field">
                <div className="set-field-text">
                  <div className="set-field-stack">
                    <label className="set-field-label">{t('setAiCompatTitle')}</label>
                    <div className="set-field-desc">{t('setAiCompatEchoHint')}</div>
                  </div>
                </div>
                <div className="set-ai-profile-switches">
                  <ProfileSwitch
                    label={t('setAiCompatOmitTemp')}
                    value={endpointCompat.omitTemperature}
                    onChange={(on) =>
                      updateEndpointProfile({
                        compat: applySwitch(endpointCompat, 'omitTemperature', on),
                      })
                    }
                    texts={{
                      on: t('setAiSwitchOn'),
                      off: t('setAiSwitchOff'),
                      auto: t('setAiSwitchAuto'),
                    }}
                  />
                  <ProfileSwitch
                    label={t('setAiCompatEchoReasoning')}
                    value={endpointCompat.echoReasoning}
                    onChange={(on) =>
                      updateEndpointProfile({
                        compat: applySwitch(endpointCompat, 'echoReasoning', on),
                      })
                    }
                    texts={{
                      on: t('setAiSwitchOn'),
                      off: t('setAiSwitchOff'),
                      auto: t('setAiSwitchAuto'),
                    }}
                  />
                  <ProfileSwitch
                    label={t('setAiCompatMaxCompletion')}
                    value={endpointCompat.useMaxCompletionTokens}
                    onChange={(on) =>
                      updateEndpointProfile({
                        compat: applySwitch(endpointCompat, 'useMaxCompletionTokens', on),
                      })
                    }
                    texts={{
                      on: t('setAiSwitchOn'),
                      off: t('setAiSwitchOff'),
                      auto: t('setAiSwitchAuto'),
                    }}
                  />
                  <div className="set-ai-profile-row">
                    <span className="set-ai-profile-label">{t('setAiCompatVision')}</span>
                    <Dropdown
                      className="set-dd"
                      value={endpointVision === undefined ? 'auto' : endpointVision ? 'yes' : 'no'}
                      ariaLabel={t('setAiCompatVision')}
                      options={[
                        { value: 'auto', label: t('setAiCompatVisionAuto') },
                        { value: 'yes', label: t('setAiCompatVisionYes') },
                        { value: 'no', label: t('setAiCompatVisionNo') },
                      ]}
                      onPick={(v) =>
                        updateEndpointProfile({
                          compat: applySwitch(
                            endpointCompat,
                            'vision',
                            v === 'auto' ? undefined : v === 'yes',
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <ProfileBlobField
                fieldId="set-ai-endpoint-headers"
                label={t('setAiEndpointHeaders')}
                hint={t('setAiEndpointHeadersHint')}
                bad={t('setAiEndpointHeadersBad')}
                text={headersText}
                placeholder={'X-Tenant: office'}
                multiline
                onCommit={(text) => {
                  const headers = parseHeaderLines(text)
                  if (!headers) return false
                  updateEndpointProfile({ headers })
                  return true
                }}
              />
              <div className="set-field">
                <div className="set-field-text">
                  <div className="set-field-stack">
                    <label className="set-field-label" htmlFor="set-ai-endpoint-idle">
                      {t('setAiEndpointIdleTimeout')}
                    </label>
                    <div className="set-field-desc">{t('setAiEndpointIdleTimeoutHint')}</div>
                  </div>
                </div>
                <input
                  id="set-ai-endpoint-idle"
                  className="set-input set-num-input"
                  type="number"
                  min={1}
                  max={600}
                  step={10}
                  value={
                    endpoint.idleTimeoutMs === undefined
                      ? ''
                      : Math.round(endpoint.idleTimeoutMs / 1000)
                  }
                  placeholder="180"
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    if (!raw) {
                      clearEndpointProfileKey('idleTimeoutMs')
                      return
                    }
                    const seconds = Number.parseInt(raw, 10)
                    if (!Number.isFinite(seconds)) return
                    updateEndpointProfile({
                      idleTimeoutMs: Math.max(1, Math.min(600, seconds)) * 1000,
                    })
                  }}
                />
              </div>
              <div className="set-field">
                <div className="set-field-text">
                  <div className="set-field-stack">
                    <label className="set-field-label" htmlFor="set-ai-endpoint-key-env">
                      {t('setAiEndpointKeyEnv')}
                    </label>
                    <div className="set-field-desc">{t('setAiEndpointKeyEnvHint')}</div>
                  </div>
                </div>
                <input
                  id="set-ai-endpoint-key-env"
                  className="set-input"
                  type="text"
                  value={endpoint.apiKeyEnv ?? ''}
                  placeholder="GW_API_KEY"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => {
                    const name = e.target.value.trim()
                    if (!name) {
                      clearEndpointProfileKey('apiKeyEnv')
                      return
                    }
                    updateEndpointProfile({ apiKeyEnv: name })
                  }}
                />
              </div>
              <ProfileBlobField
                fieldId="set-ai-endpoint-models"
                label={t('setAiEndpointModels')}
                hint={
                  probedProfilesRef.current?.length
                    ? t('setAiEndpointModelsProbed')
                    : t('setAiEndpointModelsHint')
                }
                bad={t('setAiEndpointModelsBad')}
                text={modelsText}
                placeholder={MODEL_DECLARATION_PLACEHOLDER}
                multiline
                onCommit={(text) => {
                  if (!text.trim()) {
                    clearEndpointProfileKey('modelProfiles')
                    return true
                  }
                  try {
                    const parsed = JSON.parse(text)
                    if (!Array.isArray(parsed)) return false
                    updateEndpointProfile({
                      modelProfiles: parsed as AiCustomEndpoint['modelProfiles'],
                    })
                    return true
                  } catch {
                    return false
                  }
                }}
              />
            </>
          )}
        </>
      ) : null}
      <div className="set-field">
        <div className="set-field-text">
          <div className="set-field-stack">
            <label className="set-field-label" htmlFor="set-ai-max-tokens">
              {t('setAiMaxTokens')}
            </label>
            <div className="set-field-desc">{t('setAiMaxTokensDesc')}</div>
          </div>
        </div>
        <input
          id="set-ai-max-tokens"
          className="set-input"
          type="number"
          min={MIN_MAX_OUTPUT_TOKENS}
          max={MAX_MAX_OUTPUT_TOKENS}
          step={1024}
          value={maxTokensDraft ?? String(settings.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS)}
          onChange={(e) => setMaxTokensDraft(e.target.value)}
          onBlur={commitMaxTokens}
        />
      </div>
      <div className="set-field">
        <div className="set-field-text">
          <div className="set-field-stack">
            <div className="set-field-label">{t('setAiVegaTools')}</div>
            <div className="set-field-desc">{t('setAiVegaToolsDesc')}</div>
          </div>
        </div>
        <button
          className="set-switch"
          role="switch"
          aria-checked={settings.vegaToolsEnabled !== false}
          aria-label={t('setAiVegaTools')}
          onClick={() => {
            setSettings({ ...settings, vegaToolsEnabled: settings.vegaToolsEnabled === false })
            touch()
          }}
        />
      </div>
      <div className="set-field">
        <div className="set-field-text">
          <div className="set-field-stack">
            <div className="set-field-label">{t('setAiPiiShield')}</div>
            <div className="set-field-desc">{t('setAiPiiShieldDesc')}</div>
          </div>
        </div>
        <button
          className="set-switch"
          role="switch"
          aria-checked={settings.piiShieldEnabled !== false}
          aria-label={t('setAiPiiShield')}
          onClick={() => {
            setSettings({ ...settings, piiShieldEnabled: settings.piiShieldEnabled === false })
            touch()
          }}
        />
      </div>
    </>
  )
}

type Capability = 'image' | 'analysis' | 'video' | 'search'
/** a tested block: the four capabilities plus the decision-model reranker of the local file search */
type TestedBlock = Capability | 'rerank'
/** where an outside entry point (e.g. the home list's rerank button) lands when it opens the modal */
export interface SettingsTarget {
  section: SectionId
  block?: TestedBlock
}
type TestResult = { ok: boolean; error?: string }

/** VEGA first (the default, rides the sign-in key), then the hosted Jev routes and the other decision-model servers */
const DECISION_ENDPOINTS: { value: DecisionEndpoint; label: string }[] = [
  { value: 'vega', label: 'VEGA' },
  { value: 'openrouter', label: 'Jev (TypeSafe via OpenRouter)' },
  { value: 'direct', label: 'Jev (TypeSafe API)' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'liquid', label: 'Liquid AI (d1)' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'kev', label: 'Kev (local)' },
  { value: 'rizzo', label: 'Rizzo Flow (local)' },
  { value: 'custom', label: 'Custom (/v1/systemone)' },
]

/**
 * AI media & search pane, one block per capability — web search, image
 * generation, image analysis, video analysis — each with the same
 * provider / model / key / base URL rows as the AI Model pane. A vendor's key
 * and base URL are stored once and shared by every block that picks it.
 * Saved into the same ai-settings.json as the chat provider.
 */
function AiMediaPane({
  t,
  onFileSearchChange,
  focusBlock,
}: {
  t: TFunc
  onFileSearchChange?: () => void
  focusBlock?: TestedBlock
}) {
  const [mediaCatalog] = useState<AiMediaProviderMeta[]>(
    () => window.aiOffice.getAiMediaProviders?.() ?? [],
  )
  const [searchCatalog] = useState<AiSearchProviderMeta[]>(
    () => window.aiOffice.getAiSearchProviders?.() ?? [],
  )
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const { confirmLoaded, saved, saveError, clearFeedback, pendingRef } =
    useAiSettingsAutosave(settings)
  const [fileSearch, setFileSearchState] = useState<FileSearchSettings | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Partial<Record<TestedBlock, TestResult>> | null>(
    null,
  )
  /** live VEGA image→image catalog for the image-generation picker; empty = static meta fallback */
  const [vegaImageModels, setVegaImageModels] = useState<ProviderModel[]>([])
  /** without a license every capability sticks to the VEGA provider */
  const [licensed, setLicensed] = useState(false)
  useEffect(() => {
    void window.aiOffice.getLicenseStatus().then((s) => setLicensed(s.licensed))
    return window.aiOffice.onLicenseChanged((s) => setLicensed(s.licensed))
  }, [])
  const focused = useRef(false)
  const scrollToFocused = (el: HTMLDivElement | null) => {
    if (!el || focused.current) return
    focused.current = true
    el.scrollIntoView({ block: 'start' })
  }

  /** pull {base}/models filtered to image→image ids; main supplies the issued key when the slot is keyless */
  const refreshVegaImageModels = useCallback(async (apiKey = '', baseUrl = '') => {
    if (!window.aiOffice.getProviderModels) return
    try {
      const live = await window.aiOffice.getProviderModels({
        provider: 'vega',
        apiKey,
        baseUrl,
        ...VEGA_IMAGE_MODEL_FILTER,
      })
      if (live.models.length) setVegaImageModels(live.models)
    } catch {
      // offline / unsigned — the static meta list still fills the picker
    }
  }, [])

  // the Jev rerank settings live outside ai-settings.json: same debounced
  // autosave discipline as the AI settings, then the home search re-judges
  // its order via onFileSearchChange
  const fileSearchConfirmed = useRef<FileSearchSettings | null>(null)
  const onFileSearchChangeRef = useRef(onFileSearchChange)
  useEffect(() => {
    onFileSearchChangeRef.current = onFileSearchChange
  })
  useEffect(() => {
    if (!fileSearch || fileSearch === fileSearchConfirmed.current) return
    const timer = setTimeout(() => {
      const snapshot = fileSearch
      window.aiOffice
        .setFileSearchSettings?.(snapshot)
        .then(() => {
          fileSearchConfirmed.current = snapshot
          onFileSearchChangeRef.current?.()
        })
        .catch(() => {})
    }, AI_SETTINGS_AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [fileSearch])

  /** bumped on every outside reload so a connection test that was still running reports nothing */
  const testSeqRef = useRef(0)
  useEffect(() => {
    let alive = true
    const load = () => {
      void window.aiOffice.getAiSettings?.().then((s) => {
        if (!alive || !s) return
        testSeqRef.current += 1
        setTesting(false)
        setTestResults(null)
        clearFeedback()
        const shown = storedPick(s)
        confirmLoaded(shown)
        setSettings(shown)
        void refreshVegaImageModels(
          shown.media?.providers?.vega?.apiKey || shown.providers.vega?.apiKey || '',
          shown.media?.providers?.vega?.baseUrl ?? '',
        )
      })
    }
    load()
    void window.aiOffice.getFileSearchSettings?.().then((v) => {
      if (alive && v) {
        fileSearchConfirmed.current = v
        setFileSearchState(v)
      }
    })
    // this pane saves the whole file too: follow chip switches while clean
    const off = window.aiOffice.onAiSettingsChanged?.(() => {
      if (!pendingRef.current) load()
    })
    return () => {
      alive = false
      off?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVegaImageModels, confirmLoaded, clearFeedback])

  if (!settings?.media || !settings.search) return null
  const media: AiMediaSettings = settings.media
  const search: AiSearchSettings = settings.search

  const touch = () => {
    clearFeedback()
    setTestResults(null)
  }
  const setMedia = (next: AiMediaSettings) => {
    setSettings({ ...settings, media: next })
    touch()
  }
  const setSearch = (next: AiSearchSettings) => {
    setSettings({ ...settings, search: next })
    touch()
  }
  const setFileSearch = (next: FileSearchSettings) => {
    setFileSearchState(next)
    touch()
  }
  const mediaConfigOf = (id: AiMediaProviderId) => {
    const meta = mediaCatalog.find((m) => m.id === id)
    return (
      media.providers[id] ?? {
        apiKey: '',
        imageModel: meta?.defaultImageModel ?? '',
        analysisModel: meta?.defaultAnalysisModel ?? '',
      }
    )
  }
  const updateMediaConfig = (
    id: AiMediaProviderId,
    patch: Partial<AiMediaSettings['providers'][AiMediaProviderId]>,
  ) =>
    setMedia({
      ...media,
      providers: { ...media.providers, [id]: { ...mediaConfigOf(id), ...patch } },
    })

  /**
   * Image picker options for VEGA: live catalog names when the fetch landed,
   * the meta's named static list otherwise; the stored/default ids stay pinned
   * on top when the catalog filter hides them.
   */
  const vegaImageOptions = (meta: AiMediaProviderMeta, selected: string) => {
    const staticOptions = meta.imageModels.map((m) =>
      typeof m === 'string' ? { value: m, label: m } : { value: m.id, label: m.name },
    )
    const options = vegaImageModels.length
      ? vegaImageModels.map((m) => ({ value: m.id, label: m.name }))
      : staticOptions
    const pinned = [meta.defaultImageModel, selected]
      .filter((m): m is string => !!m)
      .filter((m) => !options.some((o) => o.value === m))
      .map((m) => ({ value: m, label: staticOptions.find((o) => o.value === m)?.label ?? m }))
    return [...pinned, ...options]
  }

  // a VEGA slot with an empty key shares the AI Model key — test the effective credential
  const vegaSharedKey = settings.providers.vega?.apiKey ?? ''
  const effectiveMediaConfig = (id: AiMediaProviderId) => {
    const c = mediaConfigOf(id)
    return id === 'vega' && !c.apiKey ? { ...c, apiKey: vegaSharedKey } : c
  }
  const effectiveSearchKey = (id: string) =>
    (id === 'vega'
      ? search.providers.vega?.apiKey || vegaSharedKey
      : search.providers[id as keyof typeof search.providers]?.apiKey) ?? ''

  // every block reports its own verdict; blocks sharing a vendor share that vendor's one check
  const test = async () => {
    const seq = ++testSeqRef.current
    setTesting(true)
    setTestResults(null)
    const results: Partial<Record<TestedBlock, TestResult>> = {}
    const fallback: TestResult = { ok: true }
    const vendorChecks = new Map<AiMediaProviderId, Promise<TestResult>>()
    const vendorCheck = (id: AiMediaProviderId) => {
      let pending = vendorChecks.get(id)
      if (!pending) {
        // a VEGA slot with an empty key shares the AI Model key — test the effective credential
        pending =
          window.aiOffice.testAiMediaSettings?.({
            provider: id,
            config: effectiveMediaConfig(id),
          }) ?? Promise.resolve(fallback)
        vendorChecks.set(id, pending)
      }
      return pending
    }
    const blocks: [TestedBlock, () => Promise<TestResult>][] = [
      [
        'search',
        () =>
          window.aiOffice.testAiSearchSettings?.({
            provider: search.provider,
            apiKey: effectiveSearchKey(search.provider),
          }) ?? Promise.resolve(fallback),
      ],
      ['image', () => vendorCheck(media.imageProvider)],
      ['analysis', () => vendorCheck(media.analysisProvider)],
      ['video', () => vendorCheck(media.videoAnalysisProvider)],
    ]
    if (fileSearch?.rerank) {
      blocks.push([
        'rerank',
        () => window.aiOffice.testFileSearchRerank?.(fileSearch) ?? Promise.resolve(fallback),
      ])
    }
    await Promise.all(
      blocks.map(async ([block, run]) => {
        try {
          results[block] = await run()
        } catch (error) {
          results[block] = {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }),
    )
    if (seq !== testSeqRef.current) return
    setTestResults(results)
    setTesting(false)
  }

  const blockStatus = (block: TestedBlock): AiStatus | null => {
    if (testing) return { kind: 'testing', text: t('setAiTesting') }
    const r = testResults?.[block]
    if (!r) return null
    return r.ok
      ? { kind: 'ok', text: t('setAiTestOk') }
      : { kind: 'err', text: r.error || t('setAiTestFail') }
  }
  const subhead = (block: TestedBlock, title: string) => (
    <div className="set-pane-subhead" ref={block === focusBlock ? scrollToFocused : undefined}>
      <h4 className="set-pane-subtitle">{title}</h4>
      <AiStatusPill status={blockStatus(block)} />
    </div>
  )
  // the head is sticky, so a result pill there floats over every block —
  // test verdicts live on each block's own subhead; the head only carries
  // the autosave feedback
  const headStatus: AiStatus | null = saveError
    ? { kind: 'err', text: saveError }
    : saved
      ? { kind: 'ok', text: t('setAiSaved') }
      : null

  const providerRow = (
    label: string,
    value: string,
    options: { id: string; label: string }[],
    onPick: (id: string) => void,
  ) => (
    <div className="set-field">
      <div className="set-field-text">
        <label className="set-field-label">{t('setAiProvider')}</label>
      </div>
      <Dropdown
        className="set-dd"
        value={value}
        ariaLabel={label}
        options={options
          .filter((c) => c.id !== 'genspark' || c.id === value)
          .map((c) => {
            const locked = !licensed && c.id !== 'vega' && c.id !== 'genspark'
            return {
              value: c.id,
              label: c.label,
              disabled: locked,
              render: (
                <>
                  <ProviderLogo id={c.id} />
                  {c.label}
                  {locked && <LicenseCrown tip={t('licProviderLocked')} />}
                </>
              ),
            }
          })}
        onPick={onPick}
      />
    </div>
  )

  const modelRow = (
    id: string,
    models: ReadonlyArray<string | { value: string; label: string }>,
    fallback: string,
    value: string,
    onChange: (v: string) => void,
    /** live-catalog pickers use an editable combobox instead of a fixed dropdown */
    live?: boolean,
  ) => (
    <div className="set-field">
      <div className="set-field-text">
        <label className="set-field-label" htmlFor={id}>
          {t('setAiModelId')}
        </label>
      </div>
      {live ? (
        <ComboBox
          id={id}
          className="set-combo"
          ariaLabel={t('setAiModelId')}
          value={value}
          options={models}
          placeholder={fallback || 'model-id'}
          searchPlaceholder={t('setAiModelSearch')}
          onChange={onChange}
        />
      ) : models.length > 0 ? (
        <Dropdown
          className="set-dd"
          value={value || fallback}
          ariaLabel={t('setAiModelId')}
          options={models.map((m) => (typeof m === 'string' ? { value: m, label: m } : m))}
          onPick={onChange}
        />
      ) : (
        <input
          id={id}
          className="set-input"
          type="text"
          value={value}
          placeholder="model-id"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )

  const keyRow = (
    id: string,
    value: string,
    placeholder: string,
    onChange: (v: string) => void,
  ) => (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-stack">
          <label className="set-field-label" htmlFor={id}>
            {t('setAiApiKey')}
          </label>
          <div className="set-field-desc">{t('setAiKeyHint')}</div>
        </div>
      </div>
      <input
        id={id}
        className="set-input"
        type="password"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </div>
  )

  /** a plain text row with an i18n label; used for the decision-endpoint extra fields */
  const textRow = (
    id: string,
    labelKey: StringKey,
    value: string,
    placeholder: string,
    onChange: (v: string) => void,
  ) => (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-stack">
          <label className="set-field-label" htmlFor={id}>
            {t(labelKey)}
          </label>
        </div>
      </div>
      <input
        id={id}
        className="set-input"
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </div>
  )

  const baseUrlRow = (
    id: string,
    meta: AiMediaProviderMeta,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-stack">
          <label className="set-field-label" htmlFor={id}>
            {t('setAiBaseUrl')}
          </label>
          {!meta.needsBaseUrl && <div className="set-field-desc">{t('setAiBaseUrlHint')}</div>}
        </div>
      </div>
      <input
        id={id}
        className="set-input"
        type="text"
        value={value}
        placeholder={meta.needsBaseUrl ? 'https://…/v1' : meta.defaultBaseUrl}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </div>
  )

  /** one media block: provider → model → key → base URL (key/base URL shared per vendor) */
  const mediaBlock = (cap: Exclude<Capability, 'search'>) => {
    const title =
      cap === 'image'
        ? t('setAiCapImage')
        : cap === 'analysis'
          ? t('setAiCapAnalysis')
          : t('setAiCapVideo')
    const options = mediaCatalog.filter((m) =>
      cap === 'image'
        ? !!m.imageProtocol
        : cap === 'video'
          ? !!m.analysisProtocol && m.videoAnalysis
          : !!m.analysisProtocol,
    )
    const current =
      cap === 'image'
        ? media.imageProvider
        : cap === 'video'
          ? media.videoAnalysisProvider
          : media.analysisProvider
    const meta = options.find((m) => m.id === current) ?? options[0]!
    const id = meta.id
    const config = mediaConfigOf(id)
    const pick = (next: string) => {
      const p = next as AiMediaProviderId
      setMedia(
        cap === 'image'
          ? { ...media, imageProvider: p }
          : cap === 'video'
            ? { ...media, videoAnalysisProvider: p }
            : { ...media, analysisProvider: p },
      )
    }
    const modelField = cap === 'image' ? 'imageModel' : 'analysisModel'
    const models = (cap === 'image' ? meta.imageModels : meta.analysisModels).map((m) =>
      typeof m === 'string' ? m : { value: m.id, label: m.name },
    )
    return (
      <section key={cap}>
        {subhead(cap, title)}
        {providerRow(title, id, options, pick)}
        <div className="set-field-desc set-ai-note">
          {id === 'genspark'
            ? t('setAiMediaAccountHint')
            : id === 'vega'
              ? cap === 'image'
                ? // image has its own picker now — the "model is set by VEGA" hint
                  // only stays accurate for the analysis capabilities
                  t('setAiMediaVegaImageHint')
                : t('setAiMediaVegaHint')
              : meta.description}
        </div>
        {id === 'vega' &&
          cap === 'image' &&
          modelRow(
            `set-ai-${cap}-model`,
            vegaImageOptions(meta, config.imageModel),
            meta.defaultImageModel,
            config.imageModel,
            (m) => updateMediaConfig(id, { imageModel: m }),
            true,
          )}
        {id !== 'genspark' && id !== 'vega' && (
          <>
            {modelRow(
              `set-ai-${cap}-model`,
              models,
              cap === 'image' ? meta.defaultImageModel : meta.defaultAnalysisModel,
              config[modelField],
              (m) => updateMediaConfig(id, { [modelField]: m }),
              meta.liveCatalog,
            )}
            {keyRow(`set-ai-${cap}-key`, config.apiKey, meta.keyPlaceholder, (v) =>
              updateMediaConfig(id, { apiKey: v }),
            )}
            {baseUrlRow(`set-ai-${cap}-base-url`, meta, config.baseUrl ?? '', (v) =>
              updateMediaConfig(id, { baseUrl: v }),
            )}
          </>
        )}
      </section>
    )
  }

  const searchMeta = searchCatalog.find((m) => m.id === search.provider)
  const searchKey =
    search.provider === 'genspark' ? '' : (search.providers[search.provider]?.apiKey ?? '')

  return (
    <>
      <div className="set-pane-head">
        <h3 className="set-pane-title">{t('setSecAiMedia')}</h3>
        <div className="set-pane-actions">
          <AiStatusPill status={headStatus} />
          <button className="set-btn" disabled={testing} onClick={() => void test()}>
            {t('setAiTest')}
          </button>
        </div>
      </div>
      <div className="set-field-desc set-ai-note">{t('setAiSharedKeyHint')}</div>
      {!licensed && <div className="set-field-desc set-ai-note">{t('licProviderLocked')}</div>}
      <section>
        {subhead('search', t('setAiCapSearch'))}
        {providerRow(t('setAiCapSearch'), search.provider, searchCatalog, (v) =>
          setSearch({ ...search, provider: v as AiSearchSettings['provider'] }),
        )}
        <div className="set-field-desc set-ai-note">
          {search.provider === 'genspark'
            ? t('setAiSearchAccountHint')
            : search.provider === 'vega'
              ? t('setAiSearchVegaHint')
              : search.provider === 'parallel'
                ? t('setAiSearchParallelHint')
                : search.provider === 'serply'
                  ? t('setAiSearchSerplyHint')
                  : searchMeta?.imageSearch
                    ? t('setAiSearchSerperHint')
                    : t('setAiSearchTavilyHint')}
        </div>
        {search.provider !== 'genspark' &&
          search.provider !== 'vega' &&
          keyRow('set-ai-search-key', searchKey, searchMeta?.keyPlaceholder ?? 'API Key', (v) =>
            setSearch({
              ...search,
              providers: { ...search.providers, [search.provider]: { apiKey: v } },
            }),
          )}
      </section>
      {fileSearch && (
        <section>
          {subhead('rerank', t('setAiCapFileSearch'))}
          <div className="set-field">
            <div className="set-field-text">
              <div className="set-field-stack">
                <div className="set-field-label">{t('setSearchRerank')}</div>
                <div className="set-field-desc">{t('setSearchRerankDesc')}</div>
              </div>
            </div>
            <button
              className="set-switch"
              role="switch"
              aria-checked={fileSearch.rerank}
              aria-label={t('setSearchRerank')}
              onClick={() => setFileSearch({ ...fileSearch, rerank: !fileSearch.rerank })}
            />
          </div>
          {fileSearch.rerank && (
            <>
              <div className="set-field">
                <div className="set-field-text">
                  <label className="set-field-label">{t('setSearchRerankEndpoint')}</label>
                </div>
                <Dropdown
                  className="set-dd"
                  value={licensed ? fileSearch.endpoint : 'vega'}
                  ariaLabel={t('setSearchRerankEndpoint')}
                  options={DECISION_ENDPOINTS.map((o) => {
                    const locked = !licensed && o.value !== 'vega'
                    return {
                      ...o,
                      disabled: locked,
                      render: (
                        <>
                          {o.label}
                          {locked && <LicenseCrown tip={t('licProviderLocked')} />}
                        </>
                      ),
                    }
                  })}
                  onPick={(v) => setFileSearch({ ...fileSearch, endpoint: v as DecisionEndpoint })}
                />
              </div>
              {(licensed ? fileSearch.endpoint : 'vega') === 'vega' ? (
                // VEGA reranks on the sign-in key — no API key field, same as
                // the search/media providers above
                <div className="set-field-desc set-ai-note">{t('setAiAccountHint')}</div>
              ) : (
                keyRow(
                  'set-search-jev-key',
                  fileSearch.keys[fileSearch.endpoint],
                  fileSearch.endpoint === 'openrouter' ? 'sk-or-…' : 'API Key',
                  (v) =>
                    setFileSearch({
                      ...fileSearch,
                      keys: { ...fileSearch.keys, [fileSearch.endpoint]: v },
                    }),
                )
              )}
              {licensed && fileSearch.endpoint === 'custom' && (
                <>
                  {textRow(
                    'set-search-jev-url',
                    'setSearchRerankCustomUrl',
                    fileSearch.customBaseUrl,
                    'http://127.0.0.1:8009/v1/systemone',
                    (v) => setFileSearch({ ...fileSearch, customBaseUrl: v }),
                  )}
                  {textRow(
                    'set-search-jev-model',
                    'setSearchRerankCustomModel',
                    fileSearch.customModel,
                    'kev-latest',
                    (v) => setFileSearch({ ...fileSearch, customModel: v }),
                  )}
                </>
              )}
              {licensed && fileSearch.endpoint === 'cloudflare' && (
                <>
                  {textRow(
                    'set-search-jev-account',
                    'setSearchRerankAccount',
                    fileSearch.cloudflareAccountId,
                    '',
                    (v) => setFileSearch({ ...fileSearch, cloudflareAccountId: v }),
                  )}
                  {textRow(
                    'set-search-jev-cf-model',
                    'setSearchRerankCustomModel',
                    fileSearch.cloudflareModel,
                    '@cf/cloudflare/clef',
                    (v) => setFileSearch({ ...fileSearch, cloudflareModel: v }),
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
      {mediaBlock('image')}
      {mediaBlock('analysis')}
      {mediaBlock('video')}
    </>
  )
}

interface AiStatus {
  kind: 'testing' | 'ok' | 'err'
  text: string
}

/** colored feedback pill in the AI pane header: spinner while testing, then success/error */
function AiStatusPill({ status }: { status: AiStatus | null }) {
  if (!status) return null
  return (
    <span
      className={`set-ai-status ${status.kind}`}
      role="status"
      // error text (HTTP body, network message) can be long — full text via native tooltip
      title={status.kind === 'err' ? status.text : undefined}
    >
      {status.kind === 'testing' ? (
        <span className="set-ai-spin" aria-hidden="true" />
      ) : status.kind === 'ok' ? (
        <svg
          className="set-ai-status-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="6.3" fill="currentColor" opacity="0.16" />
          <path
            d="M4.2 7.3l1.9 1.9 3.7-4.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg
          className="set-ai-status-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="6.3" fill="currentColor" opacity="0.16" />
          <path d="M7 3.8v3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="10.1" r="1" fill="currentColor" />
        </svg>
      )}
      <span className="set-ai-status-text">{status.text}</span>
    </span>
  )
}

export interface SettingsModalProps {
  status: AccountStatus | null
  loggingOut: boolean
  /** browser sign-in in progress (spinner shows on the account entry) */
  loginWaiting: boolean
  /** device-flow user code (e.g. "ABCD-1234") shown in the sign-in field while waiting */
  deviceCode: string | null
  onClose: () => void
  /** the decision-model search settings were saved; the home search re-judges or drops its current order */
  onFileSearchChange?: () => void
  /** closes the modal and launches the VEGA login flow (progress shows on the account entry) */
  onLogin: () => void
  onLogout: () => void
  /** an installed skill is older than the bundled one: dot on the Integrations entry */
  skillUpdateDue?: boolean
  onSkillUpdateDue?: (due: boolean) => void
  /** open on this section / block instead of the account page */
  target?: SettingsTarget | null
}

export function SettingsModal({
  status,
  loggingOut,
  loginWaiting,
  deviceCode,
  onClose,
  onFileSearchChange,
  onLogin,
  onLogout,
  skillUpdateDue: updateDue = false,
  onSkillUpdateDue,
  target,
}: SettingsModalProps) {
  const { lang, setLang, t } = useI18n()
  const [section, setSection] = useState<SectionId>(target?.section ?? 'account')
  useEffect(() => {
    if (target) setSection(target.section)
  }, [target])
  const [displayName, setDisplayName] = useState('')
  const [theme, setTheme] = useState<UiTheme>('system')
  const [design, setDesign] = useState<UiDesign>('digital')
  const [docTheme, setDocTheme] = useState<DocTheme>('follow')
  const [uiScale, setUiScale] = useState(1)
  const [saveDir, setSaveDir] = useState('')
  const [autoSaveOn, setAutoSaveOn] = useState(false)
  const [defaultApp, setDefaultApp] = useState<DefaultAppStatus | null>(null)
  const [defaultAppBusy, setDefaultAppBusy] = useState(false)
  const [defaultAppFailed, setDefaultAppFailed] = useState(false)
  const [aiPrefs, setAiPrefs] = useState<AiPanelPrefs>(DEFAULT_AI_PANEL_PREFS)
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable')
  const [appVersion, setAppVersion] = useState('')
  const [updateState, setUpdateState] = useState<UpdateUiState | null>(null)

  useEffect(() => {
    let alive = true
    void window.aiOffice.getTheme?.().then((th) => {
      if (alive) setTheme(th)
    })
    void window.aiOffice.getDesign?.().then((d) => {
      if (alive) setDesign(d)
    })
    void window.aiOffice.getDisplayName?.().then((name) => {
      if (alive) setDisplayName(name)
    })
    void window.aiOffice.getDocumentTheme?.().then((th) => {
      if (alive) setDocTheme(th)
    })
    void window.aiOffice
      .getUiScale?.()
      .then((f) => {
        if (alive) setUiScale(f)
      })
      .catch(() => undefined)
    void window.aiOffice.getDefaultSaveDir?.().then((dir) => {
      if (alive && dir) setSaveDir(dir)
    })
    void window.aiOffice.getAutoSaveDefault?.().then((v) => {
      if (alive) setAutoSaveOn(v.on)
    })
    void window.aiOffice.getDefaultAppStatus?.().then((st) => {
      if (alive) setDefaultApp(st)
    })
    void window.aiOffice.getAiPanelPrefs?.().then((prefs) => {
      if (alive) setAiPrefs(prefs)
    })
    void window.aiOffice.getUpdateChannel?.().then((ch) => {
      if (alive) setChannel(ch)
    })
    void window.aiOffice.getAppVersion?.().then((v) => {
      if (alive && v) setAppVersion(v)
    })
    // a rejected invoke (main process not ready, a shell whose preload does
    // not expose the channel) must not surface as an unhandled rejection;
    // without a known state the About row simply stays hidden
    void window.aiOffice
      .getUpdateState?.()
      .then((s) => {
        if (alive) setUpdateState(s)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  // live update state: the About row offers the update as soon as one is known
  useEffect(() => {
    const off = window.aiOffice.onUpdateStateChanged?.((s) => setUpdateState(s))
    return () => off?.()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const applyTheme = (next: UiTheme) => {
    setTheme(next)
    void window.aiOffice.setTheme(next)
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
  }

  const applyDesign = (next: UiDesign) => {
    setDesign(next)
    void window.aiOffice.setDesign(next)
    if (next === 'standard') document.documentElement.removeAttribute('data-design')
    else document.documentElement.setAttribute('data-design', next)
  }

  const applyDocumentTheme = (next: DocTheme) => {
    setDocTheme(next)
    void window.aiOffice.setDocumentTheme(next)
  }

  // interface zoom (#1913): live-sync with View-menu zoom commands in editors
  useEffect(() => {
    const off = window.aiOffice.onUiScaleChanged?.((f) => setUiScale(f))
    return () => off?.()
  }, [])

  const applyUiScaleSetting = (next: number) => {
    setUiScale(next)
    void window.aiOffice.setUiScale(next)
  }

  const updateAiPrefs = (patch: Partial<AiPanelPrefs>) => {
    setAiPrefs((prev) => ({ ...prev, ...patch }))
    void window.aiOffice.setAiPanelPrefs(patch).then(setAiPrefs)
  }

  const changeSaveDir = () => {
    void window.aiOffice.pickDefaultSaveDir?.().then((dir) => {
      if (dir) setSaveDir(dir)
    })
  }

  // Windows only opens the system page; re-read ownership when the user comes back
  useEffect(() => {
    if (!defaultApp?.manualOnly) return
    const refresh = () => {
      void window.aiOffice.getDefaultAppStatus?.().then(setDefaultApp)
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [defaultApp?.manualOnly])

  const claimDefaultApp = () => {
    setDefaultAppBusy(true)
    setDefaultAppFailed(false)
    void window.aiOffice
      .setDefaultApp()
      .then((st) => {
        setDefaultApp(st)
        if (!st.manualOnly && st.state !== 'default') setDefaultAppFailed(true)
      })
      .catch(() => setDefaultAppFailed(true))
      .finally(() => setDefaultAppBusy(false))
  }

  const defaultAppDesc = (() => {
    if (!defaultApp) return ''
    if (defaultAppFailed) return t('setDefaultAppFailed')
    if (defaultApp.state === 'default') return t('setDefaultAppIs')
    if (defaultApp.state === 'other' && defaultApp.others.length > 0)
      return t('setDefaultAppOther', { app: defaultApp.others.join(', ') })
    return t('setDefaultAppDesc')
  })()

  const loggedIn = status?.loggedIn ?? false
  const email = status?.email ?? ''

  return (
    <div
      className="set-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="set-dialog" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <div className="set-header">
          <h2 className="set-title">{t('settings')}</h2>
          <button className="set-close" onClick={onClose} aria-label={t('cancel')}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="set-body">
          <nav className="set-nav" aria-label={t('settings')}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`set-nav-item${section === s.id ? ' active' : ''}`}
                aria-current={section === s.id}
                onClick={() => setSection(s.id)}
              >
                <SectionIcon id={s.id} />
                {t(s.labelKey)}
                {s.id === 'integrations' && updateDue && (
                  <span className="set-nav-dot" role="img" aria-label={t('intgUpdateDue')} />
                )}
              </button>
            ))}
          </nav>
          <div className={'set-pane' + (section === 'aiModel' ? ' set-pane-ai-model' : '')}>
            {section === 'account' && (
              <>
                <h3 className="set-pane-title">{t('setSecAccount')}</h3>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <label className="set-field-label" htmlFor="set-display-name">
                        {t('setDisplayName')}
                      </label>
                    </div>
                  </div>
                  <input
                    id="set-display-name"
                    className="set-input"
                    type="text"
                    value={displayName}
                    placeholder={loggedIn && email ? email.split('@')[0] : t('setDisplayName')}
                    spellCheck={false}
                    autoComplete="off"
                    maxLength={80}
                    onChange={(e) => {
                      const name = e.target.value
                      setDisplayName(name)
                      void window.aiOffice.setDisplayName?.(name)
                    }}
                  />
                </div>
                <Field label={t('setEmail')} value={loggedIn ? email : t('setNotLoggedIn')} />
                {loggedIn && (
                  <Field
                    label={t('credits')}
                    value={
                      status?.balance === undefined
                        ? '—'
                        : (() => {
                            const fmt = (n: number) =>
                              n.toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            const usd = `${fmt(status.balance!)} ${
                              status.currency === undefined || status.currency === 'USD'
                                ? '$'
                                : status.currency
                            }`
                            return status.balanceRub === undefined
                              ? usd
                              : `${fmt(status.balanceRub)} руб. (${usd})`
                          })()
                    }
                    action={
                      <button
                        className="set-btn"
                        data-tip={t('creditsTip')}
                        onClick={() => void window.aiOffice.openCreditUsage?.()}
                      >
                        {t('setViewUsage')}
                      </button>
                    }
                  />
                )}
                <LicenseBlock t={t} />
                <div className="set-pane-footer">
                  {loggedIn ? (
                    <button className="set-btn danger" disabled={loggingOut} onClick={onLogout}>
                      {loggingOut ? t('loggingOut') : t('logout')}
                    </button>
                  ) : (
                    <>
                      {loginWaiting && deviceCode && (
                        <input
                          className="set-input set-device-code"
                          readOnly
                          value={deviceCode}
                          aria-label={t('loginDeviceCode')}
                          data-tip={t('loginDeviceCode')}
                          spellCheck={false}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      )}
                      <button className="set-btn primary" onClick={onLogin}>
                        {loginWaiting ? t('waitingShort') : t('loginVega')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {section === 'aiModel' && <AiModelPane t={t} account={{ loggedIn, email }} />}
            {section === 'aiMedia' && (
              <AiMediaPane
                t={t}
                onFileSearchChange={onFileSearchChange}
                focusBlock={target?.block}
              />
            )}
            {section === 'general' && (
              <>
                <h3 className="set-pane-title">{t('setSecGeneral')}</h3>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('language')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={lang}
                    ariaLabel={t('language')}
                    options={LANG_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                    onPick={(v) => setLang(v as typeof lang)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('theme')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={theme}
                    ariaLabel={t('theme')}
                    options={THEME_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => applyTheme(v as UiTheme)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('design')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={design}
                    ariaLabel={t('design')}
                    options={DESIGN_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => applyDesign(v as UiDesign)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('documentTheme')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={docTheme}
                    ariaLabel={t('documentTheme')}
                    options={DOC_THEME_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => applyDocumentTheme(v as DocTheme)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setUiScale')}</div>
                      <div className="set-field-desc">{t('setUiScaleDesc')}</div>
                    </div>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={String(uiScale)}
                    ariaLabel={t('setUiScale')}
                    options={(UI_SCALE_PRESETS.includes(uiScale as (typeof UI_SCALE_PRESETS)[number])
                      ? UI_SCALE_PRESETS
                      : // a non-preset scale (e.g. a 160% system default) stays selectable
                        [...UI_SCALE_PRESETS, uiScale].sort((a, b) => a - b)
                    ).map((p) => ({
                      value: String(p),
                      label: `${uiScalePercent(p)}%`,
                    }))}
                    onPick={(v) => applyUiScaleSetting(Number(v))}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAiEnabled')}</div>
                      <div className="set-field-desc">{t('setAiEnabledDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={aiPrefs.showAiSidebar}
                    aria-label={t('setAiEnabled')}
                    onClick={() => updateAiPrefs({ showAiSidebar: !aiPrefs.showAiSidebar })}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('setAiPanelSide')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={aiPrefs.side}
                    ariaLabel={t('setAiPanelSide')}
                    options={[
                      { value: 'left', label: t('aiPanelSideLeft') },
                      { value: 'right', label: t('aiPanelSideRight') },
                    ]}
                    onPick={(side) => updateAiPrefs({ side: side as AiPanelSide })}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('setAiFontSize')}</label>
                  </div>
                  {aiPrefs.fontSize === 'custom' && (
                    <CustomFontSizeInput
                      value={aiPrefs.customFontSize}
                      label={t('aiFontSizeCustom')}
                      onCommit={(px) => updateAiPrefs({ customFontSize: px })}
                    />
                  )}
                  <Dropdown
                    className="set-dd"
                    value={aiPrefs.fontSize}
                    ariaLabel={t('setAiFontSize')}
                    options={AI_FONT_SIZE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => {
                      const fontSize = v as AiFontSize
                      // start the custom size from the preset being left so nothing jumps
                      updateAiPrefs(
                        fontSize === 'custom' && aiPrefs.fontSize !== 'custom'
                          ? { fontSize, customFontSize: aiPanelFontPx(aiPrefs) }
                          : { fontSize },
                      )
                    }}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAiSpellcheck')}</div>
                      <div className="set-field-desc">{t('setAiSpellcheckDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={aiPrefs.spellcheck}
                    aria-label={t('setAiSpellcheck')}
                    onClick={() => updateAiPrefs({ spellcheck: !aiPrefs.spellcheck })}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAiOpenInNewDocs')}</div>
                      <div className="set-field-desc">{t('setAiOpenInNewDocsDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={aiPrefs.openInNewDocs}
                    aria-label={t('setAiOpenInNewDocs')}
                    onClick={() => updateAiPrefs({ openInNewDocs: !aiPrefs.openInNewDocs })}
                  />
                </div>
                {defaultApp && defaultApp.state !== 'unsupported' && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <div className="set-field-stack">
                        <div className="set-field-label">{t('setDefaultApp')}</div>
                        <div className="set-field-desc">{defaultAppDesc}</div>
                      </div>
                    </div>
                    <button
                      className="set-btn"
                      disabled={defaultAppBusy || defaultApp.state === 'default'}
                      onClick={claimDefaultApp}
                    >
                      {defaultApp.manualOnly
                        ? t('setDefaultAppOpenSettings')
                        : t('setDefaultAppSet')}
                    </button>
                  </div>
                )}
                <Field
                  label={t('saveLocation')}
                  value={saveDir || '—'}
                  valueTitle={saveDir}
                  action={
                    <button className="set-btn" onClick={changeSaveDir}>
                      {t('setChange')}
                    </button>
                  }
                />
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAutoSave')}</div>
                      <div className="set-field-desc">{t('setAutoSaveDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={autoSaveOn}
                    aria-label={t('setAutoSave')}
                    onClick={() => {
                      const next = !autoSaveOn
                      setAutoSaveOn(next)
                      void window.aiOffice.setAutoSaveDefault?.(next).catch(() => {})
                    }}
                  />
                </div>
              </>
            )}
            {section === 'integrations' && (
              <IntegrationsPane t={t} onStatus={(st) => onSkillUpdateDue?.(skillUpdateDue(st))} />
            )}
            {section === 'about' && (
              <>
                <h3 className="set-pane-title">{t('setSecAbout')}</h3>
                <Field label={t('versionLabel')} value={appVersion || '—'} />
                {updateState && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <label className="set-field-label">{t('setUpdateAvailableLabel')}</label>
                    </div>
                    <button
                      type="button"
                      className="set-update-btn"
                      onClick={() => void window.aiOffice.openUpdateDialog?.()}
                    >
                      {updateState.phase === 'downloading'
                        ? t('setUpdateDownloading', {
                            percent: Math.round(updateState.percent),
                          })
                        : updateState.phase === 'downloaded'
                          ? t('setUpdateRestart')
                          : t('setUpdateTo', { version: updateState.version })}
                    </button>
                  </div>
                )}
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('updateChannel')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={channel}
                    ariaLabel={t('updateChannel')}
                    options={CHANNEL_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => {
                      const next = v === 'beta' ? 'beta' : 'stable'
                      setChannel(next)
                      void window.aiOffice.setUpdateChannel(next)
                    }}
                  />
                </div>
                <Field
                  label={t('setWebsite')}
                  value="officevega.com"
                  action={
                    <button
                      className="set-btn"
                      onClick={() => void window.aiOffice.openWebsite?.()}
                    >
                      {t('setOpen')}
                    </button>
                  }
                />
                <Field
                  label={t('setAiProviderSite')}
                  value="api.vega.chat"
                  action={
                    <button
                      className="set-btn"
                      onClick={() => void window.aiOffice.openAiProvider?.()}
                    >
                      {t('setOpen')}
                    </button>
                  }
                />
                <Field
                  label={`${t('setReportBug')} / ${t('setSuggestIdea')}`}
                  value="officevega.com/feedback"
                  action={
                    <button
                      className="set-btn"
                      onClick={() => void window.aiOffice.openFeedback?.()}
                    >
                      {t('setOpen')}
                    </button>
                  }
                />
                <h3 className="set-pane-title set-lic-title">{t('setOtherAiTitle')}</h3>
                <Field
                  label={t('setAiChatLabel')}
                  value={lang === 'ru' ? 'ru.vega.chat' : 'vega.chat'}
                  action={
                    <button
                      className="set-btn"
                      onClick={() => void window.aiOffice.openVegaChat?.()}
                    >
                      {t('setOpen')}
                    </button>
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Friendly label per declared protocol; the wire ids stay the stored value. */
const PROTOCOL_LABEL_KEYS: Record<AiCustomProtocol, StringKey> = {
  'openai-compatible': 'setAiApiOpenai',
  anthropic: 'setAiApiAnthropic',
  gemini: 'setAiApiGemini',
}

/** Placeholder for the model-declaration blob: one entry per declared capability. */
const MODEL_DECLARATION_PLACEHOLDER = ['{', '  "id": "m",', '  "vision": true', '}'].join('\n')

/** Apply one endpoint compat switch: undefined clears it so the heuristic answers again. */
function applySwitch<K extends keyof AiCustomCompat>(
  compat: AiCustomCompat,
  key: K,
  value: boolean | undefined,
): AiCustomCompat {
  if (value === undefined) {
    if (!(key in compat)) return compat
    const next = { ...compat }
    delete next[key]
    return next
  }
  return { ...compat, [key]: value }
}

/** Parse the header textarea: one "Name: Value" per line; false when a line is malformed. */
function parseHeaderLines(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const at = line.indexOf(':')
    if (at <= 0) return undefined
    const name = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim()
    if (!name || !value) return undefined
    out[name] = value
  }
  return out
}

/** A tri-state switch: off = never, on = always, unset (middle) = the shipped heuristic. */
function ProfileSwitch({
  label,
  value,
  onChange,
  texts,
}: {
  label: string
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
  texts: { on: string; off: string; auto: string }
}) {
  return (
    <div className="set-ai-profile-row">
      <span className="set-ai-profile-label">{label}</span>
      {/* one radio group per switch: three buttons without the group role is
          three unrelated toggles to a screen reader */}
      <div className="set-ai-profile-tri" role="radiogroup" aria-label={label}>
        {(
          [
            { option: false, text: texts.off },
            { option: undefined, text: texts.auto },
            { option: true, text: texts.on },
          ] as const
        ).map(({ option, text }) => (
          <button
            key={text}
            type="button"
            className={'set-ai-profile-tri-btn' + (value === option ? ' is-active' : '')}
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A free-text blob (headers / model declarations) committed on blur: the draft
 * lives in component state so a partially typed JSON is never written, and a
 * rejected parse keeps the red border plus the reason until the next edit.
 */
function ProfileBlobField({
  fieldId,
  label,
  hint,
  bad,
  text,
  placeholder,
  multiline,
  onCommit,
}: {
  fieldId: string
  label: string
  hint: string
  bad: string
  text: string
  placeholder: string
  multiline?: boolean
  onCommit: (text: string) => boolean
}) {
  const [draft, setDraft] = useState(text)
  const [invalid, setInvalid] = useState(false)
  const lastCommitted = useRef(text)
  // A settings change from elsewhere (another window, a saved reload) replaces
  // the draft; our own commit updates lastCommitted so the effect stays quiet.
  useEffect(() => {
    if (text === lastCommitted.current) return
    lastCommitted.current = text
    setDraft(text)
    setInvalid(false)
  }, [text])
  return (
    <div className={'set-field' + (multiline ? ' set-ai-profile-blob' : '')}>
      <div className="set-field-text">
        <div className="set-field-stack">
          <label className="set-field-label" htmlFor={fieldId}>
            {label}
          </label>
          <div className="set-field-desc">{invalid ? bad : hint}</div>
        </div>
      </div>
      {multiline ? (
        <textarea
          id={fieldId}
          className={'set-input-multiline' + (invalid ? ' set-input-invalid' : '')}
          value={draft}
          rows={4}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value)
            setInvalid(false)
          }}
          onBlur={() => {
            if (draft === lastCommitted.current) return
            if (onCommit(draft)) {
              lastCommitted.current = draft
              setInvalid(false)
            } else {
              setInvalid(true)
            }
          }}
        />
      ) : (
        <input
          id={fieldId}
          className={'set-input' + (invalid ? ' set-input-invalid' : '')}
          type="text"
          value={draft}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value)
            setInvalid(false)
          }}
          onBlur={() => {
            if (draft === lastCommitted.current) return
            if (onCommit(draft)) {
              lastCommitted.current = draft
              setInvalid(false)
            } else {
              setInvalid(true)
            }
          }}
        />
      )}
    </div>
  )
}
