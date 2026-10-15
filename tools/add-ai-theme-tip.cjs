// Insert aiThemeTip after aiThemeBtn in every html ai-shard locale file.
const fs = require('fs')
const path = require('path')

const dir = 'apps/html/src/renderer/i18n/ai'
const ANCHOR = 'aiThemeBtn'
const KEY = 'aiThemeTip'

const TR = {
  en: 'Pick a look; AI restyles the page',
  ru: 'Выберите стиль — ИИ переоформит страницу',
  uz: 'Uslub tanlang — AI sahifani qayta bezaydi',
  kk: 'Стильді таңдаңыз — AI бетті қайта безендіреді',
  az: 'Üslub seçin — AI səhifəni yenidən dizayn edəcək',
  tk: 'Stili saýlaň — AI sahypany täzeden bezär',
  ky: 'Стилди тандаңыз — AI бетти кайра коёздайт',
  tt: 'Стиль сайлагыз — AI битне яңадан бизәр',
  ka: 'აირჩიეთ სტილი — AI გვერდს ხელახლა გაფორმავს',
}

const esc = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts')) continue
  const lang = f.slice(0, -3)
  const p = path.join(dir, f)
  const lines = fs.readFileSync(p, 'utf8').split('\n')
  if (lines.some((l) => l.includes(`${KEY}:`))) {
    console.log(`${f}: already present`)
    continue
  }
  let i = lines.findIndex((l) => new RegExp(`^\\s*${ANCHOR}:`).test(l))
  if (i < 0) {
    console.log(`${f}: ANCHOR MISSING`)
    continue
  }
  const indent = lines[i].match(/^\s*/)[0]
  while (!lines[i].trimEnd().endsWith(',')) i++ // skip wrapped value lines
  lines.splice(i + 1, 0, `${indent}${KEY}: ${esc(TR[lang] ?? TR.en)},`)
  fs.writeFileSync(p, lines.join('\n'))
  console.log(`${f}: inserted`)
}
