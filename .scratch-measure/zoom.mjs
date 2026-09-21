import { PNG } from 'pngjs'
import fs from 'node:fs'

const src = PNG.sync.read(fs.readFileSync('.scratch-measure/btn.png'))
const scale = 6
const out = new PNG({ width: src.width * scale, height: src.height * scale })
for (let y = 0; y < out.height; y++) {
  for (let x = 0; x < out.width; x++) {
    const si = (Math.floor(y / scale) * src.width + Math.floor(x / scale)) * 4
    const di = (y * out.width + x) * 4
    for (let c = 0; c < 4; c++) out.data[di + c] = src.data[si + c]
  }
}
fs.writeFileSync('.scratch-measure/btn-zoom.png', PNG.sync.write(out))
console.log('done', out.width, out.height)
