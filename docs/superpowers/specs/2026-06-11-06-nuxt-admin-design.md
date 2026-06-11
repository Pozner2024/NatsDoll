# Спек 6: Админка (client-only)

Дата: 2026-06-11. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спеки 1–5 выполнены).

## Цель

Все страницы `/admin/**` работают в Nuxt client-only под защитой
`admin`-middleware (спек 4), включая формы товара/распродажи и загрузчик
изображений. Поведение идентично старому SPA.

## Структура страниц

Подход — вложенные Nuxt-страницы, зеркало старого роутера (как в спеке 5).
Каталоги `listings/` и `sales/` с `index.vue` дают плоские sibling-маршруты:

| Nuxt-файл | Путь | Контент |
|-----------|------|---------|
| `app/pages/admin.vue` | — (родитель) | виджет `AdminPanel`, в слот — `<NuxtPage :transition="false" />` |
| `app/pages/admin/index.vue` | `/admin` | `AdminDashboard` |
| `app/pages/admin/listings/index.vue` | `/admin/listings` | `AdminListings` |
| `app/pages/admin/listings/new.vue` | `/admin/listings/new` | `src/pages/AdminProductFormPage.vue` |
| `app/pages/admin/listings/[id]/edit.vue` | `/admin/listings/:id/edit` | `src/pages/AdminProductFormPage.vue` |
| `app/pages/admin/orders.vue` | `/admin/orders` | `AdminOrders` |
| `app/pages/admin/messages.vue` | `/admin/messages` | `AdminMessages` |
| `app/pages/admin/analytics.vue` | `/admin/analytics` | `AdminAnalytics` |
| `app/pages/admin/sales/index.vue` | `/admin/sales` | `AdminSales` |
| `app/pages/admin/sales/new.vue` | `/admin/sales/new` | `src/pages/AdminSaleFormPage.vue` |
| `app/pages/admin/sales/[id].vue` | `/admin/sales/:id` | `src/pages/AdminSaleFormPage.vue` |

Имена маршрутов (`admin-listings` и т.п.) НЕ переносятся: вся админ-навигация
ходит по путям, по именам ничего не резолвится (проверено grep'ом).

## Изменения в src (минимальные)

1. **`widgets/admin-panel/AdminPanel.vue`**: `<RouterView />` → `<slot />`
   (+ убрать `RouterView` из импорта vue-router).
2. **`widgets/admin-panel/index.ts`**: добавить экспорты `AdminDashboard`,
   `AdminListings`, `AdminOrders`, `AdminMessages`, `AdminAnalytics`,
   `AdminSales` (старый роутер тянул их deep-import'ами — приводим к
   ФСД-правилу, как в спеке 5).

`AdminImageUploader` не меняется — чисто клиентский код, страницы `ssr: false`.

## Защита и routeRules

- `definePageMeta({ middleware: 'admin' })` — только на родителе `admin.vue`
  (наследование детьми через merge меты vue-router проверено в спеке 5).
  Middleware `admin` (спек 4): не залогинен или роль не `ADMIN` → молча `/`.
- В `nuxt.config.ts` к `routeRules` добавляется `'/admin/**': { ssr: false }`.

## Обработка ошибок

Без изменений против SPA: ошибки данных — error-состояния виджетов; не-админ —
тихий редирект на главную.

## Тестирование

- Юнит-тесты web: существующие проходят (включая `AdminImageUploader.test.ts` —
  компонент не меняется).
- Живые сценарии (Playwright, desktop viewport):
  1. Аноним на `/admin` → молча на главную (без auth-модалки).
  2. Логин админом → `/admin`: dashboard, топбар с заголовком, табы.
  3. Табы Listings / Orders / Messages / Analytics: контент меняется,
     каркас (табы, топбар) не перемонтируется.
  4. `/admin/sales` открывается; `/admin/listings/new` — форма товара
     с `AdminImageUploader` в DOM. **Реальный аплоад в S3 не выполняется**
     (общий bucket, не мусорим) и товар не сохраняется.
  5. `/admin/listings/<id>/edit` — форма открывается с данными товара
     (id взять из списка listings).
- `curl /admin` → HTTP 200 без серверного контента виджета (`ssr: false`).
- Typecheck, lint изменённых файлов, build.

## Критерии приёмки

1. Все разделы админки работают в браузере как в SPA (dashboard, listings,
   orders, messages, analytics, sales, формы товара и распродажи).
2. Не-админ (аноним/customer) на `/admin/**` молча уходит на главную.
3. `curl /admin` подтверждает `ssr: false`.
4. Юнит-тесты, typecheck, lint, build — зелёные.

## Вне scope

Деплой (спек 7); реальная загрузка изображения в Object Storage и создание
товара (механика не менялась, проверяется рендер формы); предсуществующая
мёртвая ссылка `/admin/orders/<id>` в `AdminDashboard` (не было такого маршрута
и в старом роутере — поведение сохраняется, починка отдельной задачей);
SEO-меты админки (закрыта robots.txt).
