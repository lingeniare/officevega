import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyUiScale } from '@genoffice/ui'

import {
  ensureSheetUiZoom,
  noteSheetIntendedZoom,
  zoomToDisplay,
  zoomToIntended,
} from '../src/renderer/sheet-ui-zoom'

// genoffice#1913 — the worksheet zoom Univer renders must stay the intended
// ratio divided by the interface factor, while XLSX persistence keeps seeing
// the intended ratio only.
function fakeSheet(id: string, zoom: number) {
  return {
    getSheetId: () => id,
    getZoom: () => zoom,
    zoom: vi.fn((ratio: number) => {
      zoom = ratio
    }),
  }
}

beforeEach(() => {
  applyUiScale(1)
})

describe('zoomToDisplay / zoomToIntended', () => {
  it('round-trips through the interface factor', () => {
    applyUiScale(1.5)
    expect(zoomToDisplay(1.2)).toBeCloseTo(0.8)
    expect(zoomToIntended(zoomToDisplay(1.2))).toBeCloseTo(1.2)
  })

  it('is identity at 100% interface scale', () => {
    expect(zoomToDisplay(1.4)).toBe(1.4)
    expect(zoomToIntended(1.4)).toBe(1.4)
  })
})

describe('ensureSheetUiZoom', () => {
  it('adopts the stored ratio as intended on first sight', () => {
    applyUiScale(2)
    const ws = fakeSheet('s1', 0.6) // created with zoomToDisplay(1.2)
    ensureSheetUiZoom(ws)
    expect(ws.zoom).not.toHaveBeenCalled()
    expect(zoomToIntended(ws.getZoom())).toBeCloseTo(1.2)
  })

  it('rescales a sheet rendered under another factor', () => {
    const ws = fakeSheet('s2', 1)
    ensureSheetUiZoom(ws) // adopts intended = 1 at F=1
    applyUiScale(2)
    ensureSheetUiZoom(ws)
    expect(ws.zoom).toHaveBeenCalledWith(0.5)
  })

  it('leaves an already-correct sheet untouched', () => {
    applyUiScale(1.25)
    const ws = fakeSheet('s3', 0.8) // intended 1.0 at F=1.25
    noteSheetIntendedZoom(ws)
    ws.zoom.mockClear()
    ensureSheetUiZoom(ws)
    expect(ws.zoom).not.toHaveBeenCalled()
  })
})

describe('noteSheetIntendedZoom', () => {
  it('stores the user-facing ratio, not the rendered one', () => {
    applyUiScale(2)
    const ws = fakeSheet('s4', 0.55)
    noteSheetIntendedZoom(ws)
    applyUiScale(1)
    ensureSheetUiZoom(ws)
    // intended was 0.55 × 2 = 1.1; at F=1 the sheet zooms to the intended value
    expect(ws.zoom).toHaveBeenCalledWith(1.1)
  })
})
