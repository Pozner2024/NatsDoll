# Спек 5: Кабинет + корзина (client-only)

Дата: 2026-06-11. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спеки 1–4 выполнены).

## Цель

Все страницы `/account/**`, `/cart` и `/orders/:id` работают в Nuxt client-only,
защищены `auth`-middleware (спек 4); `/checkout` редиректит на `/cart`.
Поведение идентично старому SPA.

## Структура страниц

Вложенные Nuxt-страницы зеркалят старый роутер. Все — тонкие обёртки над
существующими экспортами `@/widgets/account-page` (виджет не перестраивается):

| Nuxt-файл | Имя маршрута | Контент |
|-----------|--------------|---------|
| `app/pages/account.vue` | — (родитель) | виджет `AccountPage`, в слот — `<NuxtPage :transition="false" />` |
| `app/pages/account/index.vue` | `account` | `AccountDashboard` |
| `app/pages/account/profile.vue` | `account-profile` | `AccountProfile` |
| `app/pages/account/purchases.vue` | `account-purchases` | `AccountPurchases` |
| `app/pages/account/purchases/[id].vue` | `account-purchase-detail` | `AccountPurchaseDetail` |
| `app/pages/account/favorites.vue` | `account-favorites` | `AccountFavorites` |
| `app/pages/account/addresses.vue` | `account-addresses` | `AccountAddresses` |
| `app/pages/account/reviews.vue` | `account-reviews` | `AccountReviews` |
| `app/pages/account/messages.vue` | `account-messages` | `AccountMessages` |
| `app/pages/cart.vue` | `cart` | `src/pages/CartPage.vue` |
| `app/pages/orders/[id].vue` | `order-confirmation` | `src/pages/OrderConfirmationPage.vue` |

Legacy-имена обязательны: на них резолвятся `AuthModal` (`account`),
`CartPromptModal` (`cart`), `CartPageWidget` (`order-confirmation`),
`OrderConfirmation` (`account-purchases`).

`<NuxtPage :transition="false" />` во вложенной странице — переходы между
разделами кабинета остаются без page-анимации (в старом SPA key `'/account'`
давал тот же эффект).

## Изменения в src (минимальные)

1. **`widgets/account-page/AccountPage.vue`**: `<RouterView />` → `<slot />`
   (+ убрать `RouterView` из импорта vue-router). Виджет остаётся
   framework-agnostic, ребёнка ему передаёт Nuxt-страница.
2. **`widgets/account-page/index.ts`**: добавить экспорт
   `AccountPurchaseDetail` (старый роутер тянул его deep-import'ом в обход
   index — приводим к ФСД-правилу проекта).

Больше ничего в `src` не меняется. `CartLink`-бейдж уже hydration-safe:
корзина загружается только после `initAuth` (после mount), при гидратации
сервер и клиент одинаково рендерят без бейджа.

## Защита и routeRules

- `definePageMeta({ middleware: 'auth' })` — на родителе `account.vue`,
  на `cart.vue` и на `orders/[id].vue`. Vue-router мержит `meta` по
  matched-записям, поэтому middleware родителя действует и на детей кабинета;
  проверяется живым сценарием (аноним на `/account/profile` → модалка +
  редирект на главную). Если меты на детей не распространятся — добавить
  `middleware: 'auth'` в каждый дочерний `definePageMeta` (fallback).
- В `nuxt.config.ts` к существующим `routeRules` добавляется:

```ts
    '/account/**': { ssr: false },
    '/cart': { ssr: false },
    '/orders/**': { ssr: false },
    '/checkout': { redirect: '/cart' },
```

Auth-инварианты не затрагиваются: JWT остаётся в памяти клиента, SSR этих
страниц нет.

## Обработка ошибок

Без изменений против SPA: ошибки загрузки данных показывают error-состояния
виджетов; аноним получает auth-модалку и главную (middleware `auth` из
спека 4); несуществующий заказ — error-состояние `OrderConfirmation`.

## Тестирование

- Юнит-тесты web: существующие проходят без изменений (виджеты не меняются,
  кроме `<RouterView />` → `<slot />`; если тест AccountPage проверяет
  RouterView — адаптировать на слот с сохранением смысла).
- Живые сценарии (Playwright, админ + при необходимости обычный юзер):
  1. Аноним открывает `/account` → auth-модалка + редирект на главную.
  2. Аноним открывает `/account/profile` → то же (проверка наследования
     middleware детьми).
  3. Логин → клик «My account»: админа ведёт в `/admin` (пока 404-страница —
     проверяется сам редирект middleware), обычного пользователя — в кабинет
     с сайдбаром и разделами. Если обычного тестового юзера нет — создать
     через регистрацию нельзя (email-верификация); проверить разделы
     кабинета под админом нельзя (его редиректит) — тогда проверка разделов
     выполняется временным понижением роли админа в БД
     (`UPDATE "User" SET role='CUSTOMER'` + обратно) либо передаётся
     пользователю. Решение принять при реализации, в отчёте указать как
     проверялось.
  4. Переходы между разделами кабинета — контент меняется, сайдбар на месте,
     без page-анимации.
  5. `/cart` под логином — корзина открывается; добавить товар со страницы
     товара → бейдж в шапке обновился.
  6. `/checkout` → URL стал `/cart`.
- `curl /cart` (и `/account`) → HTTP 200 без серверного контента виджетов
  (SPA-оболочка, `ssr: false`).
- Typecheck, lint изменённых файлов, build.

## Критерии приёмки

1. Все разделы кабинета, корзина и страница заказа работают в браузере как
   в SPA.
2. Аноним на любой защищённой странице получает auth-модалку и редирект
   на главную; админ с `/account` уходит на `/admin`.
3. `/checkout` редиректит на `/cart`.
4. `curl` защищённых страниц подтверждает `ssr: false`.
5. Юнит-тесты, typecheck, lint, build — зелёные.

## Вне scope

`/admin/**` и `admin`-middleware (спек 6), деплой (спек 7), SEO-меты приватных
страниц (закрыты robots.txt), оплата PayPal end-to-end (не менялась, серверная
часть не затрагивается; UI-поток корзины проверяется без реальной оплаты).
