# Дожатие оплаты через PayPal Webhook

Дата: 2026-06-27. Тип: улучшение надёжности (затрагивает БД/настройки, `apps/api`, PayPal Dashboard).

## Контекст

Оплата работает (см. `2026-06-17-paypal-payments-design.md`). В **server-режиме**
(`Secret` задан) подтверждение оплаты делается **только синхронно**:

```
кнопка PayPal → onApprove (браузер) → POST /payments/paypal/capture → markOrderPaid → PAID
```

Списание денег у PayPal происходит на шаге `capture`, который инициирует **наш
сервер** из обработчика `onApprove`. Значит между двумя моментами есть зазор:

1. покупатель **одобрил** платёж в окне PayPal (`CHECKOUT.ORDER.APPROVED`), но
2. до возврата на сайт **закрыл вкладку / потерял сеть** → `onApprove` не сработал →
   `capture` не вызван.

Итог: PayPal-заказ висит в статусе `APPROVED` (не `CAPTURED`), денег нет, наш
заказ остаётся `PENDING`. **Деньги не теряются** (без `capture` списания нет), но
заказ «подвисает», и покупатель может думать, что заплатил.

Сейчас это ничем не закрыто: нет ни одного асинхронного канала от PayPal к серверу.

## Цель

PayPal асинхронно уведомляет сервер о событиях заказа, и сервер **сам дожимает
оплату**, не завися от того, вернулся ли покупатель на сайт. Зазор «одобрил, но не
вернулся» закрывается; оплаченный заказ гарантированно становится `PAID`.

Webhook включается только в server-режиме (есть `Secret`). В client-режиме (без
`Secret`) сервер не может вызвать `capture`, поэтому webhook неприменим — поведение
не меняется.

## Какие события слушаем и зачем

| Событие PayPal | Зачем | Действие сервера |
|---|---|---|
| `CHECKOUT.ORDER.APPROVED` | покупатель одобрил, но `capture` мог не вызваться | найти заказ → если `PENDING` и есть `paypalOrderId` → **вызвать capture** (тот же путь, что синхронный) |
| `PAYMENT.CAPTURE.COMPLETED` | страховка: `capture` прошёл, но `markOrderPaid` упал (сеть/БД) | найти заказ → `markOrderPaid` (идемпотентно) |

`CHECKOUT.ORDER.APPROVED` — основной (закрывает зазор «не вернулся»).
`PAYMENT.CAPTURE.COMPLETED` — вторичный (закрывает зазор «списали, но не отметили»).

Сопоставление заказа: по `resource.purchase_units[0].invoice_id` =
`natsdoll-<orderNumber>` **или** по `paypalOrderId` из `resource.id`. Оба уже есть
в нашей БД, новых полей для матчинга не нужно.

## Безопасность — верификация подписи (КРИТИЧНО)

Эндпоинт webhook **публичный** (PayPal зовёт его без нашей авторизации). Без
проверки подлинности любой сможет слать фейковые «оплачено» и помечать заказы
`PAID`. Поэтому **каждый** входящий webhook обязан пройти верификацию подписи PayPal:

- Способ: `POST /v1/notifications/verify-webhook-signature` (PayPal REST), передаём
  заголовки уведомления (`transmission_id`, `transmission_time`, `cert_url`,
  `auth_algo`, `transmission_sig`), `webhook_id` и **сырое тело** запроса.
- Ответ `verification_status == "SUCCESS"` → обрабатываем; иначе → `400/401`, не трогаем заказ.
- Нужно **сырое тело** (raw body) для верификации — нельзя сначала распарсить и потерять
  байты. Эндпоинт читает `await c.req.text()`, верифицирует, и только потом `JSON.parse`.
- `webhook_id` берётся из PayPal Dashboard при создании подписки (см. Конфигурация).

Дополнительно: креды для вызова verify-API — те же `clientId/secret` из
`PaymentSettings` (расшифровка через `decryptSecret`), режим (`SANDBOX/LIVE`) — из
настроек. Webhook и оплата должны быть в одном окружении.

## Изменения данных

В `PaymentSettings` (или env) — идентификатор подписки webhook:

```prisma
model PaymentSettings {
  // ...существующие поля...
  paypalWebhookId String?   // id подписки из PayPal Dashboard; null = webhook выключен
}
```

Альтернатива — env `PAYPAL_WEBHOOK_ID`. **Рекомендуется поле в `PaymentSettings`**:
посредник «Склад ЮСА» сам настраивает оплату через админку, логично там же задавать
и webhook id (иначе придётся править прод-env вручную). Тогда в админскую форму
Payments добавляется поле «PayPal Webhook ID».

Поля `Order.paypalOrderId`/`paypalCaptureId` уже есть — переиспользуем.

## Серверная часть — расширение feature `apps/api/src/features/payments`

### Рефакторинг (обязателен для переиспользования capture)

Сейчас `capturePaypalPayment(userId, orderId)` проверяет `order.userId === userId`
(ownership). Webhook действует от системы, без `userId`. Выделяем ядро:

- `captureOrderCore(orderId)` — вся логика capture/verify/markOrderPaid **без**
  ownership-проверки (то, что сейчас внутри `capturePaypalPayment` после проверки владельца).
- `capturePaypalPayment(userId, orderId)` — HTTP-путь: проверяет ownership → зовёт `captureOrderCore`.
- Webhook-путь зовёт `captureOrderCore` напрямую (заказ уже найден по invoice_id, владелец нерелевантен).

Так HTTP-эндпоинт сохраняет проверку владельца, а webhook её обходит легитимно.

### Application
- `handlePaypalWebhook(rawBody, headers)`:
  1. верификация подписи (см. Безопасность) → иначе ошибка;
  2. парс события, разбор `event_type`;
  3. `CHECKOUT.ORDER.APPROVED` → найти заказ → `captureOrderCore(orderId)`
     (внутри уже есть идемпотентность: `isPaidStatus → return`);
  4. `PAYMENT.CAPTURE.COMPLETED` → найти заказ → `markOrderPaid` (идемпотентно);
  5. неизвестные события → `200 OK`, игнор (PayPal требует 2xx, иначе ретраит).

### Infrastructure
- `paypalClient.verifyWebhookSignature(...)` — обёртка над verify-API.
- репозиторий: `getOrderByInvoiceTag(orderNumber)` / переиспользовать поиск по `paypalOrderId`.

### Presentation
- `POST /payments/paypal/webhook` — **без** `requireAuth`, **без** `rateLimiter`
  (PayPal не аутентифицируется нашим JWT; защита — только подпись). Читает raw body,
  делегирует в `handlePaypalWebhook`, всегда отвечает `2xx` при валидной подписи
  (даже если заказ не найден — чтобы PayPal не ретраил бесконечно; факт логируем).

## Идемпотентность и edge cases

- **Дубли webhook**: PayPal может слать одно событие несколько раз. `markOrderPaid`
  уже идемпотентен (`isPaidStatus → return`), `captureOrderCore` — тоже (PayPal вернёт
  `ORDER_ALREADY_CAPTURED`). Безопасно.
- **Гонка webhook ↔ синхронный capture**: оба зовут `captureOrderCore`/`markOrderPaid`,
  оба идемпотентны, сток спишется один раз (транзакция + `isPaidStatus`).
- **Заказ не найден** (чужой/тестовый webhook): лог + `200`, не падаем.
- **client-режим** (`Secret` пустой): `captureOrderCore` упрётся в «нет Secret» →
  webhook фактически no-op. Допустимо.

## Конфигурация (PayPal Dashboard)

1. Developer Dashboard → приложение (то же, чей `clientId/secret`) → **Webhooks** →
   Add Webhook.
2. URL: `https://natsdoll.com/api/payments/paypal/webhook`.
3. Подписаться на события: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`.
4. Скопировать **Webhook ID** → вписать в админке (поле «PayPal Webhook ID»).
5. Отдельно для Sandbox и Live (разные приложения → разные webhook id).

CSP/Caddy: эндпоинт — обычный POST на наш домен, отдельных правил не требует.

## Тестирование

- **Unit**: `handlePaypalWebhook` — мок verify (SUCCESS/FAIL), оба события, дубли,
  заказ не найден, client-режим. Подпись невалидна → заказ не трогается.
- **Unit**: `captureOrderCore` отдельно от ownership; `capturePaypalPayment` по-прежнему
  проверяет владельца.
- **Integration**: реальный POST на `/payments/paypal/webhook` с подделанной подписью →
  отказ; с валидной (мок verify-API) → заказ `PAID`.
- **e2e (sandbox)**: оплатить, **не возвращаясь** на сайт (закрыть вкладку после
  approve) → дождаться webhook → заказ стал `PAID`. PayPal Dashboard умеет слать
  тестовые webhook («Mock») — использовать для проверки без реального платежа.

## Объём и риски

- ~1 новый эндпоинт, 1 use-case, рефакторинг `capturePaypalPayment` (выделить core),
  обёртка verify в `paypalClient`, поле в `PaymentSettings` + миграция, поле в админ-форме.
- Затрагивает платёжный путь → **обязательны** `code-reviewer` (critical/high блокируют)
  и полный прогон тестов платёжки перед мержем.
- Главный риск — **верификация подписи**: реализовать строго, без неё эндпоинт = дыра
  «пометь любой заказ оплаченным». Тест на отказ при невалидной подписи — обязателен.
- Деплой не ломает существующее: пока `paypalWebhookId` пуст — webhook-эндпоинт
  отвергает всё (нет id для verify), синхронный путь работает как раньше.

## Что НЕ делаем

- Не трогаем синхронный путь `onApprove → capture` — он остаётся основным.
- Не вводим возвраты/`PAYMENT.CAPTURE.REFUNDED` — отдельная задача.
- Не делаем webhook для client-режима (без `Secret` подтверждать нечем).
