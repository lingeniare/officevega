/**
 * Fixed aspect ratios for planned visual slots. The outline tags every visual
 * slot — "harbor cranes at dawn [4:3]" — and the tag then drives three stages
 * at once: the image generator's aspect_ratio, the draft placeholder box and
 * the final image element's w/h, so a slot keeps one geometry from plan to
 * landed page instead of being re-fitted (badly) at every stage.
 *
 * Pure module, no imports: the renderer reaches it through the
 * '@genoffice/pipelines/slides/aspect-ratio' subpath — the package index pulls
 * in pptx-engine, which is Node-only.
 */

/** Allowed slot ratios as label → width/height. */
export const IMAGE_ASPECT_RATIOS = [
  ['16:9', 16 / 9],
  ['4:3', 4 / 3],
  ['1:1', 1],
  ['3:4', 3 / 4],
  ['9:16', 9 / 16],
] as const

/** Human-readable ratio list for prompts and warnings: "16:9, 4:3, 1:1, 3:4, 9:16". */
export const IMAGE_ASPECT_LIST = IMAGE_ASPECT_RATIOS.map(([l]) => l).join(', ')

/** Slots without a (valid) tag fall back to the deck canvas ratio. */
export const DEFAULT_IMAGE_ASPECT = '16:9'

/** Trailing aspect tag a slot may carry: "a sunrise shot [4:3]". Accepts :, ：, x and × separators. */
export const SLOT_ASPECT_TAG = /\s*\[\s*(\d+)\s*[:：x×]\s*(\d+)\s*\]\s*$/i

/** A box closer than this to an allowed ratio (log-space) counts as matching — integer px noise is not a violation. */
const ASPECT_MATCH_TOLERANCE = 0.03

/** Nearest allowed ratio label for a width/height quotient. */
export function nearestImageAspect(ratio: number): string {
  let best: string = DEFAULT_IMAGE_ASPECT
  let bestDist = Infinity
  for (const [label, r] of IMAGE_ASPECT_RATIOS) {
    const d = Math.abs(Math.log(ratio / r))
    if (d < bestDist) {
      bestDist = d
      best = label
    }
  }
  return best
}

/** Whether a width/height quotient already is (within px-rounding tolerance) an allowed ratio. */
export function isImageAspect(ratio: number): boolean {
  const target = IMAGE_ASPECT_RATIOS.find(([l]) => l === nearestImageAspect(ratio))![1]
  return Math.abs(Math.log(ratio / target)) < ASPECT_MATCH_TOLERANCE
}

/**
 * Splits a visual slot into its text and declared aspect. The tag is optional
 * and always trailing; an unrecognized ratio snaps to the nearest allowed one.
 * "sunset [4:3]" → { text: 'sunset', aspect: '4:3' }; "sunset" → aspect undefined.
 */
export function splitSlotAspect(slot: string): { text: string; aspect?: string } {
  const s = String(slot)
  const m = SLOT_ASPECT_TAG.exec(s)
  if (!m) return { text: s }
  const w = Number(m[1])
  const h = Number(m[2])
  const text = s.slice(0, m.index).trimEnd()
  if (!w || !h) return { text }
  return { text, aspect: nearestImageAspect(w / h) }
}

export interface AspectBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Snaps a box to an allowed image aspect, position untouched. Prefers growing
 * the shorter side (keeps the planned footprint) and falls back to shrinking
 * the longer one when the grown box would cross a canvas edge. Returns the
 * snapped box and its ratio label, or null when the box already matches.
 *
 * With `aspect` the box is held to that declared ratio (a placeholder's [N:M]
 * tag wins over whatever the box happens to be); without it the box snaps to
 * the nearest allowed ratio.
 */
export function snapToImageAspect(
  box: AspectBox,
  canvasW: number,
  canvasH: number,
  aspect?: string,
): { box: AspectBox; aspect: string } | null {
  const { x, y, w, h } = box
  if (!(w > 0 && h > 0)) return null
  const target = aspect
    ? IMAGE_ASPECT_RATIOS.find(([l]) => l === aspect)?.[1]
    : IMAGE_ASPECT_RATIOS.find(([l]) => l === nearestImageAspect(w / h))![1]
  if (target === undefined || Math.abs(Math.log(w / h / target)) < ASPECT_MATCH_TOLERANCE)
    return null
  const label = aspect ?? nearestImageAspect(w / h)
  // Two ways to reach the target while keeping one side: w' = h·R or h' = w/R;
  // exactly one of them grows the box — prefer it while it stays on the canvas.
  const wFromH = Math.max(1, Math.round(h * target))
  const hFromW = Math.max(1, Math.round(w / target))
  const [grow, shrink]: AspectBox[] =
    wFromH >= w
      ? [
          { x, y, w: wFromH, h },
          { x, y, w, h: hFromW },
        ]
      : [
          { x, y, w, h: hFromW },
          { x, y, w: wFromH, h },
        ]
  const fits = (b: AspectBox) => b.x + b.w <= canvasW && b.y + b.h <= canvasH
  const next = fits(grow)
    ? grow
    : {
        x,
        y,
        w: Math.max(1, Math.min(shrink.w, canvasW - x)),
        h: Math.max(1, Math.min(shrink.h, canvasH - y)),
      }
  if (next.w === w && next.h === h) return null
  return { box: next, aspect: label }
}
