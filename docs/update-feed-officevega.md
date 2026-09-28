# Хостинг фида обновлений на updates.officevega.com

Инструкция по размещению и обновлению файлов автообновления приложения на
сайте. Обновления работают через `electron-updater` с generic-провайдером:
приложение опрашивает статический URL и читает оттуда yml-манифесты и
инсталлеры.

## Как это работает

Приложение периодически (через 15 сек после старта, затем каждые 4 часа)
скачивает из корня `https://updates.officevega.com/` файл-манифест своего
канала и платформы:

| Канал  | Windows        | macOS               | Linux                 |
|--------|----------------|---------------------|-----------------------|
| stable | `latest.yml`   | `latest-mac.yml`    | `latest-linux.yml`    |
| beta   | `beta.yml`     | `beta-mac.yml`      | `beta-linux.yml`      |

Если `version:` в манифесте новее установленной — приложение показывает окно
обновления и скачивает инсталлер, указанный в `files[].url` манифеста
(имя файла резолвится относительно корня фида). sha512 из манифеста
проверяется автоматически — битый файл не установится.

## Структура папки на сайте

В корне `updates.officevega.com` — плоский список файлов:

```
/
  latest.yml                 # манифест stable + Windows
  latest-mac.yml             # манифест stable + macOS
  latest-linux.yml           # манифест stable + Linux (AppImage)
  beta.yml  beta-mac.yml  beta-linux.yml   # только если выпускаете beta
  OfficeVega Setup 0.10.3.exe              # Windows x64
  OfficeVega Setup 0.10.3-arm64.exe        # Windows arm64 (если собираете)
  OfficeVega-0.10.3-arm64.dmg              # macOS (ручная установка)
  OfficeVega-0.10.3-arm64-mac.zip          # macOS (именно zip обновляет приложение!)
  OfficeVega-0.10.3.AppImage               # Linux (самообновляется)
  officevega_0.10.3_amd64.deb              # Linux (обновляется вручную через apt)
```

Требования к хостингу:

- **HTTPS обязателен** — обновления по http не работают.
- Обычная статическая раздача файлов, никаких скриптов и API не нужно.
- Имена файлов с пробелами (`OfficeVega Setup …`) легальны; приложение
  кодирует их в URL автоматически (`%20`).

## Чего НЕ должно быть в фиде

- `*.blockmap` — дифференциальные обновления отключены
  (`disableDifferentialDownload`), blockmap только зря занимает место.
- `*.rpm` — исключён из фида сознательно (`publish: null`); rpm-пользователи
  ставят обновления вручную. Можно раздавать rpm на основном сайте.
- `builder-debug.yml`, `win-unpacked/`, `mac/`, `linux-unpacked/` —
  служебные артефакты сборки.
- Старые версии инсталлеров — не обязательны (манифест ссылается только на
  текущую), но можно оставить одну предыдущую про запас.

## Подготовка релиза

1. Соберите дистрибутив на каждой платформе (в корне репо):
   ```bash
   npm run dist:win -w @officevega/shell     # на Windows
   npm run dist:mac -w @officevega/shell     # на macOS
   npm run dist:linux -w @officevega/shell   # на Linux
   ```
   Перед сборкой убедитесь, что в `apps/shell/package.json` поднята
   `version` — приложение откажется обновляться на ту же или более старую
   (forward-only и `allowDowngrade = false`).

   `apps/shell/electron-builder.env` уже содержит
   `OFFICEVEGA_UPDATE_URL=https://updates.officevega.com` — с ним
   electron-builder сгенерирует yml-манифесты рядом с инсталлерами в
   `apps/shell/release/`. В CI задайте ту же переменную окружения.

2. Соберите фид:
   ```bash
   node scripts/stage-update-feed.cjs
   ```
   Скрипт сложит в `release-feed/` манифесты и инсталлеры из
   `apps/shell/release/` (проверит sha512 и forward-only версию). Артефакты
   с других машин/платформ сначала сложите в отдельные папки и передайте их
   аргументами — манифесты с нескольких arch-проходов скрипт объединит:

   ```bash
   node scripts/stage-update-feed.cjs win-x64 win-arm64 mac linux --out release-feed
   ```

3. Залейте **всё содержимое** `release-feed/` в корень
   `updates.officevega.com` по FTP/через панель хостинга **в таком порядке**:
   сначала инсталлеры (exe/dmg/zip/AppImage/deb), затем — **в последнюю
   очередь** — файлы `*.yml`. Иначе часть пользователей увидит манифест без
   файлов и получит ошибку загрузки (само восстановится через 4 часа, но
   лучше не допускать).

## Кэш-заголовки

На yml-манифесты — короткое кэширование или его отсутствие, на инсталлеры —
длинное (имя содержит версию, файл иммутабелен).

nginx:
```nginx
location ~* \.yml$        { add_header Cache-Control "no-cache"; }
location ~* \.(exe|dmg|zip|AppImage|deb)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Apache (.htaccess в корне фида):
```apache
<FilesMatch "\.yml$">
    Header set Cache-Control "no-cache"
</FilesMatch>
<FilesMatch "\.(exe|dmg|zip|AppImage|deb)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

Если перед сайтом стоит CDN — сбрасывайте кэш `*.yml` после каждого релиза.

## Beta-канал

Пользователи с каналом `beta` (Настройки → О программе → Канал обновлений)
читают `beta*.yml` из того же корня. Сборка beta-версии:

```bash
npm run dist:win -w @officevega/shell -- -c.extraMetadata.version=0.10.4-beta.1 -c.publish.channel=beta
```

electron-builder положит в `release/` `beta.yml`, а скрипт добавит его в
фид вместе с инсталлером. Beta и stable могут жить в одной папке — имена
манифестов и инсталлеров не пересекаются. Версию beta повышайте так же
forward-only; при переводе beta-сборки в stable просто соберите её же с
обычной версией — `latest.yml` обновится, а `beta.yml` можно оставить или
удалить.

## Ручное скачивание (фолбэк)

Если автообновление не удалось дважды, окно предлагает прямую ссылку на
инсталлер, собранную из того же фида — убедитесь, что dmg (macOS), exe
(Windows) и AppImage (Linux) действительно лежат рядом с манифестом. Крайний
фолбэк — `DOWNLOAD_PAGE_URL` в `apps/shell/src/main/updater.ts`, сейчас
`https://officevega.com/`; когда появится отдельная страница загрузки —
замените одной строкой.

## Чеклист релиза

- [ ] Поднята `version` в `apps/shell/package.json`
- [ ] `dist:*` собраны на всех поддерживаемых ОС
- [ ] `node scripts/stage-update-feed.cjs <папки...>` собрал `release-feed/` без ошибок
- [ ] Инсталлеры залиты на `updates.officevega.com`
- [ ] `*.yml` залиты последними
- [ ] `https://updates.officevega.com/latest.yml` отдаёт новую версию (проверить в браузере с обходом кэша)
- [ ] Клиент с прошлой версией видит окно обновления (`Help → Check for Updates` ускоряет проверку)

## Траблшутинг

- **Приложение не видит обновление.** Откройте `latest.yml` в браузере в
  инкогнито — если там старая версия, это кэш CDN/сайта. Если новая —
  проверьте, что версия действительно выше установленной.
- **«Update download failed».** Инсталлер не лежит рядом с манифестом, имя
  не совпадает с `files[].url`, или битый файл (sha512 не сошёлся — скрипт
  это ловит при сборке).
- **Ошибка сразу после заливки.** Манифест загружен раньше инсталлеров —
  дозалейте файлы; пострадавшие клиенты повторят через 4 часа.
- **Откат версии.** `stage-update-feed.cjs --force` + заливка; но клиенты на
  «новой» версии вниз не откатятся (`allowDowngrade = false`) — для отката
  выпускайте версию выше проблемной.
- **Dev-проверка окна.** `OFFICEVEGA_FAKE_UPDATE=0.99.0 npm run dev` —
  симулирует весь флоу без реального фида.
