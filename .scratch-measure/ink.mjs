import { _electron as electron } from 'playwright-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'

delete process.env.ELECTRON_RUN_AS_NODE

const app = await electron.launch({ args: ['.scratch-measure/electron-main.js'] })
const page = await app.firstWindow()
await page.waitForSelector('#fileBtn')
await page.evaluate(() => document.fonts.ready)

const rect = await page.evaluate(() => {
  const r = document.getElementById('fileBtn').getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
console.log('button rect:', rect)

const clip = { x: rect.x - 4, y: rect.y - 4, width: rect.w + 8, height: rect.h + 8 }
const shot = await page.screenshot({ clip, path: '.scratch-measure/btn.png' })
await app.close()

const png = PNG.sync.read(shot)
const { width, data } = png
// scan only inside the capsule (clip has 4px margin): text ink = pure white #fff
// on the red capsule #ef4444; threshold 250 separates it from antialiased edges
const x0 = 4, y0 = 4, x1 = 4 + Math.round(rect.w) - 1, y1 = 4 + Math.round(rect.h) - 1
let top = Infinity, bottom = -1, left = Infinity, right = -1
for (let y = y0; y <= y1; y++) {
  for (let x = x0; x <= x1; x++) {
    const i = (y * width + x) * 4
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 250 && g > 250 && b > 250) {
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
}
console.log('ink box: top=%d bottom=%d left=%d right=%d', top, bottom, left, right)
console.log('capsule: top=%d bottom=%d left=%d right=%d', y0, y1, x0, x1)
console.log('space above ink=%d, below ink=%d', top - y0, y1 - bottom)
console.log('ink center=%d, capsule center=%d', (top + bottom) / 2, (y0 + y1) / 2)
console.log('left space=%d right space=%d', left - x0, x1 - right)

// per-row ink profile
for (let y = y0; y <= y1; y++) {
  let n = 0
  for (let x = x0; x <= x1; x++) {
    const i = (y * width + x) * 4
    if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) n++
  }
  console.log('row %d: %d', y - y0, n)
}
