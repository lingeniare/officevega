# Дизайн модального окна «Чат с ИИ по документации API» (AIChatDrawer)

Подробное описание модального окна ИИ-чата в проекте `api.vega.chat`.

> Источники:
> - `src/components/AIChatDrawer.tsx` — само модальное окно
> - `src/components/AIChatButton.tsx` — FAB-кнопка открытия (только главная страница)
> - `src/components/docs/DocsChatPanel.tsx` — родственная панель чата на страницах `/docs`
> - `src/app/api/docs-chat/route.ts` — бэкенд-эндпоинт (RAG + стриминг)
> - `src/lib/docs-rag/search.ts`, `src/lib/docs-rag/config.ts` — RAG-поиск и промпт
> - `src/hooks/use-scroll-position.ts` — пороговый хук скролла для FAB
> - `src/app/globals.css` — токены, `.animate-message-appear`, `.thin-scrollbar`, `.ai-*` анимации
> - Общая дизайн-система — `docs/design-system.md`

---

## 1. Назначение и сценарий

Модальное окно — помощник, который отвечает на вопросы **только по документации API VEGA**
(RAG: векторный поиск по базе знаний + генерация ответа со ссылками на источники).

**Поток:**
1. На главной странице справа внизу висит круглая FAB-кнопка «AI».
2. Клик → открывается центрированное модальное окно с чатом.
3. В пустом состоянии предлагаются 3 готовых вопроса (клик = мгновенная отправка).
4. Пользователь пишет вопрос → ответ стримится markdown'ом с пузырями сообщений.
5. Окно можно растягивать по ширине и высоте, закрыть — кликом по фону или крестиком.

**Точки рендера:**
- `AIChatButton` → `AIChatDrawer` — подключён в `src/app/layout.tsx`, но виден **только на `/`**.
- `DocsChatPanel` — встроенная (не модальная) версия того же чата на страницах документации
  (`/docs`, `/docs/[...slug]`, `/docs/api`). Описана в §13.

---

## 2. Архитектура

```tsx
// AIChatButton.tsx — FAB + локальное состояние isChatOpen
const [isChatOpen, setIsChatOpen] = useState(false);
<AIChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
```

В отличие от LoginModal, здесь **нет внешнего store** — состояние открытия локальное
(`useState` в `AIChatButton`). Состояние чата управляется хуком `useChat` из `@ai-sdk/react`:

```tsx
const transport = useMemo(() => new DefaultChatTransport({ api: "/api/docs-chat" }), []);
const { messages, sendMessage, status, stop, error } = useChat({ transport });
const isLoading = status === "submitted" || status === "streaming";
```

| Библиотека | Роль |
|-----------|------|
| `@ai-sdk/react` (`useChat`) | состояние диалога, стриминг, stop |
| `ai` (`DefaultChatTransport`) | транспорт на `/api/docs-chat` |
| `react-markdown` + `remark-gfm` | рендер markdown-ответов |
| `framer-motion` (`AnimatePresence`, `motion`) | появление/закрытие модалки |
| `lucide-react` | иконки `X`, `ArrowUp`, `Square`, `RefreshCw` |

---

## 3. FAB-кнопка открытия (`AIChatButton`)

### 3.1. Позиционирование

```tsx
<div className="fixed bottom-24 z-40 fixed-right-container-align flex items-center transition-transform duration-300"
     style={{ transform: isScrollToTopVisible ? "translateY(0)" : "translateY(72px)" }}>
```

| Свойство | Значение |
|----------|----------|
| Позиция | `fixed`, `bottom-24` (96px от низа), `right: 20px` (класс `.fixed-right-container-align`) |
| z-index | `z-40` (ниже модалки `z-50`) |
| Сдвиг | когда ScrollToTop-кнопка скрыта (скролл ≤ 400px) — FAB опускается на `translateY(72px)`; когда появилась — поднимается на своё место, чтобы не пересекаться с `ScrollToTop` (`bottom-6`) |
| Видимость | только на главной: `if (!mounted \|\| pathname !== "/") return null` |

### 3.2. Сама кнопка

```tsx
<button
  aria-label="Задать вопрос ИИ"
  className="relative w-12 h-12 rounded-full border
    bg-white/80 dark:bg-black/80 backdrop-blur-md
    border-black/10 dark:border-white/10
    text-gray-800 dark:text-gray-200 shadow-xl
    flex items-center justify-center cursor-pointer
    transition-transform duration-200 hover:scale-110 active:scale-95
    focus:outline-none focus:ring-2 focus:ring-foreground/20
    hover:bg-black/5 dark:hover:bg-white/10 select-none"
>
```

| Свойство | Значение |
|----------|----------|
| Размер | `48 × 48px` (`w-12 h-12`), `rounded-full` |
| Фон | полупрозрачный glass: `bg-white/80` / `dark:bg-black/80` + `backdrop-blur-md` |
| Рамка | `border-black/10` / `dark:border-white/10` |
| Тень | `shadow-xl` |
| Контент | текст «AI» — `text-base font-extrabold tracking-tight`, с анимацией `ai-scale` |
| Hover | `scale-110`, фон `black/5` / `white/10` |
| Active | `scale-95` |
| Focus | `ring-2 ring-foreground/20` |

### 3.3. Анимации «живости»

Вокруг кнопки два расходящихся кольца-ripple и покачивание контента:

```tsx
<div className="absolute inset-0 rounded-full border border-black/20 dark:border-white/20 ai-ripple-ring" />
<div className="absolute inset-0 rounded-full border border-black/20 dark:border-white/20 ai-ripple-ring ai-ripple-ring--delayed" />
<div className="flex items-center justify-center gap-0.5 ai-bob">
  <span className="... ai-scale">AI</span>
</div>
```

| Класс | Анимация |
|-------|----------|
| `.ai-ripple-ring` | `scale(1)→scale(1.7)`, `opacity 0.5→0`, 2.5s ease-out infinite |
| `.ai-ripple-ring--delayed` | то же, `animation-delay: 1.25s` (второе кольцо со сдвигом) |
| `.ai-bob` | `translateY(0 ↔ -3px)`, 3s ease-in-out infinite |
| `.ai-scale` | `scale(1 ↔ 1.05)`, 3s ease-in-out infinite |

Все отключаются при `prefers-reduced-motion: reduce`.

### 3.4. Тултип

При hover слева от кнопки появляется подсказка (только ≥ sm):

```tsx
<div className="hidden sm:block absolute right-14 px-3.5 py-1.5 rounded-xl
  bg-black/90 text-white dark:bg-white/95 dark:text-black
  text-xs font-medium whitespace-nowrap shadow-lg
  border border-white/10 dark:border-black/10 animate-fade-in">
  Задавайте вопросы по API VEGA
</div>
```

Инвертированная схема: тёмный тултип в светлой теме, светлый — в тёмной.

---

## 4. Модальное окно (`AIChatDrawer`)

Несмотря на имя «Drawer», это **центрированная модалка**, а не боковая панель.
Сделана вручную на `framer-motion` — **без** примитива `Dialog` (в отличие от LoginModal).

### 4.1. Overlay (backdrop)

```tsx
<motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs cursor-pointer"
/>
```

| Свойство | Значение |
|----------|----------|
| Затемнение | `bg-black/40` — заметно темнее, чем у Dialog (`bg-black/10`) |
| Blur | `backdrop-blur-xs` |
| z-index | `z-50` |
| Закрытие | клик по backdrop → `onClose()` |
| Анимация | простой fade (opacity 0→1) |

### 4.2. Центрирующий контейнер

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
     onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
```

Второй уровень защиты: клик по пустой области вокруг окна тоже закрывает
(проверка `e.target === e.currentTarget`, чтобы клики внутри панели не закрывали её).

### 4.3. Панель (окно)

```tsx
<motion.div
  ref={panelRef} tabIndex={-1}
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.96 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
  className="relative flex w-full flex-col overflow-hidden
    rounded-xl border border-border/50 bg-card
    shadow-2xl backdrop-blur-xl"
  style={{
    width: window.innerWidth >= 640 ? width : undefined,   // default 460
    maxWidth: "100%",
    height: window.innerHeight >= 640 ? height : undefined, // default 480
    maxHeight: "90vh",
    minHeight: "360px",
  }}
>
```

| Свойство | Значение |
|----------|----------|
| Размер по умолчанию | `460 × 480px` |
| Минимум | `460 × 360px` (ширина применяется только при `innerWidth ≥ 640`) |
| Максимум | `90vw × 90vh` |
| На мобильных | ширина/высота = `undefined` → `w-full` внутри `p-4`, высота по контенту (min 360px, max 90vh) |
| Скругление | `rounded-xl` (12px) |
| Рамка | `border-border/50` — полупрозрачная |
| Фон | `bg-card` + `backdrop-blur-xl` |
| Тень | `shadow-2xl` |
| Анимация | spring `damping: 25, stiffness: 300`, `scale 0.96→1` + fade — «упругое» появление |
| Структура | `flex-col overflow-hidden`: header / messages (flex-1) / footer |

### 4.4. Resize-ручки (только ≥ sm)

Две невидимые полосы по правому и нижнему краю — можно тянуть за ширину и высоту.

```tsx
{/* Правая — ширина */}
<div onPointerDown={(e) => handleResizeStart(e, "x")}
     className="hidden sm:block absolute right-0 top-0 bottom-0 w-1.5
                cursor-ew-resize hover:bg-foreground/5 active:bg-foreground/10
                transition-colors z-50 group">
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                  w-0.5 h-12 bg-foreground/20 opacity-0
                  group-hover:opacity-100 transition-opacity rounded" />
</div>
{/* Нижняя — высота (зеркально, h-1.5, cursor-ns-resize) */}
```

**Механика** (`handleResizeStart`):
- `pointerdown` → навешиваются `window.pointermove/pointerup`, `body.userSelect = "none"`.
- Ширина: `clamp(460, …, window.innerWidth * 0.9)`, дельта от `clientX`.
- Высота: `clamp(360, …, window.innerHeight * 0.9)`, дельта от `clientY`.
- После отпускания — одноразовый capture-listener на `click`, который гасит случайный
  клик (чтобы drag не закрыл модалку через backdrop).
- При hover на ручку в центре края проявляется штрих-индикатор `w-0.5 h-12`
  (вертикальный) / `h-0.5 w-12` (горизонтальный).

---

## 5. Header

```tsx
<div className="border-b border-border/50 px-5 py-4">
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 text-sm font-semibold">
      Чат с ИИ по документации API
    </div>
    <button onClick={onClose} aria-label="Закрыть чат" title="Закрыть"
      className="rounded-full p-1.5 hover:bg-muted text-muted-foreground
                 hover:text-foreground transition-colors cursor-pointer">
      <X className="size-4" />
    </button>
  </div>
</div>
```

| Элемент | Стиль |
|---------|-------|
| Контейнер | `border-b border-border/50 px-5 py-4` |
| Заголовок | `text-sm font-semibold`, без иконок и eyebrow — лаконично |
| Кнопка X | круглая `rounded-full p-1.5`, `text-muted-foreground → hover:text-foreground`, hover-фон `bg-muted` (глобально переопределяется в `--vega-accent-glow`), иконка `X size-4` |

---

## 6. Область сообщений

```tsx
<div ref={messagesContainerRef} onWheel={handleContainerWheel}
     className="flex-1 px-4 py-4 thin-scrollbar overflow-y-auto">
  <div className="flex flex-col gap-5">
```

| Свойство | Значение |
|----------|----------|
| Скролл | `overflow-y-auto` + `.thin-scrollbar` (4px, цвет `--border`) |
| Отступы | `px-4 py-4`, между сообщениями `gap-5` (20px) |
| Нижний спейсер | `<div className="h-1" />` в конце списка |

### 6.1. Пустое состояние — suggested questions

Когда `messages.length === 0` показываются три вопроса-подсказки, прижатые **вправо**
(`items-end`) — визуально выглядят как текстовые ссылки, без рамок:

```tsx
{suggestedQuestions.map((question) => (
  <button onClick={() => handleSubmit(question)}
    className="text-sm text-muted-foreground hover:text-vega-accent
               transition-colors cursor-pointer text-right no-underline">
    {question}
  </button>
))}
```

Вопросы в модалке: «Как настроить уровень Reasoning модели?», «Как подключить OpenClaw?»,
«Как подключить API к Kilo Code?» (в `DocsChatPanel` список другой).

Hover → `text-vega-accent`.

### 6.2. Пузыри сообщений

```tsx
<div className={cn("flex animate-message-appear",
                   isUser ? "justify-end" : "justify-start")}>
  <div className={cn(
    "max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6",
    isUser
      ? "rounded-br-md border border-border/30 bg-muted"
      : "rounded-bl-md bg-background"
  )}>
```

| | Пользователь | Ассистент |
|---|---|---|
| Выравнивание | `justify-end` (справа) | `justify-start` (слева) |
| Скругление | `rounded-xl` + `rounded-br-md` («хвостик» справа внизу) | `rounded-xl` + `rounded-bl-md` («хвостик» слева внизу) |
| Рамка | `border border-border/30` | нет |
| Фон | `bg-muted` | `bg-background` (на фоне `bg-card` окна — тонкий контраст) |
| Контент | `whitespace-pre-wrap` (сырой текст) | `prose` + `ReactMarkdown` |

| Общее | Значение |
|-------|----------|
| Макс. ширина | `max-w-[92%]` |
| Отступы | `px-4 py-3` |
| Текст | `text-sm leading-6` |
| Появление | `.animate-message-appear` — `translateY(8px)→0`, 0.3s `cubic-bezier(0.16,1,0.3,1)` |

### 6.3. Markdown-рендер (ответы)

```tsx
<div className="prose prose-sm max-w-none break-words dark:prose-invert
                prose-p:leading-6 prose-pre:bg-transparent prose-pre:p-0
                prose-code:text-foreground prose-pre:text-foreground">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
</div>
```

- Плагин `@tailwindcss/typography`, `prose-sm`, инверсия в тёмной теме.
- `pre` прозрачные (код-блоки наследуют глобальные стили `code`/`pre`).
- Ссылки `[Источник N]` из ответа рендерятся как обычные markdown-ссылки.

### 6.4. Состояние загрузки

```tsx
<div className="flex items-center gap-3 text-sm text-muted-foreground">
  <RefreshCw className="size-4 animate-spin" />
  Ищу ответ в документации...
</div>
```

Показывается, пока `status === "submitted" | "streaming"`.

### 6.5. Состояние ошибки

```tsx
<div className="rounded-xl border border-destructive/20 bg-destructive/10
                px-4 py-3 text-sm text-destructive">
  {error.message || "Не удалось получить ответ по документации"}
</div>
```

Мягкая destructive-плашка: рамка 20%, фон 10%, текст `--destructive`.

---

## 7. Футер с полем ввода

```tsx
<div className="border-t border-border/50 bg-background/80 p-4">
  <div className="flex items-end gap-3">
    <textarea ... />
    {isLoading ? <Button stop/> : <Button send/>}
  </div>
</div>
```

| Свойство | Значение |
|----------|----------|
| Контейнер | `border-t border-border/50`, фон `bg-background/80` (чуть светлее `bg-card` окна) |
| Layout | `flex items-end gap-3` — кнопка прижата к низу, textarea растёт вверх |

### 7.1. Textarea

```tsx
<textarea
  rows={2}
  placeholder="Задавайте вопрос по документации"
  className="flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6
             placeholder:text-muted-foreground/60 focus:outline-none"
  disabled={isLoading}
/>
```

| Свойство | Значение |
|----------|----------|
| Строки | `rows={2}`, автоматический рост: `height = clamp(64px, scrollHeight, 200px)` (эффект на `input`) |
| Рамка/фон | полностью «голая» — без border и bg, встроена в футер |
| Placeholder | `text-muted-foreground/60` (60% непрозрачности) |
| Фокус | без outline (`focus:outline-none`) |
| Enter | отправка; `Shift+Enter` — перенос строки |
| Disabled | пока идёт ответ |

### 7.2. Кнопка отправки / стоп

```tsx
// Отправка
<Button onClick={() => handleSubmit()} disabled={!input.trim()}
        className="h-9 w-9 shrink-0 rounded-xl cursor-pointer p-0">
  <ArrowUp className="size-4" />
</Button>

// Стоп (во время стриминга)
<Button variant="secondary" onClick={() => stop()}
        className="h-9 w-9 shrink-0 rounded-xl cursor-pointer p-0">
  <Square className="size-4 fill-current" />
</Button>
```

| Состояние | Внешний вид |
|-----------|-------------|
| Отправка | shadcn `Button` variant `default` → `bg-primary` (emerald), `36×36px`, `rounded-xl`, иконка `ArrowUp` |
| Disabled | `!input.trim()` → `opacity-50`, `pointer-events-none` |
| Стриминг | variant `secondary` (`bg-secondary`), иконка `Square` с заливкой |

> В `DocsChatPanel` кнопка отправки стилизована явно:
> `bg-vega-accent text-vega-accent-ink hover:bg-vega-accent-strong`.

---

## 8. Поведение и UX-детали

| Механика | Реализация |
|----------|-----------|
| Блокировка фонового скролла | `document.body.style.overflow = "hidden"` пока `isOpen`, cleanup на unmount |
| Прокси скролла | `onWheel` на контейнере сообщений: если чат не в фокусе — `preventDefault` + ручной `scrollTop += deltaY` |
| Фокус-трекинг | `onFocusCapture`/`onBlurCapture` на панели → `isChatFocused`; pointerdown по «пустому» месту панели фокусирует её (`tabIndex={-1}`), кроме кликов по `button, textarea, input, a` |
| Автоскролл вниз | после `sendMessage` — `setTimeout 50ms` → `scrollTo({ top: scrollHeight, behavior: "smooth" })` |
| Enter = отправка | `Shift+Enter` — новая строка |
| Закрытие | клик по backdrop, клик по контейнеру-обёртке, кнопка X. **Esc не обрабатывается** (нет Dialog-примитива) |
| Борьба с «драг-кликом» | после resize capture-listener гасит следующий click |

---

## 9. Слой данных (`/api/docs-chat`)

```
useChat → DefaultChatTransport → POST /api/docs-chat → stream (UI message stream)
```

Конвейер на сервере (`src/app/api/docs-chat/route.ts`):

1. Rate-limit по IP (`chatRateLimit`), лимит тела 512KB.
2. Берётся последний user-вопрос → `searchDocsKnowledge()` — векторный поиск по Qdrant
   (коллекция `api-vega`, embedding `openai/text-embedding-3-small`, rerank `cohere/rerank-4-pro`,
   min-score 0.35, до 8 фрагментов).
3. Пусто → `404` «В базе знаний не найдено релевантных фрагментов…».
4. Промпт = история (последние 6 сообщений) + вопрос + фрагменты контекста.
5. `streamText` через OpenRouter, модель `openai/gpt-5-nano`, `temperature 0.1`.
6. Системный промпт: отвечать только по фрагментам, помечать `[Источник N]`,
   финальный раздел «Ссылки» с URL, язык — русский.
7. Ответ → `toUIMessageStreamResponse()` (стриминг в чат).

---

## 10. Цветовая палитра модалки

| Элемент | Light | Dark |
|---------|-------|------|
| Overlay | `black/40` + `backdrop-blur-xs` | то же |
| Фон окна | `--card` `#FFFFFF` + `backdrop-blur-xl` | `--card` `#18181B` |
| Рамка окна | `--border` `#E4E4E7` на 50% | `--border` `#27272A` на 50% |
| Тень окна | `shadow-2xl` | `shadow-2xl` |
| Разделители | `border-border/50` | то же |
| Пузырь пользователя | `bg-muted` `#F4F4F5` + `border-border/30` | `bg-muted` `#27272A` |
| Пузырь ассистента | `bg-background` `#FAFAFA` | `bg-background` `#09090B` |
| Футер | `bg-background/80` | `bg-background/80` |
| Приглушённый текст | `#52525B` | `#A1A1AA` |
| Акцент (hover ссылок, вопросы) | `#059669` | `#34D399` |
| Ошибка | `--destructive` oklch(0.577 0.245 27.325) | oklch(0.704 0.191 22.216) |
| Кнопка отправки | `bg-primary` `#059669`, текст `#ECFDF5` | `#34D399`, текст `#000` |
| FAB | `bg-white/80`, `border-black/10` | `bg-black/80`, `border-white/10` |

---

## 11. Спецификация размеров

| Элемент | Значение |
|---------|----------|
| Окно по умолчанию | `460 × 480px` |
| Окно min / max | `460×360` / `90vw×90vh` |
| Отступ контейнера | `p-4` (16px до краёв экрана) |
| Header | `px-5 py-4` |
| Сообщения | `px-4 py-4`, `gap-5`, пузырь `px-4 py-3`, `max-w-[92%]` |
| Футер | `p-4`, `gap-3` |
| Textarea | `rows=2`, высота `64–200px` auto |
| Кнопка отправки/стоп | `36×36px` (`h-9 w-9`), `rounded-xl` |
| Resize-ручки | `w-1.5` (правая) / `h-1.5` (нижняя), индикатор `0.5×48px` |
| FAB | `48×48px`, `bottom-24 right-[20px]` |
| z-index | FAB `40`, overlay + окно `50`, resize-ручки `50` |

---

## 12. Иконки и анимации

| Иконка (lucide) | Где | Размер |
|-----------------|-----|--------|
| `X` | закрытие окна | `size-4` |
| `ArrowUp` | отправка | `size-4` |
| `Square` (`fill-current`) | стоп стриминга | `size-4` |
| `RefreshCw` (`animate-spin`) | индикатор загрузки | `size-4` |

| Анимация | Где |
|----------|-----|
| `AnimatePresence` + spring `scale 0.96→1` | появление/закрытие окна |
| fade `opacity` | overlay |
| `.animate-message-appear` | каждое новое сообщение |
| `.ai-ripple-ring`, `.ai-bob`, `.ai-scale` | FAB-кнопка |
| `.animate-fade-in` | тултипы |
| `animate-spin` | `RefreshCw` при загрузке |

---

## 13. `DocsChatPanel` — версия для страниц документации

Тот же чат, но **не модальный**. Размещён в правой колонке страниц `/docs*`.

| Отличие | AIChatDrawer (модалка) | DocsChatPanel (панель) |
|---------|----------------------|------------------------|
| Позиция | центр экрана, поверх контента | `sticky top-24` в правой колонке `w-72` |
| Режимы | open/close | `inline` ↔ `overlay` («Развернуть» накрывает центральную колонку, `w-[min(640px,100vw-2rem)]`) |
| Мобильные | FAB на главной | инлайн-панель `lg:hidden mt-4` под контентом |
| Заголовок | «Чат с ИИ по документации API» | «Чат с ИИ» + `vega-pulse-dot` (пульсирующая зелёная точка) |
| Кнопки header | только X | «Развернуть»/«Свернуть» (Maximize2/Minimize2, pill-кнопка `bg-background/60` → hover `bg-vega-accent-glow text-vega-accent`) |
| Стиль панели | `bg-card`, `border-border/50`, `shadow-2xl` | `bg-card/60`, `border-vega-border-soft`, `backdrop-blur-xl`, hover `border-vega-accent/30` — более «glass» |
| Кнопка отправки | `bg-primary` | `bg-vega-accent text-vega-accent-ink` (явно) |
| Ресайз | есть (ручки справа/снизу) | нет |
| Backdrop | есть | нет |
| Scroll-proxy | скроллит контейнер | скроллит `window` |
| Вопросы-подсказки | про Reasoning/OpenClaw/Kilo Code | про Reasoning/температуру/плагины |

Остальное (пузыри, textarea, loading/error, `useChat` на `/api/docs-chat`) — идентично,
только `border-border/30` у пользователя заменено на `border-vega-border-soft`.

---

## 14. Доступность и UX

- `aria-label="Задать вопрос ИИ"` на FAB, `aria-label="Закрыть чат"` + `title` на X.
- Тултип у FAB — `pointer-events-none`, только ≥ `sm`.
- `prefers-reduced-motion` — все CSS-анимации отключены глобально.
- Ограничения: нет `role="dialog"`/`aria-modal`, нет focus-trap, нет Esc-закрытия
  (самописная модалка; при переносе на проект с жёсткими требованиями a11y — завернуть
  в `Dialog`-примитив или добавить обработчики).

---

## 15. Чек-лист воспроизведения

При переносе модалки ИИ-чата на другой проект:

- [ ] FAB: `fixed bottom-24 right-[20px] z-40`, `w-12 h-12 rounded-full`, glass-фон,
      два `.ai-ripple-ring` (второй с `--delayed`), `.ai-bob` + `.ai-scale` на контенте,
      тултип слева (`right-14`), сдвиг `translateY(72px)` когда ScrollToTop скрыт
- [ ] Оверлей: `fixed inset-0 z-50 bg-black/40 backdrop-blur-xs`, `onClick → onClose`
- [ ] Обёртка: `fixed inset-0 z-50 flex items-center justify-center p-4` + проверка
      `e.target === e.currentTarget`
- [ ] Панель: `motion.div` spring `damping 25 / stiffness 300`, `scale 0.96→1`,
      `rounded-xl border-border/50 bg-card shadow-2xl backdrop-blur-xl`,
      `460×480`, min `460×360`, max `90vw×90vh`
- [ ] Resize-ручки `w-1.5`/`h-1.5` по правому и нижнему краю (только ≥ sm),
      индикатор-штрих при hover, `body.userSelect="none"` во время drag,
      гашение click после pointerup
- [ ] Header: `border-b border-border/50 px-5 py-4`, заголовок `text-sm font-semibold`,
      X — `rounded-full p-1.5`
- [ ] Сообщения: `flex-1 px-4 py-4 gap-5 thin-scrollbar`, пустое состояние — вопросы
      справа `text-muted-foreground hover:text-vega-accent`
- [ ] Пузыри: `max-w-[92%] rounded-xl px-4 py-3 text-sm leading-6`,
      user — `rounded-br-md bg-muted border-border/30`, bot — `rounded-bl-md bg-background`,
      `animate-message-appear`
- [ ] Markdown: `prose prose-sm dark:prose-invert prose-pre:bg-transparent` + `remarkGfm`
- [ ] Loading: `RefreshCw animate-spin` + «Ищу ответ в документации...»
- [ ] Error: `rounded-xl border-destructive/20 bg-destructive/10 text-destructive`
- [ ] Футер: `border-t border-border/50 bg-background/80 p-4`, голая textarea
      (autoresize 64–200px), Enter/Shift+Enter, кнопка `h-9 w-9 rounded-xl`
      (`ArrowUp` / `Square` при стриминге)
- [ ] `body.overflow = "hidden"` при открытии
- [ ] Данные: `useChat` + `DefaultChatTransport({ api })`, стриминг UI-мessages
- [ ] Тексты на русском, акцент через `vega-accent`-токены

---

## 16. Критерии приёмки описания модалки

- [x] Описано назначение и поток (FAB → модалка → RAG-чат)
- [x] Описана архитектура (AIChatButton + AIChatDrawer, useChat)
- [x] Описана FAB-кнопка: позиция, стили, ripple/bob/scale-анимации, тултип, связь со ScrollToTop
- [x] Описано окно: overlay, spring-анимация, размеры, resize-ручки с механикой
- [x] Описаны header, область сообщений, пузыри, markdown, loading, error
- [x] Описан футер: autoresize textarea, Enter/Shift+Enter, кнопки send/stop
- [x] Описаны UX-механики: scroll-lock, wheel-proxy, focus-tracking, автоскролл
- [x] Описан слой данных `/api/docs-chat` (RAG: Qdrant + rerank + gpt-5-nano стриминг)
- [x] Приведена палитра light/dark и спецификация размеров
- [x] Описаны иконки, анимации, доступность (включая ограничения a11y)
- [x] Описана родственная `DocsChatPanel` и её отличия
- [x] Добавлен чек-лист воспроизведения для переноса на другой проект
