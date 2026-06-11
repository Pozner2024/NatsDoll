# Nuxt-каркас (спек 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить `apps/web` из Vite SPA в Nuxt 4-приложение с работающим SSR, сохранив ФСД-слои в `src/`, стили и все 33 файла unit-тестов.

**Architecture:** Тонкий Nuxt-слой `app/` (app.vue, layouts, pages-заглушка) поверх нетронутого `src/` с ФСД. Алиас `@` → `./src` сохраняет все импорты. Vitest получает собственный конфиг, отвязанный от Vite-конфига приложения. Спек: `docs/superpowers/specs/2026-06-10-01-nuxt-skeleton-design.md`.

**Tech Stack:** Nuxt 4, @pinia/nuxt + pinia 3, sass (modern-compiler), Vitest 2 + @vitejs/plugin-vue (остаётся только для тестов).

**Контекст для исполнителя без знания проекта:**
- Монорепо npm workspaces; фронтенд в `apps/web`, API (Hono) — в `apps/api`, локально API слушает `:3000`.
- Команды запускать из корня репо, если не сказано иное. Shell — PowerShell (Windows), но Bash доступен; команды ниже даны для Bash.
- Правило проекта: НЕ добавлять комментарии в код. НЕ трогать файлы, не перечисленные в задаче.
- Старые `src/App.vue`, `src/router/`, `src/pages/*.vue` становятся временно неиспользуемыми — это by design, их удаляют спеки 2 и 4. НЕ удалять.
- `apps/web/public/site.webmanifest` отсутствует, хотя `index.html` на него ссылается — это существующее поведение, воспроизводим как есть (ссылку переносим, файл не создаём).

---

### Task 1: Ветка

**Files:** нет изменений файлов.

- [x] **Step 1: Создать ветку от текущего HEAD**

```bash
git checkout -b feat/nuxt-skeleton
```

- [x] **Step 2: Проверить чистоту рабочего дерева**

Run: `git status --short`
Expected: пустой вывод.

### Task 2: Зависимости и скрипты

**Files:**
- Modify: `apps/web/package.json`

- [x] **Step 1: Заменить содержимое `apps/web/package.json`**

```json
{
  "name": "@natsdoll/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src app --max-warnings=0"
  },
  "dependencies": {
    "@pinia/nuxt": "^0.11.0",
    "@tiptap/starter-kit": "^3.24.0",
    "@tiptap/vue-3": "^3.24.0",
    "chart.js": "^4.5.1",
    "dompurify": "^3.4.7",
    "nuxt": "^4.1.0",
    "pinia": "^3.0.0",
    "vue-chartjs": "^5.3.3",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.1",
    "@types/dompurify": "^3.0.5",
    "@types/node": "^20.10.6",
    "@vitejs/plugin-vue": "^5.0.0",
    "@vue/test-utils": "^2.4.3",
    "jsdom": "^29.0.1",
    "sass": "^1.69.5",
    "typescript": "^5.3.3",
    "vitest": "^2.0.0",
    "vue-tsc": "^3.2.6"
  }
}
```

Что изменилось относительно старого файла: scripts `dev`/`build`/`preview` → nuxt, добавлен `postinstall: nuxt prepare`, lint покрывает `src` и `app`; добавлены `nuxt`, `@pinia/nuxt`; `pinia` поднята `^2.1.7` → `^3.0.0` (требование @pinia/nuxt ≥0.10; vue 3.5 уже в дереве); удалены прямые зависимости `vue`, `vue-router`, `vite` — их предоставляет Nuxt (vitest несёт собственный vite). `@vitejs/plugin-vue` оставлен — нужен vitest для компиляции `.vue` в тестах.

- [x] **Step 2: Установить зависимости**

Run: `npm install`
Expected: завершение без ошибок. Предупреждение `postinstall: nuxt prepare` может упасть, пока нет `nuxt.config.ts`, — если `npm install` из-за этого вернул ошибку, игнорировать до Task 3, Step 3.

- [x] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "feat(web): nuxt 4 dependencies and scripts"
```

### Task 3: nuxt.config.ts и .gitignore

**Files:**
- Create: `apps/web/nuxt.config.ts`
- Modify: `.gitignore`

- [x] **Step 1: Создать `apps/web/nuxt.config.ts`**

```ts
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-10',
  modules: ['@pinia/nuxt'],
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  css: ['@/assets/styles/global.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
  devServer: {
    port: 5173,
    host: '0.0.0.0',
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_DEV_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['vitest/globals'],
      },
      include: ['../src/**/*', '../vitest-env.d.ts'],
    },
  },
  app: {
    head: {
      title: 'NatsDoll',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/favicon-180.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Corinthia:wght@400;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap' },
      ],
      script: [
        {
          src: 'https://stats.natsdoll.com/script.js',
          defer: true,
          'data-website-id': '26676592-6929-4621-a645-1d1590e31b78',
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
})
```

Пояснения для исполнителя:
- `devProxy` с ключом `/api` отбрасывает префикс при проксировании (`/api/products` → `http://localhost:3000/products`) — это воспроизводит rewrite из старого `vite.config.ts`.
- `typescript.tsConfig` мёржится в генерируемый `.nuxt/tsconfig.app.json`; `include` указан относительно каталога `.nuxt/` — поэтому `../src/**/*`. Без него typecheck не увидит ФСД-код.
- `devServer.host: '0.0.0.0'` нужен для dev-режима в Docker (порт 5173 проброшен в `docker-compose.yml`).

- [x] **Step 2: Добавить в корневой `.gitignore` артефакты Nuxt**

В секцию `# Production` после строки `/build` добавить:

```
.nuxt/
.output/
```

- [x] **Step 3: Проверить, что Nuxt видит конфиг**

Run: `npx -w apps/web nuxt prepare`
Expected: завершение без ошибок, появился каталог `apps/web/.nuxt` с `tsconfig.app.json` внутри.

- [x] **Step 4: Commit**

```bash
git add apps/web/nuxt.config.ts .gitignore
git commit -m "feat(web): nuxt config with FSD alias and dev proxy"
```

### Task 4: Слой app/ — корень, layout, страница-заглушка

**Files:**
- Create: `apps/web/app/app.vue`
- Create: `apps/web/app/layouts/default.vue`
- Create: `apps/web/app/pages/index.vue`

- [x] **Step 1: Создать `apps/web/app/app.vue`**

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [x] **Step 2: Создать `apps/web/app/layouts/default.vue`**

```vue
<template>
  <slot />
</template>
```

- [x] **Step 3: Создать `apps/web/app/pages/index.vue`**

Заглушка проверяет три вещи разом: SSR-рендер, CSS-переменные из global.scss и SCSS-миксины breakpoints (критерий приёмки 5). Будет заменена реальной главной в спеке 2.

```vue
<template>
  <section class="home-stub">
    <h1 class="home-stub__title">NatsDoll</h1>
    <p class="home-stub__note">Nuxt skeleton — SSR works</p>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.home-stub {
  padding: 2rem 1rem;

  &__title {
    color: var(--color-accent);
    font-family: var(--font-brand);
    font-size: var(--fs-logo);
  }

  &__note {
    color: var(--color-text-muted);
    font-size: var(--fs-sm);

    @include tablet {
      font-size: var(--fs-base);
    }
  }
}
</style>
```

- [x] **Step 4: Commit**

```bash
git add apps/web/app
git commit -m "feat(web): nuxt app layer with stub home page"
```

### Task 5: CSS-переменные в global.scss, удаление index.html

**Files:**
- Modify: `apps/web/src/assets/styles/global.scss`
- Delete: `apps/web/index.html`

- [x] **Step 1: Добавить блок `:root` в начало `global.scss`**

В самое начало файла `apps/web/src/assets/styles/global.scss` (перед `*,`) вставить блок `:root { ... }`, скопированный ИЗ `apps/web/index.html` (строки 16–59 внутри тега `<style>`) дословно, включая комментарий про button gradient channels:

```scss
:root {
  --color-bg: #fdf6ef;
  --color-text: #2c1810;
  --color-accent: #8b5e52;
  --color-accent-hover: #4a2e26;
  --color-text-muted: #5a3d35;
  --color-border: #ecddd5;

  /* Button gradient channels (r g b — for use with rgb(var(--x) / alpha)) */
  --btn-gradient-dark: 160 90 60;
  --btn-gradient-mid: 232 180 140;
  --btn-gradient-light: 255 245 225;

  --color-white: #ffffff;
  --color-error: #c0392b;
  --color-gold: #d4a017;

  --font-display: 'Playfair Display', serif;
  --font-brand: 'Corinthia', cursive;
  --fs-xs: 0.65rem;
  --fs-sm: 0.8rem;
  --fs-md: 0.9rem;
  --fs-base: 1rem;
  --fs-stars: 1.2rem;
  --fs-logo: 2rem;
  --fs-section-heading: 2.2rem;

  --header-height: 45px;

  --z-slider-slide: 0;
  --z-slider-overlay: calc(var(--z-slider-slide) + 1);
  --z-slider-controls: calc(var(--z-slider-overlay) + 1);
  --z-gallery-img-base: 0;
  --z-gallery-img-top: calc(var(--z-gallery-img-base) + 1);
  --z-gallery-grid-button: calc(var(--z-gallery-img-top) + 1);
  --z-card-overlay: 2;
  --z-card-menu: 10;
  --z-header: 10;
  --z-dropdown: calc(var(--z-header) + 1);
  --z-admin-mobile-nav: 100;
  --z-admin-overlay: 200;
  --z-modal: calc(var(--z-admin-overlay) + 1);
  --z-lightbox: calc(var(--z-modal) + 1);
}
```

- [x] **Step 2: Удалить `apps/web/index.html`**

Всё его содержимое уже перенесено: head → `nuxt.config.ts` (Task 3), CSS-переменные → `global.scss` (Step 1). Точка входа `<div id="app">` Nuxt'у не нужна.

```bash
git rm apps/web/index.html
```

- [x] **Step 3: Commit**

```bash
git add apps/web/src/assets/styles/global.scss
git commit -m "feat(web): move root css variables to global.scss, drop index.html"
```

### Task 6: vitest.config.ts, перестройка tsconfig, удаление main.ts и vite.config.ts

**Files:**
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/tsconfig.json` (полная замена)
- Delete: `apps/web/vite.config.ts`, `apps/web/src/main.ts`, `apps/web/tsconfig.app.json`, `apps/web/tsconfig.vitest.json`

- [x] **Step 1: Создать `apps/web/vitest.config.ts`**

Переносит vitest-секцию и алиас из старого `vite.config.ts` один в один; dev-server-секция не нужна (ею теперь владеет Nuxt):

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },
})
```

- [x] **Step 2: Заменить содержимое `apps/web/tsconfig.json`**

Nuxt генерирует project references в `.nuxt/`; ручные `tsconfig.app.json` / `tsconfig.vitest.json` больше не нужны (покрытие `src/**` и типы vitest обеспечивает `typescript.tsConfig` из `nuxt.config.ts`):

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

- [x] **Step 3: Удалить устаревшие файлы**

`src/main.ts` заменён Nuxt-bootstrap'ом: Pinia подключает модуль `@pinia/nuxt`, `setupAuthInterceptor` по спеку переезжает в client-плагин в спеке 4 (до тех пор auth в Nuxt-приложении не используется).

```bash
git rm apps/web/vite.config.ts apps/web/src/main.ts apps/web/tsconfig.app.json apps/web/tsconfig.vitest.json
```

- [x] **Step 4: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/tsconfig.json
git commit -m "feat(web): standalone vitest config, nuxt project references tsconfig"
```

### Task 7: Smoke-проверка SSR

**Files:** нет изменений файлов.

- [x] **Step 1: Запустить dev-сервер в фоне**

Run (background): `npm run dev -w apps/web`
Expected: в логе строка с `http://localhost:5173`. Локальный API запускать не нужно — заглушка данных не запрашивает.

- [x] **Step 2: Проверить, что разметка приходит с сервера (без выполнения JS)**

Run: `curl -s http://localhost:5173/ | grep -c "Nuxt skeleton — SSR works"`
Expected: `1` (или больше). Если `0` — SSR не работает, разбираться, не идти дальше.

Дополнительная проверка head:

Run: `curl -s http://localhost:5173/ | grep -c "stats.natsdoll.com/script.js"`
Expected: `1`.

- [x] **Step 3: Остановить dev-сервер**

Остановить фоновый процесс из Step 1.

### Task 8: Unit-тесты

**Files:** нет изменений файлов (если тесты зелёные).

- [x] **Step 1: Запустить unit-тесты web**

Run (из корня репо): `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
Expected: все тестовые файлы (33 шт.) проходят, exit code 0.

Известная ловушка проекта: без `--root apps/web` не подхватится `@vitejs/plugin-vue` и `.vue`-тесты упадут с ложной ошибкой парсинга.

- [x] **Step 2: Если есть падения из-за pinia 3**

Ожидаемых падений нет (pinia 3 не меняет API `defineStore`/`setActivePinia`). Если тест падает с ошибкой импорта из `pinia` — зафиксировать вывод и остановиться для ревью, НЕ переписывать тесты (правило проекта: не трогать рабочие тесты).

### Task 9: Typecheck, lint, build

**Files:** нет изменений файлов (если проверки зелёные).

- [x] **Step 1: Typecheck**

Run: `cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck; cd ../..`
Expected: exit code 0. Перед запуском убедиться, что `apps/web/.nuxt` существует (иначе `npx -w apps/web nuxt prepare`).

Проверка полноты: команда должна type-проверять и `src/**` (например, временно добавить заведомую ошибку типов в любой файл `src/shared/` — typecheck обязан её увидеть; затем убрать). Если `src/**` не проверяется — `include` в `typescript.tsConfig` из Task 3 настроен неверно, исправить там.

- [x] **Step 2: Lint**

Run: `npm run lint -w apps/web`
Expected: exit code 0. Если eslint ругается на новые файлы `app/**` правилом `vue/multi-word-component-names` (имена `app.vue`/`index.vue`/`default.vue` диктует Nuxt), добавить в конец массива конфигураций корневого `eslint.config.js` отдельный блок — не отключать правило глобально:

```js
{
  files: ['apps/web/app/**/*.vue'],
  rules: { 'vue/multi-word-component-names': 'off' },
}
```

- [x] **Step 3: Production build**

Run: `npm run build -w apps/web`
Expected: exit code 0, создан каталог `apps/web/.output` с `server/index.mjs`.

- [x] **Step 4: Commit (если были правки eslint.config.js)**

```bash
git add eslint.config.js
git commit -m "chore: eslint override for nuxt app layer"
```

### Task 10: docker-compose и CLAUDE.md

**Files:**
- Modify: `docker-compose.yml:54`
- Modify: `CLAUDE.md` (секция «Локальные проверки»)

- [x] **Step 1: Переименовать переменную прокси в dev-compose**

В `docker-compose.yml` в сервисе `web` заменить:

```yaml
    environment:
      VITE_DEV_PROXY_TARGET: http://api:3000
```

на:

```yaml
    environment:
      NUXT_DEV_PROXY_TARGET: http://api:3000
```

- [x] **Step 2: Обновить команду typecheck web в CLAUDE.md**

В секции «Локальные проверки» заменить строки:

```bash
# typecheck web
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

на:

```bash
# typecheck web (Nuxt)
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck
```

- [x] **Step 3: Commit**

```bash
git add docker-compose.yml CLAUDE.md
git commit -m "chore: rename dev proxy env var for nuxt, update typecheck docs"
```

### Task 11: Финальная сверка с критериями приёмки спека

**Files:** нет изменений файлов.

- [x] **Step 1: Пройтись по критериям приёмки**

1. `npm run build -w apps/web` — без ошибок (Task 9, Step 3).
2. `curl http://localhost:5173/` содержит разметку заглушки (Task 7, Step 2).
3. Unit-тесты проходят без изменения их кода (Task 8).
4. Typecheck проходит с heap-настройками (Task 9, Step 1).
5. SCSS-миксин `tablet` работает в заглушке (Task 4 + сборка в Task 9).
6. Lint проходит (Task 9, Step 2).

- [x] **Step 2: Итоговый статус**

Run: `git log --oneline main..HEAD` и `git status --short`
Expected: серия коммитов задач 2–10, чистое дерево. Доложить пользователю результат по каждому критерию.

---

## Вне scope (не делать в этой ветке-задаче)

Контент страниц (спек 2), SEO (спек 3), auth-плагин и удаление `src/router` (спек 4), правки `playwright.config.ts` и e2e (спеки 2+), прод-Dockerfile/Caddy/CI (спек 7), кастомный `error.vue`, кэширование.
