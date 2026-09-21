import { chromium } from 'playwright-core'

const css = `
:root {
  --accent: #ef4444;
  --accent-dark: #dc2626;
  --text: #222;
  --text-primary: #222;
  --text-dim: #666;
  --chrome-bg: #f6f6f6;
  --border-strong: #ccc;
  --surface: #fff;
  --hover: #eee;
  --pdf-on-accent: #fff;
}
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  color: var(--text);
  background: var(--chrome-bg);
  -webkit-font-smoothing: antialiased;
}
button { font-family: inherit; }
.ribbon {
  flex-shrink: 0;
  background: var(--chrome-bg);
  border-bottom: 1px solid var(--border-strong);
  user-select: none;
}
.ribbon-tabs {
  display: flex;
  align-items: center;
  padding: 5px 10px 0;
  min-height: 35px;
  gap: 2px;
}
.ribbon-tabs-spacer { flex: 1; }
.ribbon-tab {
  position: relative;
  border: none;
  background: none;
  padding: 7px 9px 6px;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  cursor: pointer;
  border-bottom: 2.5px solid transparent;
}
.ribbon-tab:hover { color: var(--accent); }
.ribbon-tab.active { color: var(--accent); }
.ribbon-tab.active::after {
  content: '';
  position: absolute;
  left: 13px; right: 13px; bottom: -2.5px;
  height: 2.5px; border-radius: 1px;
  background: var(--accent);
}
.file-tab-wrap { position: relative; }
.ribbon-tab-file {
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  margin-right: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--pdf-on-accent);
  background: var(--accent);
}
.ribbon-tab-file:hover, .ribbon-tab-file.open {
  color: var(--pdf-on-accent);
  background: var(--accent-dark);
}
`

const html = `<!doctype html><html><head><style>${css}</style></head><body>
<div class="app"><div class="ribbon"><div class="ribbon-tabs">
  <div class="file-tab-wrap">
    <button class="ribbon-tab ribbon-tab-file " id="fileBtn">File</button>
  </div>
  <button class="ribbon-tab active">Home</button>
  <button class="ribbon-tab">Insert</button>
  <div class="ribbon-tabs-spacer"></div>
</div></div></div>
</body></html>`

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\ingen\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
})
const page = await browser.newPage()
await page.setContent(html)

const info = await page.evaluate(() => {
  const btn = document.getElementById('fileBtn')
  const r = btn.getBoundingClientRect()
  const cs = getComputedStyle(btn)
  // text node geometry
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tr = range.getBoundingClientRect()
  // glyph ink box approximation via canvas measure of cap height is overkill;
  // report line box geometry instead
  return {
    btnRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    textRect: { x: tr.x, y: tr.y, w: tr.width, h: tr.height },
    computed: {
      padding: cs.padding,
      border: cs.border,
      borderBottomWidth: cs.borderBottomWidth,
      lineHeight: cs.lineHeight,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      display: cs.display,
      alignItems: cs.alignItems,
      textAlign: cs.textAlign,
      boxSizing: cs.boxSizing,
      height: cs.height,
    },
    offsets: {
      textCenterY: tr.y + tr.height / 2,
      btnCenterY: r.y + r.height / 2,
      textCenterX: tr.x + tr.width / 2,
      btnCenterX: r.x + r.width / 2,
      leftPad: tr.x - r.x,
      rightPad: r.x + r.width - (tr.x + tr.width),
      topPad: tr.y - r.y,
      bottomPad: r.y + r.height - (tr.y + tr.height),
    },
  }
})
console.log(JSON.stringify(info, null, 2))

// Also measure the plain tab for comparison
const info2 = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.ribbon-tab.active')][0]
  const r = btn.getBoundingClientRect()
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tr = range.getBoundingClientRect()
  return {
    btnRect: { y: r.y, h: r.height },
    textRect: { y: tr.y, h: tr.height },
    topPad: tr.y - r.y,
    bottomPad: r.y + r.height - (tr.y + tr.height),
    textCenterY: tr.y + tr.height / 2,
    btnCenterY: r.y + r.height / 2,
  }
})
console.log('plain tab:', JSON.stringify(info2, null, 2))

await page.screenshot({ path: '.scratch-measure/ribbon.png', clip: { x: 0, y: 0, width: 500, height: 60 } })
await browser.close()
