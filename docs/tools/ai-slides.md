# AI Slides — генерация слайд-презентации

Код: `apps/slides/src/renderer/ai/slides-skill.ts` (~3.7k строк: 17 тулов +
оркестрация), `AiPanel.tsx` (DeckAccess-исполнители, карточки, QC-проход).
Пайплайны спецификаций: `packages/pipelines/src/slides/` (page-spec,
aspect-ratio, outline, layout-audit…).

Инструменты: `generate_deck`, `upgrade_deck`, `regenerate_slide`,
`ask_clarification`, `read_slide`, `execute_slide_script`, `apply_ops`,
`web_search`, `image_search`, `generate_image`, `analyze_media`,
`insert_web_image`, `replace_image`, `edit_chart`, `save_style_template`,
`list_style_templates`, `load_guide`, `read_attachment` (files-skill).

## `generate_deck` — самоуправляемый пайплайн

AgentLoop исполняет тул-вызовы последовательно — весь параллелизм живёт
**внутри** `generate_deck`. Режимы: `detail:"draft"` (по умолчанию для новой
колоды — быстрый стейджed-путь) и `detail:"full"` (полный дизайн сразу;
автоматически при `insert_mode:"append"`).

### Шлюзы до старта (`slides-skill.ts:1946+`)

1. Доступность пайплайна: draft → `generateDraftPages || generatePageLocal`;
   full → `cloudGeneratePage (gsk slide_generate, если включён) ||
   generatePageLocal`; плюс `landGeneratedPages` обязателен.
2. **Unread-attachments hard gate**: есть непрочитанные текстовые вложения →
   отказ с требованием сначала `read_attachment`.
3. **Figure-provenance gate**: ≥2 конкретных чисел в topic/context/briefs →
   обязателен `dataSource: user|document|search|sample` (`'search'`
   удовлетворяется внутренним research — отдельный `web_search` не нужен).

### Стадии (стейджed-флоу, дефолт)

```
Шаг 0+1 — ПАРАЛЛЕЛЬНО (Promise.all):
├─ researchP: research[] (≤4) → access.searchWeb(q,6) каждый → дайджест
│   (bare topic без context → автозапрос [topic]); fail-open
├─ styleP:    draft → DRAFT_STYLE (фикс. минимальный стиль)
│             full → style_template → loadStyleTemplate
│                   иначе generateStyleSkill (LLM: «арт-директор» пишет
│                   Style Skill: концепция, hex-палитра, типографика,
│                   layout-варианты по типам страниц, anti-default правила)
└─ planP:     pages переданы → пропуск
              иначе planDeckOutline батчами PLAN_BATCH=12:
              первый батч даёт core_hook, остальные — параллельно
              с continueFrom:{coreHook} → pages[] {title,type,brief,layout,
              image_queries[],image_prompts[]}; до 2 попыток парсинга JSON
```

```
Шаг 1.2 — карточка подтверждения аутлайна (proposeOutline), только replace:
  пользователь: approve (можно удалить/переименовать страницы, править брифы)
              | revise (feedback → модель перепланирует и зовёт снова)
              | cancel → ничего не сгенерировано
```

```
Шаг 1.5 — резолв изображений (НЕ в draft — там labelled placeholder-боксы):
  уникальные слоты image_queries+image_prompts (тег [N:M] — часть идентичности)
  → AI-генерация ПЕРВИЧНА: пул из 3 generateImage(prompt, aspectRatio)
  → промахи → fallback searchImages (по 5 кандидатов)
  → явные http(s)/file:// URL уважаются, не перерезолвятся
  → раздача по страницам с дедупликацией (usedUrls); пустые → в отчёт
```

```
Шаг 2 — генерация страниц + упорядоченный лендинг:
  draft: generateDraftPages батчами DRAFT_BATCH=3, DRAFT_WAVES=2 волны
  full:  genOne по странице, GEN_BATCH=4 (cloud) / 2 (local), 2 попытки
         с backoff 2s
  каждая страница → marker (temp one-slide pptx) → flushLanded():
  лендинг строго по порядку (nextToLand), страница появляется сразу —
  юзер видит колоду «растущей». deckName = заголовок обложки.
```

```
Шаг 3 — до 2 ретрай-раундов: локальные genFailed генерятся заново,
landFailed перелендятся через insert_at (позиция = baseOffset +
кол-во приземлившихся перед ней). Cloud-фейлы не ретраятся (retry уже потрачен).
```

### Финал

- `state`: `plannedPages/pageDone` (прогресс в контексте), `draftImageSlots`
  (описания слотов для будущего upgrade), `draftResolvedSlots`,
  `draftPageImages`, `draftImageAspects` (URL→aspect, чтобы restyle не терял
  геометрию), `lastStyleSkill/lastTopic`.
- Sidecar `.styleskill.json` рядом с файлом (fail-open).
- Draft → `onUpgradeOffer({visuals:true, style:true})` — UI рисует кнопки
  следующих стадий (модель не называет тулы в ответе).
- Деградации честно репортятся: failed pages, plain-text fallback pages
  (`degraded`), unresolved image slots, image download fails.

## `upgrade_deck(stage: visuals|style|full)` — вторая стадия стейджed-флоу

- Цели: `pages[]` или все; страницы регенерятся **на месте**
  (`regenerateSlide(idx, marker)` → `landGeneratedPages 'replace_at'`).
- Текст берётся с канваса **verbatim** (`collectNodeInfos`) и вшивается в
  бриф: «keep ALL existing text».
- Слоты визуалов собираются из labelled-боксов на канвасе (`IMAGE:`/`CHART:`)
  + `state.draftImageSlots` (только пока не было visuals-прохода — иначе
  метки-заглушки воскресли бы) + `draftResolvedSlots`/`draftPageImages`.
- Нет восстановимых URL (импорт, потерянная сессия) → `storeImageData`:
  `data:`-байты картинок канваса материализуются в store (только local-путь).
- `style`/`full`: Style Skill = template > свежая генерация > hint > last >
  дефолт. `visuals`-only страницы просят «keep minimal neutral look».

## QC-проход (после рана, `AiPanel.tsx:2034+`)

Каждая приземлившаяся страница идёт в `qcPagesRef`; по завершении рана —
`runQcPass` в свежем цикле: vision-модели получают скриншот + инвентарь,
текстовые — только детерминированную геометрию. Правки страницы — свой
history-batch; если детерминированный аудит показал, что стало хуже
(`postIssues > preIssues`), батч откатывается. Кап `QC_MAX_PAGES`.

## Кейс: «Сделай презентацию кофейни "Зерно" для инвесторов, ~10 слайдов»

```
1. модель → ask_clarification (опционально): аудитория/тон/фокус —
   карточка в композере, юзер отвечает
2. модель → generate_deck({topic:"кофейня «Зерно» — питч инвесторам",
   approx_pages:10, research:["specialty coffee market 2026"]})
   ├─ параллельно: searchWeb("specialty coffee market 2026") → дайджест
   │               DRAFT_STYLE (draft-режим)
   │               planDeckOutline(10) → core_hook + 10 страниц
   ├─ КАРТОЧКА АУТЛАЙНА → юзер убирает стр.9, правит заголовок стр.3 → approve
   ├─ draft: generateDraftPages батчами по 3, 2 волны → ordered landing:
   │        слайды появляются по одному, с placeholder-боксами "IMAGE: … [4:3]"
   └─ отчёт: "Draft deck landed: 9/9" + upgrade-кнопки
3. юзер жмёт «картинки и инфографика» → модель → upgrade_deck(stage:"visuals")
   слоты → generateImage пулом 3 → regenerateSlide каждой страницы
   (текст сохранён дословно, заглушки заменены реальными визуалами)
4. юзер жмёт «единый дизайн» → upgrade_deck(stage:"style")
   → generateStyleSkill («dark cinematic, editorial typography»)
   → полный рестайл всех страниц на месте
5. QC-проход: скриншотные/геометрические фиксы по страницам;
   ухудшившие правки откатываются
```

## Замечания

- Промпты генерации запрещают «карточный» стиль: текст лежит прямо на фоне
  страницы, группы отделяются воздухом и типографикой; залитые боксы —
  только для фокального элемента, дата-визуалов и full-width банд.
  Layout-варианты `three_columns`/`kpi_row` — текстовые колонки без рамок
  (enum в `packages/pipelines/src/slides/outline.ts`).
- Модель генерации форсится на `claude-opus-4-7` только для provider
  `anthropic`; при ошибке запроса — один фолбэк на модель пользователя
  (таймауты/empty не переключают модель).
- Cloud-путь (`gsk slide_generate`) принимает только `https?` изображения —
  `file://` из BYOK-стора недостижим для сервиса; local-путь принимает оба.
- Append к существующей колоде: `pages` + `insert_mode:"append"` +
  `detail:"full"` — карточка аутлайна пропускается, стилистика берётся из
  колоды.
