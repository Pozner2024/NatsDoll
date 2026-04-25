# NatsDoll — Claude Instructions

## Проект

B2C интернет-магазин хэндмейд изделий из полимерной глины. Один разработчик. 1–200 пользователей/день.
Полная архитектура: `docs/architecture.md`.

## Стек

| Слой        | Технология                                    |
| ----------- | --------------------------------------------- |
| Frontend    | Vue 3 + Pinia + Vite + TypeScript + SCSS      |
| Backend     | Hono + TypeScript + Node.js                   |
| БД          | PostgreSQL + Prisma ORM                       |
| Shared      | npm workspaces, Zod schemas, TypeScript enums |
| Auth        | JWT (access + refresh) + Google OAuth         |
| Изображения | Яндекс Object Storage (S3)                    |
| Платежи     | PayPal REST API                               |
| Тесты       | Vitest + Playwright                           |
| Деплой      | VPS + Docker Compose                          |

## Язык общения

## Всегда отвечать на **русском языке**.

## Правила бэкенда (`apps/api`)

### Clean Architecture (упрощённая) — 3 слоя

Работаем с Prisma-моделями напрямую. Три слоя:

- **Application** — бизнес-логика (use-cases), по одному файлу на операцию (`login.ts`, `register.ts`)
- **Infrastructure** — работа с БД (репозитории), Prisma-операции
- **Presentation** — HTTP маршруты (Hono)
- `app.ts` — единственный файл, который импортирует и Application, и Infrastructure (composition root)

## Правила фронтенда (`apps/web`)

### ФСД: слои и правила импортов

Слои сверху вниз: `pages` → `widgets` → `features` → `entities` → `shared`.
Импорт только сверху вниз. Виджеты не импортируют виджеты.
Всегда через `index.ts`, deep imports запрещены.

**Структура слайса (widgets / features / entities):**

```
{layer}/{sliceName}/
├── {SliceName}.vue          главный компонент (всегда)
├── components/              (опционально, если подкомпонентов 2+)
├── use{SliceName}.ts        (опционально)
├── {sliceName}Api.ts        (опционально)
├── store.ts                 (опционально)
├── types.ts                 (опционально, если тип в 2+ файлах)
├── {sliceName}.test.ts      unit-тесты рядом с кодом
└── index.ts                 ОБЯЗАТЕЛЕН
```

**shared:**
```
shared/
├── ui/        примитивы (AppButton, AppLogo, etc)
├── lib/       утилиты
└── index.ts
```

### Типы в файлах

- Тип используется в **одном файле** → пишем его в самом файле
- Тип используется в **двух и более файлах** → в `types.ts`
- Экспортируем через `index.ts` для публичного API

### CSS — BEM в `<style scoped>`

Стили пишутся в `<style scoped lang="scss">` блоке компонента, используется BEM-нотация.
Отдельные `.scss` файлы только если стили переиспользуются в нескольких компонентах.

**Запрещено:** `cursor: pointer` — никогда не использовать (сброшен глобально в `global.scss`).
**Цвета с прозрачностью:** всегда `rgb(r g b / alpha)`, никогда `rgba(r, g, b, alpha)`.
**Статичные цвета:** hex. **Прозрачные:** через CSS-каналы `rgb(var(--x) / alpha)`.
**Z-index:** каскадом через `calc(var(--предыдущий) + 1)`, все значения в `variables.scss`.
**Адаптация:** только через миксины `@include tablet { ... }` и `@include desktop { ... }` из `@/assets/styles/breakpoints.module`. Запрещены хардкод-значения типа `@media (width >= 768px)`. В начале `<style scoped lang="scss">` подключать через `@use '@/assets/styles/breakpoints.module' as *;`.

## Стиль кода

- **Простота** — пиши минимальный код, который решает задачу; простой и читаемый код лучше умного и сложного
- **Вложенность** — используй early return вместо вложенных `if`; максимум 2–3 уровня
- **Единообразие** — для схожих задач используй одинаковые подходы (если в проекте уже есть паттерн — следуй ему)
- **Одна ответственность** — функция делает одно; если в названии есть "и" — это два метода
- **Async/await** — не `.then()` цепочки
- **Нет магических чисел** — только именованные константы (`REFRESH_TOKEN_TTL_MS`, не `604800000`)
- **TypeScript** — запрет `any`; на системных границах (HTTP, внешние API) использовать `unknown` с последующей валидацией через Zod
- **Комментарии** — не добавлять и не предлагать; пользователь сам решает когда и что комментировать; существующие не удалять

## Локальные проверки

Кириллица в пути (`D:\Наташа\NatsDoll`) ломает Glob-инструмент и заставляет `tsc` падать с OOM при дефолтных параметрах. Запускать через root-tsc/vitest с увеличенным heap:

```bash
# typecheck api (большая кодовая база — 8GB)
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
# typecheck web
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
# tests
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Для поиска файлов в пути с кириллицей использовать `find` через Bash, не Glob.

## Security invariants

Не менять без понимания последствий — это не стиль, а защита от конкретных атак:

- **`refresh_token` cookie — `sameSite='Strict'`** (CSRF). **`oauth_state` cookie — `sameSite='Lax'`** (Strict ломает Google-callback redirect).
- **Verify-email — POST с JSON-body**, не GET с query-string (токен иначе попадает в `access.log` nginx и History браузера).
- **Refresh-rotation strict без grace-period**: два параллельных refresh с одного cookie → reuse-detection → удаление всех сессий пользователя. By design.
- **Password — `min(8)` + блок-лист топ-100** (`apps/api/src/shared/lib/passwordBlocklist.ts`). Сообщение об отказе: `This password is too common, please choose a stronger one`.
- **Rate limiter — in-memory `Map`**. Production-compose ограничен одной репликой `api`. **Не запускать `--scale api>1`** — лимиты обойдут.
- **`HMAC_SECRET` отдельно от `JWT_SECRET`** (см. `.env.example`). Fallback на JWT_SECRET сохранён, но в продакшене — два разных секрета.

## Git

**Никогда не делать `git commit` и `git push` без явной просьбы пользователя.**

## Auto Memory

Заметки накапливаются в: `C:\Users\user\.claude\projects\D---------NatsDoll\memory\`

При исправлениях или новых предпочтениях — сохранять в memory автоматически.

## Скриншоты

Скриншоты пользователя хранятся в: `D:\Наташа\screenshot\`

## CRITICAL RULES — ОБЯЗАТЕЛЬНО

- NEVER удалять или переписывать рабочие тесты без явного запроса
- NEVER удалять файлы без подтверждения
- NEVER делать несколько несвязанных изменений за раз
- Если не уверен — СПРОСИ, не угадывай
- git checkpoint (коммит) перед любым изменением, которое затрагивает 3+ файла или меняет публичный API

## Working Style

- Сначала ПЛАН, потом код — для задач, затрагивающих 2+ файла или архитектурный слой
- Маленькие дифы: изменил файл → убедился что работает → следующий файл
- Исследование кодовой базы (Glob, Grep, Read) — делай сам для простых поисков; делегируй `planner`-агенту для анализа архитектуры и планирования

## Перед началом работы

- **Явные предположения** — если задача неоднозначна, сформулируй предположения вслух и спроси до начала работы, не угадывай
- **Критерий успеха** — определи конкретную проверку до написания кода ("работает" = что именно?)
- **Хирургические изменения** — при редактировании трогай только необходимое; не рефакторь соседний код, который не сломан; не удаляй импорты/функции, которые не ты сделал лишними

## Agents

- `planner` — перед любой задачей, затрагивающей 2+ файла, новую фичу или архитектурное решение
- `tester` — после изменений кода; агент сам определяет нужный scope тестов
- `code-reviewer` — перед каждым коммитом; critical/high findings блокируют коммит
