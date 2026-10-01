# Анонимизация ПДн в загружаемых файлах — changelog для переноса на форк

Дата: 2026-09-29. Ветка-основа: рабочее дерево ru.vega.chat.

Цель: персональные данные из файлов пользователя не должны попадать в LLM
(трансграничная передача, 152-ФЗ). В режимах `chat` и `auto` обезличивание
обязательно и не отключается; в `web`/`extreme` вложения запрещены;
в `image`/`video`/`music`/`transcription`/`code`/`memory` поведение не
меняется (редактирование изображений, image-to-video, транскрибация).

## 1. Новый сервис `services/pii-service/` (Python, локально)

Отдельный процесс на том же сервере. Слушает только `127.0.0.1:8787`,
исходящий интернет не нужен, значения ПДн не логируются и не возвращаются.

| Файл | Зачем |
|---|---|
| `app/main.py` | FastAPI: `POST /v1/anonymize-file` (multipart), `POST /v1/anonymize-text`, `GET /health`; auth по заголовку `x-pii-token` |
| `app/config.py` | env: токен, лимиты (50 МБ / 300 страниц PDF), OCR настройки |
| `app/extractors.py` | Извлечение текста: txt/md (utf-8/cp1251), docx (python-docx: параграфы, таблицы, колонтитулы), pdf (PyMuPDF + fallback на Tesseract для сканов), картинки (Tesseract rus+eng) |
| `app/recognizers/rules.py` | Presidio-распознаватели: телефон, email, IP, ИНН/СНИЛС/ОГРН (чексуммы), паспорт/счёт/БИК/полис/ВУ (по контекстным словам), карты (Луна), даты рождения, «Иванов И.И.», ИП/ООО/АО + Natasha (Names/Dates/Addr extractors) |
| `app/recognizers/validators.py` | Чексуммы: ИНН 10/12, СНИЛС, ОГРН/ОГРНИП, Луна, БИК |
| `app/pipeline.py` | Детект → дедупликация пересечений → замена на токены `#TYPE_N#`. Нормализация через pymorphy3-леммы: один человек в разных падежах = один токен |
| `tests/` | 21 pytest: распознаватели, падежи ФИО, API, auth |
| `Dockerfile`, `docker-compose.yml` | Альтернатива PM2; `tesseract-ocr-rus` в образе |
| `requirements.txt` | Пины; `setuptools<81` обязателен (pymorphy2 тянет `pkg_resources`) |

## 2. Новый код в Next.js (`lib/pii/`)

| Файл | Зачем |
|---|---|
| `lib/pii/shield-policy.ts` | Единая политика: `isShieldRequired` (chat/auto), `areAttachmentsDisallowed` (web/extreme). Сервер — источник истины |
| `lib/pii/pii-client.ts` | HTTP-клиент к сервису, `PiiServiceError`, токен, таймаут. Fail-closed: любая ошибка — исключение, файла в LLM нет |
| `lib/pii/pii-gateway.ts` | Единый шлюз: fileCache/`local://`/data:/http → буфер → сервис. Кэш результата по sha256 содержимого (TTL 15 мин). Бросает `PiiShieldError` |

## 3. Изменённые файлы

| Файл | Что и зачем |
|---|---|
| `lib/document-processing.ts` | Удалён `ANONYMIZE_SYSTEM_PROMPT` и весь LLM-путь анонимизации (раньше оригинал PDF уходил во внешнюю модель `vega-file` ДО обезличивания). `anonymizeDocumentToMarkdown` теперь вызывает `anonymizeFileForLlm` (локальный сервис). `extractDocumentToMarkdown` оставлен для групп без щита |
| `app/api/search/route.ts` | `shouldAnonymizeDocuments = isShieldRequired(group, actualGroup)` — щит обязателен, клиентский `anonymizeFiles` игнорируется; новая функция `anonymizeImagePartForLlm` — картинки идут через локальный OCR+анонимизацию вместо `vega-file`, фото без текста блокируются; после обработки документов под щитом все оставшиеся `file`-part'ы (аудио/видео/архивы) заменяются заметкой, `attachments` очищаются; web/extreme: `400` на сообщения с вложениями + стрип вложений из истории; `estimateChatInputTokensForRequest` получает тот же флаг щита |
| `app/api/extract-file/route.ts`, `app/api/anonymize-file/route.ts` | Оба идут через локальный шлюз (extract раньше тоже отправлял сырой файл в LLM — закрыта утечка); маппинг `PiiShieldError.status` |
| `components/ui/form-component.tsx` | Кнопка-переключатель щита заменена статичным индикатором `ShieldCheck` (chat/auto) с тултипом «ПДн удаляются автоматически»; `canAttachFiles = false` для web/extreme + toast «в этом режиме вложения не поддерживаются» в drag&drop/paste/triggerFileInput; `useEffect` снимает вложения при переключении на web/extreme; удалены пропсы `isAnonymizeEnabled`/`onAnonymizeEnabledChange` и импорт `ShieldOff` |
| `components/chat-interface.tsx` | Удалены state/ref `isAnonymizeEnabled` и поле `anonymizeFiles` из тела запроса |
| `env/server.ts` | `PII_SERVICE_URL` (default `http://127.0.0.1:8787`), `PII_SERVICE_TOKEN`, `PII_SERVICE_TIMEOUT_MS` (120000) |
| `lib/security/validation.ts` | `anonymizeFiles` оставлен optional для обратной совместимости — сервер его игнорирует |
| `messages/ru.json` | `anonymize.*`: `alwaysOn` вместо `active`/`inactive`; `toasts.attachmentsNotAllowed`; текст справки про щит |
| `ecosystem.config.js` | Добавлено pm2-приложение `pii-service` (uvicorn из `.venv`, `127.0.0.1:8787`, `--env-file .env`) |
| `.gitignore` | `**/.venv/`, `**/__pycache__/`, `.pytest_cache/` (`.env` и `logs` уже покрывались) |

## 4. Что НЕ трогалось осознанно

- Группы image/video/music/transcription/code — файлы уходят в провайдеров
  как раньше (иначе сломаются edit image, image-to-video, транскрибация).
- Текст сообщений пользователя не обезличивается (только файлы).
- S3-хранилище без изменений (российский сервер, оригиналы хранятся там же).
- Обратной подстановки ПДн нет — пользователь и модель видят токены.

## 5. Деплой на сервере / на форке

```bash
cd services/pii-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
apt-get install -y tesseract-ocr tesseract-ocr-rus tesseract-ocr-eng   # OCR
echo "PII_SERVICE_TOKEN=<случайный токен>" > .env

# в .env основного приложения:
#   PII_SERVICE_URL=http://127.0.0.1:8787
#   PII_SERVICE_TOKEN=<тот же токен>
#   PII_SERVICE_TIMEOUT_MS=120000

pm2 start ecosystem.config.js --only pii-service && pm2 save
```

Или `docker compose up -d` в `services/pii-service` (токен через env).

**Важно:** пока сервис не поднят или токен не совпадает — файлы в chat/auto
не уйдут в LLM вообще (fail-closed). Переменные в `.env` приложения
подхватываются только при его рестарте.

## 6. Проверки

- `pytest` в `services/pii-service` — 21 тест.
- `vitest` — `shield-policy` (группы), `pii-gateway` (fail-closed, кэш,
  data:/local://), `document-anonymize` (доказывает, что анонимизация не
  вызывает LLM).
- curl-смоук: `GET /health`, `POST /v1/anonymize-text` без токена → 401,
  файл с ФИО+паспортом → токены в `text`.

## 7. Известные ограничения

- Over-masking: слова с большой буквы («Москва», «Карта») иногда попадают
  в PERSON — для приватности это безопасная сторона.
- Фото без текста в chat/auto не отправляются в vision-модель (нет способа
  замазать лица) — пользователю показывается заметка.
- Нативный PDF-режим под щитом отключён: модель получает обезличенный
  текст, а не бинарь (теряется layout/картинки внутри PDF).
- История чатов: документы из прошлых сообщений проходят через шлюз при
  каждом запросе (кэш по хешу снимает повторную обработку).
