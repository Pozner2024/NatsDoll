# Приём оплаты через PayPal (посредник «Склад ЮСА»)

Дата: 2026-06-17. Тип: новая фича (затрагивает БД, `apps/api`, `apps/web`).

## Контекст

B2C-магазин принимает оплату через посредника **«Склад ЮСА»**. Бизнес-модель:
товар отправляет владелица сама; деньги покупателей падают на PayPal-аккаунт
посредника, владелица потом запрашивает зачисление в их кабинете. Сайт самописный
(Nuxt + Hono), готового модуля PayPal у посредника нет — поэтому встраиваем
**стандартный PayPal Checkout (Orders v2 REST API)** своими силами.

Платёжной интеграции в коде сейчас НЕТ. Есть заготовки: `Order.paypalOrderId`,
enum `OrderStatus { PENDING PAID ... }`, feature `orders`, `features/checkout-form`,
пустые `PAYPAL_CLIENT_ID/SECRET` в `.env.example`.

Их собственный API (id 1891 + токен, док https://api-system.skladusa.com/doc) —
это **фулфилмент/склад**, НЕ приём денег; для подтверждения оплаты не годится
(нет поиска платежа по `invoice_id`/метке). Поэтому подтверждение — только через PayPal.

## Цель

Покупатель оплачивает заказ через PayPal; деньги идут на аккаунт «Склад ЮСА».
Креды PayPal посредник вписывает сам через админку. Модуль адаптивный: работает
и когда дали `Secret`, и когда оставили пустым.

## Два режима (переключение по наличию `Secret`)

| | **Server-режим** (`Secret` задан) | **Client-режим** (`Secret` пустой) |
|---|---|---|
| Кто проводит платёж | сервер ↔ PayPal (server-to-server) | браузер покупателя ↔ PayPal (JS SDK) |
| Подтверждение оплаты | надёжное, от PayPal → `PAID` сразу | мягкое (со слов браузера) → «оплата заявлена» |
| Списание стока | автоматически при оплате | вручную, когда владелица сверилась и отметила `PAID` |
| Статус после оплаты | `PAID` | `PENDING` + `paypalOrderId != null` (= «заявлено») |

Признак «оплата заявлена» = `status = PENDING && paypalOrderId != null`. Отдельное поле не нужно.

## Метка платежа

`invoice_id` платежа PayPal = **`natsdoll-<orderNumber>`** (напр. `natsdoll-1042`).
Уникальность гарантирует `Order.orderNumber @unique` autoincrement → PayPal сам
блокирует повторную оплату того же `invoice_id`. Метка не хранится отдельно —
вычисляется из `orderNumber`. У «Склад ЮСА» в кабинете видна → сопоставление заказа.

## Изменения данных (Prisma)

**Новая модель `PaymentSettings`** — синглтон, одна строка `id = "default"`, upsert:
```prisma
model PaymentSettings {
  id             String      @id @default("default")
  enabled        Boolean     @default(false)
  mode           PaymentMode @default(SANDBOX)
  paypalClientId String?
  paypalSecret   String?     // зашифрован AES-256-GCM; null = client-режим
  updatedAt      DateTime    @updatedAt
}
enum PaymentMode { SANDBOX LIVE }
```

**Правки `Order`:**
- `paypalOrderId String? @unique` — уже есть, начинаем использовать.
- `+ paypalCaptureId String?` — id списания (идемпотентность, будущие возвраты).

## Серверная часть — новая feature `apps/api/src/features/payments`

Следует 3-слойной архитектуре проекта; собирается в `app.ts` (composition root).

### Infrastructure
- `paypalClient.ts` — обёртка над PayPal Orders v2:
  - `getAccessToken(clientId, secret, mode)` — OAuth `client_credentials`;
  - `createOrder({creds, amountUsd, invoiceId})` → POST `/v2/checkout/orders`, intent `CAPTURE`;
  - `captureOrder({creds, paypalOrderId})` → POST `/capture`; заголовок `PayPal-Request-Id`
    для идемпотентности; `ORDER_ALREADY_CAPTURED` трактуем как успех;
  - `getOrder({creds, paypalOrderId})` → GET статуса (страховочная перепроверка);
  - base URL по `mode`: `api-m.sandbox.paypal.com` / `api-m.paypal.com`.
- `secretCrypto.ts` — AES-256-GCM, ключ из env `PAYMENT_ENCRYPTION_KEY` (32 байта,
  **отдельный** от `JWT_SECRET`/`HMAC_SECRET`). Нет ключа → оплату включить нельзя (fail-safe).
- `paymentRepository.ts` — `getSettings`, `upsertSettings`, плюс выборки заказа для оплаты.

### Application (use-cases, по файлу на операцию)
- `getPaymentSettings` → `{ enabled, mode, clientId, hasSecret }`. **Secret наружу не отдаём** — только флаг.
- `updatePaymentSettings(input)` → шифрует `Secret`, upsert. Пустой `Secret` → очистка (client-режим).
  Если поле не прислано — существующее не трогаем. Нельзя `enabled=true` без `clientId`/без ключа шифрования.
- `getPaymentConfig` (публичный) → `{ enabled, clientId, mode, serverFlow }` для PayPal-кнопки.
- `createPaypalOrder(userId, orderId)` — server-режим: проверяет владельца заказа и `status=PENDING`,
  создаёт PayPal-заказ (`invoice_id = natsdoll-N`, сумма из `Order.totalAmount` — **только с сервера**),
  пишет `paypalOrderId`, возвращает его фронту.
- `capturePaypalPayment(userId, orderId)` — server-режим: capture → при `COMPLETED` → `markOrderPaid`.
- `claimPaypalPayment(userId, orderId, paypalOrderId)` — client-режим: фиксирует `paypalOrderId`,
  оставляет `PENDING`, сток НЕ трогает.
- `markOrderPaid(orderId, captureId?)` — **единая операция**, переиспользуется авто- и ручным путём
  (ручной — из `updateAdminOrder` при переводе в `PAID`). В одной транзакции:
  1. CAS-списание стока по позициям (логика из текущего `createOrderFromCart`);
  2. если не хватило — **НЕ падаем** (деньги уже взяты), пишем пометку в `Order.adminNote` («⚠ сток: <товар>»);
  3. `status = PAID`, сохраняем `paypalCaptureId`.

### Presentation (маршруты)
- `GET /payments/config` (public)
- `POST /payments/paypal/create-order` `{orderId}` (auth) — server-режим
- `POST /payments/paypal/capture` `{orderId}` (auth) — server-режим, + страховочная перепроверка через `getOrder`
- `POST /payments/paypal/claim` `{orderId, paypalOrderId}` (auth) — client-режим
- `GET /admin/payment-settings` · `PUT /admin/payment-settings` — под тем же admin-guard, что и остальная админка

## Изменения в существующих заказах (`features/orders`)

Главное изменение текущего поведения:
- `POST /orders`: создаёт `Order` `PENDING` **без списания стока**, **очищает корзину**
  (позиции ушли в заказ). Возвращает заказ → фронт ведёт на оплату.
- **Списание стока переезжает** из `createOrderFromCart` в `markOrderPaid` (момент оплаты).
- Дооплата: `PENDING`-заказ можно оплатить со страницы заказа в любой момент
  (ушёл, не оплатил → вернулся в «Мои заказы» → дооплатил).

## Фронтенд (`apps/web`)

- `features/paypal-payment/` — компонент PayPal-кнопки: грузит PayPal JS SDK по `clientId`+`mode`
  из `/payments/config`, разводит логику по `serverFlow`:
  - `serverFlow=true`: `createOrder` → наш `POST /create-order` (→ `paypalOrderId`); `onApprove` → наш `POST /capture`;
  - `serverFlow=false`: `createOrder` → SDK `actions.order.create` (локально, `invoice_id=natsdoll-N`);
    `onApprove` → SDK `actions.order.capture()` → наш `POST /claim`.
- Админка: `widgets/admin-panel/components/AdminPaymentSettings.vue` + `adminPaymentApi.ts`
  + пункт в `AdminSidebar` + иконка. Форма: toggle «включить оплату», режим Sandbox/Live,
  поле Client ID, поле Secret (плейсхолдер «оставьте пустым, если не используете»; текущее
  значение не показываем — только «Secret задан / не задан»).
- Страница заказа (`OrderConfirmationPage` / `account`): `PENDING` → кнопка оплаты;
  «заявлено» → «оплата проверяется»; `PAID` → подтверждение.

## Тесты

- API unit: `secretCrypto` (шифр/дешифр round-trip), `paypalClient` (мок `fetch`),
  use-cases обоих режимов, нехватка стока при `markOrderPaid`, идемпотентность capture.
- Web: компонент кнопки (моки обоих режимов), форма настроек.
- Правка существующих тестов заказов под новый момент списания стока.
- Запуск: vitest с `--root apps/api` / `--root apps/web`.

## Безопасность (инварианты)

- `Secret` шифруется в БД (AES-256-GCM, отдельный ключ `PAYMENT_ENCRYPTION_KEY`); наружу не отдаётся.
- Сумма платежа — только сервер (`Order.totalAmount`); фронт сумму не диктует.
- Client-режим: `PAID`/сток — только после ручной сверки (браузеру не верим).
- `invoice_id = natsdoll-N` уникален → защита от двойной оплаты на стороне PayPal.
- Идемпотентность capture.
- Оплата по умолчанию **выключена** (`enabled=false`), пока не настроена.
- Доступ «Склад ЮСА» в админку — отдельный временный админ-аккаунт, пароль сменить после подключения.

## Вне scope (на будущее)

PayPal webhook (надёжное резервное подтверждение); авто-отмена старых неоплаченных `PENDING`;
возвраты через PayPal API; авто-сверка платежей через Transactions API «Склад ЮСА».

## Открытый момент (не блокирует реализацию)

Что именно впишет «Склад ЮСА» (с `Secret` или без) — увидим по факту. Модуль адаптивный,
готов к обоим вариантам; режим определяется автоматически по наличию `Secret`.
