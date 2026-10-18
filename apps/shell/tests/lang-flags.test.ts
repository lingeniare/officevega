/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { LangFlag } from '../src/renderer/src/lang-flags'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('LangFlag', () => {
  it('draws an 18x12 flag for every supported language', () => {
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          LANGS.map((lang) => createElement(LangFlag, { key: lang, lang })),
        ),
      )
    })
    const svgs = host.querySelectorAll('svg.set-lang-flag')
    expect(svgs.length).toBe(LANGS.length)
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 18 12')
      expect(svg.querySelector('g')).not.toBeNull()
    }
  })

  it('gives each mounted flag a unique clipPath id', () => {
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          createElement(LangFlag, { lang: 'ru' }),
          createElement(LangFlag, { lang: 'ru' }),
        ),
      )
    })
    const ids = [...host.querySelectorAll('clipPath')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
