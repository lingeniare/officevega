# Подключение анонимизации ПДн к другим сервисам на этом сервере

Локальный сервис обезличивания уже запущен на сервере и готов принимать
запросы от любых бэкендов, работающих на той же машине.

## 1. Контракт сервиса

| Параметр | Значение |
|---|---|
| URL | `http://127.0.0.1:8787` |
| Аутентификация | заголовок `x-pii-token: <PII_SERVICE_TOKEN>` |
| Формат | multipart/form-data для файлов, JSON для текста |
| Выход | JSON `{ text, entities, extractor, warnings }` |

**Токен** лежит в `/srv/www/ru_vega_chat_usr/data/www/ru.vega.chat/services/pii-service/.env`
(и в `.env` основного приложения) — скопируйте значение `PII_SERVICE_TOKEN`
в конфиг каждого сервиса-клиента. Не логируйте и не коммитьте его.

### Эндпоинты

- `POST /v1/anonymize-file` — multipart: поля `file` (бинарь), `filename`,
  `content_type`.
- `POST /v1/anonymize-text` — JSON: `{ "text": "..." }`.
- `GET /health` — проверка живости (без токена).

### Поддерживаемые входные типы

txt/md/csv и другие текстовые, `.docx`, `.pdf` (текстовый слой + OCR для
сканов), изображения (OCR rus+eng). Остальные офисные форматы
(.doc/.xls/.ppt/.odt) конвертируйте в PDF на своей стороне (LibreOffice).

### Ответ

```json
{
  "text": "Я, #PERSON_1#, СНИЛС #SNILS_1#, тел. #PHONE_NUMBER_1#",
  "entities": [{"type": "PERSON", "count": 1}, {"type": "SNILS", "count": 1}],
  "extractor": "docx",
  "warnings": ["ocr_used"]
}
```

- `text` — текст с токенами `#TYPE_N#`. Одинаковые значения = один токен.
- `entities` — только типы и количество (значения ПДн не возвращаются).
- `warnings`: `ocr_used` (использовался OCR), `no_text` (картинка без
  распознаваемого текста — выглядит как фото), `ocr_failed_on_page`.

### Ошибки

| Код | Значение |
|---|---|
| 400 | пустой файл / нет text |
| 401 | неверный/отсутствующий токен |
| 413 | файл больше лимита (50 МБ) или страниц (>300) |
| 415 | неподдерживаемый тип |
| 422 | не удалось извлечь текст |
| 5xx/таймаут | сервис недоступен |

## 2. Главное правило — fail-closed

**Если сервис не ответил или вернул ошибку — файл/текст НЕ отправляется в
LLM.** Никакого fallback «отправить как есть». Пользователю возвращаем
понятную ошибку.

## 3. Примеры клиентов

### cURL (смоук-тест)

```bash
TOKEN=<PII_SERVICE_TOKEN>

# текст
curl -s -X POST http://127.0.0.1:8787/v1/anonymize-text \
  -H "x-pii-token: $TOKEN" -H 'content-type: application/json' \
  -d '{"text":"Иванов И.И., +7 916 555-35-35"}'

# файл
curl -s -X POST http://127.0.0.1:8787/v1/anonymize-file \
  -H "x-pii-token: $TOKEN" \
  -F "file=@dogovor.docx" -F "filename=dogovor.docx"
```

### Node.js / TypeScript

```ts
const PII_URL = process.env.PII_SERVICE_URL ?? 'http://127.0.0.1:8787';
const PII_TOKEN = process.env.PII_SERVICE_TOKEN!;

export async function anonymizeForLlm(buffer: Buffer, fileName: string, contentType: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)]), fileName);
  form.append('filename', fileName);
  form.append('content_type', contentType);

  const res = await fetch(`${PII_URL}/v1/anonymize-file`, {
    method: 'POST',
    headers: { 'x-pii-token': PII_TOKEN },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    // fail-closed: бросаем, файл в LLM не уходит
    throw new Error(`PII anonymization failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { text: string; entities: { type: string; count: number }[] };
}
```

Для текстового сообщения — `POST /v1/anonymize-text` с JSON `{text}`.

### Python (httpx / requests)

```python
import httpx

PII_URL = "http://127.0.0.1:8787"
PII_TOKEN = "..."

def anonymize_file(path: str) -> dict:
    with open(path, "rb") as f:
        resp = httpx.post(
            f"{PII_URL}/v1/anonymize-file",
            headers={"x-pii-token": PII_TOKEN},
            files={"file": (path, f)},
            data={"filename": path},
            timeout=120,
        )
    resp.raise_for_status()  # fail-closed
    return resp.json()
```

## 4. Где вызывать

Вызывайте анонимизацию **в самой ранней точке, где файл попадает в ваш
сервис, до любой передачи содержимого во внешние API** (LLM, переводчики,
OCR-сервисы, аналитика). Оригинал при этом можно сохранять в своём
хранилище — трансграничной передачей считается именно отправка наружу.

Типовой порядок в обработчике загрузки:

```
файл -> ваш бэкенд -> pii-service (127.0.0.1) -> обезличенный текст -> LLM
                              |
                              +-- ошибка -> не отправляем (fail-closed)
```

## 5. Что учесть

- **Сервис не отправляет ПДн наружу** и не логирует значения — но ваш
  сервис тоже не должен логировать/складировать обезличенные данные с
  прямой привязкой к пользователю, если это не нужно.
- Обратной подстановки нет: токены `#PERSON_1#` так и доходят до
  пользователя и модели.
- Изображения без текста (фото) вернут `text: ""` + `warnings: ["no_text"]`
  — решайте на своей стороне: либо отклонить, либо предупредить пользователя.
- Лимиты: 50 МБ на файл, 300 страниц PDF; OCR добавляет ~1-3 секунды на
  страницу скана. Таймаут на клиенте ставьте ≥120 с.
- Для большого RPS сервис сейчас на одном воркере uvicorn — при росте
  нагрузки поднимите workers в `ecosystem.config.js` (секция `pii-service`)
  или Docker-реплики за тем же портом через балансировщик.

## 6. Проверка после подключения

```bash
# 1. сервис жив
curl -s http://127.0.0.1:8787/health

# 2. анонимизация работает из вашего сервиса — ПДн не доходят до LLM:
#    отправьте файл с ФИО+телефоном и проверьте, что в payload к модели
#    только токены #PERSON_1#/#PHONE_NUMBER_1#.
# 3. убейте сервис (pm2 stop pii-service) — ваш сервис должен отклонить
#    файл, а не отправить его как есть.
```
