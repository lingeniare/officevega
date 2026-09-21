import { _electron as electron } from 'playwright-core'

delete process.env.ELECTRON_RUN_AS_NODE

const app = await electron.launch({
  args: ['.scratch-measure/electron-main.js'],
  env: { ...process.env, MEASURE_URL: 'http://localhost:5196' },
})
const page = await app.firstWindow()
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 250)))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)))
await page.addInitScript(() => {
  const overrides = { getLanguage: () => Promise.resolve('en'), getTheme: () => Promise.resolve('system') }
  const stub = new Proxy(
    {},
    {
      get: (t, k) => {
        if (k === 'then') return undefined
        if (k in overrides) return overrides[k]
        if (!(k in t)) {
          t[k] = String(k).startsWith('on') ? () => () => {} : () => Promise.resolve(null)
        }
        return t[k]
      },
    },
  )
  for (const name of ['pdfApi', 'docsApi', 'slidesApi', 'sheetsApi', 'mdApi', 'htmlApi', 'api', 'desktopApi']) {
    if (!(name in window)) window[name] = stub
  }
})
await page.reload()
await page.waitForTimeout(12000)
const html = await page.evaluate(() => document.getElementById('root')?.innerHTML || '(empty root)')
console.log('--- root innerHTML (first 1500) ---')
console.log(html.slice(0, 1500))
await page.screenshot({ path: '.scratch-measure/probe.png' })
await app.close()
