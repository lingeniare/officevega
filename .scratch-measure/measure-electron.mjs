import { _electron as electron } from 'playwright-core'

delete process.env.ELECTRON_RUN_AS_NODE

const app = await electron.launch({ args: ['.scratch-measure/electron-main.js'] })
const page = await app.firstWindow()
await page.waitForSelector('#fileBtn')

const info = await page.evaluate(() => {
  const btn = document.getElementById('fileBtn')
  const r = btn.getBoundingClientRect()
  const cs = getComputedStyle(btn)
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tr = range.getBoundingClientRect()
  return {
    btnRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    textRect: { x: tr.x, y: tr.y, w: tr.width, h: tr.height },
    computed: {
      padding: cs.padding,
      borderBottomWidth: cs.borderBottomWidth,
      borderBottomStyle: cs.borderBottomStyle,
      lineHeight: cs.lineHeight,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      display: cs.display,
      boxSizing: cs.boxSizing,
    },
    offsets: {
      leftPad: tr.x - r.x,
      rightPad: r.x + r.width - (tr.x + tr.width),
      topPad: tr.y - r.y,
      bottomPad: r.y + r.height - (tr.y + tr.height),
      textCenterY: tr.y + tr.height / 2,
      btnCenterY: r.y + r.height / 2,
      textCenterX: tr.x + tr.width / 2,
      btnCenterX: r.x + r.width / 2,
    },
  }
})
console.log(JSON.stringify(info, null, 2))

const tab = await page.evaluate(() => {
  const btn = document.querySelector('.ribbon-tab.active')
  const r = btn.getBoundingClientRect()
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tr = range.getBoundingClientRect()
  return {
    btnH: r.height,
    topPad: tr.y - r.y,
    bottomPad: r.y + r.height - (tr.y + tr.height),
    textCenterY: tr.y + tr.height / 2,
    btnCenterY: r.y + r.height / 2,
  }
})
console.log('plain tab:', JSON.stringify(tab, null, 2))

await page.screenshot({ path: '.scratch-measure/ribbon.png' })
await app.close()
