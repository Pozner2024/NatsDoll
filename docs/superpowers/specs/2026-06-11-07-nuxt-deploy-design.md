# Спек 7: Деплой Nuxt SSR

Дата: 2026-06-11. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спеки 1–6 выполнены). Финальный спек миграции.

## Цель

natsdoll.com отдаётся Nitro-сервером (SSR) вместо статики SPA. Caddy остаётся
edge-прокси (TLS, заголовки, www-редирект, umami). CI собирает и деплоит новую
схему; есть процедура отката. Sitemap отправлен в Google Search Console.

## Решения

- **Релиз входит в спек**: merge `feat/nuxt-skeleton` → main выполняется ТОЛЬКО
  по явной команде пользователя; после пуша — наблюдение за CI и смоук прода.
- **Caddy — отдельный сервис** (вариант A): стоковый `caddy:2-alpine`,
  `Caddyfile` bind-mount из репозитория — изменения конфига доставляются
  `git pull` без пересборки образов.

## 1. Dockerfile.web

Полная замена двух стадий:

- **builder** (`node:20.19.0-alpine3.21`): `COPY package*.json` +
  `apps/web/package.json` → `npm ci` → `COPY apps/web/` → `npm run build -w apps/web`
  (выход — `apps/web/.output`). Build-арг `VITE_API_URL` удаляется — конфигурация
  теперь рантаймовая.
- **runner** (`node:20.19.0-alpine3.21`): копируется только `.output`,
  `ENV NODE_ENV=production NITRO_PORT=3000`, `EXPOSE 3000`,
  `CMD ["node", "/app/server/index.mjs"]`, healthcheck `wget -qO- http://localhost:3000/`
  (страница `/` всегда отвечает 200).

Рантайм-переменные (задаются в compose):

| Переменная | Значение | Назначение |
|------------|----------|------------|
| `NUXT_API_INTERNAL_URL` | `http://api:3000` | SSR-фетчи в API (apiClient, sitemap) |
| `NUXT_PUBLIC_SITE_URL` | `${FRONTEND_URL}` | canonical, OG, sitemap-URL |

## 2. Caddyfile

Переезжает `apps/web/Caddyfile` → `./Caddyfile` (корень репо). Единственное
содержательное изменение — статика заменяется проксёй:

```
	handle {
		reverse_proxy web:3000
	}
```

Удаляются: `root /srv`, `try_files`, `file_server`, Cache-Control-правила для
ассетов (Nitro сам ставит `immutable` на `/_nuxt/*`).

Сохраняются ДОСЛОВНО: `handle_path /api/*` с `header_up X-Real-IP {remote_host}`
(инвариант rate-limiter), www-редирект, security-заголовки (HSTS, XFO, CSP,
Permissions-Policy), блок `stats.natsdoll.com`.

**CSP не ослабляется**: `script-src 'self' https://stats.natsdoll.com` остаётся.
Nuxt-payload (`#__NUXT_DATA__`) и JSON-LD — неисполняемые JSON-скрипты, под CSP
не подпадают. Проверка на локальном prod-прогоне: в HTML нет исполняемых inline
`<script>` без `src`; если найдётся — разрешать через `sha256-…` hash в CSP,
НЕ через `unsafe-inline`.

## 3. docker-compose.prod.yml

- `web`: образ прежний (`ghcr.io/.../web:latest`, но теперь Nitro), без портов
  наружу, environment `NUXT_API_INTERNAL_URL: http://api:3000` и
  `NUXT_PUBLIC_SITE_URL: ${FRONTEND_URL}`, healthcheck (wget на `:3000`),
  `depends_on: api: condition: service_healthy`, `restart: unless-stopped`.
- Новый сервис `caddy`: `image: caddy:2-alpine`, `ports: 80:80, 443:443`,
  volumes `caddy_data:/data`, `caddy_config:/config`,
  `./Caddyfile:/etc/caddy/Caddyfile:ro`, environment `SITE_ADDRESS`,
  `WWW_ADDRESS`, `ACME_EMAIL` (переезжают из `web`),
  `depends_on: web: condition: service_healthy`, `restart: unless-stopped`.
- Остальные сервисы (db, api, migrate, umami, umami_db) — без изменений.
- Существующие volumes `caddy_data`/`caddy_config` переиспользуются — сертификаты
  Let's Encrypt переживают миграцию, ре-выпуска не будет.

## 4. dev docker-compose.yml

Попутная чистка: из `command` сервиса `web` убирается `-w packages/shared`
(workspace удалён из репо, ссылка мёртвая).

## 5. CI (.github/workflows/deploy.yml)

- Job `test`: добавляется шаг web-тестов после api-тестов:
  `npx vitest run --root apps/web` (через корневой бинарь, как локально;
  точную команду зафиксировать по `apps/web/package.json` при реализации).
- Job `build`: у обоих образов теги `:latest` И `:${{ github.sha }}`;
  у web удаляется `build-args: VITE_API_URL`.
- Job `deploy`: без изменений — `git pull` привозит новые
  `docker-compose.prod.yml` и `Caddyfile`, `compose up -d` пересоздаёт web
  и создаёт caddy.

## 6. Откат

Сейчас отката нет: `:latest` перезаписывается, `image prune -f` удаляет старый
образ на сервере. С sha-тегами процедура (документируется здесь, выполняется
вручную при необходимости):

```bash
ssh natalia@89.127.205.44
cd /home/natalia/natsdoll
docker pull ghcr.io/pozner2024/natsdoll/web:<предыдущий-sha>
docker pull ghcr.io/pozner2024/natsdoll/api:<предыдущий-sha>
docker tag ghcr.io/pozner2024/natsdoll/web:<предыдущий-sha> ghcr.io/pozner2024/natsdoll/web:latest
docker tag ghcr.io/pozner2024/natsdoll/api:<предыдущий-sha> ghcr.io/pozner2024/natsdoll/api:latest
docker compose -f docker-compose.prod.yml up -d
```

Для отката НА СТАРЫЙ SPA (до миграции): git revert merge-коммита в main →
CI пересоберёт старую схему. Caddy-volume и БД не трогаются.

## 7. Релиз

Предусловия: все локальные проверки зелёные, прод-сборка проверена локально
(`npm run build -w apps/web` + `node apps/web/.output/server/index.mjs` +
смоук: SSR-меты, sitemap, robots, отсутствие исполняемых inline-скриптов).

По явной команде пользователя:
1. Merge `feat/nuxt-skeleton` → `main` (no-ff), push.
2. Наблюдение за GitHub Actions (test → build → deploy) до зелёного.
3. Смоук прода: `curl https://natsdoll.com` (title/меты/canonical),
   `/sitemap.xml`, `/robots.txt`, `/product/<slug>` (JSON-LD, 200),
   несуществующий товар → 404, `/shop/<категория>`; браузером — логин,
   кабинет, админка.
4. При провале — откат по разделу 6.

## 8. Google Search Console

Сайт верифицирован (`public/google133bae0d0d5ac380.html`). После успешного
деплоя пользователь отправляет sitemap вручную: GSC → ресурс natsdoll.com →
Sitemaps → ввести `sitemap.xml` → Submit. Проверка статуса «Success» там же
(может занять часы — не блокер).

## Критерии приёмки

1. Локально: prod-сборка web-образа запускается, отдаёт SSR-страницы с метами,
   `/sitemap.xml` и `/robots.txt`; исполняемых inline-скриптов в HTML нет.
2. CI зелёный: тесты (api + web), оба образа в ghcr с тегами latest и sha.
3. Прод после деплоя: смоук из раздела 7 пункт 3 полностью зелёный, HTTPS
   работает без ре-выпуска сертификатов.
4. Документированная процедура отката (раздел 6) — в спеке.
5. Sitemap отправлен в GSC (ручной шаг пользователя, инструкция выдана).

## Вне scope

`/site.webmanifest` (предсуществующий 404 — отдельной мелкой задачей),
кэширование HTML (`swr` в routeRules — по roadmap при росте трафика),
Redis-rate-limit (инвариант одной реплики api сохраняется), CDN.
