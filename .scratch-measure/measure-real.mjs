import { _electron as electron } from 'playwright-core'
import { PNG } from 'pngjs'

delete process.env.ELECTRON_RUN_AS_NODE

const app = await electron.launch({
  args: ['.scratch-measure/electron-main.js'],
  env: { ...process.env, MEASURE_URL: 'http://localhost:5196' },
})
const page = await app.firstWindow()
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
await page.waitForSelector('.ribbon-tab-file', { timeout: 45000 })
await page.waitForTimeout(1500)
await page.evaluate(() => document.fonts.ready)

const info = await page.evaluate(() => {
  const btn = document.querySelector('.ribbon-tab-file')
  const r = btn.getBoundingClientRect()
  const cs = getComputedStyle(btn)
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tr = range.getBoundingClientRect()
  return {
    text: btn.textContent,
    classes: btn.className,
    btnRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    textRect: { x: tr.x, y: tr.y, w: tr.width, h: tr.height },
    computed: {
      padding: cs.padding,
      borderBottomWidth: cs.borderBottomWidth,
      lineHeight: cs.lineHeight,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      display: cs.display,
      boxSizing: cs.boxSizing,
      alignItems: cs.alignItems,
      textAlign: cs.textAlign,
    },
    offsets: {
      leftPad: tr.x - r.x,
      rightPad: r.x + r.width - (tr.x + tr.width),
      topPad: tr.y - r.y,
      bottomPad: r.y + r.height - (tr.y + tr.height),
    },
  }
})
console.log(JSON.stringify(info, null, 2))

const r = info.btnRect
const shot = await page.screenshot({
  clip: { x: r.x - 4, y: r.y - 4, width: r.w + 8, height: r.h + 8 },
  path: '.scratch-measure/real-btn.png',
})
await page.screenshot({
  clip: { x: 0, y: 0, width: 700, height: 120 },
  path: '.scratch-measure/real-ribbon.png',
})
await app.close()

const png = PNG.sync.read(shot)
const { width, data } = png
const x0 = 4, y0 = 4, x1 = 4 + Math.round(r.w) - 1, y1 = 4 + Math.round(r.h) - 1
// sample a pixel inside the capsule to learn bg color
const bi = (y0 * width + x0 + 1) * 4
console.log('capsule bg rgb:', data[bi], data[bi + 1], data[bi + 2])
// text color = contrast color; detect "far from bg" pixels
const bg = [data[bi], data[bi + 1], data[bi + 2]]
let top = Infinity, bottom = -1, left = Infinity, right = -1
for (let y = y0 + 2; y <= y1 - 2; y++) {
  for (let x = x0 + 2; x <= x1 - 2; x++) {
    const i = (y * width + x) * 4
    const dr = Math.abs(data[i] - bg[0])
    const dg = Math.abs(data[i + 1] - bg[1])
    const db = Math.abs(data[i + 2] - bg[2])
    if (dr + dg + db > 200) {
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
}
console.log('ink box: top=%d bottom=%d left=%d right=%d', top, bottom, left, right)
console.log('capsule interior: top=%d bottom=%d left=%d right=%d', y0, y1, x0, x1)
console.log('space above=%d below=%d left=%d right=%d', top - y0, y1 - bottom, left - x0, x1 - right)
console.log('ink centerY=%d capsule centerY=%d', (top + bottom) / 2, (y0 + y1) / 2)
console.log('ink centerX=%d capsule centerX=%d', (left + right) / 2, (x0 + x1) / 2)
