# Группа `code` — архитектура и логика работы

Документ описывает режим «Создать код, сайт» (search group `code`) в AI-чате Vega:
как устроена система групп в целом и что конкретно делает `code`. Написан как
референс для переноса на новый проект — в конце есть чеклист портирования.

> Проект: Next.js 16 (App Router) + Vercel AI SDK v7 (`streamText`, `tool`,
> `useChat`, UI message stream). Модели идут через Vercel AI Gateway под
> vega-алиасами (`vega-mini` → `openai/gpt-6-luna` и т.д.).

---

## 1. Суть режима

`code` — это один из ~20 режимов («групп») чата. Группа = связка:

| Слой | Что задаётся | Где |
|---|---|---|
| Идентификатор | `'code'` в union-типе `SearchGroupId` | `lib/utils.ts` |
| UI-метаданные | имя, описание, иконка, `show`, `requiresAuth` | `lib/utils.ts` → `searchGroups` |
| Набор инструментов | `['code_context', 'web_search', 'github_search', 'code_interpreter']` | `app/actions.ts` → `groupTools` |
| Системный промт | большой instruction-блок | `app/actions.ts` → `groupInstructions` |
| Модель по умолчанию | `vega-mini` (GPT-6 Luna) | `ai/model-catalog.ts` → `MODEL_GROUP_DEFAULTS` |
| Тарифные тиры | MiniCoder / ProCoder / UltraCoder / UltimateCoder | `ai/model-catalog.ts` → `CODE_MODE_MODELS_BY_TIER` |
| Стоимость | 5/8/14/20 ⭐ по тиру + доплата за входящие токены | `lib/constants.ts`, `lib/ultra-pricing.ts` |

В отличие от поисковых групп (`web`, `extreme` — там инструмент обязателен),
в `code` инструменты **опциональны**: модель может сразу писать код без
tool-вызовов. Это ключевая особенность, которая определяет все настройки
tool-цикла (см. §6).

---

## 2. Карта файлов

```
lib/utils.ts                          # SearchGroupId + searchGroups (UI-реестр групп)
app/actions.ts                        # groupTools, groupInstructions, getGroupConfig()
app/api/search/route.ts               # главный пайплайн: billing, streamText, tool-цикл
lib/tools/code-context.ts             # code_context — Parallel Search → fallback Exa
lib/tools/github-search.ts            # github_search — GitHub Search API
lib/tools/code-interpreter.ts         # code_interpreter — Daytona sandbox (Python)
lib/tools/web-search.ts               # web_search — Exa/Parallel
lib/tools/index.ts                    # реестр-реэкспорт всех инструментов
lib/search-provider-routing.ts        # restrictToolsForGroup, resolveSearchToolProviders
lib/tool-loop-policy.ts               # ⚠️ мёртвый код (см. §9)
lib/constants.ts                      # STAR_COSTS.code, CODE_MODEL_TIER_COSTS, getStreamTimeoutConfig
lib/ultra-pricing.ts                  # calculateCodeModelRequestStars (токеновая доплата)
lib/html-preview.ts                   # sanitizeHtmlPreview — санитизация HTML-превью
ai/model-catalog.ts                   # модели, CODE_MODE_MODELS_BY_TIER, getCodeModelTier, getModelForToolUsage
ai/providers.ts                       # vega customProvider → AI Gateway + middleware

components/chat-interface.tsx         # selectedGroup state, отправка group в body запроса
components/ui/form-component.tsx      # селектор групп, расчёт цены запроса в UI
components/ui/group-mode-toggle.tsx   # кнопка-переключатель режима → ToolSelectionDialog
components/ui/tool-selection-dialog.tsx # диалог выбора группы
components/ui/model-switcher.tsx      # выбор модели (в code — по тирам)
components/ui/model-selection-dialog.tsx
components/messages.tsx               # проброс selectedGroup в сообщения
components/message-parts/index.tsx    # рендер tool-invocation: code_interpreter/code_context/github_search
components/tool-invocation-list-view.tsx # CodeInterpreterView: вкладки Превью/Код, iframe srcDoc
components/markdown.tsx               # code-блоки html/svg с вкладкой «Предпросмотр»
components/github-search-results.tsx  # карточка результатов GitHub
components/code-sandbox-block.tsx     # лендинг-демо «песочницы» (маркетинг, не часть чата)

messages/ru.json                      # i18n: searchGroups.code, quickActions, ui.code.*
docs/fix-code-mode-duplicate-answers.md # почему в code нельзя toolChoice:'required'
```

---

## 3. Регистрация группы

### 3.1. Тип и UI-реестр — `lib/utils.ts`

```ts
export type SearchGroupId =
  | 'auto' | 'web' | 'academic' | 'youtube' | 'stocks' | 'chat'
  | 'extreme' | 'memory' | 'crypto' | 'code' | 'image' | 'transcription'
  | 'video' | 'music' | 'prediction' | 'github' | 'flight' | 'places'
  | 'movies' | 'weather';

export const searchGroups = [
  // ...
  {
    id: 'code' as const,
    name: 'Создать код, сайт',
    description: 'Создание кода с MCP',
    icon: CodeCircleIcon,
    show: true,            // видна в переключателе режимов
    requiresAuth: true,    // только для авторизованных
  },
  // ...
] as const;
```

`searchGroups` — единый источник для всех селекторов режима
(`group-mode-toggle.tsx`, `tool-selection-dialog.tsx`, нижняя панель
`form-component.tsx`, suggested questions). Флаг `show: false` у части групп
(`github`, `prediction`, `stocks`…) — такие режимы недоступны как самостоятельные,
но существуют как суб-роуты мультитула `web` (см. §4.2).

### 3.2. Инструменты и промт — `app/actions.ts`

```ts
const groupTools = {
  // ...
  code: ['code_context', 'web_search', 'github_search', 'code_interpreter'] as const,
  // ...
} as const;
```

Промт собирается композицией общих блоков-констант (`VEGA_PERSONA`,
`LANGUAGE_RULES`, `FORMAT_RULES`, `MEMORY_USAGE_RULES`, `COMPLETENESS_RULES`)
плюс секции, специфичные для кода: `Core behavior`, `Code quality`,
`HTML / frontend`, `Vercel Web Interface Guidelines` (accessibility, focus states,
forms, animation, typography, performance), `Tool selection`, `Images for
websites`, `Response`. Полный текст — `app/actions.ts:713–771`.

Важно: промт `code` сознательно **не включает** `CORE_RULES` («RUN TOOL
IMMEDIATELY before writing») и `TOOL_RULES` («Run tool FIRST»), которые есть у
поисковых групп — в code инструменты опциональны, и принуждение в промте
противоречило бы `toolChoice: 'auto'` (§6.1).

Ключевые установки промта:

- Отвечать сразу на self-contained задачи (генерация, дебаг, рефакторинг) —
  инструменты не нужны.
- `code_context` обязателен при незнакомых библиотеках и исправлении ошибок —
  «не угадывай API».
- До 3 последовательных tool-вызовов для глубокого ресёрча
  (`code_context → web_search → github_search`).
- HTML-страницы — одним self-contained блоком ```html, без JS-CDN
  (in-app превью надёжнее без внешних скриптов; см. §8).
- `code_interpreter` — только для исполнения Python/данных/чартов, никогда
  для статичных страниц.
- Ровно ОДНА версия решения — без повторов после tool-вызовов
  (страховка от бага дублей у grok, см. `docs/fix-code-mode-duplicate-answers.md`).

### 3.3. Server Action `getGroupConfig()` — `app/actions.ts:851`

```ts
export async function getGroupConfig(groupId: LegacyGroupId = 'web') {
  'use server';
  if (process.env.NODE_ENV !== 'production') {
    validatePromptLanguageRules(); // все промты обязаны включать LANGUAGE_RULES
  }
  // memory/buddy требуют авторизации — иначе откат на 'web'
  const tools = groupTools[groupId];
  const instructions = groupInstructions[groupId];
  return { tools, instructions };
}
```

В роуте результат кэшируется: `getCachedData('group-config-code')` →
`setCachedData(...)` (`app/api/search/route.ts:2110–2121`), потому что конфиг —
статичный объект в памяти.

---

## 4. Поток запроса

### 4.1. Клиент → сервер

`components/chat-interface.tsx`:

- `selectedGroup` хранится в sessionStorage (`vega-selected-group-v6`,
  default `'auto'`). Смена группы сбрасывает/подхватывает сохранённую модель
  `vega-model-${group}`.
- `useChat` + `DefaultChatTransport({ api: '/api/search' })`; в
  `prepareSendMessagesRequest` в body кладётся `group: selectedGroupRef.current`,
  `model`, `temperature`, `timezone`, флаги и т.д. (chat-interface.tsx:1006–1045).
- Для `code` также доступна температура («солнце-снежинка» в UI).

### 4.2. Сервер: резолвинг группы — `app/api/search/route.ts`

```ts
const group = rawGroup || 'chat';        // сырая группа из body
let actualGroup = group;                  // эффективная группа
// group='web' может переадресоваться роутером намерений в 'github'/'prediction'/...
// group='auto' обрабатывается автопилотом. Для 'code' actualGroup === 'code'.
```

Затем:

1. **Валидация и санитизация сообщений** (`filterValidUIMessages`,
   `trimChatContextMessages` до `MAX_CONTEXT_MESSAGES`).
2. **Выбор модели**: `getModelForToolUsage(originalModel, group)` — для `code`
   модель **не подменяется** (группа в `preserveModelGroups`: пользователь
   осознанно выбрал модель и её тир определяет цену).
3. **Доступ**: гости не могут в `code` (`requiresAuth`, баннер тарифов);
   тариф `hobby` имеет `code` в `disallowedGroups` (`lib/constants.ts:215`).
4. **Вложения**: `code` входит в `shouldExtractDocuments` — документы
   извлекаются в текст (полный текст только у последнего user-сообщения,
   старые сжимаются до summary).
5. **Конфиг**: `getGroupConfig('code')` → `{ tools, instructions }`
   (через in-memory кэш).
6. **Активные инструменты**:
   `activeTools = restrictToolsForGroup(actualGroup, [...baseActiveTools])` —
   для `code` возвращает список как есть.
7. **Биллинг** (см. §7): резерв звёзд `calculateCodeModelRequestStars(tier, estInputTokens)`.
8. **Сборка `apiSystem`** (route.ts:2536–2569): `instructions` + контекст памяти
   пользователя (`userMemoryContext` — подставляется и в code) + `customInstructions`
   пользователя из БД (применяются и в code, «YOU MUST FOLLOW THEM AT ALL COSTS»).
   НЕ применяется к code только поле `systemPrompt` из запроса (роль/сценарий):
   `shouldApplyUserSystemPrompt = actualGroup === 'chat'` (route.ts:2536).
   Плюс URL-контекст из ссылок в сообщении.
9. **`streamText`** — см. §6.
10. Стрим обёрнут в `createUIMessageStream` с heartbeat `data-keepalive`
    каждые 20с (чтобы nginx `proxy_read_timeout=120s` не рвал SSE во время
    «молчания» модели/инструмента).

### 4.3. Схема

```
[UI] form-component (иконка «Код») → chat-interface.selectedGroup='code'
   │
   │ useChat → POST /api/search  { group:'code', model, messages, temperature, ... }
   ▼
route.ts:
   group='code' → actualGroup='code'
   getModelForToolUsage → модель пользователя (без подмены)
   getGroupConfig('code') → tools + instructions (кэш)
   activeTools = [code_context, web_search, github_search, code_interpreter]
   резерв ⭐ по тиру модели (MiniCoder…UltimateCoder)
   ▼
   streamText({
     model: vega.languageModel(model),
     tools: Object.fromEntries(registry.filter(activeTools)),
     toolChoice: 'auto',                    // НЕ 'required'!
     stopWhen: [isStepCount(8), codeAnswerAlreadyDelivered],
     prepareStep: tool-цикл (max 3 успешных вызова),
     maxOutputTokens: max(modelLimit, 64000),
     timeout: { firstChunkMs:90s, toolMs:120s, totalMs:600s },
     experimental_transform: [toolCallMarkupStripper, markdownJoiner], // без smoothStream
   })
   ▼
[UI] message-parts: text + tool-* parts → CodeInterpreterView / карточки
     code_context / github_search; html-блоки → iframe srcDoc «Предпросмотр»
```

---

## 5. Инструменты группы `code`

Все инструменты — `tool({ description, inputSchema: zod, execute })` из
Vercel AI SDK, реэкспортируются из `lib/tools/index.ts`. В `streamText`
передаётся **полный реестр** (~30 инструментов), но включены только те, что
есть в `activeTools`:

```ts
tools: Object.fromEntries(
  Object.entries({ /* все инструменты */ })
    .filter(([name]) => activeTools.includes(name)),
),
```

### 5.1. `code_context` — `lib/tools/code-context.ts`

Документация/API/примеры по библиотекам. Input: `{ query, tokensNum=5000 }`.

- Primary: **Parallel Search** (`parallelSearch`) с тремя search_queries
  (`programming code …`, `github …`, `documentation …`), до 5 результатов
  по 10K символов.
- Fallback при ошибке: **Exa** `exa.search()` с `includeDomains:['github.com']`,
  highlights + text, с retry (`withExaRetry`).
- Output: `{ query, numResults, outputTokens, context, results[] }` —
  `context` собирается в строку `## Source N: title / URL / text`, которую
  модель вставляет в рассуждение.
- Использование логируется (`logParallelSearchUsage`).

### 5.2. `github_search` — `lib/tools/github-search.ts`

Поиск по GitHub REST API (`api.github.com/search`). Input:
`{ query, type: 'repositories'|'code'|'users' = 'repositories', limit = 5 }`.

- `buildQueryVariants` генерирует варианты запроса: исходный,
  `… in:name,description,readme`, топ-3 токена, `OR`-вариант — перебирает
  до первого ненулевого результата.
- Авторизация: `serverEnv.GITHUB_TOKEN` (опционально; без него ниже rate-limit).
- `type:'code'` требует auth: при 401/403/422 откатывается на поиск репозиториев
  (`fallback:'repositories'` в ответе).
- Output нормализован: `{ name, description, stars, language, url, updatedAt, owner }`.

### 5.3. `code_interpreter` — `lib/tools/code-interpreter.ts`

Исполнение Python в **Daytona**-песочнице. Input: `{ title, code, icon }`.

- `new Daytona({ apiKey: serverEnv.DAYTONA_API_KEY, target: 'eu' })`.
- Создание песочницы из снапшота `SNAPSHOT_NAME = 'ruvega'` → если снапшот
  не найден — `daytona.create({})` без снапшота.
- Оба этапа (create, `sandbox.process.codeRun(code)`) обёрнуты в
  `withTimeout(45s)`.
- Из результата собираются `message` (stdout/result) и `chart`
  (первый из `execution.artifacts.charts`, без png).
- `finally`: `sandbox.delete()` — песочница живёт один вызов.
- Нет ключа → `{ error: 'DAYTONA_API_KEY is not configured…' }` — ошибка
  возвращается модели как данные, а не исключением.

### 5.4. `web_search` — `lib/tools/web-search.ts`

Фабрика `webSearchTool(dataStream, provider)` — провайдер `'exa' | 'parallel'`
резолвится через `resolveSearchToolProviders` (для `code` — общий
`searchProvider` из запроса). Используется для трендов, версий фреймворков,
экосистемы.

---

## 6. Параметры `streamText` для `code`

Главная специфика в `app/api/search/route.ts` (~2900–3115):

| Параметр | code | Остальные |
|---|---|---|
| `toolChoice` | `'auto'` | `'required'` для web-групп с `supportsToolChoiceRequired` |
| `stopWhen` | `[isStepCount(8), codeAnswerAlreadyDelivered]` | `isStepCount(5)` |
| `maxSuccessfulCalls` (в `prepareStep`) | 3 | 1 (sub-modes 2) |
| `maxOutputTokens` | `max(modelLimit, 64000)` | `modelLimit` |
| `timeout` | firstChunk 90s, tool 120s, total **600s** | 60/120/300s |
| `experimental_transform` | без `smoothStream` | `smoothStream({chunking:'line'})` + те же два |
| `temperature` (дефолт) | 0.5 | 0.5 для chat, 0.4 web/extreme |

### 6.1. Почему `toolChoice: 'auto'`, а не `'required'`

`prepareStep` в AI SDK вызывается **перед каждым шагом, включая первый**.
Раньше он возвращал `'required'` по умолчанию → код-модель принудительно
делала 3 tool-вызова, а `vega-grok` писал видимый текст ответа на каждом
forced-шаге → в сообщении 2–3 одинаковых «версии» ответа. Подробности —
`docs/fix-code-mode-duplicate-answers.md`. Теперь дефолтная ветка возвращает
`initialToolChoice` (для code — `'auto'`); `'required'` остался только в ветке
retry-при-ошибках (все toolResults последнего шага — ошибки, <2 подряд).

### 6.2. `codeAnswerAlreadyDelivered` — досрочный стоп

```ts
const codeAnswerAlreadyDelivered = ({ steps }) => {
  if (actualGroup !== 'code') return false;
  const last = steps[steps.length - 1];
  const text = typeof last?.text === 'string' ? last.text : '';
  if (!text.trim()) return false;
  const callsInterpreter = (last?.toolCalls ?? [])
    .some((tc) => tc?.toolName === 'code_interpreter');
  if (callsInterpreter) return false;            // ждём результат исполнения
  return text.includes('```') || text.trim().length > 1500;
};
```

Эвристика «ответ готов»: fenced-блок или длинный текст. Короткие preamble
(«проверю документацию») цикл не останавливают. Компромисс: если модель в том
же шаге вызвала tool «для проверки» — его результат уже не попадёт в ответ.

### 6.3. `prepareStep` — политика tool-цикла

Перед каждым шагом считаются успешные tool-вызовы по всем шагам:

- `successfulToolCalls >= 3` (для code) → `toolChoice:'none'`, но
  `activeTools` **не очищается** — thinking-модели могут проигнорировать
  `'none'` и всё равно эмитить tool-call; пустой список инструментов дал бы
  `NoSuchToolError` и крашнул стрим.
- Все результаты последнего шага — ошибки → повтор с `'required'`, но не более
  2 подряд: дальше `toolChoice:'none'` и модель отвечает как есть.
- Иначе → `initialToolChoice`.

### 6.4. Почему без `smoothStream`

Для code не добавляется `smoothStream({ chunking:'line' })` — код выдаётся
большими структурированными блоками, а line-chunking создаёт лишние паузы.
Остаются `toolCallMarkupStripperTransform` (вырезает сырой `<tool_call>` markup
из текста — некоторые gateway-модели пишут tool-call текстом) и
`markdownJoinerTransform` (не даёт markdown-структуре ломаться на границах чанков).

### 6.5. Токены и таймауты

- `maxOutputTokens = max(getMaxOutputTokens(model), 64000)` — code-шаг может
  писать большой файл целиком; у always-thinking моделей reasoning делит тот же
  бюджет → даём 64K, чтобы не резать код посередине. Дальше clamp до
  `getGatewayOutputTokenLimit(model)` — потолок gateway.
- Таймауты `getStreamTimeoutConfig('code')` (`lib/constants.ts:472`):
  `firstChunkMs=90s` ( reasoning-модель может долго «думать»), `toolMs=120s`,
  для `code_interpreter` переопределение 60s (внутренний лимит 45s + запас),
  `totalMs=600s` — самый долгий бюджет среди групп.

### 6.6. `repairToolCall`

Если провайдер вернул невалидный tool-call, схема чинится через
`generateObject` на сервисной модели `SERVICE_MODELS.toolSubstitution`
(vega-glm-flash) — работает для всех групп, включая code.

---

## 7. Биллинг и доступ

Модельный контур цены (`⭐` — внутренняя валюта). Два пути в зависимости от
того, есть ли у модели code-тир (`getCodeModelTier`, `ai/model-catalog.ts:1170`):

**A. Модель с тиром** (токеновый прайсинг):

- Тиры и базовые цены (`CODE_MODEL_TIER_COSTS`, `lib/constants.ts:398`):
  - **MiniCoder** (5⭐): vega-mini, vega-mimo26-pro, vega-deepseek
  - **ProCoder** (8⭐): vega-grok, vega-google, vega-glm, vega-qwen-max
  - **UltraCoder** (14⭐): vega-gpt-pro, vega-anthropic-sonnet, vega-kimi
  - **UltimateCoder** (20⭐): vega-anthropic-opus
- Доплата за размер входа (`lib/ultra-pricing.ts`): тир маппится на токеновую
  категорию Mini/Pro/Ultra/Ultimate → `includedInputTokens = 30 000`, дальше
  `+2⭐` за каждые `extraStarTokenQuantum` (60K/30K/10K/10K) входящих токенов.
- **До стрима** (route.ts:2719–2793): оценка входа
  `estimateChatInputTokensForRequest` → guard по контекстному окну модели
  (`getModelContextTokens`, превышение → `bad_request:api`) → проверка баланса
  → `reserveStars` с purpose `code:{tier}:{model}`.
- **После стрима** (onFinish, ~3661): пересчёт по **фактическим**
  `usage.inputTokens` → `calculateCodeModelRequestStars(tier, actualInputTokens)`,
  списание из резерва, `transactionType: 'usage_model'`, `resourceId =
  'code:{model}'`.

**B. Модель без тира** (legacy-путь): цена = `getEffectiveGroupCost('code',
model)` = `getCodeModelPromptCost(model) ?? STAR_COSTS.code` (10⭐,
`lib/search/search-route-helpers.ts:229`). Резерв не делается — списание
после стрима через `calculateChatRequestCost` (`usage_tool`,
`resourceId = 'code+{model}'`).

Общее для обоих путей:

- `getEffectiveBaseModelCost` возвращает 0 для code/image/music/video —
  стоимость модели не дублируется поверх тир/групповой цены.
- Файловая доплата: `code` и `chat` — единственные группы, где не-image
  вложения тарифицируются по сумме размеров (`calculateFilesCostByTotalSize`);
  при токеновом пути итог не ниже `baseStars + fileBillingCost`, при legacy —
  доплата просто добавляется (`+files` в resourceId).
- UI зеркалит расчёт в `form-component.tsx` (`requestStarCostInfo`, ~1029)
  — цена показывается в тултипе кнопки отправки.

Доступ:

- `requiresAuth: true` — гость в `code` получает баннер тарифов (route.ts:1262).
- Тариф `hobby`: `code` в `disallowedGroups` → только `work`/`business`
  (`lib/constants.ts:215`).

---

## 8. Клиентский UI

### 8.1. Выбор группы

- Нижняя панель `form-component.tsx` (~3830): хардкод-порядок
  `['auto','web','chat','extreme','image','video','music','code','transcription']`
  фильтруется по `group.show`; иконки + подписи `tUi('searchGroups.*')`.
- `group-mode-toggle.tsx` + `tool-selection-dialog.tsx` — полный список
  с описаниями и фичами (`TOOL_DESCRIPTIONS.code` в `lib/constants.ts:323`).
- i18n: `messages/ru.json` — `searchGroups.code`, `quickActions.code`
  (плейсхолдеры), `ui.code.*` (подписи превью/копирования), help-текст.

### 8.2. Рендер tool-вызовов — `components/message-parts/index.tsx`

Стрим приходит part'ами (`tool-*` типы); диспетчер по `part.type`/`state`
(`input-streaming` → `input-available` → `output-available`/`output-error`):

- `code_interpreter` → `CodeInterpreterView`
  (`tool-invocation-list-view.tsx:274`): шапка с языком/заголовком/`StatusBadge`,
  code-блок с номерами строк, блок stdout/ошибки, чарт через
  `InteractiveChart` если вернулся `chart`. Если в `code` найден полный HTML
  (`<!DOCTYPE`/`<html>` или внутри python `"""…"""`) — появляются вкладки
  **«Предпросмотр»/«Код»** с `iframe srcDoc` (`sandbox="allow-scripts allow-forms"`).
- `code_context` → карточка с числом источников и сеткой ссылок (домен + title).
- `github_search` → `GithubSearchResults` (сворачиваемая карточка результатов).

### 8.3. Превью HTML в ответе — `components/markdown.tsx`

Обычные ```html/```svg-блоки получают вкладку «Предпросмотр»: `srcDoc`
с `sanitizeHtmlPreview()` (`lib/html-preview.ts`).

Санитизация: вырезаются **все внешние `<script src>`**, кроме whitelist
(`cdn.tailwindcss.com`, `unpkg.com/lucide`); `tailwind.config`-скрипт вырезается,
если CDN не разрешён. После вырезания подставляются моки `window.lucide` /
`window.tailwind`, чтобы inline-скрипты не падали, и HTML-комментарий о
удалённых скриптах. Это соответствует промту (§3.2): «не используй JS-CDN».

---

## 9. Подводные камни и несостыковки (важно при портировании)

1. **`lib/tool-loop-policy.ts` — мёртвый код.** В `TOOL_REQUIRED_GROUPS` есть
   `'code'`, но функция `getToolChoiceForGroup` не вызывается из роута (только
   тесты). Реальная политика — inline `initialToolChoice` + `prepareStep`.
   Не используйте этот файл как источник истины.
2. **Никогда не ставьте `toolChoice:'required'` для code** — см. §6.1 и
   `docs/fix-code-mode-duplicate-answers.md`. Особенно опасно с моделями
   семейства grok, пишущими текст на каждом шаге.
3. **`code` не является роутом автопилота** (`AUTOPILOT_FREE_ROUTE_GROUPS` —
   только chat/web/image/memory/weather): авто-роутер сознательно отправляет
   кодовые задачи в `chat` (`lib/auto-router.ts:89,101`). Группа — только
   ручной выбор.
4. **`mcp_search` НЕ входит в code** — описание «Создание кода с MCP» в UI —
   маркетинговое. Инструмент существует в реестре, но не активирован ни в одной
   группе из `groupTools`.
5. **`web` → `github`/`prediction` суб-роуты**: `actualGroup` может стать
   `'github'` при группе `'web'` через intent-роутер (`lib/web-router.ts`),
   с промтом и тулсетом github-группы. Условия по коду пишутся через
   `actualGroup`, а не `group` — при добавлении своей группы проверяйте обе.
6. **User system prompt (роль) применяется только к `chat`**:
   `shouldApplyUserSystemPrompt = actualGroup === 'chat'` — поле `systemPrompt`
   из запроса игнорируется. А вот `customInstructions` из БД (постоянные
   пользовательские инструкции) и контекст памяти `userMemoryContext`
   подставляются в `apiSystem` и для code. Анонимизация вложений
   (`anonymizeFiles`) — тоже только chat (`shouldAnonymizeDocuments =
   anonymizeFiles && actualGroup === 'chat'`).
7. **`temperature` с клиента применяется не всеми моделями** —
   `supportsSamplingParams`/`supportsToolChoiceRequired` фильтруют опции.
8. Имена инструментов в реестре `streamText.tools` — snake_case
   (`code_context`), в `groupTools` — тот же snake_case; фильтрация идёт по
   точному совпадению строки.

---

## 10. Чеклист переноса на новый проект

Минимальный набор для своей code-группы:

- [ ] Union-тип id группы + UI-реестр (`SearchGroupId`, `searchGroups`)
- [ ] `groupTools[code]` — список имён инструментов
- [ ] `groupInstructions[code]` — промт (композиция общих блоков + секции кода)
- [ ] Инструменты в `lib/tools/`: `code_context` (Parallel→Exa fallback),
      `github_search` (GitHub API + query variants), `code_interpreter`
      (песочница Daytona; можно заменить на E2B/Microsandbox), `web_search`
- [ ] Реестр `tools:` в `streamText` с фильтром по `activeTools`
- [ ] `getGroupConfig()` + кэш конфигурации
- [ ] API-пайплайн: парсинг `group` → `actualGroup` → activeTools → billing →
      `streamText` с параметрами §6 (`toolChoice:'auto'`, `stopWhen` с
      эвристикой досрочного ответа, `prepareStep` с max 3 вызова, `maxOutputTokens`
      ≥64K, таймауты 90/120/600s, без `smoothStream`)
- [ ] Env: `GITHUB_TOKEN` (опц.), `DAYTONA_API_KEY`, ключи Parallel/Exa,
      `AI_GATEWAY_API_KEY` (или аналог провайдера)
- [ ] UI: селектор группы, кейсы рендера `tool-*` parts в message-parts,
      `CodeInterpreterView` с превью, `sanitizeHtmlPreview` для ```html-блоков
- [ ] Биллинг (если нужен): тиры моделей + токеновая доплата + резерв;
      цена в UI зеркалит серверный расчёт
- [ ] i18n-строки, доступ (`requiresAuth`, тарифные списки), тесты
      (`lib/utils-tests/` — примеры: `stream-timeouts.test.ts`,
      `search-provider-routing.test.ts`)

Ключевая идея архитектуры: **группа — это декларативная связка
{id, UI-метаданные, tools, prompt, модель, цена}**, собираемая в одной точке
(`getGroupConfig` + `activeTools`), а вся специфика поведения — точечными
условиями `actualGroup === 'code'` в стрим-пайплайне. Новая группа добавляется
без нового роута: запись в `groupTools`/`groupInstructions`/`searchGroups` +
несколько условий в `route.ts`.
