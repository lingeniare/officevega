import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { launchShell, closeAndSaveVideo, screenshotPath } from './helpers'

test('Decision model reranking lives in the AI Media & Search pane, saves with it, and reports its own test verdict', async () => {
  // the star prompt card sits over the pane footer on a small window
  const launched = await launchShell({
    onboardingSeen: true,
    settings: { starPrompt: { resolved: true } },
    videoDir: 'settings-media-search',
  })
  const { page, userDataDir } = launched
  try {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.locator('.set-nav-item').filter({ hasText: 'General' }).click()
    await expect(page.getByRole('switch', { name: 'Decision model reranking' })).toHaveCount(0)

    await page.locator('.set-nav-item').filter({ hasText: 'AI Media & Search' }).click()
    const block = page.locator('section', {
      has: page.locator('.set-pane-subtitle', { hasText: 'Local file search' }),
    })
    const toggle = block.getByRole('switch', { name: 'Decision model reranking' })
    // absent = on: the VEGA endpoint rides the sign-in key, so a fresh profile
    // starts with reranking enabled
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // without a licence only the VEGA endpoint is selectable
    await block.getByRole('button', { name: 'Decision model endpoint', exact: true }).click()
    await expect(
      page.getByRole('option', { name: 'Jev (TypeSafe API)', exact: true }),
    ).toBeDisabled()
    await page.getByRole('option', { name: 'VEGA', exact: true }).click()

    // the block reports its own verdict: no sign-in, nothing leaves the machine
    await page.getByRole('button', { name: 'Test connection', exact: true }).click()
    await expect(block.locator('.set-ai-status.err')).toHaveText(
      'Sign in to VEGA or enter an API key',
    )
    // test verdicts live only on the blocks — the sticky pane head keeps just
    // the autosave pill so no result floats over the scrolled rows
    await expect(page.locator('.set-pane-actions .set-ai-status.err')).toHaveCount(0)
    await page.screenshot({ path: screenshotPath('settings-media-search-test') })

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.set-pane-actions .set-ai-status.ok')).toHaveText('Saved')
    await expect
      .poll(async () => {
        const saved = JSON.parse(await readFile(join(userDataDir, 'app-settings.json'), 'utf8'))
        return saved.fileSearch
      })
      .toEqual({
        rerank: true,
        endpoint: 'vega',
        keys: {
          vega: '',
          openrouter: '',
          direct: '',
          perplexity: '',
          cloudflare: '',
          kev: '',
          rizzo: '',
          custom: '',
        },
        customBaseUrl: '',
        customModel: '',
        cloudflareAccountId: '',
        cloudflareModel: '@cf/cloudflare/clef',
      })
  } finally {
    await closeAndSaveVideo(launched, 'settings-media-search')
  }
})
