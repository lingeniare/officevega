# Синхронизация апстрима genoffice → officevega: v0.11.564 + post-release

Дата: 2026-10-14.
Цель: `upstream/main` = `438d9c65` (2026-10-14, после-релизный tip).
Мердж: `f7ae49e5` «Merge upstream/main (v0.11.564 + post-release fixes)».
Релизная точка апстрима: `ab429d0e` «Sync snapshot (2026-10-11)».

## Что вошло мерджем (~20 коммитов)

- Snapshot `ab429d0e` (v0.11.564) + пост-релизные фиксы: `#1973` (узкие
  колонки в docs), `#1968` (Seedream IDs), `#1971` (markdown pane width),
  `#1966` (system font keywords → w:rFonts), `#1945` (кавычки в XLSX
  number formats), `#1942` (compact ribbon clip), `#1949` (row menus),
  `#1950` (Genspark sign-in), `#1953` (clef-omni rerank), `#1941` (CJK
  шрифты темы pptx), `#1904` (page break внутри ячейки таблицы), `#1935`,
  `#1937`, `#1879`.
- Фичи апстрима: `#1944` (токены AI-панели), `#1940` (hero kb-ask),
  `#1919` (подписи PDF), `#1876` (очередь сообщений в чате), `#1954`
  (мануал).

## Backport фиксов по issues

`11cfe041` — пять фиксов:

| Issue  | Суть |
|--------|------|
| #1449  | литеральный `&` в колонтитулах XLSX |
| #1563  | конфликт workbook-/sheet-scoped defined names |
| #1581  | снаппинг коннекторов при повороте/флипе в PPTX |
| #1020  | более новый mtime файла мог снять crash-recovery |
| #1021  | AI-история наследовалась файлу с тем же путём |

## Новые фичи (наша реализация поверх мержа)

| Коммит     | Issue  | Суть |
|------------|--------|------|
| `df62ebbc` | #1947  | полное отключение AI-панели (suite-wide switch) |
| `604ce5f3` | #1903  | eye-care тема страницы (WPS-зелёный фон) |
| `3feb62f9` | #1974  | экспорт Ask AI в Markdown (все 6 панелей + KbAsk) |
| `85a40bdb` | #1975  | внутренние TOC/cross-ref ссылки в экспортируемом PDF |
| `ef35bca8` | #1913  | масштаб интерфейса, независимый от зума документа |

### #1913 — детали дизайна

- `webContents.setZoomFactor` масштабирует chrome + документ; каждый
  редактор делит зум документа на фактор — они независимы.
- `uiScale` в `app-settings.json` (0.5–3.0); дефолт — scaleFactor
  основного дисплея; IPC `app:get/set-ui-scale` + broadcast
  `app:ui-scale-changed`; `web-contents-created` применяет ко всем окнам.
- Sheets: `sheet-ui-zoom.ts` держит intended/display пары — `zoomScale`
  в XLSX пишется по-прежнему.
- Управление: Settings → Appearance (80–200%), View → Interface Zoom
  (`Ctrl+Alt+Shift+=/-/0` — `Ctrl+Shift` занят superscript/nb-hyphen/Excel
  borders), `Ctrl+Shift+wheel` во всех редакторах.
- Скрытые print/export-окна пинятся `setZoomFactor(1)`; `printToPDF`
  зум окна игнорирует (проверено побайтово).

## Попутно исправлено

- Валидаторы `docTheme` в preload shell/docs/markdown/sheets отклоняли
  `eyecare` — маппили в `follow` (добавлено в `604ce5f3`/`ef35bca8`).

## Верификация

- Typecheck всех 8 пакетов чист; `check-theme-colors` чист.
- Тесты: ui 198, docs 3488, sheets 3403, slides 1491, pdf 979,
  markdown 1113, html 331 — все зелёные (единичные падения под
  параллельной нагрузкой проходят соло — тайминги).
- `npm run build:all` — все бандлы собраны, включая xlsx-native (Rust).

## Что дальше (релиз)

См. `docs/update-feed-officevega.md`: поднята `version` в
`apps/shell/package.json` → `dist:win/mac/linux` →
`stage-update-feed.cjs` → заливка инсталлеров, затем `*.yml`.
