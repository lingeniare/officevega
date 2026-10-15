# Синхронизация апстрима genoffice → officevega: v0.11.727

Дата: 2026-10-15.
Цель: `upstream/main` = `62ec0584` (v0.11.727).
Мердж: ветка `merge/upstream-2026-09-28`, поверх `9ab4b62c`
(удаление локалей cs/he/hi/ms/nl/vi/zh-TW).
Предварительный разбор: `docs/upstream-review-2026-10-15.md`
(28 коммитов дельта `438d9c65..62ec0584`).

## Что вошло

- **ODF-импорт** — новый пакет `packages/odf2ooxml` (~4300 строк):
  .odt/.ods/.odp + шаблоны → docx/xlsx/pptx с диалогом конвертации.
  Требует `npm install` после мерджа (линковка workspace-пакета).
- **Mail-merge в docs**: MERGEFIELD поля, источники данных, подстановка
  (#2030, #2009, #2026).
- **Декларативные профили кастомных AI-endpoint'ов**: протоколы
  openai/anthropic/gemini, заголовки, `apiKeyEnv`, probe-кэш моделей —
  релевантно для api.vega.chat (OpenRouter-compatible).
- **Mind map** в AI-ассистенте docs и markdown (`generate_mindmap`,
  MindMapCard).
- **Компактная лента** (⌥⌘K / Ctrl+Alt+K) во всех приложениях +
  `useRibbonCollapse`, счётчик слов в статус-баре docs.
- **Контекстное меню вкладок**: rename/duplicate/split/close others/
  reopen; восстановление геометрии окон (settled-rectangle checks).
- **[[wiki links]]** в markdown, paper themes, экспорт Markdown
  с медиа, image-host (S3/sm.ms) для вставки картинок.
- Sheets: RTL toggle, ленивая загрузка шрифтов, расширения ленты.
- PDF: redaction, fill/sign, reliability экспорта/печати.
- Множество правок вёрстки docs: обтекание, плавающие таблицы,
  keepNext, метрики CJK/Korean шрифтов.
- **Безопасность**: `1ac9775c` — SSRF-gate (биндинг к провалидированным
  адресам, proxy-aware) + magic-bytes проверка AI-картинок.

## Решения по конфликтам (наше поверх их)

| Зона | Решение |
|------|---------|
| Масштаб UI | НАШ `webContents.setZoomFactor` (0.5–3.0 через clamp, лестница пресетов 1–1.5 для меню View); их CSS-`zoom` не взяли. `ui-scale.ts` держит обе границы. |
| AI sidebar | НАШ hard-off: выключатель прячет и панель, и все входы Ask AI (лента/меню). Их `useAiSidebarEnabled` (soft-hide) используется только в docs как читалка флага. |
| PDF links | Комбинация: наши `PdfLinkPlan`/measured rects + `installPdfAnchorIds` для single-pass; их `collectPdfInternalLinks` + IPC и `pdf-lib` аннотации для merged/chunked экспорта. |
| Recovery copy | Их `recoveryCopyDiskNewer` + наше: новый файл на диске НЕ удаляет копию молча — prompt получает `fileIsNewer`/`newerWarning` (ключи `autosaveDiskNewer`, `autosaveFileNewer`). |
| AI provider | Union: их custom-profile credential resolution + наши VEGA (`api.vega.chat`) и license gating (`setLicenseGetter`). |
| Sheets File tab | НАШ File-popover + их compact ribbon/RTL опции. |
| Локали | Только 9: en/ru/uz/kk/az/tk/ky/tt/ka. Новые upstream-ключи в тюркских/грузинском шардах — английские плейсхолдеры (помечены к переводу). |

## Попутно исправлено при мердже

- `GenOffice` → `OfficeVega` в новых ODF-диалогах (en/ru + плейсхолдеры).
- `aiSettingsInputSchema` (sheets): добавлено поле `fastModel` — наша
  схема провайдера, upstream `.strict()` его ронял.
- `SettingsModal`: `withProbedCache` читал `endpoint`/`meta` из
  render-scope — TDZ-crash при unmount-флаше автосейва
  (`if (!settings) return null` раньше объявлений). Переведено на
  `endpointRef`/`metaRef`.
- `TRANSLATE_LANGS`/`TRANSLATE_TARGETS` (docs/slides/sheets): восстановлен
  полный список из 21 языка — это цели перевода документа, не UI-локали;
  ключи `appLang*`/`ribbonLang*` добавлены во все 9 шардов.
- Тесты под нашу конфигурацию: `i18n-key-parity` (эталон en, не zh),
  `tab-menu`/`status-word-count-wiring` (9 локалей), `ui-scale` (клэмп
  0.5–3), `mind-map` (summary через `t()`, не zh-литерал),
  `ribbon-compact` (ключ `officevega-pdf-ribbon-collapsed`),
  `settings-custom-models` (`saveDraft` через 600ms автосейв — у нас нет
  кнопки Save), `windows-restore-layout` (моки `nativeTheme`, `once`,
  `setBackgroundColor`), `table-design-create` (timeout 30s — медленный
  импорт графа).
- Временные мердж-хелперы: `tools/_merge-i18n-table.mjs`,
  `tools/_i18n-parity.mjs` (паритет ключей шардов — оставлены для
  следующих синков).

## Верификация

- `tsc --noEmit` чист: shell, docs, sheets, slides, markdown, pdf, html
  + пакеты ai-provider, i18n, ui, agent-core, odf2ooxml, pptx-engine,
  xlsx-gateway, pipelines.
- Тесты (прямой запуск vitest из `node_modules`, см. AGENTS.md):
  ai-provider 527 · odf2ooxml 24 · i18n 23 · ui 204 · docs 3720 ·
  sheets 3433 · slides 1504 · markdown 818 · pdf 929 · html 331 ·
  shell 869 — все зелёные.
- Конфликт-маркеров нет; ссылок на удалённые локали нет (кроме
  комментария zh-TW в `font-names.ts` — метрики шрифтов, не UI).
- `npm run build -w @officevega/shell` — см. сборку в сессии.

## TODO после мерджа

- Перевести en-плейсхолдеры новых ключей в uz/kk/az/tk/ky/tt/ka
  (ODF-диалоги, mind map, compact ribbon, tab menu, recovery).
- Оценить `sync/2026-10-15-11-54` (следующий snapshot апстрима,
  `44770842`) на следующем синке.
