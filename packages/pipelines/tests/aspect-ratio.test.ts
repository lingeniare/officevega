/**
 * Fixed slot-aspect helpers: tag parsing on outline slot strings and the
 * geometry snap applied to image boxes / IMAGE: placeholders at spec time.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_IMAGE_ASPECT,
  isImageAspect,
  nearestImageAspect,
  snapToImageAspect,
  splitSlotAspect,
} from '../src/slides/aspect-ratio'

describe('splitSlotAspect', () => {
  it('splits a trailing [N:M] tag off the slot text', () => {
    expect(splitSlotAspect('harbor cranes at dawn [4:3]')).toEqual({
      text: 'harbor cranes at dawn',
      aspect: '4:3',
    })
    expect(splitSlotAspect('hero banner[16:9]')).toEqual({
      text: 'hero banner',
      aspect: '16:9',
    })
    expect(splitSlotAspect('https://cdn.example/pic.png [9:16]')).toEqual({
      text: 'https://cdn.example/pic.png',
      aspect: '9:16',
    })
  })

  it('accepts x/×/：separators and normalizes reducible tags to the set label', () => {
    expect(splitSlotAspect('sq [2x2]').aspect).toBe('1:1')
    expect(splitSlotAspect('sq [2：2]').aspect).toBe('1:1')
    expect(splitSlotAspect('sq [8:6]').aspect).toBe('4:3')
  })

  it('returns no aspect for untagged slots and snaps unknown tags to the nearest allowed ratio', () => {
    expect(splitSlotAspect('harbor cranes at dawn')).toEqual({
      text: 'harbor cranes at dawn',
      aspect: undefined,
    })
    expect(splitSlotAspect('wide [7:3]').aspect).toBe('16:9') // 2.33 → nearer 1.78 than anything else
    expect(splitSlotAspect('tall [1:2]').aspect).toBe('9:16')
    expect(splitSlotAspect('empty [0:0]')).toEqual({ text: 'empty', aspect: undefined })
    // A bracketed word that is not N:M stays part of the text
    expect(splitSlotAspect('hero [wide]').aspect).toBeUndefined()
  })
})

describe('nearestImageAspect / isImageAspect', () => {
  it('picks the nearest allowed ratio', () => {
    expect(nearestImageAspect(2)).toBe('16:9')
    expect(nearestImageAspect(1)).toBe('1:1')
    expect(nearestImageAspect(0.6)).toBe('9:16')
    expect(nearestImageAspect(1.4)).toBe('4:3')
    expect(nearestImageAspect(0.8)).toBe('3:4')
  })

  it('treats integer-px noise as matching but not a genuinely foreign ratio', () => {
    expect(isImageAspect(1280 / 720)).toBe(true)
    expect(isImageAspect(641 / 360)).toBe(true)
    expect(isImageAspect(3 / 2)).toBe(false)
    expect(isImageAspect(1 / 3)).toBe(false)
  })

  it('keeps DEFAULT_IMAGE_ASPECT inside the allowed set', () => {
    expect(isImageAspect(16 / 9)).toBe(true)
    expect(DEFAULT_IMAGE_ASPECT).toBe('16:9')
  })
})

describe('snapToImageAspect', () => {
  const W = 1280
  const H = 720

  it('returns null for a box already on an allowed aspect', () => {
    expect(snapToImageAspect({ x: 0, y: 0, w: 1280, h: 720 }, W, H)).toBeNull()
    expect(snapToImageAspect({ x: 80, y: 60, w: 300, h: 400 }, W, H)).toBeNull() // 3:4
  })

  it('grows the shorter side to reach the nearest ratio (a narrow strip becomes a real portrait)', () => {
    const r = snapToImageAspect({ x: 100, y: 60, w: 200, h: 600 }, W, H)
    expect(r?.aspect).toBe('9:16')
    expect(r?.box).toEqual({ x: 100, y: 60, w: 338, h: 600 })
  })

  it('shrinks the longer side when growing would cross the canvas edge', () => {
    // Right-edge strip: widening to 9:16 would overflow — shrink the height instead.
    const r = snapToImageAspect({ x: 1200, y: 100, w: 60, h: 600 }, W, H)
    expect(r?.aspect).toBe('9:16')
    expect(r?.box).toEqual({ x: 1200, y: 100, w: 60, h: 107 })
    expect(r!.box.x + r!.box.w).toBeLessThanOrEqual(W)
  })

  it('widens a too-flat box to the nearest wide ratio', () => {
    const r = snapToImageAspect({ x: 100, y: 100, w: 400, h: 100 }, W, H) // 4:1 → 16:9
    expect(r?.aspect).toBe('16:9')
    expect(r?.box).toEqual({ x: 100, y: 100, w: 400, h: 225 })
  })

  it('keeps a corner box inside by shrinking the width when height growth would overflow', () => {
    // Bottom-right corner: 100x160 → 9:16 wants h=178 which crosses the bottom
    // edge, so the width shrinks to 90 instead.
    const r = snapToImageAspect({ x: 1160, y: 560, w: 100, h: 160 }, W, H)
    expect(r?.aspect).toBe('9:16')
    expect(r?.box).toEqual({ x: 1160, y: 560, w: 90, h: 160 })
    expect(r!.box.x + r!.box.w).toBeLessThanOrEqual(W)
  })

  it('holds the box to a declared aspect instead of the nearest allowed one', () => {
    // A [1:1]-tagged slot in a strip-shaped box becomes square, not 9:16.
    const r = snapToImageAspect({ x: 100, y: 60, w: 200, h: 600 }, W, H, '1:1')
    expect(r?.aspect).toBe('1:1')
    expect(r?.box).toEqual({ x: 100, y: 60, w: 600, h: 600 })
  })

  it('reshapes a box that matches a different allowed ratio when the tag declares another', () => {
    const r = snapToImageAspect({ x: 60, y: 60, w: 480, h: 270 }, W, H, '9:16')
    expect(r?.aspect).toBe('9:16')
    expect(r?.box).toEqual({ x: 60, y: 60, w: 152, h: 270 })
  })

  it('returns null when the box already matches the declared aspect', () => {
    expect(snapToImageAspect({ x: 0, y: 0, w: 300, h: 400 }, W, H, '3:4')).toBeNull()
  })
})
