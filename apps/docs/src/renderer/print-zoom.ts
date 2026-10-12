/**
 * Chromium lays print jobs out at device scale 1, but pagination measured the
 * canvas at the screen's scale, and Blink rounds font ascent/descent to device
 * pixels: a line whose height comes from a taller secondary-font run is up to
 * half a pixel shorter in print than on a Retina screen. Across a document the
 * drift reaches several pixels and the fixed page clips cut through glyphs at
 * the seams. Zooming the sheets by the screen ratio and printing at the inverse
 * scale reproduces the screen rounding, so print geometry equals measurement.
 */

import { pdfAnchorId } from './editor/link-actions'

// Chromium accepts printToPDF scales in 0.1..2
const MAX_ZOOM = 10
const MIN_ZOOM = 0.5

export function printZoom(dpr: number = window.devicePixelRatio): number {
  if (!(dpr > 0) || Math.abs(dpr - 1) < 1e-3) return 1
  return Math.min(Math.max(dpr, MIN_ZOOM), MAX_ZOOM)
}

const previewRoot = () => document.querySelector<HTMLElement>('.pagination-preview')

/**
 * Installs resolvable ids (bk--name) on the bookmarked blocks of the surface
 * about to be printed: Chromium's print/printToPDF resolves <a href="#id">
 * only against laid-out elements, and resolves to the FIRST id match in DOM
 * order even when that copy is print-hidden — so the live editor and the
 * preview clones must never hold ids at the same time. Ids go on
 * .pagination-preview when it exists (the preview is what prints), on the
 * live editor otherwise; a block carrying several bookmarks gets transient
 * child anchors for every name past the first.
 *
 * When the printed surface is the live ProseMirror DOM, pass the editor view:
 * its domObserver is paused while the ids are installed and restored, so
 * ProseMirror never tries to reconcile the foreign attributes/children.
 */
export function installPdfAnchorIds(view?: unknown): () => void {
  const pv = previewRoot()
  const root: ParentNode = pv ?? document
  // domObserver is private in prosemirror-view's typings; the codebase reaches
  // it via a structural cast (App.tsx, pagination-gaps.ts do the same)
  const obs =
    pv === null
      ? (view as { domObserver?: { stop(): void; start(): void } } | undefined)
          ?.domObserver
      : undefined
  const prevIds: { el: HTMLElement; id: string | null }[] = []
  const added: HTMLElement[] = []
  obs?.stop()
  root.querySelectorAll<HTMLElement>('[data-bookmarks]').forEach((el) => {
    const names = (el.dataset.bookmarks ?? '').split(' ').filter(Boolean)
    const first = names[0]
    if (first == null) return
    prevIds.push({ el, id: el.getAttribute('id') })
    el.id = pdfAnchorId(first)
    for (const name of names.slice(1)) {
      const marker = document.createElement('a')
      marker.id = pdfAnchorId(name)
      marker.className = 'doc-bm-anchor'
      el.prepend(marker)
      added.push(marker)
    }
  })
  return () => {
    for (const marker of added) marker.remove()
    for (const { el, id } of prevIds) {
      if (id === null) el.removeAttribute('id')
      else el.setAttribute('id', id)
    }
    obs?.start()
  }
}

/** Zooms the preview sheets for print (print media only) and returns the job's print scale. */
export function setPrintZoom(): number {
  const zoom = printZoom()
  if (zoom !== 1) previewRoot()?.style.setProperty('--pv-print-zoom', String(zoom))
  return 1 / zoom
}

export function clearPrintZoom(): void {
  previewRoot()?.style.removeProperty('--pv-print-zoom')
}
