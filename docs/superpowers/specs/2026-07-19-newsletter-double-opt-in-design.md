# Newsletter Double-Opt-In — Design

## Проблема

Подписка на рассылку сейчас single opt-in: любой адрес, введённый в форму, сразу попадает в `NewsletterSubscriber`. Никто не проверяет, что адрес принадлежит тому, кто его ввёл. Риски: чужие/ошибочные адреса в базе, жалобы на спам при первой рассылке, удар по репутации домена natsdoll.com у почтовых провайдеров (в спам начнут падать и письма о заказах), отсутствие доказуемого согласия (GDPR).

Из ревью 2026-07-11: double-opt-in обязателен до первой реальной рассылки.

## Цель

После отправки формы подписки адрес считается неподтверждённым и не участвует в будущих рассылках, пока владелец не перейдёт по ссылке из письма и не нажмёт кнопку подтверждения.

## Решение по существующим подписчикам (утверждено пользователем)

Вариант А: все существующие строки считаются подтверждёнными — миграция проставляет им `confirmedAt = subscribedAt`. Люди вводили адреса сами, база маленькая, форма под rate-limit.

## Токен подтверждения

Stateless HMAC — тот же паттерн, что действующий unsubscribe:

```
confirmToken(email) = hashToken('newsletter-confirm:' + normalizeEmail(email))
```

Ничего не храним в БД, ссылка бессрочная. Это безопасно: токен позволяет ровно одно действие — подтвердить подписку этого же адреса. Проверка — `timingSafeEqual`, зеркально `unsubscribe.ts`.

## Хранение данных

```prisma
model NewsletterSubscriber {
  id           String    @id @default(cuid())
  email        String    @unique
  subscribedAt DateTime  @default(now())
  confirmedAt  DateTime?          // ← новое поле
}
```

Миграция: добавить колонку + `UPDATE "NewsletterSubscriber" SET "confirmedAt" = "subscribedAt"` (вариант А).

## Backend (`apps/api/src/features/newsletter`)

### `subscribe.ts` (изменение)

1. `upsertSubscriber` в репозитории начинает возвращать подписчика (создан или уже существовал).
2. Если `confirmedAt === null` — отправить письмо-подтверждение со ссылкой
   `${FRONTEND_URL}/newsletter/confirm?email=<urlencoded>&token=<confirmToken>`.
3. Если уже подтверждён — письмо не шлём.
4. Ответ в обоих случаях одинаковый `201 { message: 'Subscribed' }` — по ответу нельзя определить, есть ли адрес в базе (анти-enumeration).
5. Отправка письма — **fire-and-forget** (`try/catch` + `console.error`), как письмо-подтверждение заказа в `createOrder.ts`. Причины: в CI-джобе e2e и локальном dev нет `RESEND_API_KEY`, `await` ломал бы подписку с 500; сбой почты не должен ронять подписку.
6. Повторная отправка формы с тем же адресом = повторное письмо (способ «перевышли ссылку»). От бомбёжки защищает существующий лимитер 3/час на `/subscribe`.

### `confirm.ts` (новый, зеркало `unsubscribe.ts`)

- `confirmToken(email)` — экспортируется для использования в `subscribe.ts` и тестах.
- `makeConfirm(repo)`: проверить токен (`timingSafeEqual`, при несовпадении — `AppError(400, 'Invalid confirmation link')`), затем `repo.confirmByEmail(normalizeEmail(email))`.
- Идемпотентность: повторное подтверждение уже подтверждённого адреса — успех. Подтверждение адреса, которого нет в базе (отписался раньше, чем подтвердил) — тоже успех без создания записи (`updateMany` затронет 0 строк); отдельной ошибки не нужно.

### `newsletterRouter.ts` (изменение)

`POST /newsletter/confirm { email, token }` — схема как у `/unsubscribe` (`email().max(254)`, `token min(1).max(128)`), лимитер 10/час (общий с unsubscribe-паттерном), ответ `200 { message: 'Confirmed' }`.

### `newsletterRepository.ts` (изменение)

- Тип `NewsletterSubscriber` дополняется `confirmedAt: Date | null`.
- `upsertSubscriber(email): Promise<NewsletterSubscriber>` — upsert с возвратом строки.
- Новый `confirmByEmail(email): Promise<void>` — `updateMany({ where: { email }, data: { confirmedAt: new Date() } })`.

### `emailService.ts` (изменение)

Новый метод `sendNewsletterConfirmation(to, confirmUrl)`:

- from `noreply@natsdoll.com`, subject `Confirm your subscription — NatsDoll`;
- html в стиле `sendVerificationEmail`: короткий текст + ссылка «Confirm subscription» + строка «If you didn't subscribe, just ignore this email.»;
- `confirmUrl` — server-controlled (FRONTEND_URL + HMAC-токен), user-input в html не попадает.

### `app.ts` (composition root)

`makeSubscribe(newsletterRepo, emailService)` — по образцу `makeCreateOrder`, который уже получает `emailService`; URL строится внутри `subscribe.ts` из `process.env.FRONTEND_URL ?? 'https://natsdoll.com'` (как в остальных письмах). `makeConfirm(newsletterRepo)` подключается в `makeNewsletterRouter` третьим аргументом.

### Админ-API

`GET /admin/newsletter/subscribers` включает `confirmedAt` в ответ (тип уже расширен). Админ-UI для списка подписчиков не существует и в этой задаче не создаётся — вне скоупа.

## Frontend (`apps/web`)

### Страница подтверждения (новая)

- `apps/web/app/pages/newsletter/confirm.vue` → `src/pages/NewsletterConfirmPage.vue` — клон `NewsletterUnsubscribePage.vue`:
  - разбор `email`/`token` из query в `onMounted` (client-only, как unsubscribe);
  - состояния `init/ready/loading/done/invalid/error`;
  - кнопка «Confirm subscription» → `POST /newsletter/confirm`;
  - тексты: ready — `Confirm your subscription to the NatsDoll newsletter?`, done — `Your subscription is confirmed. Welcome!`, invalid/error — как на unsubscribe-странице.
- Кнопка вместо авто-подтверждения по заходу — намеренно: почтовые сканеры безопасности переходят по ссылкам из писем и «подтверждали» бы подписку сами.

### Форма подписки (изменение)

`NewsletterSubscribe.vue`: текст успеха меняется с `You're in!` на `Almost there — check your inbox to confirm your subscription.` Логика `useNewsletterSubscribe.ts` не меняется.

## Будущая рассылка (фиксация инварианта)

Когда появится функциональность отправки кампаний — выборка получателей строго `confirmedAt != null`. В этой задаче код рассылки не создаётся.

## Тесты

- `confirm.test.ts` (новый): валидный токен подтверждает; невалидный/чужой токен → 400; идемпотентность повторного подтверждения; несуществующий email с валидным токеном → успех без ошибки.
- `subscribe.test.ts` (правка): письмо отправляется для нового/неподтверждённого адреса; НЕ отправляется для подтверждённого; сбой отправки не ломает подписку (201).
- `newsletterRepository.test.ts` (правка): `upsertSubscriber` возвращает строку; `confirmByEmail` проставляет дату.
- Тест страницы `NewsletterConfirmPage` — по образцу тестов unsubscribe-страницы, если они есть; иначе минимальный smoke (состояния invalid/done).
- E2E `newsletter.spec.ts` (правка): ассерт текста успеха `You're in!` заменить на новый текст.

## Вне скоупа

- Админ-UI списка подписчиков.
- Код отправки рассылок.
- Повторное подтверждение существующей базы (вариант Б — отклонён).
- TTL/истечение ссылки подтверждения.
