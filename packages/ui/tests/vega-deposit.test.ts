import { describe, expect, it } from 'vitest'

import { formatVegaDeposit } from '../src/vega-deposit'

/** ICU versions differ on the ru-RU group separator (NBSP vs narrow NBSP) */
const groupSafe = (s: string) => s.replace(/[\u00a0\u202f ]/g, ' ')

describe('formatVegaDeposit', () => {
  it('returns null when no deposit figure is available', () => {
    expect(formatVegaDeposit(null, 'ru')).toBeNull()
    expect(formatVegaDeposit(undefined, 'en')).toBeNull()
    expect(formatVegaDeposit({ loggedIn: true }, 'ru')).toBeNull()
    expect(formatVegaDeposit({ balance: Number.NaN }, 'en')).toBeNull()
  })

  it('shows whole rubles for the ru and tt locales', () => {
    const status = { balance: 156.4, balanceRub: 14561.22, currency: 'USD' }
    expect(groupSafe(formatVegaDeposit(status, 'ru')!.label)).toBe('14 561 ₽')
    expect(groupSafe(formatVegaDeposit(status, 'tt')!.label)).toBe('14 561 ₽')
  })

  it('shows whole dollars for every other locale', () => {
    const status = { balance: 156.4, balanceRub: 14561.22, currency: 'USD' }
    expect(groupSafe(formatVegaDeposit(status, 'en')!.label)).toBe('156 $')
    expect(groupSafe(formatVegaDeposit(status, 'de')!.label)).toBe('156 $')
    expect(groupSafe(formatVegaDeposit(status, 'zh')!.label)).toBe('156 $')
  })

  it('groups thousands in the dollar label', () => {
    expect(groupSafe(formatVegaDeposit({ balance: 14561.22 }, 'en')!.label)).toBe(
      '14,561 $',
    )
  })

  it('falls back to the dollar figure for ru/tt when balanceRub is missing', () => {
    expect(groupSafe(formatVegaDeposit({ balance: 156.6 }, 'ru')!.label)).toBe('157 $')
  })

  it('keeps the Settings › Account precision in the title', () => {
    const status = { balance: 156, balanceRub: 14561.22, currency: 'USD' }
    expect(groupSafe(formatVegaDeposit(status, 'ru')!.title)).toBe(
      '14 561,22 ₽ (156,00 $)',
    )
    expect(groupSafe(formatVegaDeposit(status, 'en')!.title)).toBe('156.00 $')
  })

  it('honors a non-USD currency code', () => {
    expect(groupSafe(formatVegaDeposit({ balance: 10, currency: 'EUR' }, 'en')!.label)).toBe(
      '10 EUR',
    )
  })
})
