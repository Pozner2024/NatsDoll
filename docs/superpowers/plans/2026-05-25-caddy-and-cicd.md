# Caddy Migration & CI/CD Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить nginx на Caddy в контейнере `web` (статика + прокси `/api` + автоматический HTTPS) и привести `deploy.yml` к реальному пути/юзеру сервера.

**Architecture:** Caddy заменяет nginx как единственный веб-сервер контейнера `web`. Адрес сайта берётся из env `SITE_ADDRESS` (этап 1 — `:80` HTTP по IP, этап 2 — `natsdoll.com` с автосертификатом Let's Encrypt). Сертификаты персистятся в volume `caddy_data`. CI деплоит по SSH под юзером `natalia` в `/home/natalia/natsdoll`.

**Tech Stack:** Caddy 2 (caddyfile adapter), Docker Compose, GitHub Actions (appleboy/ssh-action), Let's Encrypt.

**Спека:** `docs/superpowers/specs/2026-05-25-caddy-and-cicd-design.md`

**Замечание по верификации:** локального Docker нет — статически валидируем правки, реальная проверка (build + smoke) выполняется на сервере в фазе выкатки (Task 7).

---

## File Structure

| Файл | Ответственность | Действие |
| --- | --- | --- |
| `apps/web/Caddyfile` | Конфиг Caddy: статика SPA, прокси `/api`, заголовки, HTTPS | создать |
| `apps/web/nginx.conf` | (старый конфиг nginx) | удалить |
| `Dockerfile.web` | Сборка фронта + runner на Caddy | модифицировать (runner-стадия) |
| `docker-compose.prod.yml` | Сервис `web`: порты, env, volume-ы | модифицировать |
| `.env.example` | Шаблон env: новые переменные | модифицировать |
| `.github/workflows/deploy.yml` | CI-деплой по SSH | модифицировать (путь + юзер) |

Ветка: `feat/caddy-and-cicd` (уже создана, спека закоммичена).

---

## Task 1: Создать `apps/web/Caddyfile`

**Files:**
- Create: `apps/web/Caddyfile`

- [ ] **Step 1: Написать Caddyfile**

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

Примечания:
- `{$SITE_ADDRESS::80}` — адрес сайта из env с дефолтом `:80`.
- `handle_path /api/*` срезает префикс `/api` перед проксированием (эквивалент nginx `rewrite ^/api/(.*)$ /$1`).
- Заголовки в Caddy применяются ко всему блоку — дублировать по локациям не нужно (в отличие от nginx).
- Отступы — табы (стиль Caddyfile).

- [ ] **Step 2: Визуальная проверка соответствия**

Сверить с `apps/web/nginx.conf`: совпадают ли все 6 security-заголовков (CSP идентичен), SPA-fallback, кэш ассетов, прокси `/api` на `api:3000`.

---

## Task 2: Удалить `apps/web/nginx.conf`

**Files:**
- Delete: `apps/web/nginx.conf`

- [ ] **Step 1: Удалить файл**

```bash
git rm apps/web/nginx.conf
```

- [ ] **Step 2: Проверить отсутствие ссылок**

Run: `grep -rn "nginx.conf" --include=*.yml --include=*.yaml --include=Dockerfile* .`
Expected: единственная ссылка — в `Dockerfile.web` (её исправим в Task 3). Если есть другие — обработать.

---

## Task 3: Обновить `Dockerfile.web` (runner → Caddy)

**Files:**
- Modify: `Dockerfile.web` (runner-стадия, строки 18-27)

- [ ] **Step 1: Заменить runner-стадию**

Было (с `# ─── runner ───` до конца файла):
```dockerfile
# ─── runner ───────────────────────────────────────────
# nginx-unprivileged runs as non-root user on port 8080
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

Стало:
```dockerfile
# ─── runner ───────────────────────────────────────────
# Caddy serves the SPA, reverse-proxies /api, and auto-provisions HTTPS
FROM caddy:2-alpine AS runner

COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
```

Builder-стадию (node 20, `npm run build -w apps/web`, `ARG VITE_API_URL=/api`) НЕ трогать. CMD не нужен — штатный CMD образа `caddy` запускает `/etc/caddy/Caddyfile`.

- [ ] **Step 2: Проверить**

Run: `grep -n "nginx\|caddy\|/srv\|Caddyfile" Dockerfile.web`
Expected: больше нет упоминаний `nginx`; есть `caddy:2-alpine`, `/srv`, `Caddyfile`.

---

## Task 4: Обновить `docker-compose.prod.yml` (сервис `web` + volume-ы)

**Files:**
- Modify: `docker-compose.prod.yml` (сервис `web`, строки 52-62; секция `volumes`, строки 76-77)

- [ ] **Step 1: Заменить сервис `web`**

Было:
```yaml
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      args:
        VITE_API_URL: /api
    ports:
      - "8081:8080"
    depends_on:
      - api
    restart: unless-stopped
```

Стало:
```yaml
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      args:
        VITE_API_URL: /api
    ports:
      - "80:80"
      - "443:443"
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS:-:80}
      ACME_EMAIL: ${ACME_EMAIL:-}
    volumes:
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
    restart: unless-stopped
```

- [ ] **Step 2: Добавить volume-ы Caddy**

Было:
```yaml
volumes:
  postgres_data:
```

Стало:
```yaml
volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

Сервисы `db`, `api`, `migrate` и заметку про single-replica rate-limiter НЕ трогать.

- [ ] **Step 3: Проверить YAML и подстановку env**

Run (на сервере или машине с Docker): `docker compose -f docker-compose.prod.yml config`
Expected: валидный вывод без ошибок; в сервисе `web` видны `SITE_ADDRESS: ":80"` и порты `80`, `443`; в `volumes` — `caddy_data`, `caddy_config`.

---

## Task 5: Обновить `.env.example`

**Files:**
- Modify: `.env.example` (после блока «Приложение», перед «Google OAuth»)

- [ ] **Step 1: Добавить переменные Caddy**

После строки `HMAC_SECRET=...` (конец блока «Приложение») и перед `# Google OAuth` вставить:

```
# Веб-сервер (Caddy)
# Этап 1 (проверка по IP): SITE_ADDRESS=:80 — чистый HTTP.
# Этап 2 (боевой): SITE_ADDRESS=natsdoll.com — Caddy выписывает сертификат Let's Encrypt.
SITE_ADDRESS=:80
# Email для уведомлений Let's Encrypt (необязательно).
ACME_EMAIL=

```

- [ ] **Step 2: Проверить**

Run: `grep -n "SITE_ADDRESS\|ACME_EMAIL" .env.example`
Expected: обе переменные присутствуют.

---

## Task 6: Обновить `.github/workflows/deploy.yml`

**Files:**
- Modify: `.github/workflows/deploy.yml` (строки 16-26)

- [ ] **Step 1: Заменить username и путь**

Было:
```yaml
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd /home/deploy/new_project
            git pull
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml run --rm migrate
            docker compose -f docker-compose.prod.yml up -d
```

Стало (меняется только путь в `cd`; `username` остаётся из секрета `SSH_USER`, который зададим = `natalia`):
```yaml
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd /home/natalia/natsdoll
            git pull
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml run --rm migrate
            docker compose -f docker-compose.prod.yml up -d
```

- [ ] **Step 2: Проверить**

Run: `grep -n "cd /home" .github/workflows/deploy.yml`
Expected: `cd /home/natalia/natsdoll`, старого `/home/deploy/new_project` нет.

---

## Task 7: Коммит изменений кода

**Files:** все из Task 1-6.

- [ ] **Step 1: Закоммитить**

```bash
git add apps/web/Caddyfile Dockerfile.web docker-compose.prod.yml .env.example .github/workflows/deploy.yml
git status   # убедиться, что apps/web/nginx.conf помечен deleted
git commit -m "feat(deploy): replace nginx with Caddy, fix CI path"
```

- [ ] **Step 2: Проверить**

Run: `git show --stat HEAD`
Expected: 6 файлов (1 deleted: nginx.conf; 1 new: Caddyfile; 4 modified).

---

## Task 8: Выкатка на сервере (операционная, выполняет пользователь по SSH)

Эти шаги выполняются вручную на сервере fornex. План фиксирует точную последовательность.

### Фаза A — этап 1 (HTTP по IP)

- [ ] **A1.** Переименовать папку: `cd ~ && mv NatsDoll natsdoll` (контейнеры ещё не запущены).
- [ ] **A2.** Влить изменения: `cd ~/natsdoll && git fetch && git checkout feat/caddy-and-cicd` (или после мержа — `git checkout main && git pull`).
- [ ] **A3.** Убедиться, что в `.env` есть `SITE_ADDRESS=:80` (добавить, если нет).
- [ ] **A4.** Сборка: `docker compose -f docker-compose.prod.yml build`
- [ ] **A5.** Миграции: `docker compose -f docker-compose.prod.yml run --rm migrate`
- [ ] **A6.** Запуск: `docker compose -f docker-compose.prod.yml up -d`
- [ ] **A7.** Статус: `docker compose -f docker-compose.prod.yml ps` — все Up; `docker compose -f docker-compose.prod.yml logs web` — Caddy слушает `:80` без ошибок.
- [ ] **A8.** Открыть фаервол fornex на порты `80` и `443` (если закрыты).
- [ ] **A9.** Smoke-тест: `curl -I http://IP-СЕРВЕРА` → `200 OK`; открыть `http://IP-СЕРВЕРА` в браузере — SPA грузится, товары и картинки видны, `/api`-запросы отвечают (вкладка Network).

### Фаза B — создание админа

- [ ] **B1.** Прогнать seed (создаёт админа из `ADMIN_*`) по процедуре для прода (builder-образ, `-w /app/apps/api`, переменные через `-e`). Сверить с `docs/superpowers/specs` / memory `project_prod_seed`.

### Фаза C — этап 2 (домен + HTTPS)

- [ ] **C1.** В Namecheap → Advanced DNS поменять A-записи `@` и `www` со `185.128.104.205` на IP сервера fornex. TTL = Automatic/5 min.
- [ ] **C2.** Дождаться распространения DNS: `nslookup natsdoll.com 8.8.8.8` → новый IP.
- [ ] **C3.** На сервере: в `.env` поменять `SITE_ADDRESS=natsdoll.com` (опц. задать `ACME_EMAIL`).
- [ ] **C4.** `docker compose -f docker-compose.prod.yml up -d` → `docker compose logs web` — Caddy выписал сертификат (`certificate obtained successfully`).
- [ ] **C5.** Smoke-тест: `https://natsdoll.com` грузится по HTTPS, замок валиден, `http://` редиректит на `https://`; проверить вход (Google OAuth) — теперь cookie с `Secure` работают.
- [ ] **C6.** Добавить редирект `www.natsdoll.com` → апекс (если требуется): отдельный сайт-блок в Caddyfile или DNS.

### Фаза D — автодеплой

- [ ] **D1.** Смержить `feat/caddy-and-cicd` в `main` (после явного согласия пользователя).
- [ ] **D2.** В GitHub → Settings → Secrets and variables → Actions задать: `SSH_HOST` (IP сервера), `SSH_USER=natalia`, `SSH_PRIVATE_KEY` (приватный ключ для SSH-входа `natalia`).
- [ ] **D3.** Проверить автодеплой: пуш в `main` → вкладка Actions → workflow «Deploy to production» зелёный → изменения на сайте.

---

## Self-Review

- **Spec coverage:** Caddyfile (Task 1) ✓, удаление nginx.conf (Task 2) ✓, Dockerfile.web (Task 3) ✓, compose web+volumes (Task 4) ✓, .env.example (Task 5) ✓, deploy.yml (Task 6) ✓, операционный порядок A-D (Task 8) ✓, нюансы www/cookie/seed — Фазы B, C5, C6 ✓.
- **Placeholder scan:** все файлы приведены полным содержимым; команды и ожидаемый вывод указаны. IP сервера — единственное внешнее значение (`IP-СЕРВЕРА`), вписывается пользователем на сервере.
- **Type consistency:** имена переменных (`SITE_ADDRESS`, `ACME_EMAIL`), volume-ы (`caddy_data`, `caddy_config`), путь `/home/natalia/natsdoll`, адрес сайта `{$SITE_ADDRESS::80}` — согласованы между задачами и спекой.
