# Спек 4: Auth на клиенте

Дата: 2026-06-11. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спеки 1–3 выполнены).

## Цель

Авторизация работает в Nuxt-приложении как в старом SPA: логин/регистрация через
модалку, silent refresh при загрузке, refresh-on-401 интерцептор, логаут,
Google OAuth callback, верификация email, сброс пароля. Старые `src/router` и
`src/App.vue` удаляются. Auth остаётся полностью клиентским — security-инварианты
(SameSite=Strict refresh cookie, verify-email через POST, strict refresh-rotation)
не затрагиваются.

## Контекст

После спека 1 удалён `src/main.ts`, который подключал `setupAuthInterceptor`
с колбэками authStore — сейчас на ветке интерцептор не подключён вовсе
(`authFetch` работает без refresh-on-401), а `initAuth()` никто не вызывает.
Спек 4 восстанавливает эту связку Nuxt-средствами.

## 1. Client-плагин

`apps/web/app/plugins/auth.client.ts`:

```ts
import { defineNuxtPlugin } from 'nuxt/app'
import { setupAuthInterceptor } from '@/shared'
import { useAuthStore } from '@/entities/user'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  setupAuthInterceptor({
    getAccessToken: () => authStore.accessToken,
    setAccessToken: (token) => authStore.setAccessToken(token),
    clearAuth: () => authStore.clearState(),
  })
  void authStore.initAuth()
})
```

- Суффикс `.client` — при SSR плагин не выполняется; шапка рендерится анонимно
  и догидрачивается после ответа `/auth/refresh` (как в старом SPA: сначала
  «Login», после initAuth — «My account»).
- `initAuth()` без `await` — загрузка страницы не блокируется авторизацией.

## 2. Named middleware

`apps/web/app/middleware/auth.ts`:

```ts
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '@/entities/user'
import { useAuthModal } from '@/shared'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()

  if (!authStore.isLoggedIn) {
    const { open } = useAuthModal()
    open()
    return navigateTo('/')
  }

  if (to.path.startsWith('/account') && authStore.user?.role === 'ADMIN') {
    return navigateTo('/admin')
  }
})
```

`apps/web/app/middleware/admin.ts`:

```ts
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '@/entities/user'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()

  if (!authStore.isLoggedIn || authStore.user?.role !== 'ADMIN') {
    return navigateTo('/')
  }
})
```

Логика — копия старого `router.beforeEach` (разделена по типу защиты).
В спеке 4 middleware ни к одной странице не подключены: страницы `/account`,
`/cart`, `/admin` появятся в спеках 5–6 и подключат их через
`definePageMeta({ middleware: 'auth' | 'admin' })`. Guard `import.meta.server` —
страховка для прямого захода до того, как страница объявлена `ssr: false`.

## 3. Auth-страницы

Тонкие обёртки с legacy-именами маршрутов (паттерн спека 2):

| Nuxt-файл | Имя маршрута | Контент |
|-----------|--------------|---------|
| `app/pages/auth/callback.vue` | `auth-callback` | `src/pages/AuthCallbackPage.vue` |
| `app/pages/verify-email.vue` | `verify-email` | `src/pages/VerifyEmailPage.vue` |
| `app/pages/reset-password.vue` | `reset-password` | `src/pages/ResetPasswordPage.vue` |

В `nuxt.config.ts` добавляется:

```ts
  routeRules: {
    '/auth/**': { ssr: false },
    '/verify-email': { ssr: false },
    '/reset-password': { ssr: false },
  },
```

Сами `src/pages/*.vue` не меняются — их логика целиком в `onMounted`
(query-токены, `window.location`, `sessionStorage`). SEO-мет у этих страниц нет
намеренно: они закрыты в robots.txt (спек 3) и не предназначены для индексации.

## 4. Удаление старого роутера и App.vue

Удаляются (подтверждено этим спеком):

- `apps/web/src/router/index.ts` — маршруты генерирует Nuxt; декларация
  `RouteMeta` (requiresAuth/requiresAdmin) не нужна — named middleware
  обходятся без меты.
- `apps/web/src/router/router.test.ts` — тестировал резолв маршрутов старого
  роутера (3 сценария); маршруты Nuxt проверяются SSR-смоуками спеков 2–3.
- `apps/web/src/App.vue` — разметка переехала в `app/layouts/default.vue`
  (спек 2), `initAuth` — в плагин (этот спек).

Кастомный `scrollBehavior` старого роутера переезжает в
`apps/web/app/router.options.ts`:

```ts
import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
} satisfies RouterConfig
```

## Обработка ошибок

Без изменений относительно SPA: ошибки login/register показывает auth-модалка;
fail в `initAuth` — тихий (пользователь анонимен); невалидный токен на
verify-email/reset-password — сообщение «link is invalid» на странице;
`?error=` в OAuth callback — «Authentication failed».

## Тестирование

- Юнит-тесты web: существующие проходят; минус 3 удалённых теста роутера
  (итого ожидание: 33 файла, 228 тестов).
- Живые сценарии — Playwright-браузер (решение пользователя), админ-аккаунт
  из dev-сида (`ADMIN_EMAIL`/`ADMIN_PASSWORD` из `apps/api/.env`):
  1. Логин через модалку → в шапке «My account».
  2. Перезагрузка страницы → сессия восстановлена (refresh + /auth/me).
  3. Логаут → в шапке «Login», `/account`-меню исчезло.
  4. `/verify-email` без токена → «The link is invalid or has expired».
  5. `/auth/callback?error=x` → «Authentication failed».
- `curl /verify-email` → HTTP 200, в HTML нет текста «Verifying your email»
  (подтверждение `ssr: false` — отдана SPA-оболочка).
- Typecheck (web + api), lint изменённых файлов, build.

## Критерии приёмки

1. Логин, восстановление сессии после перезагрузки, логаут работают в браузере
   как в старом SPA (включая refresh-on-401 интерцептор).
2. `/auth/callback`, `/verify-email`, `/reset-password` доступны и client-only
   (`ssr: false` подтверждён curl'ом).
3. `src/router/` и `src/App.vue` удалены; `grep` по `src` и `app` не находит
   импортов удалённых модулей.
4. Кастомный scrollBehavior работает (top при переходе, savedPosition при back).
5. Юнит-тесты, typecheck, lint, build — зелёные.

## Вне scope

Страницы `/account/**`, `/cart`, `/orders/:id` и подключение `auth`-middleware
(спек 5), `/admin/**` и `admin`-middleware (спек 6), редирект `/checkout` →
`/cart` (спек 5), SEO-меты auth-страниц (не индексируются), интеграция
`<ClientOnly>` для бейджа корзины (спек 5, если всплывёт hydration mismatch).
