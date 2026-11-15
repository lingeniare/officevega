# OfficeVega 0.4.0

**Дата релиза:** 2026-11-15
**Установщик (Windows x64):** `OfficeVega Setup 0.4.0.exe`

Пятое публичное обновление OfficeVega. Сборка основана на `upstream/main` коммите `19a389b3` — включает стабильный релиз GenOffice **v0.13.18** и все пост-релизные исправления по 2026-11-14 включительно (всего **181 коммит** относительно 0.3.0: 27 новых возможностей и 123 исправления).

**Основание:** `upstream/main` 19a389b3 + 181 коммит форка (99 прежних + интеграция).
**Инженерные детали:** [`docs/upstream-sync-v0.13.18.md`](docs/upstream-sync-v0.13.18.md).

## Главное

- **Slides: открытие старых `.ppt` (PowerPoint 97–2003).** Файл конвертируется в редактируемый `.pptx` через новый движок `ppt2pptx` — со слайдами, текстом и графикой.
- **Slides: раздаточные материалы 4/9 на страницу** с выбором порядка слайдов при печати.
- **Docs: «Режим истории» (Story View)** — пишите без отвлечения на форматирование; **автоопределение заголовков** по нестилизованным абзацам для оглавления.
- **Docs: открытие `.doc`/`.dot` и корейских `.hwp`/`.hwpx`** с конвертацией.
- **Sheets: срезы (slicers) и шкалы времени** сохраняются в файле; **управление внешними связями** (разрыв, смена источника); импорт CSV/разделителей — потоковый, с прогрессом, отменой и настраиваемым лимитом строк.
- **Sheets: EMF-картинка в буфер обмена Windows** — вставка в другие приложения без потери качества.
- **PDF: поиск чувствительных данных по паттернам** (банковские реквизиты, паспорта, телефоны…) перед redaction; **редактирование текста**, **экспорт в PowerPoint**, **сравнение документов**, вложения, измерения/калибровка, нумерация Бейтса, подписи-сертификаты.
- **MCP/CLI: `convert_document` и `check_document`** — агенты конвертируют и валидируют файлы напрямую; **`read_blocks`** во встроенном MCP-сервере; `set_header_footer` с выбором секции; регистрация сервера для DeepSeek Harness (dsh).
- **AI: новые decision-эндпоинты** — Google Decisions API как маршрут модели решений, Perplexity v12/flash, Liquid Ultra, Cloudflare Flash, Gemini; DeepSeek в лестнице thinking-effort; провайдеры изображений Stability AI и FLUX; SearchApi как источник веб- и картиночного поиска.
- **Сессия восстанавливается по умолчанию** — вкладки и открытые документы возвращаются после перезапуска.
- **123 исправления**: движки docx/xlsx/pptx/odf, file-parse, hwp2docx, печать, экспорт, шрифты, буфер обмена.

## Изменения по приложениям

### Оболочка (shell)

**Новое**
- Подтверждение перед выходом из аккаунта ([#2690](https://github.com/genspark-ai/genoffice/pull/2690))
- Диалог настроек перестроен; быстрые плитки создания — авто-сетка ([#2591](https://github.com/genspark-ai/genoffice/pull/2591), [#2638](https://github.com/genspark-ai/genoffice/pull/2638))
- Можно скрыть плавающий AI-чип редактирования при выделении ([#2602](https://github.com/genspark-ai/genoffice/pull/2602))
- Создание файлов по URL-схеме `officevega:` ([#2475](https://github.com/genspark-ai/genoffice/pull/2475))
- Проверка метаданных недавних файлов больше не блокирует главный процесс ([#2541](https://github.com/genspark-ai/genoffice/pull/2541))
- Конфиг сборки ARM64-таргета для Linux ([#2474](https://github.com/genspark-ai/genoffice/pull/2474))

**Исправления**
- Хранилище проектов пропускает некорректный seq при чтении записей чата и ограничивает кардинальность инструментов/вложений ([#1830](https://github.com/genspark-ai/genoffice/pull/1830), [#1126](https://github.com/genspark-ai/genoffice/pull/1126))
- Переведённые элементы печати помещаются в колонку настроек ([#2553](https://github.com/genspark-ai/genoffice/pull/2553))
- Серия исправлений в `shell`, `electron-utils`, `window-registry` (стабильность окон, горячих клавиш, загрузки)

### Docs

**Новое**
- «Режим истории» — редактор без форматирования ([#2595](https://github.com/genspark-ai/genoffice/pull/2595))
- Заголовки оглавления выводятся из нестилизованных абзацев ([#2667](https://github.com/genspark-ai/genoffice/pull/2667))
- Обновление оглавления одной командой; панель стилей с действиями из настроек стилей и заголовком панели
- Отслеживание изменений для встроенных объектов; выделение через границы ячеек таблицы
- Раскладка CJK/арабского/бенгали; подстановка недостающих шрифтов
- Save As в PDF/HTML/Markdown
- Открытие legacy `.doc`/`.dot` и `.hwp`/`.hwpx` с конвертацией

**Исправления (17 `fix(docs)` + смежные)**
- Сочетания клавиш по физической клавише — работают на любой раскладке ([#2685](https://github.com/genspark-ai/genoffice/pull/2685))
- Разрешение системных и пользовательских шрифтов Linux для метрик — рекурсивный скан + XDG ([#2698](https://github.com/genspark-ai/genoffice/pull/2698))
- EMF+ записи рисунков docx воспроизводятся корректно ([#2628](https://github.com/genspark-ai/genoffice/pull/2628))
- Исправления в `docx`, `odf2ooxml` (27), `pdf2docx` (3), `hwp2docx` (3), `file-parse` (14): связи пакетов workbook/presentation, таблицы, списки, стили, поля

### Sheets

**Новое**
- Срезы и шкалы времени сохраняются при сохранении ([#2226](https://github.com/genspark-ai/genoffice/pull/2226))
- Внешние связи: разрыв и смена источника ([#2350](https://github.com/genspark-ai/genoffice/pull/2350))
- Импорт разделителей с прогрессом и отменой ([#2545](https://github.com/genspark-ai/genoffice/pull/2545)); лимит строк задаёт пользователь ([#2539](https://github.com/genspark-ai/genoffice/pull/2539))
- `add_chart` принимает имена колонок ([#2547](https://github.com/genspark-ai/genoffice/pull/2547))
- Копирование кладёт EMF в буфер обмена Windows ([#2588](https://github.com/genspark-ai/genoffice/pull/2588))
- Сохранение вставленной картинки; удаление условного форматирования; области печати для переименованных листов

**Исправления (16 `fix(sheets)` + `xlsx-gateway`)**
- Синхронизация формул и экспорта; парсинг workbook-связи пакета ([#2714](https://github.com/genspark-ai/genoffice/pull/2714))
- Покрытие: seeded round-trip fidelity-фазз для пайплайна XLSX ([#2665](https://github.com/genspark-ai/genoffice/pull/2665)), hostile-input фазз для сайдкар-импорта ([#2542](https://github.com/genspark-ai/genoffice/pull/2542))

### Slides

**Новое**
- Открытие legacy `.ppt` — конвертируемая `.pptx`-копия через `ppt2pptx` ([#2509](https://github.com/genspark-ai/genoffice/pull/2509))
- Раздатки 4/9 на страницу + порядок слайдов ([#2533](https://github.com/genspark-ai/genoffice/pull/2533))
- Slide Show → Record: диктовка слайдов покадрово ([#2056](https://github.com/genspark-ai/genoffice/pull/2056))
- Экспорт в MP4; поиск шрифтов; перенос строк CJK; кернинг и табуляции

**Исправления (`pptx-engine` 9, `pptx-ops`, `slides`)**
- Hostile-input фазз для обоих PPT-импортёров ([#2586](https://github.com/genspark-ai/genoffice/pull/2586))
- Связь пакета presentation в file-parse ([#2713](https://github.com/genspark-ai/genoffice/pull/2713))

### PDF

**Новое**
- Redaction: поиск чувствительной информации по паттернам перед сокрытием
- Редактирование текста; экспорт в PowerPoint; сравнение документов
- Вложения, измерения/калибровка, сохранение OCR, сжатие, закладки, нумерация Бейтса, гиперссылки, комментарии
- Диалог печати предлагает опции драйвера принтера ([#2360](https://github.com/genspark-ai/genoffice/pull/2360)); отмена/повтор операций со страницами; разблокировка owner-паролем; зум по умолчанию

**Исправления (8 `fix(pdf)`)** — стабильность печати, аннотаций, подписей.

### AI-провайдер и агент

- Google Decisions API как маршрут модели решений ([#2637](https://github.com/genspark-ai/genoffice/pull/2637))
- SearchApi — провайдер веб- и картиночного поиска ([#2484](https://github.com/genspark-ai/genoffice/pull/2484))
- Stability AI и FLUX — провайдеры изображений, обновлённые каталоги ([#2442](https://github.com/genspark-ai/genoffice/pull/2442))
- DeepSeek в лестнице thinking-effort ([#2550](https://github.com/genspark-ai/genoffice/pull/2550)); опции thinking для OpenAI/Gemini-совместимых эндпоинтов; кэш-брейкпоинты промптов
- Фоновая компакция агента не блокирует диалог

### MCP и CLI

- `convert_document` и `check_document` расширяют файловую поверхность агентов ([#2587](https://github.com/genspark-ai/genoffice/pull/2587))
- `read_blocks` во встроенном MCP-сервере ([#2664](https://github.com/genspark-ai/genoffice/pull/2664))
- `set_header_footer` с указанием секции ([#2565](https://github.com/genspark-ai/genoffice/pull/2565))
- Регистрация для DeepSeek Harness (dsh) ([#2462](https://github.com/genspark-ai/genoffice/pull/2462))
- Флаг `--no-generator-fields`; компактные схемы в install/list ([#2568](https://github.com/genspark-ai/genoffice/pull/2568))

## Специфика форка OfficeVega

Сохранено и дополнено при интеграции:

- **Брендинг:** OfficeVega/VEGA на всех пользовательских поверхностях; `officevega:` URL-схема; лончер распознаёт и наследие `vegaoffice`.
- **MCP:** сервер публикуется как `mcp-officevega`/`officevega`; legacy-блоки `mcp-genoffice` распознаются как свои и мигрируются, настоящий GenOffice не перезаписывается.
- **VEGA-интеграции:** провайдер VEGA, decision-эндпоинт, лицензионный клиент и гейты по лицензии — без изменений.
- **i18n:** extras-локали (uz/kk/az/tk/ky/tt/ka) получили переводы нового redaction-поиска; метка создания — «Markdown».
- **Шрифты:** `@font-face OfficeVega Hangul Space` (пробел U+0020) на месте.
- **Лицензионные моки** в тестах настроек (`getLicenseStatus`/`onLicenseChanged`).

## Тестовая матрица

| Пакет | Тесты |
|---|---|
| shell | 1 292 ✅ |
| sheets | 4 191 ✅ |
| docs | ~6 430 ✅ |
| pdf | 1 285 ✅ |
| cli | 575 ✅ |
| ai-provider | 641 ✅ |
| agent-core | 322 ✅ |
| slides | ✅ |
| html | 377 ✅ |

Typecheck (`tsc --noEmit`) — все пакеты без ошибок.
