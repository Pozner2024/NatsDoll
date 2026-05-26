# Дизайн: Caddy вместо nginx + фикс CI/CD

**Дата:** 2026-05-25
**Статус:** согласован

## Контекст

Деплой NatsDoll на VPS fornex. Текущая инфраструктура:

- `docker-compose.prod.yml`: сервисы `db` (postgres), `api` (Hono :3000), `web` (nginx, статика + прокси `/api`), `migrate` (prisma migrate deploy).
- Контейнер `web` слушает `8081:8080`, TLS-терминации нет — HTTPS не закрыт.
- `.github/workflows/deploy.yml` деплоит по SSH в `/home/deploy/new_project` под юзером `deploy` — этого пути/юзера на сервере нет.
- Реальное состояние сервера: репозиторий в `/home/natalia/NatsDoll`, пользователь `natalia`, Docker 29.5.2 + Compose v5.1.4, `.env` заполнен.

Две цели:
1. Заменить nginx на Caddy в контейнере `web` — Caddy закрывает и веб-сервер, и автоматический HTTPS (Let's Encrypt) одним компонентом.
2. Привести `deploy.yml` к реальному пути/юзеру, чтобы автодеплой работал.

## Решения (согласованы)

- **Caddy полностью заменяет nginx** в контейнере `web`: раздаёт SPA + проксирует `/api` + терминирует HTTPS. Отдельный edge-прокси не вводим.
- **Выкатка HTTPS двухэтапная**: сначала HTTP по IP (`SITE_ADDRESS=:80`), после переключения DNS — домен + автосертификат (`SITE_ADDRESS=natsdoll.com`). Без простоя старого сайта на фестбайте.
- **CI/CD выравниваем под реальность**: `deploy.yml` ходит под `natalia` в `/home/natalia/natsdoll`. Отдельного юзера `deploy` не заводим (один разработчик).
- **Папку на сервере переименовываем** в строчные: `NatsDoll` → `natsdoll`.

## Архитектура

### 1. `apps/web/Caddyfile` (новый, заменяет `apps/web/nginx.conf`)

Один сайт-блок с адресом из env-переменной:

```
{$SITE_ADDRESS::80} {
    encode gzip zstd

    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://storage.yandexcloud.net; connect-src 'self'; script-src 'self'; frame-ancestors 'none';"
    }

    handle_path /api/* {
        reverse_proxy api:3000
    }

    handle {
        root * /srv
        @assets path *.js *.css *.woff *.woff2 *.png *.jpg *.jpeg *.svg *.ico
        header @assets Cache-Control "public, immutable, max-age=31536000"
        header /index.html Cache-Control "no-cache, no-store, must-revalidate"
        try_files {path} /index.html
        file_server
    }
}
```

Соответствие текущему nginx:
- `handle_path /api/*` срезает префикс `/api` (эквивалент nginx `rewrite ^/api/(.*)$ /$1`), затем `reverse_proxy api:3000`. Caddy сам проставляет `X-Forwarded-*`.
- Security-заголовки переносятся один-в-один; CSP не меняется. В Caddy заголовки применяются глобально к блоку — не нужно дублировать по локациям, как в nginx.
- SPA-fallback: `try_files {path} /index.html`.
- Кэш хешированных ассетов — `immutable, 1y`; `index.html` — `no-store`.
- `{$SITE_ADDRESS::80}` — адрес сайта из env с дефолтом `:80`.

### 2. `Dockerfile.web`

Builder-стадия (node 20, `npm run build -w apps/web`, `ARG VITE_API_URL=/api`) — без изменений. Runner-стадия меняется с `nginx:1.27-alpine` на `caddy:2-alpine`:

```dockerfile
FROM caddy:2-alpine AS runner
COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
```

(штатный CMD образа caddy запускает `/etc/caddy/Caddyfile`.)

### 3. `docker-compose.prod.yml` — сервис `web`

- `ports`: `8081:8080` → **`80:80`** и **`443:443`**.
- `environment`: `SITE_ADDRESS: ${SITE_ADDRESS:-:80}`, `ACME_EMAIL: ${ACME_EMAIL:-}`.
- **новые volume-ы**: `caddy_data:/data` (сертификаты — обязательно персистить, иначе rate-limit Let's Encrypt), `caddy_config:/config`.
- `depends_on: api`, `restart: unless-stopped` — без изменений.
- В секцию `volumes:` добавить `caddy_data:` и `caddy_config:`.

Сервисы `db`, `api`, `migrate` — без изменений. Заметку про single-replica rate-limiter сохранить.

### 4. `.env.example` (и `.env` на сервере)

Добавить:

```
# Веб-сервер (Caddy)
SITE_ADDRESS=:80          # этап 1 — HTTP по IP; этап 2 — natsdoll.com
ACME_EMAIL=               # email для уведомлений Let's Encrypt (необязательно)
```

### 5. `.github/workflows/deploy.yml`

- `cd /home/deploy/new_project` → **`cd /home/natalia/natsdoll`**.
- `username: ${{ secrets.SSH_USER }}` — секрет = `natalia`.
- Порядок `git pull → build → migrate → up -d` — без изменений.
- GitHub-секреты: `SSH_HOST` (IP сервера), `SSH_USER=natalia`, `SSH_PRIVATE_KEY`.

## Порядок выкатки (операционный, на сервере)

1. Переименовать папку: `mv ~/NatsDoll ~/natsdoll` (контейнеры ещё не запущены — безопасно).
2. `git pull` (после мержа изменений в main) или работаем с текущей веткой.
3. Добавить `SITE_ADDRESS=:80` в `.env`.
4. `docker compose -f docker-compose.prod.yml build`
5. `docker compose -f docker-compose.prod.yml run --rm migrate`
6. `docker compose -f docker-compose.prod.yml up -d`
7. Проверить сайт по `http://IP-сервера`.
8. Переключить A-запись `natsdoll.com` (и `www`) в Namecheap на IP сервера.
9. Поменять `SITE_ADDRESS=natsdoll.com` в `.env` → `up -d` → Caddy выписывает сертификат, сайт на HTTPS.
10. Завести GitHub-секреты → дальше деплой автоматический по `push` в `main`.

## Известные нюансы

- **www**: на этапе 2 добавить редирект `www.natsdoll.com` → апекс (в DNS уже есть запись `www`).
- **Авторизация по HTTP (этап 1)**: refresh-cookie с флагом `Secure` по `http://IP` не отправится — полноценная проверка входа на этапе 2 (HTTPS). На этапе 1 проверяем загрузку сайта, отображение товаров и картинок.
- **Создание админа** не входит в `migrate` (только `prisma migrate deploy`) — отдельный шаг через `prisma db seed`, после поднятия контейнеров.

## Затрагиваемые файлы

| Файл | Изменение |
| --- | --- |
| `apps/web/Caddyfile` | новый |
| `apps/web/nginx.conf` | удалить |
| `Dockerfile.web` | runner-стадия → caddy |
| `docker-compose.prod.yml` | сервис `web`: ports, env, volumes; новые volume-ы |
| `.env.example` | + `SITE_ADDRESS`, `ACME_EMAIL` |
| `.github/workflows/deploy.yml` | путь + юзер |
