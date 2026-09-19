# Дизайн-система API VEGA

Документ описывает визуальный язык, токены, компоненты и паттерны проекта `api.vega.chat`.
Все значения и классы приведены по состоянию кода в `src/app/globals.css`, `components.json`
и `src/components/ui/*`.

> Источники истины:
> - `src/app/globals.css` — токены тем, утилиты, анимации, кнопки
> - `components.json` — конфигурация shadcn/ui
> - `src/components/ui/*` — базовые UI-примитивы
> - `src/components/LoginModal.tsx` — модальное окно авторизации (см. `login-modal-design.md`)
> - `src/components/AIChatDrawer.tsx` — модальное окно ИИ-чата (см. `ai-chat-modal-design.md`)

---

## 1. Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Фреймворк | Next.js (App Router) | 16.3.3 |
| UI-библиотека | React | 19.2.8 |
| Стили | Tailwind CSS | 4.3.3 |
| Дизайн-система | shadcn/ui (style `base-nova`) | 4.21.0 |
| Примитивы | `@base-ui/react` | 1.8.0 |
| Иконки | `lucide-react` + `@lobehub/icons` (логотипы моделей) | 1.46.0 / 5.18.0 |
| Анимации | `framer-motion` + CSS keyframes | 13.3.0 |
| Темы | `next-themes` (атрибут `class`) | 0.4.6 |
| Утилиты классов | `clsx`, `tailwind-merge`, `class-variance-authority` | — |
| Анимационные утилиты | `tw-animate-css` | 1.4.0 |
| Типографика плагин | `@tailwindcss/typography` | 0.5.20 |
| AI-чат | `ai` + `@ai-sdk/react` (`useChat`) + `react-markdown`/`remark-gfm` | 7.0.102 / 4.0.105 |

Пакетный менеджер — **pnpm**. Сборка/перезапуск выполняется пользователем, не агентом.

### Конфигурация shadcn/ui (`components.json`)

```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "src/app/globals", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- Базовый цвет: **neutral** (zinc-палитра)
- CSS-переменные включены, префикс отсутствует
- Иконки — `lucide`

---

## 2. Типографика

Шрифты подключаются из Google Fonts в `src/app/layout.tsx` и `globals.css`.

| Назначение | Семейство | CSS-переменная |
|-----------|-----------|----------------|
| Основной текст | `Google Sans` | `--font-sans` |
| Моноширинный | `Google Sans Code` | `--font-mono` |
| Дисплей/гибкий | `Google Sans Flex` | — |
| Иконки-символы | `Material Symbols Rounded` | — |

```css
@theme {
  --font-sans: 'Google Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Google Sans Code', ui-monospace, monospace;
}
```

Тело документа использует `Google Sans`. Инлайн-код и блоки кода — `Google Sans Code`.

### Выделение текста

```css
::selection {
  background: color-mix(in srgb, var(--vega-accent) 28%, transparent);
  color: var(--foreground);
}
```

### Инлайн-код

```css
code:not(pre code) {
  @apply px-1.5 py-0.5 rounded-xl text-[0.9em] font-medium
         text-foreground bg-card border border-border;
}
```

### Eyebrow (надзаголовок)

Маленькая моноширинная метка над заголовком, используется в секциях лендинга и в модалке авторизации.

```css
.eyebrow {
  font-family: 'Google Sans Code', ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--vega-accent);
  margin-bottom: 14px;
}
.eyebrow::before { content: "// "; color: var(--vega-faint); }
```

### Градиентный текст

```css
.gradient-text {
  background: linear-gradient(92deg, var(--vega-accent) 10%, var(--vega-cyan) 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
```

---

## 3. Цветовая система

### 3.1. Базовые токены shadcn (neutral)

#### Светлая тема (`:root`)

| Токен | Значение | Назначение |
|-------|----------|-----------|
| `--background` | `#FAFAFA` | Фон страницы |
| `--foreground` | `#09090B` | Основной текст |
| `--card` | `#FFFFFF` | Фон карточек |
| `--card-foreground` | `#09090B` | Текст в карточках |
| `--popover` | `#FFFFFF` | Фон поповеров |
| `--popover-foreground` | `#09090B` | Текст поповеров |
| `--primary` | `#059669` | Primary-кнопки |
| `--primary-foreground` | `#ECFDF5` | Текст на primary |
| `--secondary` | `#F4F4F5` | Secondary-поверхность |
| `--secondary-foreground` | `#18181B` | Текст на secondary |
| `--muted` | `#F4F4F5` | Muted-поверхность |
| `--muted-foreground` | `#52525B` | Приглушённый текст |
| `--accent` | `#F4F4F5` | Accent-поверхность |
| `--accent-foreground` | `#18181B` | Текст на accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Деструктивные действия |
| `--border` | `#E4E4E7` | Границы |
| `--input` | `#E4E4E7` | Поля ввода |
| `--ring` | `#059669` | Кольцо фокуса |
| `--radius` | `12px` | Базовый радиус |

#### Тёмная тема (`.dark`)

| Токен | Значение | Назначение |
|-------|----------|-----------|
| `--background` | `#09090B` | Фон страницы |
| `--foreground` | `#FAFAFA` | Основной текст |
| `--card` | `#18181B` | Фон карточек |
| `--popover` | `#18181B` | Фон поповеров |
| `--primary` | `#34D399` | Primary-кнопки |
| `--primary-foreground` | `#000000` | Текст на primary |
| `--secondary` | `#27272A` | Secondary-поверхность |
| `--muted` | `#27272A` | Muted-поверхность |
| `--muted-foreground` | `#A1A1AA` | Приглушённый текст |
| `--border` | `#27272A` | Границы |
| `--input` | `#27272A` | Поля ввода |
| `--ring` | `#34D399` | Кольцо фокуса |

### 3.2. VEGA design tokens (фирменные)

Дополнительные токены поверх neutral-палитры. Это «лицо» бренда VEGA.

| Токен | Light | Dark | Назначение |
|-------|-------|------|-----------|
| `--vega-accent` | `#059669` | `#34D399` | Главный акцент (зелёный) |
| `--vega-accent-strong` | `#047857` | `#10B981` | Hover для акцента |
| `--vega-accent-ink` | `#FFFFFF` | `#000000` | Текст/иконки на акценте |
| `--vega-accent-glow` | `rgba(5,150,105,0.08)` | `rgba(52,211,153,0.14)` | Свечение, hover-подложка |
| `--vega-cyan` | `#0891B2` | `#22D3EE` | Вторичный акцент (градиенты) |
| `--vega-amber` | `#D97706` | `#FBBF24` | Предупреждения/бейджи |
| `--vega-faint` | `#71717A` | `#71717A` | Очень приглушённый текст |
| `--vega-border-soft` | `rgba(9,9,11,0.06)` | `rgba(250,250,250,0.06)` | Мягкие границы |
| `--vega-surface-glass` | `rgba(255,255,255,0.7)` | `rgba(24,24,27,0.55)` | Glassmorphism-поверхность |
| `--vega-hero-grid` | `rgba(9,9,11,0.04)` | `rgba(250,250,250,0.028)` | Сетка hero-секции |

Токены экспонируются в Tailwind через `@theme inline`:
`--color-vega-accent`, `--color-vega-accent-strong`, `--color-vega-accent-ink`,
`--color-vega-accent-glow`, `--color-vega-cyan`, `--color-vega-amber`,
`--color-vega-faint`, `--color-vega-border-soft`, `--color-vega-surface-glass`.

Использование в классах: `text-vega-accent`, `bg-vega-accent`, `border-vega-accent/50`,
`ring-vega-accent/10`, `bg-vega-accent-glow` и т.д.

### 3.3. Чарты

`--chart-1` … `--chart-5` — сине-фиолетовая oklch-палитра (одинакова в обеих темах).

### 3.4. Сайдбар

Отдельный набор `--sidebar*` токенов для боковых панелей дашборда (фон, текст, primary, accent, border, ring).

---

## 4. Радиусы и отступы

Все радиусы сведены к одному значению `--radius: 12px`:

```css
--radius-sm: var(--radius);
--radius-md: var(--radius);
--radius-lg: var(--radius);
--radius-xl: var(--radius);
--radius-2xl: var(--radius);
--radius-3xl: var(--radius);
--radius-4xl: var(--radius);
```

Визуально проект использует мягкие скругления: `rounded-xl` / `rounded-2xl` / `rounded-full`.

### Контейнер

```css
.vega-container {
  max-width: 1120px;
  margin-inline: auto;
  padding-inline: clamp(20px, 4vw, 32px);
}
```

---

## 5. Темы

- Реализовано через `next-themes`, атрибут `class`, тема по умолчанию `system`.
- Тёмная тема активируется классом `.dark` на `<html>`.
- Вариант тёмной темы определён через `@custom-variant dark (&:is(.dark *))`.
- `disableTransitionOnChange` — без анимаций при переключении темы.
- `theme-color` в `<head>`: `#059669`.

Terminal и blog code-block всегда тёмные (One Dark) вне зависимости от темы — см. `.terminal-dark` и `.blog-code-block`.

---

## 6. Базовые стили и скроллбары

```css
* {
  @apply border-border outline-ring/50;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-thumb { background-color: var(--border); border-radius: 3px; }
*::-webkit-scrollbar-thumb:hover { background-color: var(--muted-foreground); }
```

Утилиты:
- `.hide-scrollbar` / `.scrollbar-hide` — скрыть скроллбар, сохранив прокрутку
- `.thin-scrollbar` — тонкий кастомный скроллбар
- `.no-shadows` — отключить все тени для страницы

### Ссылки

```css
a:not([class~="no-underline"]):hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

---

## 7. Утилиты VEGA (glassmorphism, свечения, сетки)

### Glass-карточка

```css
.glass-card {
  border: 1px solid var(--border);
  background: var(--vega-surface-glass);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
/* На мобильных blur отключается, фон = card */
.glass-card:hover { border-color: color-mix(in srgb, var(--vega-accent) 50%, transparent); }
```

### Hero-сетка

```css
.hero-grid-bg {
  background-image:
    linear-gradient(var(--vega-hero-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--vega-hero-grid) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(ellipse 85% 65% at 50% 0%, #000 30%, transparent 75%);
  mask-image: radial-gradient(ellipse 85% 65% at 50% 0%, #000 30%, transparent 75%);
}
```

### Свечения

```css
.hero-glow-bg {
  background: radial-gradient(ellipse 55% 45% at 50% -8%, var(--vega-accent-glow), transparent 65%);
}
.footer-glow-bg {
  background: radial-gradient(ellipse 55% 45% at 50% 108%, var(--vega-accent-glow), transparent 65%);
}
```

### Tooltip (без библиотеки)

`.vega-tooltip-wrap` + `.vega-tooltip` — позиционируется сверху по центру, фон `--foreground`, текст `--background`, появляется по hover с плавной анимацией opacity/transform.

### Performance: landing sections

```css
@media (max-width: 768px) {
  .landing-section {
    content-visibility: auto;
    contain-intrinsic-size: auto 600px;
  }
}
```

---

## 8. Кнопки

### 8.1. Кнопки дизайн-системы VEGA (`.btn`)

Используются на лендинге и в маркетинговых секциях.

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 9px; min-height: 48px; padding: 0 24px;
  border-radius: 12px; font-size: 15px; font-weight: 600;
  letter-spacing: 0.02em; white-space: nowrap; cursor: pointer;
  transition: transform 0.18s, border-color 0.2s, background 0.2s, color 0.2s;
}
.btn:active { transform: translateY(1px); }
```

| Класс | Стиль |
|-------|-------|
| `.btn-primary` | `bg: var(--vega-accent)`, текст `var(--vega-accent-ink)`, hover → `--vega-accent-strong` + `translateY(-1px)` |
| `.btn-ghost` | рамка `--border`, фон `2% foreground`, hover → рамка и текст `--vega-accent`, фон `--vega-accent-glow` |

### 8.2. shadcn Button (`@/components/ui/button`)

Примитив на `@base-ui/react/button` + `cva`. Используется в UI-компонентах и формах.

**Базовые классы:**
```
group/button inline-flex shrink-0 items-center justify-center
rounded-lg border border-transparent bg-clip-padding text-sm font-medium
whitespace-nowrap transition-all outline-none select-none
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
active:scale-95 disabled:pointer-events-none disabled:opacity-50
[&_svg]:size-4
```

**Варианты (`variant`):**

| variant | Описание |
|---------|----------|
| `default` | `bg-primary text-primary-foreground` |
| `outline` | рамка `border-border`, hover `bg-muted` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `ghost` | прозрачная, hover `bg-muted` |
| `destructive` | `bg-destructive/10 text-destructive`, hover `/20` |
| `link` | `text-primary underline-offset-4 hover:underline` |

**Размеры (`size`):**

| size | Высота |
|------|--------|
| `default` | `h-8` |
| `xs` | `h-6` |
| `sm` | `h-7` |
| `lg` | `h-9` |
| `icon` | `size-8` |
| `icon-xs` | `size-6` |
| `icon-sm` | `size-7` |
| `icon-lg` | `size-9` |

### 8.3. Глобальные hover-оверрайды → акцент

В `globals.css` заданы unlayered-оверрайды, чтобы hover/focus всегда вели к зелёному акценту VEGA
(перекрывают Tailwind-утилиты):

- Текст при hover → `var(--vega-accent)`: `.hover\:text-foreground:hover`, `.group-hover\:text-foreground`, `.hover\:text-zinc-200:hover` и dark-варианты
- Фон при hover → `var(--vega-accent-glow)`: `.hover\:bg-muted:hover`, `.hover\:bg-muted\/80`, `/50`, `/30`, `.hover\:bg-foreground\/5`, `.hover\:bg-black\/5` и dark-варианты
- Рамка при hover → `var(--vega-accent)`: `.hover\:border-vega-faint:hover`, `.hover\:border-border\/80:hover`

> Важно: при добавлении новых hover-классов учитывайте, что они могут быть переопределены этими правилами.

### 8.4. Жёсткие тени и «нео-брутализм» (фирменный приём)

Характерная черта стиля VEGA — **твёрдые offset-тени без blur** (`5px 5px 0 0`) и лифт элемента
при hover. Цвет тени зависит от типа кнопки и темы.

| Класс | Эффект |
|-------|--------|
| `.btn:hover` | `box-shadow: 5px 5px 0 0 #000` (light) / `#CBEEF3` (dark) |
| `.btn:active` | `translateY(1px)` + неуморфные двойные тени (`8px 8px 16px #c5ccd8, -8px -8px 16px #fff` в light) |
| `.btn-ghost:hover` | тень `5px 5px 0 0 var(--vega-accent)`; `:active` → `2px 2px` |
| `.vega-solid-btn` | для залитых shadcn-кнопок: hover `5px 5px #000`/`#CBEEF3`, active `2px 2px` |
| `.vega-hard-btn` | универсальная утилита: hover `4px 4px var(--vega-accent)` + `translate(-1px,-1px)`, active `2px 2px` |
| `.vega-neu-active` | активный пункт навигации: `translate(-1px,-2px)` + `5px 5px var(--vega-accent)`, фон `#E6EBF2` (light) / `rgba(24,24,27,0.55)` (dark) |
| `.vega-hard-hover` | инлайн-обёртка для hero-строк: hover `translate(-2px,-4px)` + `6px 6px var(--vega-accent)` |
| `.terminal-lift` | карточки терминала: hover `translate: 0 -4px` + мягкая тень `0 20px 50px -12px var(--vega-accent-glow)` (использует `translate`, не `transform` — не конфликтует с `vega-fade-in-up`) |

Все эти эффекты отключаются при `prefers-reduced-motion: reduce` (transform убирается, тени остаются частично).

---

## 9. UI-примитивы (`src/components/ui`)

Все примитивы построены на `@base-ui/react` и стилизуются через `cn()` из `@/lib/utils`.

| Компонент | Файл | База | Примечание |
|-----------|------|------|-----------|
| Button | `button.tsx` | `@base-ui/react/button` | cva-варианты (см. §8.2) |
| Dialog | `dialog.tsx` | `@base-ui/react/dialog` | overlay `bg-black/10` + `backdrop-blur-xs`, popup `rounded-xl ring-1 ring-foreground/10`, кнопка закрытия `XIcon` |
| Input | `input.tsx` | `@base-ui/react/input` | `h-8 rounded-lg border-input`, фокус `ring-3 ring-ring/50` |
| Switch | `switch.tsx` | `@base-ui/react/switch` | размеры `default` (32×18.4px) и `sm` (24×14px), `data-checked:bg-primary` |
| Card | `card.tsx` | div | — |
| Badge | `badge.tsx` | span | — |
| Avatar | `avatar.tsx` | `@base-ui/react` | — |
| Checkbox | `checkbox.tsx` | `@base-ui/react` | — |
| DropdownMenu | `dropdown-menu.tsx` | `@base-ui/react/menu` | — |
| Label | `label.tsx` | `@base-ui/react` | — |
| Slider | `slider.tsx` | `@base-ui/react/slider` | — |
| Switch | `switch.tsx` | `@base-ui/react/switch` | — |
| Table | `table.tsx` | table | — |
| Tabs | `tabs.tsx` | `@base-ui/react` | — |

### Dialog — ключевые детали

- Overlay: `fixed inset-0 z-50 bg-black/10 backdrop-blur-xs`, анимация `fade-in/out`
- Popup: `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, `max-w-[calc(100%-2rem)] sm:max-w-sm`, `rounded-xl bg-background p-4 ring-1 ring-foreground/10`, анимация `fade + zoom-in-95`
- Кнопка закрытия: `variant="ghost"`, `size="icon-sm"`, позиция `absolute top-2 right-2`, иконка `XIcon`
- `showCloseButton` по умолчанию `true` (можно отключить)

---

## 10. Анимации

Все анимации уважают `prefers-reduced-motion: reduce` (отключаются).

| Имя | Класс | Описание |
|-----|-------|----------|
| Fade in | `.animate-fade-in` | `translateY(10px) → 0`, 0.4s ease-out |
| Fade in up | `.vega-fade-in-up` | `translateY(20px) → 0`, 0.6s ease-out |
| Stagger | `.vega-stagger > *` | каскад из 12 шагов с задержкой 0.15s |
| Message appear | `.animate-message-appear` | `translateY(8px) → 0`, 0.3s cubic-bezier |
| Pulse dot | `.vega-pulse-dot` | пульсация opacity, 2.4s |
| AI ripple | `.ai-ripple-ring` | scale 1→1.7, opacity 0.5→0, 2.5s |
| AI bob | `.ai-bob` | `translateY(0 ↔ -3px)`, 3s |
| AI scale | `.ai-scale` | `scale(1 ↔ 1.05)`, 3s |
| Sun pulse | `.vega-sun-core` | opacity 0.7↔1, 3.5s |
| Marquee | `.vega-marquee-track` | `translateX(0 ↔ -50%)`, 40s linear, пауза на hover |
| Blink cursor | `.vega-blink-cursor` | step-end blink, 1s |

### Sun composition (capabilities section)

Композиция из центрального ядра `.vega-sun-core` (153px, radial-gradient, рамка 30% accent) и
узлов `.vega-sun-node`, расположенных по кругу через `rotate(var(--angle)) translate(207px, 0)`.
Карточки узлов `.vega-sun-card` масштабируются `1.08` при hover.

---

## 11. Подсветка кода

Три набора токенов Prism:

1. **Blog code block** (`.blog-code-block`) — всегда One Dark (Atom One Dark)
2. **CodeBlock light** (`.code-block`) — GitHub-палитра
3. **CodeBlock dark** (`.dark .code-block`) — One Dark

Terminal-токены (`.tk-c`, `.tk-cmd`, `.tk-flag`, `.tk-str`, `.tk-key`) — One Dark.

### Terminal всегда тёмный

```css
.terminal-dark {
  --foreground: #ABB2BF; --muted-foreground: #5C6370;
  --border: #21252B; --card: #21252B;
  background: #282C34; color: #ABB2BF;
}
```

### MCP README (`.mcp-readme`)

Кастомные стили для рендеринга Markdown: `pre` с `rounded-xl`, инлайн-код, таблицы,
blockquote с зелёной левой рамкой и `--vega-accent-glow` фоном, `.markdown-alert` аналогично.

---

## 12. Иконки

- Основной набор — **lucide-react** (`lucide-react@1.35.0`)
- Символьные иконки — **Material Symbols Rounded** (подключены в `<head>`)
- SVG в кнопках: `[&_svg]:size-4`, `[&_svg]:shrink-0`, `[&_svg]:pointer-events-none`

---

## 13. Структура проекта (UI-часть)

```
src/
├── app/
│   ├── globals.css        # токены тем, утилиты, анимации, кнопки, hard-тени
│   ├── layout.tsx         # шрифты, ThemeProvider, SiteHeader, AIChatButton, модалки
│   └── ...                # страницы (aimodels, chat, forum, dashboard, blog, docs, ...)
├── components/
│   ├── ui/                # shadcn/base-ui примитивы
│   ├── LoginModal.tsx     # модалка авторизации (docs/login-modal-design.md)
│   ├── AIChatButton.tsx   # FAB-кнопка ИИ-чата на главной
│   ├── AIChatDrawer.tsx   # модалка «Чат с ИИ по документации API» (docs/ai-chat-modal-design.md)
│   ├── SiteHeader.tsx     # шапка (рендерит LoginModal, HelpModal, ContactModal)
│   ├── ScrollToTop.tsx    # FAB «Наверх» (парная кнопка к AIChatButton)
│   ├── docs/              # DocsChatPanel, DocsSearch, CodeBlock, ...
│   ├── landing/           # секции лендинга
│   └── ...
├── hooks/
│   └── use-scroll-position.ts  # пороговый хук скролла (FAB-кнопки)
├── lib/
│   ├── utils.ts           # cn()
│   ├── auth-client.ts     # better-auth клиент
│   ├── login-modal-store.ts # внешний store модалки
│   ├── docs-rag/          # RAG-поиск для ИИ-чата по документации
│   └── ...
└── proxy.ts               # middleware (Next.js 16+: proxy.ts)
```

---

## 14. Паттерны и конвенции

1. **Внешний store для модалок.** LoginModal управляется не локальным `useState`, а внешним
   store в `src/lib/login-modal-store.ts` на `useSyncExternalStore`. Это позволяет открывать
   модалку из любого места (`openLoginModal()`, `setLoginModalState({...})`).
2. **Авторизация — better-auth + email OTP.** Клиент в `src/lib/auth-client.ts`.
3. **Страница `/login`** — тонкая обёртка: открывает LoginModal на mount и пробрасывает
   `?redirect=` в store. Нужна для server-side redirect из защищённых маршрутов.
4. **Защищённые ссылки** в шапке: `handleAuthRequiredClick` перехватывает клик и открывает
   модалку, если сессии нет.
5. **Тексты интерфейса — на русском.** Язык проекта `ru`, `locale: ru_RU`.
6. **Не пересобирать/перезапускать проект** — это делает пользователь.
7. **`proxy.ts`** — это middleware в Next.js 16+ (не `middleware.ts`).
8. **Класс `cn()`** из `@/lib/utils` (clsx + tailwind-merge) — обязателен для слияния классов.

---

## 15. Перенос дизайн-системы в другой проект

Минимальный набор для воспроизведения стиля VEGA на новом Next.js + Tailwind 4 проекте.

### Шаг 1. Зависимости

```bash
pnpm add tailwindcss @tailwindcss/postcss tw-animate-css shadcn \
  @tailwindcss/typography next-themes class-variance-authority clsx \
  tailwind-merge lucide-react framer-motion @base-ui/react
```

### Шаг 2. Файлы

| Что копировать | Зачем |
|---------------|-------|
| `src/app/globals.css` | **Весь файл целиком** — токены, темы, утилиты, кнопки, тени, анимации. Это 90% дизайн-системы |
| `components.json` | конфиг shadcn (style `base-nova`, baseColor `neutral`) |
| `src/lib/utils.ts` | `cn()` |
| `src/components/ui/*` | примитивы на `@base-ui/react` (button, dialog, input, ...) |
| `src/components/theme-provider.tsx` | обёртка `next-themes` |
| Подключение шрифтов из `layout.tsx` | Google Sans + Google Sans Code + Material Symbols Rounded |

### Шаг 3. Настройка

1. Tailwind 4 — без `tailwind.config`: всё в CSS через `@import "tailwindcss"`, `@theme`,
   `@custom-variant dark`, `@theme inline`.
2. `postcss.config.mjs`: `{ plugins: { "@tailwindcss/postcss": {} } }`.
3. `<html suppressHydrationWarning>` + `ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`.
4. Поменять брендовые токены `--vega-accent*` под свой акцент — остальная система
   (neutral-палитра, тени, стекло, анимации) переживёт ребрендинг без изменений.

### Что делает стиль «VEGA» — краткая памятка

- **База:** почти белый фон `#FAFAFA` / почти чёрный `#09090B`, карточки белые/`#18181B`.
- **Акцент:** emerald-green (`#059669` light / `#34D399` dark) + cyan для градиентов.
- **Радиус:** везде 12px (`--radius` единый), кнопки-пилюли `rounded-full`.
- **Фирменный приём:** жёсткие offset-тени `5px 5px 0 0` без blur при hover + лифт.
- **Стекло:** `--vega-surface-glass` + `backdrop-blur` для шапки, модалок, FAB.
- **Типографика:** Google Sans; моно — Google Sans Code; eyebrow-метки `// раздел`.
- **Движение:** fade-in-up + stagger на входе, spring-анимации framer-motion для модалок,
  всё уважает `prefers-reduced-motion`.
- **Ховеры:** глобально приведены к зелёному акценту через unlayered-оверрайды в CSS.

---

## 16. Критерии приёмки дизайн-системы

- [x] Описан технологический стек и конфигурация shadcn/ui
- [x] Описана типографика (Google Sans / Google Sans Code / eyebrow / gradient-text)
- [x] Приведены все цветовые токены (neutral + VEGA tokens) для light/dark
- [x] Описаны радиусы, контейнер, темы, скроллбары
- [x] Описаны утилиты VEGA (glass-card, hero-grid, glow, tooltip)
- [x] Описаны кнопки (`.btn` + shadcn Button), глобальные hover-оверрайды и система жёстких теней
- [x] Перечислены UI-примитивы и детали Dialog
- [x] Описаны все анимации с поддержкой reduced-motion
- [x] Описана подсветка кода и terminal-тема
- [x] Описаны иконки и структура проекта
- [x] Описаны паттерны (внешний store модалок, better-auth, /login-обёртка)
- [x] Добавлена инструкция по переносу дизайн-системы в другой проект
