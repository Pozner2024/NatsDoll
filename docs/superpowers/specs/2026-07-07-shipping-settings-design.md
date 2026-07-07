# Shipping Settings — Design

## Проблема

Стоимость доставки сейчас захардкожена в коде: `SHIPPING_BASE=12`, `SHIPPING_PER_EXTRA_ITEM=1` — продублирована в двух местах:
- `apps/api/src/shared/lib/shipping.ts` (используется при оформлении заказа)
- `apps/web/src/shared/lib/shipping.ts` (используется в корзине для предпоказа суммы до оформления)

Владелица магазина не может сама поменять эти значения — только через правку кода и деплой.

## Цель

Дать возможность редактировать стоимость доставки через форму в админке, без участия разработчика.

## Формула доставки (не меняется)

`shippingCost = baseCost + (totalItemCount - 1) * perExtraItemCost`

Только сами числа `baseCost` и `perExtraItemCost` становятся редактируемыми (сейчас $12 и $1 соответственно).

## Хранение данных

Новая singleton-таблица в Prisma, по образцу `PaymentSettings`:

```prisma
model ShippingSettings {
  id               String   @id @default("default")
  baseCost         Decimal
  perExtraItemCost Decimal
  updatedAt        DateTime @updatedAt
}
```

Строка с `id: "default"` создаётся сидом/миграцией с текущими значениями (12 и 1), чтобы поведение не изменилось в момент выката.

## Backend

### Публичный эндпоинт
`GET /shipping-settings` — без авторизации, отдаёт `{ baseCost, perExtraItemCost }`. Нужен, чтобы корзина на фронте показывала актуальную сумму до оформления заказа (без этого эндпоинта фронт продолжал бы показывать старое хардкод-значение до перезагрузки после деплоя).

### Админ-эндпоинты
- `GET /admin/shipping-settings` — текущие значения для формы.
- `PUT /admin/shipping-settings` — сохранение новых значений. Валидация: оба поля — положительные числа (Zod, `z.number().positive()`), с разумным верхним пределом (например, до 1000), чтобы отсечь опечатки в духе лишнего нуля.

Оба защищены существующим `requireAuth` + `requireAdmin` (как остальная админка).

### Расчёт при оформлении заказа
`createOrder.ts` и `guestCheckout.ts` сейчас импортируют константы `SHIPPING_BASE`/`SHIPPING_PER_EXTRA_ITEM` напрямую. Меняем на чтение текущих значений из `ShippingSettings` перед вызовом `calcShipping(totalItemCount, baseCost, perExtraItemCost)` — функция получает параметры вместо использования глобальных констант. Так итоговая цена заказа всегда считается по значениям на момент оформления, а не по значениям на момент последнего деплоя.

## Frontend

### Корзина
`CartPageWidget.vue` вместо хардкод-констант `SHIPPING_BASE`/`SHIPPING_PER_EXTRA_ITEM` из `apps/web/src/shared/lib/shipping.ts` — подгружает актуальные значения через `GET /shipping-settings` (аналогично тому, как уже подгружаются категории на витрине), и использует их в той же формуле для предпоказа суммы.

### Админка
- Новая страница `apps/web/app/pages/admin/shipping.vue` + компонент `AdminShippingSettings.vue` в `widgets/admin-panel`, по образцу `AdminPaymentSettings.vue`: форма из двух полей (Base cost, Per extra item cost), кнопка Save, состояния loading/error/success.
- Пункт «Shipping» в `AdminSidebar.vue`, между Sales и Payments.

## Тесты

- Backend: юнит-тесты на репозиторий (get/update shipping settings), на `calcShipping` с параметрами вместо констант, на `createOrder`/`guestCheckout` с замоканными настройками, на валидацию admin-роута (отрицательные/нулевые значения отклоняются).
- Frontend: тест на composable загрузки публичных настроек в корзине, тест на форму сохранения в админке (успех/ошибка).

## Вне рамок

- Тарифы по регионам/странам — не делаем, формула остаётся "база + доп. товар".
- Бесплатная доставка от суммы заказа — не делаем.
- История изменений настроек доставки — не делаем (только текущее значение, как у `PaymentSettings`).
