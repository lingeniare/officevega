import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { writeFileSync } from 'node:fs'
import { LangFlag } from '../apps/shell/src/renderer/src/lang-flags'

const langs = ['az','en','ka','kk','ky','ru','tk','tt','uz'] as const
const rows = langs
  .map((l) => `<div class="row">${renderToStaticMarkup(createElement(LangFlag, { lang: l }))}<span>${l}</span></div>`)
  .join('\n')
writeFileSync(
  'flagprev/index.html',
  `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui">
  <style>.row{display:flex;align-items:center;gap:10px;margin:8px;font-size:14px}.set-lang-flag{width:36px;height:24px}h3{margin:8px}</style>
  <h3>2x scale preview</h3>${rows}`,
)
