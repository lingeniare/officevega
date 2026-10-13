import { uiScaleFactor } from '@genoffice/ui'

/// genoffice#1913 — interface zoom vs worksheet zoom.
///
/// The worksheet zoom Univer stores is document data: Excel persists it in
/// sheetView/@zoomScale, and our edit journal writes it back out on save — so
/// the interface factor can't simply live in it. Each worksheet instead renders
/// `intended / F` while this module tracks the user-facing ratio per sheet, so
/// a later factor change rescales the sheet on the way in and the journal sees
/// the intended value only.

/** worksheet.getZoom() → the user's zoom ratio (what % labels and saves mean) */
export const zoomToIntended = (ratio: number): number => ratio * uiScaleFactor()

/** user ratio → the value to pass to worksheet.zoom() / zoomRatio configs */
export const zoomToDisplay = (ratio: number): number => ratio / uiScaleFactor()

const intendedBySheet = new Map<string, number>()

interface ZoomableSheet {
  getSheetId(): string
  getZoom(): number
  zoom(ratio: number): void
}

/**
 * Re-assert `intended / F` on a sheet that may have been created or last zoomed
 * under another factor. Call on sheet activation and on uiScaleChanged for the
 * active sheet; the first call after sheet creation adopts its stored ratio as
 * intended (the creation config already divides by F, so the product round-trips).
 */
export function ensureSheetUiZoom(worksheet: ZoomableSheet): void {
  const id = worksheet.getSheetId()
  const intended = intendedBySheet.get(id)
  if (intended === undefined) {
    intendedBySheet.set(id, zoomToIntended(worksheet.getZoom()))
    return
  }
  const want = zoomToDisplay(intended)
  if (Math.abs(worksheet.getZoom() - want) > 1e-6) worksheet.zoom(want)
}

/** Record the intended ratio after any zoom change (SheetZoomChanged event). */
export function noteSheetIntendedZoom(worksheet: ZoomableSheet): void {
  intendedBySheet.set(worksheet.getSheetId(), zoomToIntended(worksheet.getZoom()))
}
