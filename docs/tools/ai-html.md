# AI Html — генерация одностраничного сайта

Код: `apps/html/src/renderer/ai/` — `tools.ts` (7 тулов + исполнитель),
`page-writer.ts` (стриминг-писатель страницы), `brief-writer.ts` (писатель
брифа), `AiPanel.tsx` (карточки, DraftPreview). Скиллы:
`composeSkills('html+search', [document-skill, search-skill, files-skill,
intent-skill])` (`AiPanel.tsx:690`).

Инструменты: `get_outline`, `read_source`, `apply_ops`,
`ask_clarification`, `plan_page`, `fill_images`, `write_document`
(+ `web_search`, `read_attachment` из соседних скиллов).

## Пайплайн новой страницы

```
ask_clarification → plan_page(brief-карточка) → streamed writePage
                                                           ↓
                                              DraftPreview → fill_images
```

### 1. `ask_clarification` — анкета + параллельный ресёрч

- 1–4 вопроса, ≤5 опций; для новой страницы первый вопрос предлагает 2–3
  готовых структуры секций («Hero → Features → Pricing → Contacts» и т.п.);
  карточка сама добавляет «decide for me» / free-text.
- Опциональное поле `search` (≤4 запроса): поиски идут **параллельно, пока
  юзер отвечает на карточку**; каждый запрос ограничен `Promise.race` 15 с —
  карточка никогда не блокируется на поиске. Находки прилетают в результат
  тула (`Web findings…`), их читает brief-writer.
- Юзер пропустил карточку → «decide yourself, then call plan_page».

### 2. `plan_page(mode)` — бриф-карточка

Режимы: `new` | `redesign` | `restyle` | `extract`
(`tools.ts:1031-1108`).

1. `planBrief(spec)` → `runBriefWriter` → `streamBrief`: отдельный tool-less
  LLM-запрос, который читает **транскрипт разговора** (ответы анкеты,
  web-находки, вложения, текущую страницу) и выдаёт черновик брифа. Пустой
  ответ — один ретрай.
2. `confirmBrief(brief)` → карточка брифа: style-tiles с редактируемыми
  полями (core hook, стиль, список секций). Исходы: `confirmed`
  (учитываются `user_edited` поля — держатся verbatim) | `redo` (note →
  модель зовёт `plan_page` снова с notes) | `cancelled`.
3. Дальше по режиму:
   - `new`/`redesign` → `landPage({kind:'design', brief, instruction,
     context})` (ниже).
   - `restyle` → бриф пинится в документ (`<meta name="officevega:brief">`),
     модель обновляет `--brief-*` переменные через `apply_ops` —
     структура и текст не трогаются.
   - `extract` → только пин брифа.

### 3. `writePage` — стриминг-генерация (`page-writer.ts`)

- Отдельный tool-less запрос: `DESIGN_SYSTEM` + `## Confirmed brief` (JSON) +
  reference material (cap 8000) + исходный запрос пользователя.
- Контракт вывода: чистый `<!doctype html>…</html>`, один `<style>`,
  без CDN/скриптов; `:root` обязан объявить `--brief-primary/-accent/-bg/
  -surface/-text/-font-*/-radius/-space/-shadow`; секции —
  `data-section="<type>"` с layout-вариантами; **картинки — контракт
  `<img class="img-slot" data-img="English prompt">` без `src`** +
  shimmer-правило `.img-slot`.
- Дельты стримят в preview-мirror (`previewDraft`, троттлинг
  `DRAFT_PREVIEW_MS`) — юзер видит страницу растущей. `PAGE_MAX_CHARS=200k`.
- Исходы: `complete` → `replaceAll(html,'generate')`; `empty` → один ретрай;
  `partial` (обрыв/стоп/max_tokens) → черновик остаётся, карточка
  keep/discard.
- После лендинга тулы репортят секции и число `data-img`-слотов → модель
  зовёт `fill_images`.

### 4. `fill_images` — заполнение слотов (`tools.ts:878-1030`)

1. Сбор всех `<img data-img="…">` (prompt из атрибута); нет слотов → «нечего
   заполнять».
2. Та же ClarifyCard спрашивает юзера «заполнить N слотов?» — отказ =
   стилизованные заглушки остаются, повторно не предлагается.
3. Дедуп промптов (регистр/пробелы) → **пул из 3 воркеров**: `generateImage`
   (aspect 16:9) первичен — 2 подряд ошибки генератора = стоп-фидер
   (`genErrors < 2`), дальше `searchImages` fallback; каждый URL →
   `persistImage` (file:→assets/, https:→assets/ для сохранённых документов).
4. Один `apply_ops`-батч `str_replace`: `data-img="…"` → `src="…"`
   (`replace_all`, дубли-слоты делят одну картинку); stray `src` на том же
   теге снимается scoped-заменой.
5. Отчёт «Filled X of N» — недозаполненные слоты называются явно.

## `write_document` — контент-first режим

Для «напиши текст» (статья, гайд, memo): тот же стриминг, но
`CONTENT_SYSTEM` — чистая одноколоночная семантическая вёрстка без дизайн-
выкрутасов (~680px мера). Дизайн-страницы всегда через `plan_page`.

## Guard'ы

- `seenVersion`: `apply_ops`/`plan_page`/`write_document` отклоняются, если
  юзер правил документ после последнего снимка → `STALE_MESSAGE`, модель
  обязан перечитать (`get_outline`/`read_source`) и перепланировать.
- `apply_ops`: детект обрезанных `data:` URL (многоточие в src → reject);
  `attachment://name` ссылки раскрываются в реальные src на IPC
  (base64 никогда не идёт через аргументы тула); счётчик parse-recoveries —
  предупреждение, если правка внесла >5 новых ошибок парсинга.
- Контекст (`buildContext`): файл/объём/версия, title, outline с `sid`
  (стабильные id элементов для apply_ops), выделенный элемент, пиннутый бриф.

## Кейс: «Сделай лендинг для кофейни "Зерно"»

```
1. модель → ask_clarification({questions:[структура, тон, аудитория],
     search:["coffee shop landing examples"]})
   юзер: «Hero → Меню → О нас → Контакты», тон «тёплый минимализм»
   + web-находки в результате тула
2. модель → plan_page(mode:"new")
   → brief-writer: черновик брифа из транскрипта
   → BriefCard: юзер правит accent-цвет → confirm
   → landPage → streamPage: <!doctype html>… льётся в DraftPreview,
     3 слота <img data-img> без src
   → replaceAll → "Page written (18k chars; sections: hero,menu,about,
     contacts; 3 image slots) — call fill_images"
3. модель → fill_images → карточка «заполнить 3 слота?» → да
   → generateImage ×3 (пул 3) → persistImage → apply_ops: src подставлены
4. модель: «Лендинг готов: hero с фото интерьера, меню, о нас, контакты»
5. дальше точечные правки: apply_ops по sid ("сделай hero темнее"),
   restyle → plan_page(mode:"restyle") + правка --brief-* переменных
```
