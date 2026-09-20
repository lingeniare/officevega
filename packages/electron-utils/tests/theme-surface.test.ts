import { describe, expect, it, vi } from 'vitest'

const electronMock = vi.hoisted(() => ({ shouldUseDarkColors: false }))

vi.mock('electron', () => ({
  nativeTheme: {
    get shouldUseDarkColors() {
      return electronMock.shouldUseDarkColors
    },
  },
}))

import { themedSurfaceColor } from '../src/theme-surface'

describe('themedSurfaceColor', () => {
  it('returns the light --surface value in light mode', () => {
    electronMock.shouldUseDarkColors = false
    expect(themedSurfaceColor()).toBe('#ffffff')
  })

  it('returns the dark --surface value in dark mode', () => {
    electronMock.shouldUseDarkColors = true
    expect(themedSurfaceColor()).toBe('#1e1e1e')
  })
})
