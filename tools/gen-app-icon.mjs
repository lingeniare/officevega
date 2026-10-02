/**
 * Regenerates the application icon from the brand star: a black rounded
 * square (the previous silhouette, kept pixel-identical so platform masks,
 * margins and taskbar treatments do not change) with the white star centered.
 *
 * Source of truth for the star is STAR_D below (the same path as the
 * in-app VegaMark logo); STAR_BOX is its measured bounds in the 300x300
 * box after the .1/-.1 flip (see tools/measure-star.mjs history).
 *
 * Rasterization uses @napi-rs/canvas (already in node_modules); the .ico is
 * a hand-rolled PNG-entry container like tools/gen-file-association-icons.mjs.
 * The .icns still needs macOS `iconutil` — on darwin this script builds it
 * directly, elsewhere it leaves build/icon.iconset/ and prints the command.
 *
 * Regenerate after changing STAR_D:
 *   node tools/gen-app-icon.mjs
 * On a Mac, finish with:
 *   iconutil -c icns apps/shell/build/icon.iconset -o apps/shell/build/icon.icns
 */

import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Path2D, createCanvas, loadImage } from '@napi-rs/canvas'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'apps/shell/build')
const assetsDir = join(root, 'apps/shell/src/renderer/src/assets')

const STAR_D =
  'M1477 2653c-10-120-26-330-37-468-11-137-24-263-28-278l-7-28-110 214c-60 119-111 214-112 213s29-96 66-211c38-116 72-225 76-244l7-34-163 144c-90 79-230 206-311 281-81 76-150 138-153 138-9 0 15-30 163-204 216-254 361-430 358-434-2-2-102 31-222 72-207 72-266 88-192 51 75-38 368-208 365-212-4-4-275-28-702-63-137-11-270-23-295-27l-45-7 20-3c21-3 473-42 813-70 111-9 202-19 202-22s-88-57-195-120c-108-63-194-115-192-117s69 20 148 50 181 68 227 85l82 30-19-27c-10-15-63-79-116-142s-160-194-238-290L726 755l45 40c25 22 163 149 307 283 144 133 262 239 262 235 0-5-33-111-74-236-40-125-72-227-70-227s49 90 105 201c55 111 103 199 106 196 6-6 45-489 63-782 7-104 15-219 19-255l7-65 17 215c9 118 29 364 43 545 15 182 30 333 34 338l6 7 100-194c54-107 100-193 102-191 2 1-29 100-68 220-40 119-70 218-68 220s118-102 258-231 278-254 305-277l50-42-45 55c-24 30-110 134-190 230-157 188-261 318-273 337l-8 12 68-25c164-62 392-144 399-144 5 0-68 44-161 98-94 54-188 110-210 123l-40 24 20 2c26 4 792 70 908 79 48 4 87 10 87 13s-206 23-457 44c-252 22-480 41-506 44l-49 6 44 27c24 14 119 68 211 119 92 52 166 95 165 97-2 2-35-8-73-22-39-14-146-53-239-85l-169-59 39 47c44 55 191 228 354 418 62 72 122 144 133 160l21 30-49-41c-28-23-102-90-165-149-134-126-416-375-424-375-3 0 31 106 74 234 44 129 83 243 86 253s-25-40-64-112c-38-71-92-172-120-224l-51-95-5 25c-3 13-15 143-26 289s-27 344-35 440-15 190-15 208v32h-16l-17-217z'
// measured bounds of the star in the 300x300 box (pixel scan of the
// flipped path: x 13.5-282.9, y 14.6-287.0)
const STAR_BOX = { minX: 13.5, minY: 14.6, maxX: 282.9, maxY: 287.0 }
// star width relative to the black square width (same 0.64 as the in-app logo)
const STAR_RATIO = 0.64

const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]
// canvas px -> .iconset entry names (same convention as gen-file-association-icons.mjs)
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

/**
 * Renders the new master artwork at `size` px from the previous master file:
 * the old silhouette (alpha mask) painted black, star painted white centered.
 * Geometry (margins, corner radius) stays pixel-identical to the old icon.
 */
async function renderMaster(srcPath, size) {
  const img = await loadImage(srcPath)
  const w = img.width
  const h = img.height
  const base = createCanvas(w, h)
  const bx = base.getContext('2d')
  bx.drawImage(img, 0, 0)
  const { data } = bx.getImageData(0, 0, w, h)
  let x0 = w
  let y0 = h
  let x1 = 0
  let y1 = 0
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (data[(j * w + i) * 4 + 3] > 8) {
        if (i < x0) x0 = i
        if (i > x1) x1 = i
        if (j < y0) y0 = j
        if (j > y1) y1 = j
      }
    }
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const silW = x1 - x0 + 1
  const k = size / w // source masters are 1024px

  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  // black silhouette: reuse the old shape via its alpha mask
  ctx.drawImage(img, 0, 0, size, size)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'
  // white star centered on the silhouette
  const starW = STAR_BOX.maxX - STAR_BOX.minX
  const starCX = (STAR_BOX.minX + STAR_BOX.maxX) / 2
  const starCY = (STAR_BOX.minY + STAR_BOX.maxY) / 2
  const s = ((STAR_RATIO * silW) / starW) * k
  // raw path coords are 10x the measured 300-box (the in-app SVG applies
  // matrix(.1 0 0 -.1 0 300)), so the 0.1 flip is folded into the transform
  ctx.setTransform(0.1 * s, 0, 0, -0.1 * s, cx * k - s * starCX, cy * k + s * starCY)
  ctx.fillStyle = '#ffffff'
  ctx.fill(new Path2D(STAR_D))
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return c.toBuffer('image/png')
}

async function downscale(masterPng, size) {
  const img = await loadImage(masterPng)
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, size, size)
  return c.toBuffer('image/png')
}

// full-bleed master (win / linux / dev / onboarding)
const master = await renderMaster(join(buildDir, 'icon.png'), 1024)
writeFileSync(join(buildDir, 'icon.png'), master)
copyFileSync(join(buildDir, 'icon.png'), join(assetsDir, 'app-icon.png'))
for (const size of LINUX_SIZES) {
  if (size === 1024) continue
  writeFileSync(join(buildDir, 'icons', `${size}x${size}.png`), await downscale(master, size))
}
writeFileSync(join(buildDir, 'icons', '1024x1024.png'), master)
console.log('generated icon.png + app-icon.png + build/icons set')

// windows .ico from the same master
const winEntries = []
for (const size of WIN_SIZES) {
  winEntries.push({ size, png: await downscale(master, size) })
}
writeFileSync(join(buildDir, 'icon.ico'), buildIco(winEntries))
console.log('generated icon.ico')

// mac master keeps its own grid margin; iconset for iconutil
const macMaster = await renderMaster(join(buildDir, 'icon-mac.png'), 1024)
writeFileSync(join(buildDir, 'icon-mac.png'), macMaster)
const macPngs = new Map()
for (const size of MAC_CANVAS_SIZES) {
  macPngs.set(size, await downscale(macMaster, size))
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
