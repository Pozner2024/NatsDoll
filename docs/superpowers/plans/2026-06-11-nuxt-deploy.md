# Деплой Nuxt SSR (спек 7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** natsdoll.com отдаётся Nitro-сервером (SSR); Caddy — отдельный edge-сервис; CI с web-тестами и sha-тегами; релиз с откатом.

**Architecture:** web-образ = чистый Nitro (`node .output/server/index.mjs`), Caddy — стоковый образ с bind-mount Caddyfile из репо, прокся `handle → web:3000` вместо `file_server`. Спек: `docs/superpowers/specs/2026-06-11-07-nuxt-deploy-design.md`.

**Tech Stack:** Docker multi-stage, Caddy 2, GitHub Actions, ghcr.io.

**Контекст для исполнителя без знания проекта:**
- Монорепо npm workspaces (`apps/web`, `apps/api`). Ветка `feat/nuxt-skeleton`. Прод: VPS fornex, юзер `natalia`, `/home/natalia/natsdoll`, домен natsdoll.com.
- **КРИТИЧНО: merge в main = автодеплой прода.** Task 7 (релиз) выполняется ТОЛЬКО после явной команды пользователя. До неё — никаких push в main.
- Коммиты заканчивать строкой: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Security-инварианты: `header_up X-Real-IP {remote_host}` в Caddyfile НЕ трогать; CSP НЕ ослаблять (`unsafe-inline` для script-src запрещён); api — одна реплика.
- Локальный docker должен быть жив (`docker info`); если завис — перезапуск Docker Desktop (процедура в памяти проекта).

---

### Task 1: Dockerfile.web → Nitro

**Files:**
- Modify: `Dockerfile.web` (полная замена)

- [x] **Step 1: Заменить содержимое `Dockerfile.web`**

```dockerfile
FROM node:20.19.0-alpine3.21 AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY apps/web/ ./apps/web/

RUN npm run build -w apps/web

FROM node:20.19.0-alpine3.21 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3000

COPY --from=builder /app/apps/web/.output ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

CMD ["node", "/app/server/index.mjs"]
```

- [x] **Step 2: Локальная сборка образа**

Run: `docker build -f Dockerfile.web -t natsdoll-web-test . 2>&1 | tail -3`
Expected: `naming to docker.io/library/natsdoll-web-test` без ошибок (5–10 мин).

- [x] **Step 3: Прогон образа в сети dev-compose**

Предусловие: dev-стек запущен (`docker compose up -d`), api healthy.

Run: `docker run -d --rm --name web-prod-test --network natsdoll_default -e NUXT_API_INTERNAL_URL=http://api:3000 -e NUXT_PUBLIC_SITE_URL=https://natsdoll.com -p 8080:3000 natsdoll-web-test`
Подождать до 200: `until curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -q 200; do sleep 2; done` (background).

Смоук:

```bash
curl -s http://localhost:8080/ | grep -c "Handmade Polymer Clay Dolls"   # SSR-меты
curl -s http://localhost:8080/sitemap.xml | grep -c "<lastmod>"          # sitemap с lastmod
curl -s http://localhost:8080/robots.txt | grep -c "Sitemap:"            # robots
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/product/nonexistent-404
curl -s http://localhost:8080/_nuxt/ -o /dev/null -w "%{http_code}\n"    # любой код, главное сервер жив
```

Expected: меты ≥ 1; lastmod > 0; robots = 1; 404.

- [x] **Step 4: Проверка CSP-совместимости (нет исполняемых inline-скриптов)**

Run: `curl -s http://localhost:8080/ | grep -oE '<script[^>]*>' | grep -v 'src=' | grep -vE 'application/(ld\+)?json' | head -5`
Expected: пусто (все `<script>` без `src` — JSON-типы). Если НЕ пусто — стоп:
вычислить sha256-хэши инлайнов и добавить в CSP Caddyfile (Task 2), НЕ
использовать `unsafe-inline`.

- [x] **Step 5: Остановить тестовый контейнер**

Run: `docker stop web-prod-test`

- [x] **Step 6: Commit**

```bash
git add Dockerfile.web
git commit -m "feat(deploy): nitro server image instead of static spa"
```

### Task 2: Caddyfile — переезд и прокся на Nitro

**Files:**
- Move: `apps/web/Caddyfile` → `Caddyfile` (корень репо)
- Modify: блок `handle` внутри

- [x] **Step 1: Переместить файл**

Run: `git mv apps/web/Caddyfile Caddyfile`

- [x] **Step 2: Заменить статик-блок проксёй**

В `Caddyfile` блок:

```
	handle {
		root * /srv
		@assets path *.js *.css *.woff *.woff2 *.png *.jpg *.jpeg *.svg *.ico
		header @assets Cache-Control "public, immutable, max-age=31536000"
		header /index.html Cache-Control "no-cache, no-store, must-revalidate"
		try_files {path} /index.html
		file_server
	}
```

заменить на:

```
	handle {
		reverse_proxy web:3000
	}
```

Остальное (www-редирект, header-блок с CSP, `handle_path /api/*` с
`header_up X-Real-IP {remote_host}`, блок stats.natsdoll.com) НЕ трогать.
Если Task 1 Step 4 нашёл inline-скрипты — добавить их sha256 в `script-src`.

- [x] **Step 3: Валидация синтаксиса**

Run: `docker run --rm -v "${PWD}/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -2`
Expected: `Valid configuration`.

- [x] **Step 4: Commit**

```bash
git add Caddyfile apps/web/Caddyfile
git commit -m "feat(deploy): caddy proxies nitro instead of serving static"
```

### Task 3: docker-compose.prod.yml — web без портов + сервис caddy

**Files:**
- Modify: `docker-compose.prod.yml` (сервис `web`, новый сервис `caddy`)

- [x] **Step 1: Заменить сервис `web`**

Текущий блок `web:` заменить на:

```yaml
  web:
    image: ghcr.io/pozner2024/natsdoll/web:latest
    environment:
      NUXT_API_INTERNAL_URL: http://api:3000
      NUXT_PUBLIC_SITE_URL: ${FRONTEND_URL}
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:-:80}
      WWW_ADDRESS: ${WWW_ADDRESS:-http://localhost:2080}
      ACME_EMAIL: ${ACME_EMAIL:-}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      web:
        condition: service_healthy
    restart: unless-stopped
```

(healthcheck web живёт в Dockerfile — compose-условие `service_healthy` его
использует; volumes `caddy_data`/`caddy_config` уже объявлены — сертификаты
переживут миграцию.)

- [x] **Step 2: Локальная валидация compose**

Run: `FRONTEND_URL=https://natsdoll.com DB_USER=x DB_PASSWORD=x DB_NAME=x JWT_SECRET=x HMAC_SECRET=x docker compose -f docker-compose.prod.yml config --quiet && echo VALID`
Expected: `VALID` (warnings о незаданных переменных допустимы).

- [x] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat(deploy): caddy edge service, nitro web internal"
```

### Task 4: Чистка dev-compose

**Files:**
- Modify: `docker-compose.yml` (command сервиса `web`)

- [x] **Step 1: Убрать мёртвый workspace**

В `command` сервиса `web` строку:

```yaml
    command: sh -c "rm -rf /app/node_modules/.package-lock.json 2>/dev/null; npm ci -w apps/web -w packages/shared && npm run dev -w apps/web"
```

заменить на:

```yaml
    command: sh -c "rm -rf /app/node_modules/.package-lock.json 2>/dev/null; npm ci -w apps/web && npm run dev -w apps/web"
```

- [x] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: drop dead packages/shared workspace from dev compose"
```

### Task 5: CI — web-тесты и sha-теги

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [x] **Step 1: Web-тесты в job `test`**

После шага `Integration tests` добавить:

```yaml
      - name: Web unit tests
        run: npx vitest run --root apps/web
```

- [x] **Step 2: Sha-теги и чистка build-args**

Шаг `Build and push API image`: строку `tags:` заменить на:

```yaml
          tags: |
            ghcr.io/pozner2024/natsdoll/api:latest
            ghcr.io/pozner2024/natsdoll/api:${{ github.sha }}
```

Шаг `Build and push Web image`: удалить строку `build-args: VITE_API_URL=/api`,
строку `tags:` заменить на:

```yaml
          tags: |
            ghcr.io/pozner2024/natsdoll/web:latest
            ghcr.io/pozner2024/natsdoll/web:${{ github.sha }}
```

- [x] **Step 3: Локальная проверка web-тестов той же командой, что в CI**

Run: `npx vitest run --root apps/web --reporter=basic 2>&1 | tail -3`
Expected: 225 passed. (Локально может потребоваться `node --max-old-space-size`;
в CI Linux-путь без кириллицы — не нужен.)

- [x] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: web unit tests, sha image tags for rollback"
```

### Task 6: Полная локальная проверка

**Files:** нет изменений.

- [x] **Step 1: Тесты, typecheck, lint, build**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic 2>&1 | tail -4
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck; cd ../..
npm run build -w apps/web
```

Expected: 225 + 271 passed; typecheck 0; build 0.

- [x] **Step 2: Отчёт пользователю и ожидание команды на релиз**

Сообщить: все файлы деплоя готовы, локальная prod-сборка проверена (результаты
Task 1 Step 3–4). Ветка готова к мержу. **СТОП — ждать явной команды
пользователя на merge.**

### Task 7: Релиз (ТОЛЬКО по явной команде пользователя)

**Files:** нет изменений кода.

- [ ] **Step 1: Merge и push**

```bash
git checkout main
git pull
git merge --no-ff feat/nuxt-skeleton -m "feat: nuxt 4 ssr migration (specs 1-7)"
git push origin main
```

(Сообщение merge-коммита дополнить строкой Co-Authored-By.)

- [ ] **Step 2: Наблюдение за CI**

Run: `gh run watch` (или `gh run list --limit 1` + `gh run view <id>` циклом).
Expected: jobs test → build → deploy все зелёные (~10–15 мин).
При красном test/build — прод НЕ тронут, чинить на ветке main обычным порядком.
При красном deploy — диагностика по логам job, возможен откат (спек, раздел 6).

- [ ] **Step 3: Смоук прода**

```bash
curl -s https://natsdoll.com/ | grep -c "Handmade Polymer Clay Dolls"
curl -s https://natsdoll.com/ | grep -o 'rel="canonical" href="[^"]*"' | head -1
curl -s https://natsdoll.com/sitemap.xml | grep -c "<lastmod>"
curl -s https://natsdoll.com/robots.txt | grep -c "Sitemap:"
curl -s -o /dev/null -w "%{http_code}\n" https://natsdoll.com/product/nonexistent-404
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://www.natsdoll.com/
curl -s https://stats.natsdoll.com/ -o /dev/null -w "umami: %{http_code}\n"
```

Expected: меты ≥ 1; canonical = `https://natsdoll.com/`; lastmod > 0;
robots = 1; 404; www → 308 на апекс; umami 200.

Браузером (Playwright): главная — без ошибок CSP в консоли; логин админом;
`/admin` открывается; добавление товара в корзину работает (потом удалить).

- [ ] **Step 4: Инструкция по GSC**

Выдать пользователю: Google Search Console → ресурс natsdoll.com → раздел
«Файлы Sitemap» → ввести `sitemap.xml` → «Отправить». Статус «Успешно»
появится в течение часов/суток.

- [ ] **Step 5: Финальный отчёт**

Статус 5 критериев приёмки спека. Зафиксировать sha задеплоенных образов
(для отката). Обновить память проекта: миграция завершена, прод на Nuxt SSR.

---

## Вне scope

`/site.webmanifest`, swr-кэширование, Redis-rate-limit, CDN.
