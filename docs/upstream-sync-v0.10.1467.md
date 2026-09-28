# Анализ апстрима genoffice → officevega: v0.10.1467

Дата анализа: 2026-09-28.
Форк-поинт: `109f32f6` (последний мерж `cd48afc4` — upstream/main на уровне v0.10.1038+).
Цель: тег `v0.10.1467` (`dfe2a6d9`, 2026-09-27) + 85 коммитов в `upstream/main` после тега.

## Масштаб

- `HEAD..v0.10.1467`: **149 коммитов**, 917 файлов, +73 290 / −8 306 строк.
- Ядро релиза — атомарный снапшот `dfe2a6d9` «Sync snapshot (2026-09-27)» (711 файлов):
  вся фичевая часть лежит в нём, раздельного cherry-pick у него нет.
- Остальные ~148 коммитов — индивидуальные `fix(...)`/`feat(...)`/`perf(...)`.
- `v0.10.1467..upstream/main`: ещё **85 коммитов** (фиксы + несколько фич, см. ниже).

## Пересечение с нашими изменениями

- Мы изменили 968 файлов с форк-поинта; апстрим — 917.
- Изменены **обеими сторонами: 312 файлов** — зона конфликтов мержа.
- Только апстрим (чистое применение): 605 файлов. Самые чистые зоны:
  `apps/docs` (190 файлов, почти всё — новый код Word-parity), `packages/docx-engine` (65),
  `packages/pptx-engine` (26), `packages/pdf2docx` (19), `packages/pptx-render` (8),
  `packages/html2docx` (7), `packages/file-parse` (6).

## Что применять: фичи

Из релиз-нот и описания снапшота — почти всё применимо, наша дивергенция в основном
брендинг + VEGA-интеграция + лицензирование, которые этих областей не переписывают.

### Docs (самый большой пласт — паритет с Word)
- Navigation pane; Find & Replace с wildcards/regex и Go To.
- Рuler: маркеры отступов и полей; selection bar; Format Painter; Zoom-диалог (10–500%).
- Paste split-button, быстрая галерея стилей; табличные группы ленты Design/Layout; меню Breaks.
- Зеркальные поля, пресеты размеров бумаги; редактирование колонтитулов с Link to Previous;
  Simple Markup (review view); Draw Text Box; настройка единиц измерения.
- Font dialog — Advanced; Paragraph dialog — Line/Page Breaks; AutoCorrect на лету;
  spelling suggestions + Add to Dictionary; полный набор list/table-операций из Word Table menu.
- Много фиксов layout-совместимости с Word: сетки таблиц, anchored pictures/floats,
  CJK/hangul-метрики строк, embedded fonts, TOC PAGEREF, дробные twips, zip offsets при save.
- Риск: мы трогали `apps/docs` (47 файлов, в т.ч. App.tsx, Ribbon, styles.css) — конфликты будут,
  но 190 из ~237 тронутых апстримом файлов docs — только с его стороны.

### Sheets
- Ctrl+drag на fill handle — заполнение числовой серии.
- `feat(sheets) a1de1e80`: открытие `.tsv` как таблицы.
- WPS DISPIMG — картинки в ячейках (`ccd23100`); агрегация raw-значений в pivot measures.
- Пачка фиксов xlsx-engine/xlsx-gateway: сдвиг CF/DV/hyperlink/auto-filter при вставке диапазонов,
  fail-closed на структурных правках pivot-источника, lowercase refs (`13dce3d0`),
  CSE array type/extent, case-insensitive sheet qualifiers, Unicode shared-formula names.
- CSV: bare-dot decimals, formula-only cells, пустые файлы без сырых IPC-ошибок,
  quoted multiline CR (пост-релиз `2a1ca1f4`).

### Slides
- `perf(slides) b6ceedd8`: декод медиа по требованию + cap удерживаемого — длинные колоды
  больше не держат canvas на каждый слайд (репорт от пользователя).
- `aafab3ec`: fallback на локальную генерацию страниц при падении cloud slide generation —
  прямо по нашему пайплайну `generate_deck`.
- Аудит флагает off-slide и stretched элементы; `279be07b` (пост-релиз): резерв бюджета
  layout-аудита по категориям находок — относится к нашему `slide-qc.ts`.
- `3b93238e`: bound duplicate-analysis в page-spec к retained elements;
  `f80ec33a` (пост-релиз): page spec заканчивается на своей closing brace — оба про
  `packages/pipelines/src/slides/page-spec.ts`, который у нас активно доработан (aspect-теги).
- Печать больших колод через временный HTML (`b2a94cbe`); undo-коммит после dirty snapshot;
  AI composer redo → deck history; current slide сохраняется при history reorder.
- Чарты: data labels, date/log axes, reversed axes, titles/legends, pie-of-pie; bevel/light-rig;
  корейский word-wrap, hanging punctuation.
- Пост-релиз `2b6996b9`: `flipH`/`flipV` зеркалирование в deck-spec shapes.
- Пост-релиз `c1f71f90`: `create --type pptx` рендерит превью и аудитит колоду.

### Markdown / HTML
- DOCX-экспорт встраивает SVG/WebP/BMP/AVIF и remote-картинки; single-file HTML export
  сохраняет stylesheets и fonts.
- `perf(html) f4ea9de9`: индексация parse map — rebuild перестаёт быть квадратичным.
- `ee41ec1e` Save As image rewrites; `e0b0520e` namespace preview SIDs; `17820554` skip
  templates при base injection; `93eb76fe` flush CSS drafts — всё по нашему HTML-пайплайну.
- Токенизатор: tables/math/charrefs edge cases; escaped currency вне strict math (`2342b1bd`,
  пост-релиз); linear image-ref scanning; escape image metadata.
- `2d4fac6c`: hardening message boundary превью-фрейма — security-релевантно.

### AI / agent-core / ai-provider / ai-search
- Gemini 3 BYOK снова работает; `79a77d2f` thought signatures в function-call history;
  cap streamed tool calls (`c5300ad2`).
- Отказ + retry на tool call без обязательных аргументов (вместо фейла правки).
- `d7e091fd`: endpoints собираются по path, а не query — **важно для нашего api.vega.chat
  прокси** (openrouter-совместимые endpoints).
- Расширенная редакция секретов в payload; SSE-лимиты в UTF-8 байтах; caps на non-SSE тела,
  streamed media downloads; timeout stalled bodies; Parallel Search MCP как дефолтный fallback.
- `29e3a4b0`: DeepSeek V4.1 Flash для analyze_media.
- agent-core: `153327dc` не дёргать interrupts у долгих тулов; `fec0c411` settle streamText
  перед cancel; `3cddaa4e` cancel timed-out compaction.
- Пост-релиз `5c735513`: Serply как web+image search провайдер.

### CLI & MCP (пакет `packages/cli`)
- `mcp install` — регистрация stdio-сервера у coding-агентов.
- `merge` — `{{key}}` плейсхолдеры в docx/pptx/xlsx шаблонах.
- `pdf read` — headless-извлечение текста; typed op schemas + batch-флаги на apply-тулах;
  `slides read --units`.
- `afa459fb`: release-версия приложения запекается в packaged CLI.
- Фиксы: ownership лаунчера по платформе, guard файлов между живыми инстансами,
  cap `--ops`, non-ASCII буквы в именах MCP-файлов, reject пустого `--out`,
  discovery приложения при custom install path (три последних — пост-релиз).
- Внимание: мы сильно меняли `packages/cli` (81 файл) — брендинг/VEGA; ждать конфликты.

### Shell / приложение
- Полнотекстовый поиск файлов на home-экране + Jev reranking — **у нас уже стоит VEGA-дефолт
  (928cb594), при мерже сохранить его**.
- `df92cb91`: double-click по табу = inline rename (+ пост-релизные фиксы `2caf13fe`,
  `6a709bc0` — extension из basename).
- «Default app for Office documents»; сворачиваемая лента (Word-style, `packages/ui/ribbon-collapse`);
  атомарные записи userData JSON + fsync перед rename документа; folded search hits → original text.
- project-store: identity по canonical path (`91006aad`), миграция чатов из удалённого проекта,
  сохранение полных чатов при rebind, не перезаписывать нечитаемый default project (пост-релиз).
- `updater.ts` апстрим **не трогал** — наш кастомный feed (updates.officevega.com) в безопасности;
  но `electron-builder.cjs` тронут (dfe2a6d9, `afa459fb`, `b2f0e884` PDFium notices) — мержить аккуратно,
  сохранить `OFFICEVEGA_UPDATE_URL` generic-provider конфиг.

### Accessibility (пласт из ~10 коммитов)
Модальная семантика и focus-trap: CropDialog, ImageViewer, CutoutDialog (пост-релиз), modal backdrop;
Dropdown — active option для AT + skip disabled; ruler keyboard-operable; picture dialogs;
find panels, comments, colour grids; color-picker tab stop (пост-релиз).

### Metafiles / PDF
- EMF+ dual-mode replay, device-pixel pen widths, pattern brushes, Windows-ascent text.
- PDF: bound print wait (`c81b14fb`), n-up rotation, undo native form-fields,
  дефер скана аннотаций до AI-использования (пост-релиз `7745a059`), квадратичный
  selection-quad sweep починен (пост-релиз `67dd3688`), валидация дат.

## Тема релиза: security/robustness hardening

Десятки коммитов вида «bound/cap/fail closed/sanitize» — защита от враждебных документов:
квадратичные сканы, `...spread` на больших массивах, zip-размеры, аллокации по TIFF/PNG dims,
regex-захваты соседних ячеек. Почти всё — в движках форматов, которые мы почти не меняли
(применится чисто). Если полный мерж откладывается — это главный кандидат на точечный
cherry-pick: `ad67955a, d100bfc4, f7b6d999, a9886ad2, 238a6acc, e2aa2ee2, b51913f3,
b966a4fe, 70678cab, 35c6f217, 5ad42859, bafc80a8` и др.

## Инфраструктура
- `3a736984`: shard e2e по трём раннерам + unit-тесты фильтруются по changed paths — полезно для CI.
- `1514a96c`: детект stale preload-зависимостей — прямо про нашу болячку из AGENTS.md
  («stale preload → blank renderer»).
- `315e4211`: Prettier без shell; `b2f0e884`: валидация PDFium notices; `624ab429` (пост-релиз):
  rpm без `.build-id`; `a2813b44` (пост-релиз): prerelease-версии в feed-guard — **релевантно
  нашему `stage-update-feed.cjs`**.

## Форк-специфика и риски мержа

1. **Рекомендуемый путь — полный merge** (`git merge v0.10.1467` или `upstream/main`),
   как прецеденты `238c06c7`/`cd48afc4`. Снапшот атомарен — выборочно фичи не вытащить.
2. **Ребрендинг-повтор**: апстрим вернёт идентификаторы `genoffice`/`@genoffice/*`
   (`skills/genoffice/SKILL.md` изменён у них — у нас это `skills/officevega/`; CLI binary name,
   URL-ы, домашние строки). Нужен пост-мерж rename-pass по новым строкам.
3. Горячие точки конфликтов: `apps/shell` (Home/Settings/TabBar/строки — там наш VEGA/Jev
   и брендинг), `packages/cli`, `apps/slides` (AiPanel, slides-skill — наши правки из AGENTS.md),
   `apps/docs` App.tsx/Ribbon, все i18n-шарды (механические конфликты, zh задаёт ключи —
   новые ключи апстрима добавить во все локали; пост-релиз есть `vi` локаль `ea3a8afc` —
   при переносе добавить шард по нашему паттерну).
4. Сохранить наши дефолты: VEGA endpoint для Jev reranking, `OFFICEVEGA_UPDATE_URL`,
   `DOWNLOAD_PAGE_URL` → officevega.com, лицензионные доки не конфликтуют (docs-only).
5. `package-lock.json` трогали обе стороны — регенерировать через npm после мержа
   (pnpm не использовать, см. AGENTS.md).
6. `tools/check-theme-colors.mjs` CI: апстрим добавляет renderer CSS — проверить на
   raw-hex по нашим правилам темизации.
7. Пост-релизные фиксы (85 коммитов) стоит забрать тем же мержем `upstream/main` —
   там доводка новых фич (tab rename, модалки, page-spec brace) иначе придётся чинить самим.

## Проверка после мержа (чек-лист)
- `../../node_modules/.bin/tsc --noEmit` в изменённых пакетах; vitest по затронутым пакетам.
- Пересобрать shell (main-процессные изменения apps/*/src/main не подхватываются без этого).
- Прогон e2e хотя бы по sheets/slides; проверить updater test (наши fork-URL),
  Jev дефолт = VEGA, отсутствие `genoffice` в пользовательских строках.
