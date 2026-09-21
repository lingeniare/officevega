// Scan renderer .tsx for <button> blocks where a data-tip key is also used as
// the button's visible label text — i.e. the tooltip adds no information.
const fs = require('fs')
const path = require('path')

const roots = [
  'apps/docs/src/renderer',
  'apps/slides/src/renderer',
  'apps/sheets/src/renderer',
  'apps/pdf/src/renderer',
  'apps/markdown/src/renderer',
  'apps/html/src/renderer',
]

function walk(d, acc) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p, acc)
    else if (/\.tsx$/.test(f)) acc.push(p)
  }
  return acc
}

for (const r of roots) {
  for (const f of walk(r, [])) {
    const src = fs.readFileSync(f, 'utf8')
    const re = /<button[\s\S]*?<\/button>/g
    let m
    while ((m = re.exec(src))) {
      const block = m[0]
      if (/data-tip-detail=/.test(block)) continue
      const tips = [...block.matchAll(/data-tip=\{t\('([A-Za-z0-9_]+)'/g)].map((x) => x[1])
      if (!tips.length) continue
      const stripped = block.replace(/data-tip=\{[^}]*\}\s*/g, '')
      for (const k of tips) {
        const labelRe = new RegExp(">\\s*\\{?t\\('" + k + "'\\)\\}?\\s*<")
        const hit = stripped.match(labelRe)
        if (hit) {
          const line = src.slice(0, m.index).split('\n').length
          console.log(
            f.replace(/.*renderer./, '') + ':' + line + ' key=' + k + ' m=' + JSON.stringify(hit[0]),
          )
        }
      }
    }
  }
}
