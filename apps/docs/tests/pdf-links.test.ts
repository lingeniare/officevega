/**
 * #1975: merged-PDF link annotations. pdf-lib copyPages drops every Annots
 * entry, so applyPdfLinkPlan re-emits them from renderer-measured geometry:
 * internal links become direct [page /XYZ 0 y null] dests that survive
 * cross-chunk references, external links become /URI actions.
 */
import { describe, expect, it } from 'vitest'
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFString,
  type PDFRef,
} from 'pdf-lib'
import { applyPdfLinkPlan } from '../src/main/pdf-links'
import type { PdfLinkPlan } from '../src/shared/ipc'

async function mergedTwoFragments(): Promise<PDFDocument> {
  // two 1-page "fragments" mimicking two printToPDF chunks
  const merged = await PDFDocument.create()
  for (let i = 0; i < 2; i++) {
    const part = await PDFDocument.create()
    part.addPage([600, 800])
    const pages = await merged.copyPages(part, part.getPageIndices())
    for (const p of pages) merged.addPage(p)
  }
  return merged
}

function annotDict(doc: PDFDocument, pageIndex: number, annotIndex = 0): PDFDict {
  const annots = doc.context.lookup(
    doc.getPages()[pageIndex].node.get(PDFName.of('Annots')),
  ) as PDFArray
  return doc.context.lookup(annots.get(annotIndex) as PDFRef) as PDFDict
}

describe('applyPdfLinkPlan', () => {
  it('emits a direct Dest for an internal link, retargeted across group boundaries', async () => {
    const doc = await mergedTwoFragments()
    // fragment 1 printed preview page 0; fragment 2 printed preview page 1
    const plan: PdfLinkPlan = {
      groups: [{ from: 0, to: 0 }, { from: 1, to: 1 }],
      links: [
        {
          kind: 'dest',
          page: 0,
          rect: [30, 800, 100, 815],
          target: '_Toc42',
        },
      ],
      targets: { _Toc42: { page: 1, y: 700 } },
    }
    expect(applyPdfLinkPlan(doc, plan)).toBe(1)
    const annot = annotDict(doc, 0)
    expect(annot.get(PDFName.of('Subtype'))?.toString()).toBe('/Link')
    // Dest is an inline array [pageRef /XYZ 0 y null], not a named dest
    const dest = annot.get(PDFName.of('Dest')) as PDFArray
    expect(dest.get(0)).toBe(doc.getPages()[1].ref)
    expect((dest.get(3) as PDFNumber).asNumber()).toBe(700)
    expect(annot.get(PDFName.of('Rect'))?.toString()).toBe('[ 30 800 100 815 ]')
  })

  it('emits a URI action for external links', async () => {
    const doc = await mergedTwoFragments()
    const plan: PdfLinkPlan = {
      groups: [{ from: 0, to: 1 }],
      links: [{ kind: 'uri', page: 1, rect: [10, 10, 50, 20], url: 'https://example.com/x' }],
      targets: {},
    }
    expect(applyPdfLinkPlan(doc, plan)).toBe(1)
    const annot = annotDict(doc, 1)
    const action = doc.context.lookup(annot.get(PDFName.of('A')) as PDFRef) as PDFDict
    expect(action.get(PDFName.of('S'))?.toString()).toBe('/URI')
    expect((action.get(PDFName.of('URI')) as PDFString).decodeText()).toBe(
      'https://example.com/x',
    )
  })

  it('skips links whose target bookmark or page is unknown instead of failing', async () => {
    const doc = await mergedTwoFragments()
    const plan: PdfLinkPlan = {
      groups: [{ from: 0, to: 1 }],
      links: [
        { kind: 'dest', page: 0, rect: [0, 0, 1, 1], target: 'missing' },
        { kind: 'dest', page: 99, rect: [0, 0, 1, 1], target: 'ok' },
      ],
      targets: { ok: { page: 0, y: 100 } },
    }
    expect(applyPdfLinkPlan(doc, plan)).toBe(0)
  })
})
