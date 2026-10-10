/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { LocaleProvider } from '../src/renderer/src/locale'
import { HelpScreen } from '../src/renderer/src/i18n/help/HelpScreen'
import { helpBody, manualLangFor } from '../src/renderer/src/i18n/help/help-registry'
import { topicTitle } from '../src/renderer/src/i18n/help/help-titles'

/**
 * The manual ships two editions: Russian for the former USSR and the CIS, and
 * English for everyone else. The edition follows the system region, not the
 * shell's UI language.
 */

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const TOPIC = 'getting-started'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Element.prototype.scrollTo ??= function scrollTo(): void {}
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function setSystemLocale(locale: string): void {
  Object.defineProperty(navigator, 'language', { value: locale, configurable: true })
}

/** Wait until the article shows the phrase the caller is about to assert. */
async function settle(view: HTMLDivElement, expected: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const text = view.querySelector('.help-article')?.textContent ?? ''
    if (text.includes(expected)) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))
    })
  }
}

async function renderManual(uiLang: 'en' | 'ja' | 'de' | 'ru', expected: string): Promise<HTMLDivElement> {
  act(() => {
    root.render(
      createElement(LocaleProvider, { initial: uiLang, children: createElement(HelpScreen) }),
    )
  })
  // The screen opens on the first topic (install); open the asserted one by name.
  const button = [...host.querySelectorAll('button.help-topic')].find(
    (b) => b.textContent?.trim() === expected,
  )
  if (button) {
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }
  await settle(host, expected)
  return host
}

describe('manualLangFor', () => {
  it('gives Russian for the former USSR and the CIS, by region', () => {
    for (const locale of ['ru-RU', 'be-BY', 'kk-KZ', 'uk-UA', 'uz-UZ', 'hy-AM', 'lv-LV']) {
      expect(manualLangFor(locale), locale).toBe('ru')
    }
  })

  it('gives English for every other region, whatever the language', () => {
    for (const locale of ['en-US', 'de-DE', 'zh-CN', 'ja-JP', 'fr-FR', 'tr-TR']) {
      expect(manualLangFor(locale), locale).toBe('en')
    }
  })

  it('falls back to the language when the locale names no region', () => {
    expect(manualLangFor('ru')).toBe('ru')
    expect(manualLangFor('uk')).toBe('ru')
    expect(manualLangFor('de')).toBe('en')
  })

  it('gives English when there is no usable locale', () => {
    expect(manualLangFor(undefined)).toBe('en')
    expect(manualLangFor('')).toBe('en')
    expect(manualLangFor('not a locale!!')).toBe('en')
  })
})

describe('the manual renders in the edition the system region picks', () => {
  it('has a body and a title for both editions', async () => {
    expect((await helpBody(TOPIC, 'ru')) ?? '').toContain('Быстрый старт')
    expect((await helpBody(TOPIC, 'en')) ?? '').toContain('Quick start')
    expect(topicTitle(TOPIC, 'ru')).not.toBe(topicTitle(TOPIC, 'en'))
  })

  it('shows the Russian edition for a Russian region, even with an English UI', async () => {
    setSystemLocale('kk-KZ')
    const view = await renderManual('en', topicTitle(TOPIC, 'ru'))
    expect(view.querySelector('h1')?.textContent).toBe(topicTitle(TOPIC, 'ru'))
  })

  it('shows the English edition elsewhere, even with a Russian UI', async () => {
    setSystemLocale('de-DE')
    const view = await renderManual('ru', topicTitle(TOPIC, 'en'))
    expect(view.querySelector('h1')?.textContent).toBe(topicTitle(TOPIC, 'en'))
  })
})
