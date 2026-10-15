import type { Lang } from '@genoffice/i18n'
import type { CropEdge } from './image-dialogs'

// Shared accessible names for the crop edge handles, so every edge is reachable
// by keyboard and still announced in the editor's own language.
export const CROP_EDGE_LABELS: Record<Lang, Record<CropEdge, string>> = {
  en: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  ru: {
    nw: 'Верхний левый край',
    n: 'Верхний край',
    ne: 'Верхний правый край',
    e: 'Правый край',
    se: 'Нижний правый край',
    s: 'Нижний край',
    sw: 'Нижний левый край',
    w: 'Левый край',
  },
  
  
  
  
  
  
  
  uz: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  kk: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  az: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  tk: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  ky: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  tt: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
  ka: {
    nw: 'Top left edge',
    n: 'Top edge',
    ne: 'Top right edge',
    e: 'Right edge',
    se: 'Bottom right edge',
    s: 'Bottom edge',
    sw: 'Bottom left edge',
    w: 'Left edge',
  },
}
