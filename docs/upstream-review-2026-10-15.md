# Ревизия апстрима genoffice: что брать в officevega

Дата: 2026-10-15.
Дельта: `438d9c65..upstream/main` = 28 коммитов, релизная точка `v0.11.727`
(`62ec0584`). Плюс неотмердженная ветка `upstream/sync/2026-10-15-11-54`
(один коммит `44770842`, очередной snapshot — придёт в main следующим PR).
Источник: `git log/show` по `upstream/main`, тег `v0.11.727`.

## Уже реализовано у нас (свои версии — при мердже выбрать одну)

| Апстрим | Наше | Примечание |
|---------|------|------------|
| `66cd1b3b` interface scale (#1934), `ui-scale.ts` + tab-manager/detached-windows/title-bar-overlay | `ef35bca8` (#1913), `webContents.setZoomFactor` | Разные механизмы: у них отдельная система масштаба chrome, у нас browser-zoom с делением документного зума. Текстуальных и семантических конфликтов будет много — надо сознательно выбрать одну реализацию. |
| `55ade14a` AI sidebar off (#1951), `packages/ui/ai-panel-prefs.ts` | `df62ebbc` (#1947) | У нас уже есть `ai-panel-prefs.ts` — наш порт близок к апстримному, мердж сравнительно лёгкий. |
| PDF internal links: `pdf-internal-links.ts` + `main/pdf-links.ts` (в snapshot `aff3d20a`) | `85a40bdb` (#1975), `bk--` id на print surface | Разные подходы к одной проблеме. |
| Ask AI → сохранение ответов в Markdown/Word (`KbAskPanel`, `knowledge-base.ts`, в `aff3d20a`) | `3feb62f9` (#1974), только Markdown | Апстрим шире (Word тоже) — можно принять их версию поверх нашей. |

## Новые фичи — кандидаты на перенос

### Docs
- **Mail-merge движок** — `62ec0584` (#2030, ~770 строк в docx-engine:
  источник данных + подстановка) + `5eab98ad` (#2009, MERGEFIELD остаётся
  полем при открытии шаблона) + `f33df4bb` (#2026, hyperlink поля не
  теряется при сворачивании).
- **Скрытие выделения из модели** — `a3d374af` (#1883, 53 файла, ~3200
  строк; закрывает пять путей, которые читали скрытый текст).
- **Mind map в AI-ассистенте** — `28508de9` (#1999, ~1600 строк).
- **Статус-бар: выделено/всего слов как в Word** — `8612304a` (#2010).
- **Export as Markdown** — `export-markdown.ts` (в `aff3d20a`).
- **Печать/PDF**: `print-args.ts` (Windows print scale, опции задания
  печати), `pdf-links.ts`, правки полей — в `aff3d20a`.
- **Вёрстка**: `wrap-obstacles.ts` (обтекание, плавающие таблицы),
  keepNext-цепочки, кэшированные номера страниц TOC, выталкивание абзацев
  на швах равных колонок, justify/cjk-punct shrink — в `aff3d20a`.
- **Шрифтовые метрики**: Cambria Math, Calibri Arabic, Korean Latin,
  autoSpaceDE/DN, таб-стопы нумерации — в `aff3d20a`.

### Sheets
- RTL grid direction toggle на вкладке View — `05c45b9d` (#1972).
- Ленивая загрузка cell-font aliases (ускорение старта) — `f990ce5b` (#1997).
- conditional-format ROW()/COLUMN() 1-based; Excel-литералы ошибок не
  читаются как defined names; печатные таблицы держат ширины колонок —
  в `44770842` (sync-ветка).

### Slides
- Геометрия chart title/legend по PowerPoint-замерам, chart userShapes
  overlays, rich data labels, small caps, скрытые линии осей, line legend
  keys — в `44770842` (sync-ветка).

### Markdown
- **[[wiki links]] как в Obsidian** — `af8f9809` (#1977, ~1300 строк).
- **Paper themes**: Notion, Drake, Blubook, Nord, Newsprint —
  `b06a2e7a` (#1994).
- Mind map в AI — `71d4c923` (#1976).

### PDF
- Диалог печати: принтер, копии, duplex, odd/even — в `44770842`
  (sync-ветка).

### AI / provider
- **Декларативные профили кастомных endpoint'ов** — `10aa804a` (#1978,
  ~3700 строк): протоколы openai-compatible/anthropic/gemini, статические
  заголовки, indirection credential'ов через env, per-model capabilities,
  релаксированные таймауты для медленных локальных серверов. Релевантно
  для api.vega.chat как прокси — но зона конфликта с нашим
  `vega`-провайдером и `setLicenseGetter`.
- `trace.ts` в ai-provider — трейсинг запросов (в `aff3d20a`).
- `create-document-skill.ts` в agent-core (в `aff3d20a`).

### Shell / app
- **Полное контекстное меню вкладки** (save/print/rename/duplicate/
  reveal/split/close others/reopen closed) + локализованные tooltips —
  `0ec17816` (#2031) + доработки в `44770842`.
- **Компактная icon-only лента** по ⌥⌘K для sheets/slides/pdf —
  `06913121` (#2014).
- Восстановление views при Windows taskbar restore — `2e379a30` (#2021).
- Нет PowerShell-пробинга при запуске и вспышки PowerShell из
  Windows-инсталлера — в `44770842`.
- `recovery-copy.ts` в electron-utils; file index ограничивает парсимый
  текст xlsx — в `aff3d20a`/`44770842`.

### Interop
- **Импорт OpenDocument** (.odt/.ods/.odp + шаблоны .ott/.ots/.otp) —
  `5281b705` (#1982, ~4300 строк): новый пакет `odf2ooxml`, read-only
  импорт в OOXML-копию, Rust-sidecar для формул ODF в xlsx-engine,
  ассоциации файлов, CLI `convert` для всех шести расширений.
- xlsx-engine: сборка без threads для WebAssembly — `48638359` (#1979);
  WASI-фикс canonicalize — `d32d1711` (#1990).

## Фиксы — брать

| Коммит | Суть |
|--------|------|
| `1ac9775c` (#1960) | **Security**: SSRF-gate биндит соединение к провалидированным адресам (proxy-aware); AI-загрузки картинок в slides проверяются по magic bytes, а не заголовкам. Приоритет №1. |
| `d4cfb9b0` (#2015) | docs: сохранение не затирает шрифт под кареткой |
| `bed9713a` (#2006) | docx: note-reference run сохраняет свой rPr при редактировании |
| `9966ccd3` (#1967) | docs: латинская font-chain перед East Asian на CJK-спанах |
| `2a607bd4` (#2025) | алиас DFKai-SB PostScript → font family |
| `2e379a30` (#2021) | Windows: views документов переживают taskbar restore |
| `32aec0ad` (#1987) | тесты независимы от сети/нагрузки |

## Пропустить или осторожно

- `ab2b0f78` (#2008): Vietnamese README — нам не нужен; но входящие там
  **key-parity тесты** для single-object string tables прямо конфликтуют с
  текущим удалением локалей (cs/he/hi/ms/nl/vi/zh-TW в рабочем дереве) —
  либо не брать тесты, либо не удалять локали.
- i18n-шарды во всех фичах: апстрим добавляет ключи во все ~21 локаль,
  включая удаляемые — при мердже ре-импорт удалённых файлов придётся
  давить массово.
- README.md / docs/i18n/README.* — ребрендинг, брать нашу сторону.

## Зоны конфликтов при мердже

- `apps/shell/src/main/index.ts` — у нас license/updater/vega, у них
  +~270 строк (ODF routing, tab menu, AI sidebar, ui-scale).
- `packages/ai-provider` — профили перелопачивают
  providers/registry/stream, рядом наши `vega-key`/`vegaSessionHeaders`/
  license gating.
- `apps/shell/electron-builder.cjs` — их ODF-ассоциации vs наши env-правки.
- Дублирующиеся реализации (таблица выше) — мердж создаст обе, надо
  вычищать вручную.
- `packaging/flatpak/com.genoffice.app.desktop` — переименования ID
  (genoffice → vegaoffice) будут ловиться по всему ODF-коммиту.

## План мерджа (рекомендация)

1. Cherry-pick `1ac9775c` (SSRF) отдельным коммитом сразу.
2. Основной merge `upstream/main` (`v0.11.727`): принимать их версии по
   interface scale / AI sidebar / PDF links / Ask-export там, где наши
   не имеют преимуществ; иначе оставить нашу и вычистить их файлы.
3. Sync-ветку `sync/2026-10-15-11-54` взять тем же мерджем (она от
   сегодняшнего main) или отдельным следующим.
4. После мерджа: прогон `tsc --noEmit` + vitest по всем пакетам
   (бинарники из корневого `node_modules/.bin`, см. AGENTS.md), ребилд
   shell (main-код app'ов компилируется в shell).
