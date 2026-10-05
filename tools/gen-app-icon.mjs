/**
 * Regenerates the application icon from vega.png (repo root) — the approved
 * artwork: white 12-ray star with a soft glow, centered on a black square.
 *
 * vega.png is the single source of truth; everything below is derived:
 * - build/icon.png + renderer app-icon.png + build/icons set (opaque square)
 * - build/icon.ico (PNG-entry container, like gen-file-association-icons.mjs)
 * - build/icon-mac.png (824/1024 content on transparent, mac grid convention)
 * - build/icon.iconset/ for the macOS .icns (needs `iconutil` on a Mac)
 *
 * Regenerate after changing vega.png:
 *   node tools/gen-app-icon.mjs
 * On a Mac, finish with:
 *   iconutil -c icns apps/shell/build/icon.iconset -o apps/shell/build/icon.icns
 */

import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'apps/shell/build')
const assetsDir = join(root, 'apps/shell/src/renderer/src/assets')
const SRC = join(root, 'vega.png')

if (!existsSync(SRC)) {
  throw new Error(`artwork source missing: ${SRC}`)
}

const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]
// mac grid margin: content is 824/1024 of the canvas (same as before)
const MAC_CONTENT_RATIO = 824 / 1024
const MAC_CANVAS_SIZES = [16, 32, 64, 128, 256, 512, 1024]
const ICONSET_ENTRIES = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
]

/** ICO container with PNG-compressed entries (supported since Vista). */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = header.length + dir.length
  entries.forEach(({ size, png }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o) // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2) // palette
    dir.writeUInt8(0, o + 3) // reserved
    dir.writeUInt16LE(1, o + 4) // planes
    dir.writeUInt16LE(32, o + 6) // bpp
    dir.writeUInt32LE(png.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += png.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

const srcImg = await loadImage(SRC)

/**
 * Star core extracted from vega.png: pixels brighter than CORE_THRESHOLD
 * (the white star body without the soft glow tail), cropped to its bbox.
 * Small icon entries (title bars, installer dialogs, tree views) physically
 * cannot reproduce the glow — a faithful downscale reads as a dark smudge —
 * so they get this simplified high-contrast mark instead.
 */
const CORE_THRESHOLD = 110
const starCore = (() => {
  const w = srcImg.width
  const h = srcImg.height
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.drawImage(srcImg, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)
  let x0 = w
  let y0 = h
  let x1 = 0
  let y1 = 0
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4
      if (data[o] > CORE_THRESHOLD && data[o + 1] > CORE_THRESHOLD && data[o + 2] > CORE_THRESHOLD) {
        if (i < x0) x0 = i
        if (i > x1) x1 = i
        if (j < y0) y0 = j
        if (j > y1) y1 = j
      }
    }
  }
  const crop = createCanvas(x1 - x0 + 1, y1 - y0 + 1)
  const cx = crop.getContext('2d')
  cx.drawImage(c, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height)
  console.log(`star core ${crop.width}x${crop.height} at threshold ${CORE_THRESHOLD}`)
  return crop
})()

/**
 * Small-size entry: solid black square + the star core redrawn large
 * (74% of the canvas) in pure white. Same star, optimized for tiny pixels.
 */
async function renderSmall(size) {
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  const side = Math.round(size * 0.74)
  const pad = Math.round((size - side) / 2)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(starCore, pad, pad, side, side)
  return c.toBuffer('image/png')
}

// canvas sizes at/below this get the simplified high-contrast star
const SMALL_MAX = 48

/** vega.png scaled to `size` px, full-bleed (opaque black square). */
async function renderFull(size) {
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(srcImg, 0, 0, size, size)
  return c.toBuffer('image/png')
}

/** vega.png at the mac grid margin, centered on a transparent canvas. */
async function renderMac(size) {
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const content = Math.round(size * MAC_CONTENT_RATIO)
  const pad = Math.round((size - content) / 2)
  ctx.drawImage(srcImg, pad, pad, content, content)
  return c.toBuffer('image/png')
}

// full-bleed master (win / linux / dev / onboarding); 1024 is a 2x upscale
const master = await renderFull(1024)
writeFileSync(join(buildDir, 'icon.png'), master)
copyFileSync(join(buildDir, 'icon.png'), join(assetsDir, 'app-icon.png'))
for (const size of LINUX_SIZES) {
  if (size === 1024) continue
  const png = size <= SMALL_MAX ? await renderSmall(size) : await renderFull(size)
  writeFileSync(join(buildDir, 'icons', `${size}x${size}.png`), png)
}
writeFileSync(join(buildDir, 'icons', '1024x1024.png'), master)
console.log('generated icon.png + app-icon.png + build/icons set')

// windows .ico from the same artwork
const winEntries = []
for (const size of WIN_SIZES) {
  winEntries.push({ size, png: size <= SMALL_MAX ? await renderSmall(size) : await renderFull(size) })
}
writeFileSync(join(buildDir, 'icon.ico'), buildIco(winEntries))
console.log('generated icon.ico')

// NSIS wizard icons (build/installerIcon.ico + uninstallerIcon.ico are picked
// up by electron-builder automatically — MUI_ICON/MUI_UNICON/UNINSTALLER_ICON).
// The wizard shows the icon at 32-55 px in the MUI header, where the
// simplified star-core loses the glow and reads as a broken mark, so installer
// icons keep the full vega.png artwork at every size except 16 px (title bar),
// where the glow downscales to noise and the star core stays legible.
const installerEntries = []
for (const size of WIN_SIZES) {
  installerEntries.push({ size, png: size <= 16 ? await renderSmall(size) : await renderFull(size) })
}
const installerIco = buildIco(installerEntries)
writeFileSync(join(buildDir, 'installerIcon.ico'), installerIco)
writeFileSync(join(buildDir, 'uninstallerIcon.ico'), installerIco)
console.log('generated installerIcon.ico + uninstallerIcon.ico')

// mac master keeps its grid margin; iconset for iconutil
const macMaster = await renderMac(1024)
writeFileSync(join(buildDir, 'icon-mac.png'), macMaster)
const macPngs = new Map()
for (const size of MAC_CANVAS_SIZES) {
  // tiny mac canvases go full-bleed: the grid margin would leave 3px of
  // artwork at 16px, and macOS masks the squircle itself anyway
  macPngs.set(size, size <= SMALL_MAX ? await renderSmall(size) : await renderMac(size))
}
console.log('generated icon-mac.png')

const writeIconset = (dir) => {
  mkdirSync(dir, { recursive: true })
  for (const [name, size] of ICONSET_ENTRIES) {
    writeFileSync(join(dir, name), macPngs.get(size))
  }
}
if (process.platform === 'darwin') {
  const tmp = mkdtempSync(join(tmpdir(), 'officevega-app-icon-'))
  try {
    const iconset = join(tmp, 'icon.iconset')
    writeIconset(iconset)
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(buildDir, 'icon.icns')])
    console.log('generated icon.icns')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
} else {
  writeIconset(join(buildDir, 'icon.iconset'))
  console.log('icon.icns needs macOS iconutil:')
  console.log('  iconutil -c icns apps/shell/build/icon.iconset -o apps/shell/build/icon.icns')
}
