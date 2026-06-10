# Спек 1: Nuxt-каркас

Дата: 2026-06-10. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`.

## Цель

Превратить `apps/web` из Vite SPA в Nuxt 4-приложение с работающим SSR,
сохранив ФСД-структуру, стили и существующие unit-тесты. Контент страниц
не переносится — только каркас, на котором будут строиться спеки 2–6.

## Текущее состояние (что мигрируем)

- `apps/web` — Vite 5 + `@vitejs/plugin-vue`, вход `src/main.ts`, ручной
  конфиг vue-router в `src/router/index.ts`.
- ФСД-слои в `src/`: `pages` → `widgets` → `features` → `entities` → `shared`,
  алиас `@` → `./src`, импорты только через `index.ts`.
- `index.html` содержит: CSS-переменные в `:root` (инлайн `<style>`),
  Google Fonts (Corinthia, Playfair Display), favicon'ы, webmanifest,
  Umami-скрипт (`stats.natsdoll.com`).
- Стили: `src/assets/styles/global.scss` (импортируется в `main.ts`),
  `breakpoints.module.scss` (миксины `tablet`/`desktop`).
- `main.ts`: createApp + Pinia + router + `setupAuthInterceptor`.
- Dev-прокси: `/api` → `localhost:3000` (rewrite убирает префикс `/api`).
- Vitest: jsdom, globals, `vitest.setup.ts`, запуск с `--root apps/web`.

## Архитектура

### Структура каталогов

Nuxt 4 со стандартным `app/`-каталогом для Nuxt-специфики; ФСД-слои остаются
в `src/` без изменений:

```
apps/web/
├── nuxt.config.ts
├── app/                  ← Nuxt-слой (тонкий)
│   ├── app.vue           ← корень: NuxtLayout + NuxtPage
│   ├── layouts/default.vue
│   └── pages/index.vue   ← минимальная главная (заглушка для проверки SSR)
└── src/                  ← ФСД-слои, не двигаются
    ├── pages/            ← старые SPA-страницы; реэкспортируются в app/pages в спеках 2–6
    ├── widgets/ features/ entities/ shared/
    └── assets/styles/
```

Правило импортов расширяется на один пункт: `app/pages/*` — тонкие обёртки,
импортируют контент из `src/` через `@`. Слой `app/` ничего не экспортирует в `src/`.

### Конфигурация (`nuxt.config.ts`)

- `alias: { '@': './src' }` — все существующие импорты работают без правок.
- `css: ['@/assets/styles/global.scss']`.
- `vite.css.preprocessorOptions.scss.api: 'modern-compiler'` — переносится как есть.
- `app.head`: title `NatsDoll`, `lang="en"`, favicon'ы, webmanifest, preconnect
  и стили Google Fonts, Umami-скрипт (`defer`).
- `devServer.port: 5173` (Nuxt-дефолт 3000 конфликтует с локальным API).
- `nitro.devProxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }`
  с учётом текущего rewrite (префикс `/api` убирается). Цель переопределяется
  переменной окружения как сейчас (`VITE_DEV_PROXY_TARGET` → новое имя в `runtimeConfig`).
- `routeRules` — пока пусто; client-only правила добавят спеки 4–6.

### Что переезжает и куда

| Откуда | Куда |
|--------|------|
| `index.html` `:root` CSS-переменные | блок `:root` в `global.scss` |
| `index.html` шрифты/favicon/umami | `nuxt.config.ts` → `app.head` |
| `src/main.ts` (Pinia) | модуль `@pinia/nuxt` |
| `src/main.ts` (`setupAuthInterceptor`) | НЕ переносится в этом спеке — спек 4 (плагин `.client`) |
| `src/router/index.ts` | НЕ удаляется в этом спеке — маршруты переезжают в `app/pages` в спеках 2–6, guards в спеке 4; файл удаляется в спеке 4 |
| `vite.config.ts` (vitest-секция) | отдельный `vitest.config.ts` (vitest больше не читает конфиг Vite-приложения) |
| `package.json` scripts | `dev`/`build`/`preview` → `nuxt dev`/`nuxt build`/`nuxt preview` |

### Зависимости

Добавляются: `nuxt`, `@pinia/nuxt`. Удаляются: `vite`, `@vitejs/plugin-vue`,
`vue-router` (как прямые зависимости — Nuxt тащит свои). Точные версии — на этапе плана.
`vue-tsc`/typecheck: команда из CLAUDE.md заменяется на `nuxt typecheck`
с тем же увеличенным heap; работоспособность на кириллическом пути — критерий приёмки.

## Обработка ошибок

- Ошибка SSR-рендера → стандартная Nuxt-страница ошибки; кастомный `error.vue` — вне scope.
- Недоступность API каркас не затрагивает (данных ещё нет — спек 2).

## Тестирование

- Существующие unit-тесты (`src/**/*.test.ts`) проходят через отдельный
  `vitest.config.ts` (jsdom + plugin-vue + алиас `@`), запуск как раньше
  с `--root apps/web`.
- Новый smoke-тест каркаса: `curl http://localhost:5173/` возвращает HTML
  с контентом заглушки главной (SSR работает без JS).
- `nuxt build` завершается без ошибок; `nuxt typecheck` проходит.
- Playwright e2e — вне scope (контента ещё нет), вернутся в спеках 2+.

## Критерии приёмки

1. `npm run build -w apps/web` собирает Nuxt-приложение без ошибок.
2. `npm run dev -w apps/web` поднимает сервер на 5173; ответ `curl /` содержит
   разметку заглушки (не пустой `<div id="app">`).
3. Существующие unit-тесты web проходят без изменений их кода.
4. Typecheck web проходит на кириллическом пути с настройками heap.
5. SCSS-миксины breakpoints работают в компоненте-заглушке.
6. Lint проходит.

## Вне scope

Перенос контента страниц (спек 2), SEO (спек 3), auth и удаление
`src/router` (спек 4), кабинет/корзина (спек 5), админка (спек 6),
Docker/Caddy/CI (спек 7), кастомная страница ошибки, кэширование.
