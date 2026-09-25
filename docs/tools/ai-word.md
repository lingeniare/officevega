# AI Word — генерация текстового документа

Код: `apps/docs/src/renderer/ai/` — `tools.ts` (29 тулов + исполнитель),
`doc-writer.ts` (стриминг-писатель), `protocol.ts` (системный промпт
`AGENT_SYSTEM_PROMPT`, контекст документа), `docs-skill.ts` (сборка скилла).
Панель: `AiPanel.tsx` — `composeSkills('docs+files', [docs-skill,
files-skill])`.

## Что получает модель

- **Системный промпт** (`protocol.ts:105`): правила выбора инструмента —
  короткие вставки → `insert_content`, переписывание блоков →
  `replace_blocks`, форматирование/структура/batch → `apply_ops`, длинный
  новый контент → `write_document`.
- **Контекст в каждом user-сообщении**: «document block list»
  (`index|type|preview` каждого блока, превью могут быть усечены), статистика
  полнотекста, замороженная на момент рана выделенная область
  (`FrozenSelection`), открытые комментарии, колонтитулы, page setup.
- **Guard свежести**: индекс-адресованные записи (`insert_content`,
  `write_document`, `replace_blocks`, `apply_ops`…) отклоняются, если
  документ менялся вне модели с момента последнего снимка — модель обязана
  перечитать через `get_document_context` (`tools.ts:790-800`).

## Инструменты (основные)

| Тул | Назначение |
|---|---|
| `get_document_context`, `read_blocks` | снимок / полный текст блоков |
| `insert_content` | короткий новый контент (абзац-два) |
| **`write_document`** | длинный контент: документ, глава, отчёт, перевод |
| `replace_blocks`, `replace_selection` | переписать существующие блоки |
| `apply_ops` | форматирование, find&replace, стили, таблицы, поля, TOC |
| `web_search`, `image_search`, `generate_image`, `analyze_media` | факты и медиа |
| `insert_image`, `insert_chart`, `edit_chart`, `set_header_footer` | объекты |
| `add_comment`, `reply_comment`, `resolve_comment`, `read_notes`, `insert_footnote`… | комментарии и сноски |
| `create_document` | новый отдельный файл (не трогая текущий) |
| `read_attachment` (files-skill) | чтение приложенных файлов |

## Процесс `write_document` по коду (`tools.ts:1255-1340`)

1. **Валидация**: `plan` непустой; `writer` доступен (панель всегда
   предоставляет `AiDocWriter`).
2. **Позиция**: `afterBlockIndex` → вставка после блока; пустой документ или
   `replaceDocument=true` → режим `whole`; иначе — отказ с инструкцией
   («документ не пустой — укажи afterBlockIndex или replaceDocument»).
3. **DraftLanding**: создаётся лендинг-черновик на позиции вставки.
4. **Стриминг-писатель**: `writer.write({plan, title, context}, onProgress)`
   — отдельный tool-less запрос с промптом `WRITER_SYSTEM`
   (`doc-writer.ts:45+`): «пиши всё содержимое целиком, только факты из
   материалов, ограниченный HTML». Тело ответа — сам HTML-фрагмент; дельты
   каждые ~300 мс (`DRAFT_TICK_MS`) уходят в `draft.update(html)` —
   пользователь видит текст появляющимся в документе. Лимиты:
   `DOC_MAX_CHARS = 200k`, `CONTEXT_CAP = 8000`.
5. **Лендинг**: `parseHtmlFragment(result.html)` → ProseMirror-ноды →
   `replaceBlockRange` (whole) или `insertBlocksAfter` (after index).
   Обрезанный стрим (`truncated`) — пользователь решает keep/discard в UI;
   при keep парсится отрендеренный partial.
6. **Отчёт модели**: «Content written by the system (N blocks)» + хвост про
   неполноту; модель отвечает 1-2 фразами, не вставляя текст.

## Кейс: «Напиши аналитический отчёт по рынку EV на 3 страницы»

```
пользователь → run("Напиши отчёт…")
1. user-msg += снимок документа (пустой doc → block list пуст)
2. модель: "Соберу данные и напишу отчёт."
   → web_search("global EV market 2026 sales statistics")
   → web_search("EV market China Europe US share")
     (оба результата — title/url/snippet из main-процесса)
3. модель: → write_document({
     plan: "Title: …; sections: 1) Market size …; tone: analytic; ~3 pages",
     context: "<факты и цифры из выдачи — writer видит ТОЛЬКО plan+context>"})
4. система: position=whole; DraftLanding; writer.write() → стриминг-запрос
   → текст растёт в документе на глазах у пользователя
5. done → parseHtmlFragment → replaceBlockRange → markDocSeen
6. модель: "Готово: отчёт на ~3 страницы с разделами …"
   (+ карточка с Undo-снапшотом — captureSnapshot до первой мутации)
```

Варианты: непустой документ → модель передаёт `afterBlockIndex` (вставка
главы) или `replaceDocument=true` (полный рерайт). Прерванный стрим → карточка
«keep/discard»; keep → контент помечается неполным, модель предлагает
дописать хвост тем же `write_document` с `afterBlockIndex` в конец.

## Особенности

- Медиа-тулы (`generate_image`, `analyze_media`) скрываются динамически, если
  нет провайдера (`docs-skill.ts:56-65` — `mediaToolsOff()` + примечание в
  системный промпт).
- Комментарии обрабатываются по одному: правка → `reply_comment` →
  `resolve_comment` — никогда одной гигантской правкой.
- Ревизии: `read_revisions` только читает; accept/reject — за пользователем
  (Review tab).
