// Insert aiThemeTip after aiThemeBtn in every html ai-shard locale file.
const fs = require('fs')
const path = require('path')

const dir = 'apps/html/src/renderer/i18n/ai'
const ANCHOR = 'aiThemeBtn'
const KEY = 'aiThemeTip'

const TR = {
  zh: '选择风格，AI 为页面换肤',
  'zh-TW': '選擇風格，AI 為頁面換膚',
  en: 'Pick a look; AI restyles the page',
  ja: 'スタイルを選ぶと AI がページをリスタイルします',
  ko: '스타일을 선택하면 AI가 페이지를 다시 디자인합니다',
  fr: "Choisissez un style ; l'IA restyle la page",
  de: 'Stil wählen; die KI gestaltet die Seite neu',
  es: 'Elige un estilo; la IA rediseña la página',
  th: 'เลือกสไตล์ AI จะจัดรูปแบบหน้าใหม่',
  id: 'Pilih gaya; AI mendesain ulang halaman',
  ru: 'Выберите стиль — ИИ переоформит страницу',
  ar: 'اختر نمطًا؛ يعيد الذكاء الاصطناعي تصميم الصفحة',
  pt: 'Escolha um estilo; a IA reformata a página',
  it: "Scegli uno stile; l'IA ridisegna la pagina",
  pl: 'Wybierz styl — AI przeprojektuje stronę',
  cs: 'Vyberte styl; AI stránku přestylová',
  nl: 'Kies een stijl; de AI ontwerpt de pagina opnieuw',
  ms: 'Pilih gaya; AI menggayakan semula halaman',
  he: 'בחרו סגנון; ה-AI יעצב מחדש את העמוד',
  hi: 'स्टाइल चुनें; AI पृष्ठ को फिर से स्टाइल करेगा',
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
