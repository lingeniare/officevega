# Анализ апстрима genoffice → officevega: v0.11.0 + post-release main

Дата анализа: 2026-09-29.
Форк-поинт: `a73703de` (мерж `b43c8851` — upstream/main на уровне v0.10.1467+).
Цель: `upstream/main` = `324b0477` (2026-09-29).

## Масштаб и топология

- `HEAD..upstream/main`: **61 коммит**, 348 файлов, +12 371 / −1 970 строк.
- Тег `v0.11.0` = `21111196` — это форк-поинт **+1 коммит** («new spreadsheet file
  at first save»). Сам релиз почти без новизны для нас: вся фичевая часть из
  релиз-нот либо уже у нас (вошла мержем v0.10.1467+), либо лежит в **60
  коммитах после тега** — вероятно, выйдут как v0.11.x/v0.12.0.
- Ядро дельты — два снапшота: `05b4bd6e` (222 файла, ~6 900 строк) и
  `968d7d23` (32 файла, ~1 900 строк). Плюс 58 точечных `fix(...)`-коммитов.

## Уже у нас (повторно применять не нужно)

Из релиз-нот v0.11.0 вошло предыдущим мержем: Vietnamese UI (`ea3a8afc`),
Serply (`5c735513`), flipH/flipV (`2b6996b9`), `create --type pptx`
render+audit (`c1f71f90`), MCP non-ASCII имена (`2652bfab`), cancelled deck
run (`a73703de`), атомарные записи, bounded-сканы, pdf annotation defer.

## Новые фичи (из снапшотов)

### Sheets
- **Find & Replace** (`968d7d23`): `FindReplacePanel.tsx` (~496 строк),
  `find-replace-session.ts`, `lazy-find.ts`, e2e-спек, ключи во всех 23
  локалях `i18n/dialogs/*`.
- Excel-паритет (`05b4bd6e`): chords для числовых форматов/границ,
  диалог Insert/Delete Cells (Ctrl+Shift++ / Ctrl+-), Format Painter lock,
  статус-бар в стиле Excel (pickable stats, view buttons) + ZoomDialog,
  font-size ladder, wheel-zoom, univer-locales.
- Новый spreadsheet получает файл при первом сохранении (`21111196` — сам тег).
- Формулы: parens внутри литералов и stale regex offset в balance-check
  (`a482ce0e`, `4936cc52`).

### Docs
- Live-preview ширины колонок таблицы при drag (`docs-table-resize-live.spec`).
- Чип-бар колонтитулов убран (`HeaderFooterArea` −27).
- Большие многосекционные документы перестали пинать CPU:
  `phased-content.ts` / `pagination-sections.ts` + новые тесты.

### Shell
- **Tab tear-off**: таб оттаскивается в отдельное окно и докается обратно —
  `detached-windows.ts` +328, новый `tab-drag-geometry.ts`, переработка
  `TabBar.tsx`, e2e `tab-tear-off-dock.spec.ts`.
- `renderer-watchdog.ts` (новый, ~206 строк): предлагает закрыть
  зависший/разбухший документ.
- Настройка «открывать новые документы со свёрнутой AI-панелью»
  (`ai-panel-prefs-store.ts`, `SettingsModal`).
- `electron-builder.cjs`: RPM больше не конфликтует с Motrix по
  `/usr/lib/.build-id`.
- `atomic-write.ts`, `file-index` timeout, recents paging, context-menu
  guard — см. фиксы ниже.

### Markdown / HTML / CLI / AI
- Escaped currency больше не попадает в math-токенизатор (`editor/math*`).
- pdf2docx не рвёт слова после широких глифов.
- 0-byte docx/xlsx/pptx открываются как пустые документы
  (`open-empty-file-save.spec`).
- Headless export переживает crash on quit (`cli/formats/app-export.ts`).
- AI: OpenAI content arrays и failed media responses (`protocols/shared.ts`,
  sse-lines тесты); `gsk.ts` — HTML error page сводится к одной строке,
  не сливая страницу ошибки в логи/контекст агента.

## Security/robustness hardening — главный пласт (~35 коммитов)

Memory-bomb/DoS (приоритет — применяются почти чисто, движки мы не меняли):
- **Новый пакет `packages/zip-gate`** (metered zip): общий gate для
  docx/pptx/attachment parsers, 1 205 MB → 11 ms (`e51241a1`). Новая
  workspace-зависимость `@genoffice/zip-gate` у docx-engine и pptx-engine —
  проверить `externalizeDepsPlugin` exclude и lockfile.
- pptx: bound roman/alpha list numbering (startAt 1e20 → 4 GB loop),
  chart ptCount-аллокация 2.3 GB → 30 MB (`6b67efdc`, `15fd0227`).
- log-axis ticks: 1e308-точка замораживала слайд навсегда (`887dd0c3`).
- CLI: cap `data:`-URL payload до декода (400 MB → ~1 GB peak) (`69c8ed60`).
- xlsx text extraction: trim trailing empty cells (18 KB → 94 MB) (`e976e67b`).
- html2docx: nbsp-спейсер на мульти-ГБ от degenerate font size (`bf095447`).
- docx altChunk: quoted-printable in place, 27× → ~1× memory (`aaea39c5`).
- `decodeDataUrl` exponential backtracking (`310d1781`); xlsx-engine
  drawing-group recursion bound (`e3191229`); cmap segment guard (`3730dcdf`).

Crash/robustness: sheets — один save на AutoSave+recovery таймеры
(`324b0477`, tip), quit-latch reset при vetoed quit; pdf — destroy полуоткрытого
документа, redaction census один раз на apply, NaN `read_pages`, text items
без transform, stack overflow в note threads, пустой print, undefined в ink
signature; docx — self-closing sectPr, header/footer refs в любом написании,
settings flag element-pair, ST_OnOff, field attrs в обеих кавычках, слияние
numbering level, 1900-era chart serials, orphan field-char repair
8.3 s → 1.3 s; xlsx — hyperlink ids в обеих кавычках, cap row-axis ops,
`<tableParts>` без count, cap structural shifts, sort по display-значению;
pptx — group hyperlink с атрибутами nvGrpSpPr, single-quoted clrMap;
slides — watchdog скрытого PDF-export окна; docs — валидация геометрии на
export-pdf IPC; shell — timeout file-index worker, recents paging со строковым
offset, context-menu interceptor, кэш failed image decodes, project-store
transcript при переносе файла между проектами.

AI/agent: caps на codex-app-server tool calls/args, emit anthropic tool call
при max_tokens cut-off, cap `analyze_media` URL на Genspark-роуте, fail run при
throw в skill tools getter, i18n format `undefined` literal, drop одного
битого DuckDuckGo-линка, `media-protocols` через endpointUrl вместо concat,
content-type Default в любом порядке атрибутов, Demibold ≠ Bold в
font-metrics, elapsed-duration форматы дат xlsx.

## Конфликты мержа (merge-tree: 43 файла)

- **i18n-шарды sheets** — 24 файла `apps/sheets/src/renderer/i18n/app/*`:
  наши переводы vs их новые ключи (механические, zh задаёт набор).
- **apps/shell**: `index.ts`, `tab-manager.ts`, `TabBar.tsx`, `strings.ts`,
  `package.json` — наш ребрендинг officevega + updater + VEGA/Jev.
- **ai-provider**: `media-protocols.ts` — их `endpointUrl`-фикс (`abb9e6e3`)
  конфликтует с нашей защитой «must not redirect traffic off api.vega.chat»
  (строка ~73): смержить, сохранив оба инварианта. `protocols/anthropic.ts` —
  наши VEGA-правки.
- **agent-core/loop.ts** — у нас +311 локальных строк.
- `apps/docs|pdf|sheets` App.tsx, `ExcelShell.tsx`, `excel-shortcuts.ts` —
  наши UI-правки поверх их фич.
- `packages/cli/src/formats/app-export.ts` — их headless-export fix vs наш
  officevega-брендинг.
- `skills/officevega/SKILL.md` — rename vs их правки `skills/genoffice/SKILL.md`.
- `package-lock.json` — регенерировать через **npm** (не pnpm, см. AGENTS.md).
- 4 e2e-спека (home-folders, sheets-filter-reopen/new-blank/paste-shared) —
  механические.

## Рекомендация

Полный `git merge upstream/main` (как прецеденты `238c06c7`/`cd48afc4`/
`b43c8851`): снапшоты атомарны, выборочно фичи не вытащить. Если полный мерж
откладывается — точечный cherry-pick memory-bomb кластера: `e51241a1`
(+ пакет zip-gate целиком), `6b67efdc`, `887dd0c3`, `15fd0227`, `69c8ed60`,
`e976e67b`, `bf095447`, `aaea39c5`, `310d1781`, `e3191229`, `3730dcdf`.

## Чек-лист после мержа

- `npm install` для lockfile; `@genoffice/zip-gate` → `externalizeDepsPlugin`
  exclude в приложениях, где попадёт в dependencies.
- `../../node_modules/.bin/tsc --noEmit` + vitest в изменённых пакетах.
- Пересобрать shell (main-код apps/*/src/main без этого не подхватывается).
- e2e: `tab-tear-off-dock`, `sheets-find-replace`, `docs-table-resize-live`,
  `open-empty-file-save`.
- Сохранить: guard api.vega.chat в media-protocols, VEGA-дефолт Jev,
  `OFFICEVEGA_UPDATE_URL`, `DOWNLOAD_PAGE_URL`, officevega-строки,
  наши «ИИ»-формулировки в ru-шардах.
- `tools/check-theme-colors.mjs` на новых renderer CSS (styles.css sheets +
 158/122 строки).
