import { describe, expect, it } from 'vitest'
import {
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_PRESETS,
  clampUiScale,
  normalizeUiScale,
  stepUiScale,
  uiScalePercent,
} from '../src/ui-scale'

// genoffice#1913 — interface zoom ladder/normalization shared by every editor
describe('clampUiScale', () => {
  it('passes in-range factors through', () => {
    expect(clampUiScale(1)).toBe(1)
    expect(clampUiScale(1.25)).toBe(1.25)
    expect(clampUiScale(0.5)).toBe(0.5)
    expect(clampUiScale(3)).toBe(3)
  })

  it('clamps to the supported range', () => {
    expect(clampUiScale(0.1)).toBe(UI_SCALE_MIN)
    expect(clampUiScale(10)).toBe(UI_SCALE_MAX)
  })

  it('treats non-finite input as 100%', () => {
    expect(clampUiScale(NaN)).toBe(1)
    expect(clampUiScale(Infinity)).toBe(1)
    expect(clampUiScale(-Infinity)).toBe(1)
  })
})

describe('normalizeUiScale', () => {
  it('rejects non-numbers with the 100% fallback', () => {
    expect(normalizeUiScale(undefined)).toBe(1)
    expect(normalizeUiScale(null)).toBe(1)
    expect(normalizeUiScale('150%')).toBe(1)
    expect(normalizeUiScale({})).toBe(1)
  })

  it('clamps numeric input', () => {
    expect(normalizeUiScale(99)).toBe(UI_SCALE_MAX)
    expect(normalizeUiScale(1.75)).toBe(1.75)
  })
})

describe('stepUiScale', () => {
  it('walks the preset ladder', () => {
    expect(stepUiScale(1, 1)).toBe(1.1)
    expect(stepUiScale(1.1, 1)).toBe(1.25)
    expect(stepUiScale(1.25, -1)).toBe(1.1)
    expect(stepUiScale(0.9, -1)).toBe(0.8)
  })

  it('round-trips through every preset', () => {
    let f: number = UI_SCALE_PRESETS[0]!
    const visited = [f]
    for (let i = 0; i < UI_SCALE_PRESETS.length; i++) {
      f = stepUiScale(f, 1)
      visited.push(f)
    }
    expect(visited.slice(0, UI_SCALE_PRESETS.length)).toEqual([...UI_SCALE_PRESETS])
    for (let i = 0; i < UI_SCALE_PRESETS.length; i++) f = stepUiScale(f, -1)
    expect(f).toBe(UI_SCALE_PRESETS[0])
  })

  it('extends past the ladder ends in 25pt steps within the clamp range', () => {
    expect(stepUiScale(2, 1)).toBe(2.25)
    expect(stepUiScale(2.9, 1)).toBe(UI_SCALE_MAX)
    expect(stepUiScale(0.8, -1)).toBe(0.55)
    expect(stepUiScale(0.6, -1)).toBe(UI_SCALE_MIN)
  })

  it('resumes the ladder from off-preset values (e.g. a 160% system default)', () => {
    expect(stepUiScale(1.6, 1)).toBe(1.75)
    expect(stepUiScale(1.6, -1)).toBe(1.5)
    expect(stepUiScale(0.85, 1)).toBe(0.9)
  })
})

describe('uiScalePercent', () => {
  it('renders whole percents', () => {
    expect(uiScalePercent(1)).toBe(100)
    expect(uiScalePercent(1.25)).toBe(125)
    expect(uiScalePercent(0.8)).toBe(80)
  })

  it('clamps before labelling', () => {
    expect(uiScalePercent(99)).toBe(300)
  })
})
