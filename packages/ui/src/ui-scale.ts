/**
 * Suite-wide interface zoom (genoffice#1913): webContents.setZoomFactor scales
 * chrome AND document surfaces together, so each app divides its own document
 * zoom by this factor to keep document zoom independent. Persisted by the
 * shell in app-settings.json and broadcast on 'app:ui-scale-changed'.
 */
export const UI_SCALE_MIN = 0.5
export const UI_SCALE_MAX = 3

/** preset ladder from the issue; the View-menu +/- steps jump between these */
export const UI_SCALE_PRESETS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const

export function clampUiScale(factor: number): number {
  if (!Number.isFinite(factor)) return 1
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, factor))
}

/**
 * Menu zoom-in/out: jump to the next preset like the document zoom menus do;
 * past the ladder ends, keep going in 25pt steps inside the clamp range.
 */
export function stepUiScale(current: number, dir: 1 | -1): number {
  const c = clampUiScale(current)
  if (dir > 0) {
    const next = UI_SCALE_PRESETS.find((p) => p > c + 1e-6)
    return next ?? clampUiScale(c + 0.25)
  }
  const prev = [...UI_SCALE_PRESETS].reverse().find((p) => p < c - 1e-6)
  return prev ?? clampUiScale(c - 0.25)
}

export function normalizeUiScale(raw: unknown): number {
  return typeof raw === 'number' ? clampUiScale(raw) : 1
}

/** whole-percent label for menus and the settings picker ('125%') */
export function uiScalePercent(factor: number): number {
  return Math.round(clampUiScale(factor) * 100)
}
