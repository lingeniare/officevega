/**
 * Link annotations for a merged PDF export. pdf-lib's copyPages drops every
 * annotation, so the fragments Chromium emitted lose their links; the merged
 * document re-emits them from the renderer's measured geometry (PdfLinkPlan):
 * internal links become direct /Dest [page /XYZ 0 y null] jumps — resolvable
 * across printed groups, which fragment-local named destinations never could
 * be — and external http(s)/mailto links become /URI actions.
 *
 * Electron-free so vitest can exercise it with an in-memory PDFDocument.
 */
import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRef,
  PDFString,
} from 'pdf-lib'
import type { PdfLinkPlan } from '../shared/ipc'

/** preview page index → merged page index, following the emitted group order */
function mergedPageIndex(plan: PdfLinkPlan): Map<number, number> {
  const index = new Map<number, number>()
  let offset = 0
  for (const g of plan.groups) {
    for (let i = g.from; i <= g.to; i++) index.set(i, offset + (i - g.from))
    offset += g.to - g.from + 1
  }
  return index
}

/**
 * Writes one /Link annotation per planned link onto the merged pages.
 * Returns the number of annotations applied; links whose target page or
 * bookmark can't be resolved are skipped rather than failing the export.
 */
export function applyPdfLinkPlan(doc: PDFDocument, plan: PdfLinkPlan): number {
  const index = mergedPageIndex(plan)
  const pages = doc.getPages()
  let applied = 0
  for (const link of plan.links) {
    const mi = index.get(link.page)
    const page = mi == null ? undefined : pages[mi]
    if (!page) continue
    let extra: Record<string, unknown>
    if (link.kind === 'dest') {
      const target = link.target ? plan.targets[link.target] : undefined
      const targetPage = target == null ? undefined : pages[index.get(target.page) ?? -1]
      if (!target || !targetPage) continue
      extra = { Dest: [targetPage.ref, PDFName.of('XYZ'), 0, target.y, null] }
    } else {
      if (!link.url) continue
      extra = {
        A: doc.context.obj({
          Type: PDFName.of('Action'),
          S: PDFName.of('URI'),
          URI: PDFString.of(link.url),
        }),
      }
    }
    const annot = doc.context.register(
      doc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        // print flag (matches the annotation style Chromium writes)
        F: 4,
        Border: [0, 0, 0],
        Rect: link.rect,
        ...extra,
      }),
    )
    const existing = page.node.get(PDFName.of('Annots'))
    const resolved = existing instanceof PDFRef ? doc.context.lookup(existing) : existing
    if (resolved instanceof PDFArray) resolved.push(annot)
    else page.node.set(PDFName.of('Annots'), doc.context.obj([annot]))
    applied++
  }
  return applied
}
