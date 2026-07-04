# Внешняя страница оплаты WooCommerce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покупатель оплачивает заказ NatsDoll на `pay.natsdoll.com` (WordPress + WooCommerce, PayPal посредника «Склад ЮСА»), наш API создаёт заказ-двойник в Woo и переводит свой заказ в `PAID` по вебхуку Woo.

**Architecture:** Спек — `docs/superpowers/specs/2026-07-03-woocommerce-payment-page-design.md`. Существующие PayPal-режимы (server/client flow) не трогаем; добавляется третий режим `external`, переключаемый в админке. Новый код в API — внутри существующей фичи `payments` (wooClient в infrastructure, два use-case в application, два роута). На фронте — новый FSD-слайс `features/woo-payment`.

**Tech Stack:** Hono + Prisma (api), Nuxt 4 / Vue 3 (web), WordPress + WooCommerce + WooCommerce PayPal Payments (Docker), Caddy, Vitest.

## Global Constraints

- Комментарии в новый код не добавлять (правило проекта; в т.ч. PHP).
- TypeScript: запрет `any`; на границах (HTTP, Woo API) — `unknown`/Zod.
- Магические числа — только именованные константы.
- CSS: BEM в `<style scoped lang="scss">`, никакого `cursor: pointer`, адаптация только через миксины breakpoints.
- Валюта USD; метка заказа `natsdoll-<orderNumber>`.
- Typecheck api: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api` (перед этим при изменениях Prisma: `npm run generate -w apps/api` + удалить `apps/api/dist`).
- Тесты: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic` (web: `--root apps/web`).
- Lint: `npx eslint apps/api/src apps/web/app apps/web/src --max-warnings=0`.
- Push в `main` авто-деплоит прод — коммитить можно, пушить только на фазе деплоя по команде пользователя.
- Правка Caddyfile на проде требует `docker compose up -d --force-recreate caddy` (bind-mount inode).

**Отступления от спека (зафиксированы, причины):**

1. Полный shipping-адрес в Woo не передаём — страница `order-pay` адрес не запрашивает и не показывает; передаём только имя и email (email префиллит PayPal-чекаут). Адрес остаётся в нашем заказе.
2. CSP на `pay.natsdoll.com` не ставим: WP-админка и плагины построены на inline-скриптах, allowlist-CSP выродился бы в `unsafe-inline`. Остальные security-заголовки ставим.
3. Строки заказа в Woo: REST API не принимает line_items без `product_id` — используем скрытый товар-плейсхолдер (`WOO_PLACEHOLDER_PRODUCT_ID`) с переопределением `name`/`subtotal`/`total` на каждую строку.

## File Structure

```
infra/wordpress/mu-plugins/
├── natsdoll-return-redirect.php   (create) редирект thank-you → natsdoll.com
└── natsdoll-hardening.php         (create) xmlrpc off
docker-compose.yml                 (modify) сервисы wordpress + wp-db (dev)
docker-compose.prod.yml            (modify) те же сервисы + WOO_* env для api
Caddyfile                          (modify) хост-блок pay.natsdoll.com
.env.example                       (modify) WOO_*, WP_DB_*

apps/api/prisma/schema.prisma      (modify) Order.wooOrderId/wooOrderKey, PaymentSettings.externalPageEnabled
apps/api/src/features/payments/
├── types.ts                       (modify) Woo-типы, PaymentRepository, config/settings типы
├── infrastructure/paymentRepository.ts (modify) 3 новых метода + externalPageEnabled
├── infrastructure/wooClient.ts    (create) REST-клиент Woo
├── infrastructure/wooClient.test.ts (create)
├── application/createWooPayment.ts (create) + .test.ts
├── application/handleWooWebhook.ts (create) + .test.ts
├── application/getPaymentConfig.ts (modify) external
├── application/updatePaymentSettings.ts (modify) валидация
├── application/getPaymentSettings.ts (modify) view
├── application/claimPaypalPayment.ts (modify) гвард external
├── presentation/paymentRoutes.ts  (modify) 2 роута
├── presentation/adminPaymentRoutes.ts (modify) schema
└── index.ts                       (modify) экспорты
apps/api/src/app.ts                (modify) composition root

apps/web/src/features/paypal-payment/paypalPaymentApi.ts (modify) config schema + external
apps/web/src/features/woo-payment/ (create) WooPayButton.vue, wooPaymentApi.ts, тест, index.ts
apps/web/src/widgets/cart-page/CartPageWidget.vue (modify) ветка external
apps/web/src/widgets/order-confirmation/OrderConfirmation.vue (modify) ветка external + поллинг
apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue (modify) ветка external
apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.vue (modify) чекбокс
apps/web/src/widgets/admin-panel/adminPaymentApi.ts (modify) schema
```

---

### Task 1: Файлы инфраструктуры (mu-plugins, dev-compose, .env.example)

**Files:**
- Create: `infra/wordpress/mu-plugins/natsdoll-return-redirect.php`
- Create: `infra/wordpress/mu-plugins/natsdoll-hardening.php`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Interfaces:**
- Produces: WordPress доступен на `http://localhost:8080`; mu-plugins смонтированы; meta-ключи `natsdoll_return_url`/`natsdoll_order_number`, query-параметр возврата `?paid=1` — их используют Task 4 (wooClient) и Task 11 (OrderConfirmation).

- [ ] **Step 1: Создать mu-plugin возврата**

`infra/wordpress/mu-plugins/natsdoll-return-redirect.php`:

```php
<?php
add_action('template_redirect', function () {
    if (!function_exists('is_wc_endpoint_url') || !is_wc_endpoint_url('order-received')) {
        return;
    }
    $order_id = absint(get_query_var('order-received'));
    if (!$order_id) {
        return;
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
    if (!$key || !hash_equals($order->get_order_key(), $key)) {
        return;
    }
    $url = $order->get_meta('natsdoll_return_url');
    if (!$url) {
        return;
    }
    wp_redirect(add_query_arg('paid', '1', $url), 303);
    exit;
});
```

- [ ] **Step 2: Создать mu-plugin hardening**

`infra/wordpress/mu-plugins/natsdoll-hardening.php`:

```php
<?php
add_filter('xmlrpc_enabled', '__return_false');
```

- [ ] **Step 3: Добавить сервисы в docker-compose.yml (dev)**

В `services:` добавить, в `volumes:` внизу дописать `wp_data:` и `wp_db_data:`:

```yaml
  wp-db:
    image: mariadb:11
    environment:
      MARIADB_DATABASE: wordpress
      MARIADB_USER: wordpress
      MARIADB_PASSWORD: wordpress
      MARIADB_ROOT_PASSWORD: wordpress
    volumes:
      - wp_db_data:/var/lib/mysql

  wordpress:
    image: wordpress:6
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: wp-db
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
    volumes:
      - wp_data:/var/www/html
      - ./infra/wordpress/mu-plugins:/var/www/html/wp-content/mu-plugins
    depends_on:
      - wp-db
```

- [ ] **Step 4: Дополнить .env.example**

После блока PayPal добавить:

```
# WooCommerce — внешняя страница оплаты (pay.natsdoll.com)
WOO_BASE_URL=
WOO_CONSUMER_KEY=
WOO_CONSUMER_SECRET=
# Секрет вебхука Woo (задаётся при создании вебхука в админке Woo). Сгенерировать: openssl rand -hex 32
WOO_WEBHOOK_SECRET=
# id скрытого товара-плейсхолдера в Woo (строки заказа создаются поверх него)
WOO_PLACEHOLDER_PRODUCT_ID=
# БД WordPress (MariaDB)
WP_DB_PASSWORD=
WP_DB_ROOT_PASSWORD=
```

- [ ] **Step 5: Проверить валидность compose**

Run: `docker compose config --quiet`
Expected: выход 0, без ошибок.

- [ ] **Step 6: Commit**

```bash
git add infra/wordpress docker-compose.yml .env.example
git commit -m "feat(payments): WordPress payment page scaffolding (mu-plugins, dev compose)"
```

---

### Task 2: Локальный WordPress — установка и ручная настройка (де-риск)

Задача полностью ручная (браузер). Она НАМЕРЕННО раньше API-кода: проверяет ключевые предположения (line_items c плейсхолдером, страница order-pay, вебхук, редирект) до написания TypeScript.

**Interfaces:**
- Produces: рабочий Woo на `http://localhost:8080`, значения `WOO_CONSUMER_KEY/SECRET`, `WOO_WEBHOOK_SECRET`, `WOO_PLACEHOLDER_PRODUCT_ID` в `apps/api/.env`.

- [ ] **Step 1: Поднять контейнеры**

Run: `docker compose up -d wp-db wordpress`
Открыть `http://localhost:8080` → мастер установки: язык English, Site Title «NatsDoll» (tagline «Secure checkout»), admin-логин/пароль сохранить у пользователя, Search engine visibility — галку «Discourage» ПОСТАВИТЬ.

Брендинг страницы оплаты (шрифты/цвета/логотип NatsDoll, скрытие корзины, смягчение плашки) применяется автоматически мини-плагином `infra/wordpress/mu-plugins/natsdoll-branding.php` — отдельной настройки в админке не требует, едет вместе с деплоем.

- [ ] **Step 2: Установить и настроить WooCommerce**

Plugins → Add New → WooCommerce → Install → Activate. Мастер настройки пропустить (Skip setup). Затем:
- WooCommerce → Settings → General: Currency = US Dollar.
- Settings → Accounts & Privacy: «Allow customers to place orders without an account» ✓; обе галки «Allow customers to create an account…» снять.
- Settings → Emails: у всех писем покупателю (New order оставить админский по желанию; Processing order, Completed order, Customer invoice и т.д.) — Disable.
- Settings → Advanced → Permalinks WP (Settings → Permalinks): Post name.

- [ ] **Step 3: Товар-плейсхолдер**

Products → Add New: название «NatsDoll item», Regular price `0`, Catalog visibility = Hidden, Publish. Запомнить id из URL (`post=<id>`) → это `WOO_PLACEHOLDER_PRODUCT_ID`.

- [ ] **Step 4: REST-ключи и вебхук**

- WooCommerce → Settings → Advanced → REST API → Add key: Description «natsdoll api», Permissions Read/Write → Generate. Скопировать Consumer key/secret в `apps/api/.env` (`WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`), туда же `WOO_BASE_URL=http://localhost:8080`, `WOO_PLACEHOLDER_PRODUCT_ID`.
- Settings → Advanced → Webhooks → Add webhook: Name «natsdoll paid», Status Active, Topic «Order updated», Delivery URL `http://api:3000/payments/woo/webhook`, Secret — сгенерировать (`openssl rand -hex 32`) и продублировать в `apps/api/.env` как `WOO_WEBHOOK_SECRET`, API version v3. (Доставка заработает после Task 8; ошибки доставки до этого — норма.)

- [ ] **Step 5: Плагин PayPal с нашим sandbox**

Plugins → Add New → «WooCommerce PayPal Payments» → Install/Activate. На Welcome-экране: «See advanced options» → Manually Connect → включить Sandbox, ввести НАШИ sandbox Client ID/Secret (те же, что в админке сайта для тестов) → Connect Account.

**Включить приём карт (ключевое — гостевая оплата картой без аккаунта PayPal):** настройки плагина → вкладка **Payment Methods** → отметить **«Credit and debit card payments»** («Accept all major credit and debit cards — even if your customer doesn't have a PayPal account») → Save. После этого на странице order-pay появляется выбор «Debit & Credit Cards» / «PayPal». Проверено локально: чекбокс переводит шлюз `ppcp-card-button-gateway` в `available:yes`, на странице оплаты рендерится опция карты. Прямое редактирование опции через wp-cli НЕ работает (новый React-UI 4.x перезатирает `enabled`) — только через UI.

Примечание про eligibility: фактическая отрисовка карточной кнопки зависит от страны покупателя (PayPal режет гостевую карту в ряде стран, включая RU/PL — там показывается только PayPal) и от карточных возможностей аккаунта. Для sandbox из RU/PL-геолокации карта может не отрисоваться — это НЕ баг конфигурации.

- [ ] **Step 6: Проверка предположений через curl**

```bash
curl -s -u "$WOO_CONSUMER_KEY:$WOO_CONSUMER_SECRET" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/wp-json/wc/v3/orders \
  -d '{"status":"pending","currency":"USD","billing":{"first_name":"Test","last_name":"Buyer","email":"buyer@example.com"},"line_items":[{"product_id":<PLACEHOLDER_ID>,"name":"Polymer clay fox","quantity":2,"subtotal":"24.00","total":"24.00"}],"shipping_lines":[{"method_id":"flat_rate","method_title":"Shipping","total":"5.00"}],"meta_data":[{"key":"natsdoll_order_number","value":"natsdoll-9999"},{"key":"natsdoll_return_url","value":"http://localhost:5173/orders/test"}]}'
```

Expected: JSON с `"id"`, `"order_key"`, `"total":"29.00"`, line item с именем «Polymer clay fox». Открыть `http://localhost:8080/checkout/order-pay/<id>/?pay_for_order=true&key=<order_key>` — видны строки заказа и кнопки PayPal; оплатить sandbox-покупателем; после оплаты происходит редирект на `http://localhost:5173/orders/test?paid=1` (404 там — ок), заказ в Woo стал processing.
Если что-то из этого НЕ так — остановиться и вернуться к дизайну, не писать код.

- [ ] **Step 7: Лёгкий брендинг**

Appearance → Customize → Site Identity: логотип NatsDoll (файл у пользователя); Additional CSS — фирменный акцентный цвет кнопок (значение взять из `apps/web/app/assets/styles` переменных):

```css
.woocommerce #payment button.button, .woocommerce-page .button.alt {
  background: #b76e79;
}
```

---

### Task 3: Prisma-миграция и типы платёжной фичи

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/features/payments/types.ts`

**Interfaces:**
- Produces (для Task 4–8): типы `WooLineItem { name; quantity; subtotalUsd }`, `WooCreateOrderInput`, `WooCreatedOrder { wooOrderId: number; wooOrderKey: string }`, `WooClient { createOrder; payUrl }`, `OrderForWooPayment`; `PaymentRepository.getOrderForWooPayment/setWooOrder/getOrderByWooOrderId`; `externalPageEnabled: boolean` в getSettings/getAdminSettings/upsert-типах; `PublicPaymentConfig.external: boolean`.

- [ ] **Step 1: Git checkpoint**

Изменение затрагивает публичный API фичи — чекпойнт уже сделан коммитом Task 1; если рабочее дерево грязное, закоммитить остатки.

- [ ] **Step 2: Схема**

В `model Order` после `paymentClaimed`:

```prisma
  wooOrderId      Int?        @unique
  wooOrderKey     String?
```

В `model PaymentSettings` после `liveWebhookId`:

```prisma
  externalPageEnabled Boolean @default(false)
```

- [ ] **Step 3: Миграция + generate**

Run (локальная БД из docker-compose должна быть поднята):
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/natsdoll npx -w apps/api prisma migrate dev --name woo_external_payment
npm run generate -w apps/api
rm -rf apps/api/dist
```
Expected: миграция создана в `apps/api/prisma/migrations/*_woo_external_payment/` с `ALTER TABLE "Order" ADD COLUMN "wooOrderId" ...`, `CREATE UNIQUE INDEX "Order_wooOrderId_key" ...`, `ALTER TABLE "PaymentSettings" ADD COLUMN "externalPageEnabled" ...`.

- [ ] **Step 4: types.ts**

В `apps/api/src/features/payments/types.ts`:

В `PublicPaymentConfig` добавить поле `external: boolean`.
В `PaymentSettingsView` и `UpdatePaymentSettingsInput` добавить `externalPageEnabled: boolean`.
В `AdminPaymentSettings` и `UpsertPaymentSettingsData` добавить `externalPageEnabled: boolean`.
В возвращаемый тип `PaymentRepository.getSettings` добавить `externalPageEnabled: boolean`.

После блока `// --- Settings ---`-типов добавить:

```ts
export interface WooLineItem {
  name: string
  quantity: number
  subtotalUsd: number
}

export interface WooCreateOrderInput {
  orderNumber: number
  lineItems: WooLineItem[]
  shippingUsd: number
  customerName: string
  customerEmail: string
  returnUrl: string
}

export interface WooCreatedOrder {
  wooOrderId: number
  wooOrderKey: string
}

export interface WooClient {
  createOrder(input: WooCreateOrderInput): Promise<WooCreatedOrder>
  payUrl(wooOrderId: number, wooOrderKey: string): string
}

export interface OrderForWooPayment {
  id: string
  userId: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  wooOrderId: number | null
  wooOrderKey: string | null
  customerName: string
  customerEmail: string
  items: WooLineItem[]
}
```

В интерфейс `PaymentRepository` добавить:

```ts
  getOrderForWooPayment(orderId: string): Promise<OrderForWooPayment | null>
  setWooOrder(orderId: string, wooOrderId: number, wooOrderKey: string): Promise<boolean>
  getOrderByWooOrderId(wooOrderId: number): Promise<OrderForPayment | null>
```

- [ ] **Step 5: Реализация в paymentRepository.ts**

В `getSettings` добавить в возврат `externalPageEnabled: s.externalPageEnabled`; в `getAdminSettings` — то же; в `upsertSettings` в `create` и `update` добавить `externalPageEnabled: data.externalPageEnabled`.

После `claimPaypalOrder` добавить методы:

```ts
    async getOrderForWooPayment(orderId: string): Promise<OrderForWooPayment | null> {
      const o = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true, userId: true, orderNumber: true, status: true, totalAmount: true,
          shippingCost: true, wooOrderId: true, wooOrderKey: true, shippingAddress: true,
          user: { select: { email: true } },
          items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
        },
      })
      if (!o) return null
      const address = o.shippingAddress as { fullName?: string }
      return {
        id: o.id,
        userId: o.userId,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount.toNumber(),
        shippingCost: o.shippingCost.toNumber(),
        wooOrderId: o.wooOrderId,
        wooOrderKey: o.wooOrderKey,
        customerName: address.fullName ?? '',
        customerEmail: o.user.email,
        items: o.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          subtotalUsd: i.price.toNumber() * i.quantity,
        })),
      }
    },

    async setWooOrder(orderId: string, wooOrderId: number, wooOrderKey: string): Promise<boolean> {
      const { count } = await prisma.order.updateMany({
        where: { id: orderId, wooOrderId: null },
        data: { wooOrderId, wooOrderKey },
      })
      return count === 1
    },

    async getOrderByWooOrderId(wooOrderId: number): Promise<OrderForPayment | null> {
      const o = await prisma.order.findUnique({
        where: { wooOrderId },
        select: { id: true, userId: true, orderNumber: true, status: true, totalAmount: true, paypalOrderId: true },
      })
      if (!o) return null
      return { ...o, totalAmount: o.totalAmount.toNumber() }
    },
```

Импорт `OrderForWooPayment` добавить в строку импорта типов.

- [ ] **Step 6: Typecheck**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: ошибки ТОЛЬКО о недостающем `externalPageEnabled`/`external` в use-cases и их тестах (getPaymentConfig, updatePaymentSettings, getPaymentSettings и тестовые моки) — чинится в Task 6–7. Если ошибки другие — исправить здесь.
Примечание: чтобы коммит был зелёным, в ЭТОМ таске сразу внести минимальные правки этих файлов: в `getPaymentConfig.ts`, `getPaymentSettings.ts`, `updatePaymentSettings.ts` пробросить поле (код см. Task 7, Step 1–3 — выполнить эти шаги здесь), а тестовые моки настроек дополнить `externalPageEnabled: false`.

- [ ] **Step 7: Тесты api**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic`
Expected: PASS (все существующие).

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(payments): schema and types for external WooCommerce payment"
```

---

### Task 4: wooClient (infrastructure)

**Files:**
- Create: `apps/api/src/features/payments/infrastructure/wooClient.ts`
- Test: `apps/api/src/features/payments/infrastructure/wooClient.test.ts`
- Modify: `apps/api/src/features/payments/index.ts` (экспорт `makeWooClient`)

**Interfaces:**
- Consumes: типы `WooClient`, `WooCreateOrderInput`, `WooCreatedOrder` из Task 3.
- Produces: `makeWooClient(): WooClient`; env: `WOO_BASE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`, `WOO_PLACEHOLDER_PRODUCT_ID`; при неполном env — `AppError(503, 'External payments are not configured')`.

- [ ] **Step 1: Failing test**

`wooClient.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeWooClient } from './wooClient'

const ENV_KEYS = ['WOO_BASE_URL', 'WOO_CONSUMER_KEY', 'WOO_CONSUMER_SECRET', 'WOO_PLACEHOLDER_PRODUCT_ID'] as const
const input = {
  orderNumber: 1042,
  lineItems: [{ name: 'Polymer clay fox', quantity: 2, subtotalUsd: 24 }],
  shippingUsd: 5,
  customerName: 'Jane Ann Doe',
  customerEmail: 'jane@example.com',
  returnUrl: 'https://natsdoll.com/orders/o1',
}

describe('wooClient', () => {
  beforeEach(() => {
    process.env.WOO_BASE_URL = 'https://pay.example.com/'
    process.env.WOO_CONSUMER_KEY = 'ck'
    process.env.WOO_CONSUMER_SECRET = 'cs'
    process.env.WOO_PLACEHOLDER_PRODUCT_ID = '17'
  })
  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k]
    vi.unstubAllGlobals()
  })

  it('создаёт заказ: плейсхолдер-товар, суммы с двумя знаками, метка и return url в meta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7, order_key: 'wc_key' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const created = await makeWooClient().createOrder(input)
    expect(created).toEqual({ wooOrderId: 7, wooOrderKey: 'wc_key' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://pay.example.com/wp-json/wc/v3/orders')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body.line_items).toEqual([{ product_id: 17, name: 'Polymer clay fox', quantity: 2, subtotal: '24.00', total: '24.00' }])
    expect(body.shipping_lines).toEqual([{ method_id: 'flat_rate', method_title: 'Shipping', total: '5.00' }])
    expect(body.billing).toEqual({ first_name: 'Jane', last_name: 'Ann Doe', email: 'jane@example.com' })
    expect(body.meta_data).toEqual([
      { key: 'natsdoll_order_number', value: 'natsdoll-1042' },
      { key: 'natsdoll_return_url', value: 'https://natsdoll.com/orders/o1' },
    ])
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('ck:cs').toString('base64')}`)
  })

  it('строит pay-ссылку из id и ключа', () => {
    expect(makeWooClient().payUrl(7, 'wc_key')).toBe('https://pay.example.com/checkout/order-pay/7/?pay_for_order=true&key=wc_key')
  })

  it('503 когда env не настроен', async () => {
    delete process.env.WOO_CONSUMER_SECRET
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ status: 503 })
  })

  it('502 когда Woo ответил ошибкой', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ status: 502 })
  })

  it('502 когда в ответе нет id/order_key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })))
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ status: 502 })
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/payments/infrastructure/wooClient.test.ts`
Expected: FAIL — `Cannot find module './wooClient'`.

- [ ] **Step 3: Реализация**

`wooClient.ts`:

```ts
import { AppError } from '../../../shared/errors'
import type { WooClient, WooCreateOrderInput, WooCreatedOrder } from '../types'

const WOO_ORDERS_PATH = '/wp-json/wc/v3/orders'

interface WooEnv {
  baseUrl: string
  consumerKey: string
  consumerSecret: string
  placeholderProductId: number
}

function readEnv(): WooEnv {
  const baseUrl = process.env.WOO_BASE_URL
  const consumerKey = process.env.WOO_CONSUMER_KEY
  const consumerSecret = process.env.WOO_CONSUMER_SECRET
  const placeholderProductId = Number(process.env.WOO_PLACEHOLDER_PRODUCT_ID)
  if (!baseUrl || !consumerKey || !consumerSecret || !Number.isInteger(placeholderProductId) || placeholderProductId <= 0) {
    throw new AppError(503, 'External payments are not configured')
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), consumerKey, consumerSecret, placeholderProductId }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export function makeWooClient(): WooClient {
  return {
    async createOrder(input: WooCreateOrderInput): Promise<WooCreatedOrder> {
      const env = readEnv()
      const { firstName, lastName } = splitName(input.customerName)
      const auth = Buffer.from(`${env.consumerKey}:${env.consumerSecret}`).toString('base64')
      const res = await fetch(`${env.baseUrl}${WOO_ORDERS_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          status: 'pending',
          currency: 'USD',
          billing: { first_name: firstName, last_name: lastName, email: input.customerEmail },
          line_items: input.lineItems.map((li) => ({
            product_id: env.placeholderProductId,
            name: li.name,
            quantity: li.quantity,
            subtotal: li.subtotalUsd.toFixed(2),
            total: li.subtotalUsd.toFixed(2),
          })),
          shipping_lines: [{ method_id: 'flat_rate', method_title: 'Shipping', total: input.shippingUsd.toFixed(2) }],
          meta_data: [
            { key: 'natsdoll_order_number', value: `natsdoll-${input.orderNumber}` },
            { key: 'natsdoll_return_url', value: input.returnUrl },
          ],
        }),
      })
      if (!res.ok) {
        console.error('[wooClient] createOrder failed', res.status, await res.text().catch(() => ''))
        throw new AppError(502, 'Payment page is temporarily unavailable')
      }
      const data = (await res.json()) as { id?: unknown; order_key?: unknown }
      if (typeof data.id !== 'number' || typeof data.order_key !== 'string') {
        throw new AppError(502, 'Payment page is temporarily unavailable')
      }
      return { wooOrderId: data.id, wooOrderKey: data.order_key }
    },

    payUrl(wooOrderId: number, wooOrderKey: string): string {
      const env = readEnv()
      return `${env.baseUrl}/checkout/order-pay/${wooOrderId}/?pay_for_order=true&key=${encodeURIComponent(wooOrderKey)}`
    },
  }
}
```

В `index.ts` добавить: `export { makeWooClient } from './infrastructure/wooClient'`.

- [ ] **Step 4: Тест зелёный**

Run: команда из Step 2. Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments
git commit -m "feat(payments): WooCommerce REST client"
```

---

### Task 5: use-case createWooPayment

**Files:**
- Create: `apps/api/src/features/payments/application/createWooPayment.ts`
- Test: `apps/api/src/features/payments/application/createWooPayment.test.ts`
- Modify: `apps/api/src/features/payments/index.ts`

**Interfaces:**
- Consumes: `PaymentRepository.getSettings/getOrderForWooPayment/setWooOrder`, `WooClient` (Task 3–4).
- Produces: `CreateWooPayment = (userId: string, orderId: string) => Promise<{ payUrl: string }>`; фабрика `makeCreateWooPayment(repo, woo, frontendUrl)`. Возвратный URL: `${frontendUrl}/orders/${order.id}`.

- [ ] **Step 1: Failing test**

`createWooPayment.test.ts` (по образцу `claimPaypalPayment.test.ts`):

```ts
import { describe, it, expect, vi } from 'vitest'
import { makeCreateWooPayment } from './createWooPayment'

const settings = { enabled: true, mode: 'SANDBOX', clientId: null, secret: null, webhookId: null, externalPageEnabled: true }
const order = {
  id: 'o1', userId: 'u1', orderNumber: 1042, status: 'PENDING', totalAmount: 29, shippingCost: 5,
  wooOrderId: null, wooOrderKey: null, customerName: 'Jane Doe', customerEmail: 'jane@example.com',
  items: [{ name: 'Fox', quantity: 2, subtotalUsd: 24 }],
}

function makeDeps(repoOverrides: Record<string, unknown> = {}, wooOverrides: Record<string, unknown> = {}) {
  const repo = {
    getSettings: vi.fn().mockResolvedValue({ ...settings }),
    getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order }),
    setWooOrder: vi.fn().mockResolvedValue(true),
    ...repoOverrides,
  }
  const woo = {
    createOrder: vi.fn().mockResolvedValue({ wooOrderId: 7, wooOrderKey: 'wc_key' }),
    payUrl: vi.fn((id: number, key: string) => `https://pay.example.com/checkout/order-pay/${id}/?pay_for_order=true&key=${key}`),
    ...wooOverrides,
  }
  return { repo, woo, uc: makeCreateWooPayment(repo as never, woo as never, 'https://natsdoll.com') }
}

describe('createWooPayment', () => {
  it('создаёт Woo-заказ, привязывает его и возвращает pay-ссылку', async () => {
    const { repo, woo, uc } = makeDeps()
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).toHaveBeenCalledWith({
      orderNumber: 1042,
      lineItems: order.items,
      shippingUsd: 5,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      returnUrl: 'https://natsdoll.com/orders/o1',
    })
    expect(repo.setWooOrder).toHaveBeenCalledWith('o1', 7, 'wc_key')
    expect(result.payUrl).toContain('/checkout/order-pay/7/')
  })

  it('повторный вызов возвращает существующую ссылку без создания дубликата', async () => {
    const { woo, uc } = makeDeps({ getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order, wooOrderId: 7, wooOrderKey: 'wc_key' }) })
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).not.toHaveBeenCalled()
    expect(result.payUrl).toContain('/checkout/order-pay/7/')
  })

  it('409 когда внешний режим выключен', async () => {
    const { uc } = makeDeps({ getSettings: vi.fn().mockResolvedValue({ ...settings, externalPageEnabled: false }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ status: 409 })
  })

  it('409 когда оплата выключена целиком', async () => {
    const { uc } = makeDeps({ getSettings: vi.fn().mockResolvedValue({ ...settings, enabled: false }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ status: 409 })
  })

  it('404 когда заказ чужой', async () => {
    const { uc } = makeDeps()
    await expect(uc('intruder', 'o1')).rejects.toMatchObject({ status: 404 })
  })

  it('409 когда заказ не PENDING', async () => {
    const { uc } = makeDeps({ getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order, status: 'PAID' }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ status: 409 })
  })

  it('гонка привязки: setWooOrder=false → перечитывает и отдаёт уже привязанную ссылку', async () => {
    const { woo, uc } = makeDeps({
      setWooOrder: vi.fn().mockResolvedValue(false),
      getOrderForWooPayment: vi.fn()
        .mockResolvedValueOnce({ ...order })
        .mockResolvedValueOnce({ ...order, wooOrderId: 8, wooOrderKey: 'other' }),
    })
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).toHaveBeenCalledTimes(1)
    expect(result.payUrl).toContain('/checkout/order-pay/8/')
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/payments/application/createWooPayment.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`createWooPayment.ts`:

```ts
import { AppError } from '../../../shared/errors'
import type { PaymentRepository, WooClient } from '../types'

export type CreateWooPayment = (userId: string, orderId: string) => Promise<{ payUrl: string }>

export function makeCreateWooPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForWooPayment' | 'setWooOrder'>,
  woo: WooClient,
  frontendUrl: string,
): CreateWooPayment {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings?.enabled || !settings.externalPageEnabled) {
      throw new AppError(409, 'External payment is not available')
    }
    const order = await repo.getOrderForWooPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      throw new AppError(409, 'Order is not awaiting payment')
    }
    if (order.wooOrderId !== null && order.wooOrderKey !== null) {
      return { payUrl: woo.payUrl(order.wooOrderId, order.wooOrderKey) }
    }
    const created = await woo.createOrder({
      orderNumber: order.orderNumber,
      lineItems: order.items,
      shippingUsd: order.shippingCost,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      returnUrl: `${frontendUrl}/orders/${order.id}`,
    })
    const bound = await repo.setWooOrder(orderId, created.wooOrderId, created.wooOrderKey)
    if (bound) {
      return { payUrl: woo.payUrl(created.wooOrderId, created.wooOrderKey) }
    }
    const fresh = await repo.getOrderForWooPayment(orderId)
    if (fresh && fresh.wooOrderId !== null && fresh.wooOrderKey !== null) {
      return { payUrl: woo.payUrl(fresh.wooOrderId, fresh.wooOrderKey) }
    }
    throw new AppError(409, 'Order is not awaiting payment')
  }
}
```

В `index.ts`: `export { makeCreateWooPayment } from './application/createWooPayment'`.

- [ ] **Step 4: Тест зелёный**

Run: команда из Step 2. Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments
git commit -m "feat(payments): createWooPayment use-case"
```

---

### Task 6: use-case handleWooWebhook

**Files:**
- Create: `apps/api/src/features/payments/application/handleWooWebhook.ts`
- Test: `apps/api/src/features/payments/application/handleWooWebhook.test.ts`
- Modify: `apps/api/src/features/payments/index.ts`

**Interfaces:**
- Consumes: `PaymentRepository.getOrderByWooOrderId/markOrderPaid`; `alertCaptureUnsettled` из `./capturePaypalPayment`; `EmailService.sendPaymentCaptureAlert`.
- Produces: `HandleWooWebhook = (rawBody: string, signature: string) => Promise<{ handled: boolean }>`; фабрика `makeHandleWooWebhook(repo, emailService, webhookSecret)`. Заголовок подписи: `x-wc-webhook-signature` (base64 HMAC-SHA256 сырого body).

- [ ] **Step 1: Failing test**

`handleWooWebhook.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { makeHandleWooWebhook } from './handleWooWebhook'

const SECRET = 'whsec'
const order = { id: 'o1', userId: 'u1', orderNumber: 1042, status: 'PENDING', totalAmount: 29, paypalOrderId: null }

function sign(rawBody: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const repo = {
    getOrderByWooOrderId: vi.fn().mockResolvedValue({ ...order }),
    markOrderPaid: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const emailService = { sendPaymentCaptureAlert: vi.fn().mockResolvedValue(undefined) }
  return { repo, emailService, uc: makeHandleWooWebhook(repo as never, emailService as never, SECRET) }
}

const paidEvent = JSON.stringify({ id: 7, status: 'processing', total: '29.00', currency: 'USD', transaction_id: 'TX1' })

describe('handleWooWebhook', () => {
  it('валидная подпись + processing + сумма сошлась → PAID', async () => {
    const { repo, uc } = makeDeps()
    const result = await uc(paidEvent, sign(paidEvent))
    expect(repo.getOrderByWooOrderId).toHaveBeenCalledWith(7)
    expect(repo.markOrderPaid).toHaveBeenCalledWith('o1', 'TX1')
    expect(result).toEqual({ handled: true })
  })

  it('статус completed тоже подтверждает оплату', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'completed', total: '29.00', currency: 'USD' })
    const result = await uc(body, sign(body))
    expect(repo.markOrderPaid).toHaveBeenCalledWith('o1', null)
    expect(result).toEqual({ handled: true })
  })

  it('невалидная подпись → 401, заказ не тронут', async () => {
    const { repo, uc } = makeDeps()
    await expect(uc(paidEvent, sign(paidEvent, 'wrong'))).rejects.toMatchObject({ status: 401 })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('секрет не настроен → handled false без проверок', async () => {
    const repo = { getOrderByWooOrderId: vi.fn(), markOrderPaid: vi.fn() }
    const emailService = { sendPaymentCaptureAlert: vi.fn() }
    const uc = makeHandleWooWebhook(repo as never, emailService as never, undefined)
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
  })

  it('не-оплатный статус (pending) → handled false', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'pending', total: '29.00', currency: 'USD' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('неизвестный wooOrderId → handled false', async () => {
    const { uc } = makeDeps({ getOrderByWooOrderId: vi.fn().mockResolvedValue(null) })
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
  })

  it('сумма не сошлась → handled false, алерт, PAID не ставится', async () => {
    const { repo, emailService, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'processing', total: '0.01', currency: 'USD' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
    expect(emailService.sendPaymentCaptureAlert).toHaveBeenCalled()
  })

  it('валюта не USD → handled false', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'processing', total: '29.00', currency: 'EUR' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('markOrderPaid=false (терминальный статус) → handled false + алерт', async () => {
    const { emailService, uc } = makeDeps({ markOrderPaid: vi.fn().mockResolvedValue(false) })
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
    expect(emailService.sendPaymentCaptureAlert).toHaveBeenCalled()
  })

  it('не-JSON body с валидной подписью → handled false', async () => {
    const { uc } = makeDeps()
    const body = 'webhook_id=5'
    expect(await uc(body, sign(body))).toEqual({ handled: false })
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/payments/application/handleWooWebhook.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`handleWooWebhook.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import type { EmailService } from '../../auth/infrastructure/emailService'
import { alertCaptureUnsettled } from './capturePaypalPayment'
import type { PaymentRepository } from '../types'

export type HandleWooWebhook = (rawBody: string, signature: string) => Promise<{ handled: boolean }>

const PAID_WOO_STATUSES = ['processing', 'completed']

function verifyWooSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  const received = Buffer.from(signature, 'base64')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

interface WooWebhookEvent {
  id?: unknown
  status?: unknown
  total?: unknown
  currency?: unknown
  transaction_id?: unknown
}

export function makeHandleWooWebhook(
  repo: Pick<PaymentRepository, 'getOrderByWooOrderId' | 'markOrderPaid'>,
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
  webhookSecret: string | undefined,
): HandleWooWebhook {
  return async (rawBody, signature) => {
    if (!webhookSecret || !signature) {
      return { handled: false }
    }
    if (!verifyWooSignature(rawBody, signature, webhookSecret)) {
      throw new AppError(401, 'Invalid webhook signature')
    }
    let event: WooWebhookEvent
    try {
      event = JSON.parse(rawBody) as WooWebhookEvent
    } catch {
      return { handled: false }
    }
    if (typeof event.id !== 'number' || typeof event.status !== 'string' || !PAID_WOO_STATUSES.includes(event.status)) {
      return { handled: false }
    }
    const order = await repo.getOrderByWooOrderId(event.id)
    if (!order) {
      return { handled: false }
    }
    const transactionId = typeof event.transaction_id === 'string' && event.transaction_id !== '' ? event.transaction_id : null
    const amountMatches = event.total === order.totalAmount.toFixed(2)
    const currencyMatches = event.currency === 'USD'
    if (!amountMatches || !currencyMatches) {
      console.error('[handleWooWebhook] amount verification mismatch', {
        orderNumber: order.orderNumber,
        amount: { expected: order.totalAmount.toFixed(2), actual: event.total ?? null, ok: amountMatches },
        currency: { expected: 'USD', actual: event.currency ?? null, ok: currencyMatches },
      })
      await alertCaptureUnsettled(emailService, order.orderNumber, transactionId, new AppError(409, 'Payment verification failed'))
      return { handled: false }
    }
    const paid = await repo.markOrderPaid(order.id, transactionId)
    if (!paid) {
      await alertCaptureUnsettled(emailService, order.orderNumber, transactionId, new AppError(409, 'Order went into a final state during payment'))
      return { handled: false }
    }
    return { handled: true }
  }
}
```

В `index.ts`: `export { makeHandleWooWebhook } from './application/handleWooWebhook'`.

- [ ] **Step 4: Тест зелёный**

Run: команда из Step 2. Expected: PASS (10 тестов).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments
git commit -m "feat(payments): WooCommerce webhook handler with HMAC verification"
```

---

### Task 7: Настройки — external-режим в конфиге, админ-схеме и гвардах

**Files:**
- Modify: `apps/api/src/features/payments/application/getPaymentConfig.ts` (+ .test.ts)
- Modify: `apps/api/src/features/payments/application/getPaymentSettings.ts` (+ .test.ts)
- Modify: `apps/api/src/features/payments/application/updatePaymentSettings.ts` (+ .test.ts)
- Modify: `apps/api/src/features/payments/application/claimPaypalPayment.ts` (+ .test.ts)
- Modify: `apps/api/src/features/payments/presentation/adminPaymentRoutes.ts` (+ .test.ts)

(Если Step 6 Task 3 уже внёс правки в первые три файла — здесь довнести тесты и оставшееся.)

**Interfaces:**
- Produces: `GET /payments/config` → `{ enabled, clientId, mode, serverFlow, external }`; admin PUT принимает/возвращает `externalPageEnabled`.

- [ ] **Step 1: getPaymentConfig**

```ts
export function makeGetPaymentConfig(repo: PaymentRepository): GetPaymentConfig {
  return async () => {
    const s = await repo.getSettings()
    if (!s || !s.enabled) {
      return { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false }
    }
    if (s.externalPageEnabled) {
      return { enabled: true, clientId: null, mode: s.mode, serverFlow: false, external: true }
    }
    return { enabled: true, clientId: s.clientId, mode: s.mode, serverFlow: s.secret !== null, external: false }
  }
}
```

В `getPaymentConfig.test.ts` дополнить моки настроек полем `externalPageEnabled: false`, в ожидаемые объекты добавить `external: false` и добавить тест:

```ts
  it('external-режим: clientId скрыт, external=true', async () => {
    const repo = { getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc', webhookId: null, externalPageEnabled: true }) }
    const config = await makeGetPaymentConfig(repo as never)()
    expect(config).toEqual({ enabled: true, clientId: null, mode: 'LIVE', serverFlow: false, external: true })
  })
```

- [ ] **Step 2: getPaymentSettings**

В пустой дефолт добавить `externalPageEnabled: false`, в заполненный возврат — `externalPageEnabled: s.externalPageEnabled`. Тест-моки дополнить полем.

- [ ] **Step 3: updatePaymentSettings**

Валидацию заменить на:

```ts
    if (input.enabled && !input.externalPageEnabled && !activeClientId) {
      throw new AppError(400, 'Client ID is required to enable payments')
    }
```

В `repo.upsertSettings({...})` добавить `externalPageEnabled: input.externalPageEnabled`. В тестах во входные объекты добавить `externalPageEnabled: false`; добавить тест: `enabled=true, externalPageEnabled=true, clientId=null` → НЕ бросает.

- [ ] **Step 4: Гвард claim**

В `claimPaypalPayment.ts`:

```ts
    if (!settings?.enabled || settings.secret || settings.externalPageEnabled) {
      throw new AppError(409, 'Claim is not available')
    }
```

В `claimPaypalPayment.test.ts` в `clientModeSettings` добавить `externalPageEnabled: false` и тест: settings c `externalPageEnabled: true` → rejects, `claimPaypalOrder` не вызван.

- [ ] **Step 5: adminPaymentRoutes**

В `updateSchema` добавить `externalPageEnabled: z.boolean()`. В `adminPaymentRoutes.test.ts` дополнить валидные тела запросов этим полем.

- [ ] **Step 6: Прогон и коммит**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic`
Expected: PASS.

```bash
git add apps/api/src/features/payments
git commit -m "feat(payments): external payment mode in config, settings and claim guard"
```

---

### Task 8: Роуты + composition root

**Files:**
- Modify: `apps/api/src/features/payments/presentation/paymentRoutes.ts` (+ .test.ts)
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `CreateWooPayment` (Task 5), `HandleWooWebhook` (Task 6), `makeWooClient` (Task 4).
- Produces: `POST /payments/woo/create-payment` (auth, body `{ orderId }`, ответ `{ payUrl }`); `POST /payments/woo/webhook` (публичный, заголовок `x-wc-webhook-signature`).

- [ ] **Step 1: Failing tests**

В `paymentRoutes.test.ts` расширить `makeApp` двумя параметрами и добавить тесты:

```ts
function makeApp(
  config = vi.fn().mockResolvedValue({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false }),
  create = vi.fn(),
  capture = vi.fn(),
  claim = vi.fn(),
  webhook = vi.fn().mockResolvedValue({ handled: true }),
  wooCreate = vi.fn().mockResolvedValue({ payUrl: 'https://pay.example.com/x' }),
  wooWebhook = vi.fn().mockResolvedValue({ handled: true }),
) {
  const app = new Hono()
  app.route('/payments', makePaymentRouter(config as never, create as never, capture as never, claim as never, webhook as never, wooCreate as never, wooWebhook as never))
  return { app, config, create, capture, claim, webhook, wooCreate, wooWebhook }
}
```

```ts
  it('POST /woo/create-payment без auth → 401, use-case не вызван', async () => {
    const { app, wooCreate } = makeApp()
    const res = await app.request('/payments/woo/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1' }),
    })
    expect(res.status).toBe(401)
    expect(wooCreate).not.toHaveBeenCalled()
  })

  it('POST /woo/webhook — публичный, передаёт подпись и raw body', async () => {
    const { app, wooWebhook } = makeApp()
    const body = JSON.stringify({ id: 7, status: 'processing' })
    const res = await app.request('/payments/woo/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wc-webhook-signature': 'sig==' },
      body,
    })
    expect(res.status).toBe(200)
    expect(wooWebhook).toHaveBeenCalledWith(body, 'sig==')
  })
```

Существующий тест `GET /payments/config` дополнить `external: false` в моке и ожидании.

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/payments/presentation/paymentRoutes.test.ts`
Expected: FAIL (сигнатура `makePaymentRouter` не совпадает).

- [ ] **Step 2: Роуты**

В `paymentRoutes.ts` добавить импорты типов `CreateWooPayment`, `HandleWooWebhook`, параметры фабрики `createWooPayment: CreateWooPayment, handleWooWebhook: HandleWooWebhook` и перед `return router`:

```ts
  router.post('/woo/create-payment', paymentLimiter.middleware, requireAuth, zValidator('json', orderIdSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId } = c.req.valid('json')
    return c.json(await createWooPayment(userId, orderId))
  })

  router.post('/woo/webhook', webhookLimiter.middleware, async (c) => {
    const rawBody = await c.req.text()
    return c.json(await handleWooWebhook(rawBody, c.req.header('x-wc-webhook-signature') ?? ''))
  })
```

- [ ] **Step 3: app.ts**

В блок `// Payments` добавить (импорт `makeWooClient`, `makeCreateWooPayment`, `makeHandleWooWebhook` — в существующий импорт из `./features/payments`):

```ts
  const wooClient = makeWooClient()
  const createWooPayment = makeCreateWooPayment(paymentRepo, wooClient, frontendUrl)
  const handleWooWebhook = makeHandleWooWebhook(paymentRepo, emailService, process.env.WOO_WEBHOOK_SECRET)
```

(`frontendUrl` — использовать ту же переменную/выражение, что уже применяется в app.ts для FRONTEND_URL; если там прямое `process.env.FRONTEND_URL ?? ''` — взять его.)

Строку `app.route('/payments', ...)` дополнить двумя новыми аргументами.

- [ ] **Step 4: Полный прогон api**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic
npx eslint apps/api/src --max-warnings=0
```
Expected: всё зелёное.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(payments): woo payment routes and composition root wiring"
```

---

### Task 9: Web — конфиг external и слайс woo-payment

**Files:**
- Modify: `apps/web/src/features/paypal-payment/paypalPaymentApi.ts` (+ обновить моки в существующих тестах, где парсится config)
- Create: `apps/web/src/features/woo-payment/wooPaymentApi.ts`
- Create: `apps/web/src/features/woo-payment/WooPayButton.vue`
- Create: `apps/web/src/features/woo-payment/wooPayment.test.ts`
- Create: `apps/web/src/features/woo-payment/index.ts`

**Interfaces:**
- Consumes: `POST /payments/woo/create-payment` → `{ payUrl }` (Task 8); `authFetch`, `apiErrorMessage`, `AppButton` из `@/shared`.
- Produces: `WooPayButton` с props `orderId?: string`, `onValidate?: () => boolean`, `prepareOrder?: () => Promise<{ orderId: string } | null>` и emit `redirecting` (срабатывает до ухода со страницы); `createWooPayment(orderId): Promise<string>`.

- [ ] **Step 1: configSchema**

В `paypalPaymentApi.ts` в `configSchema` добавить `external: z.boolean()`. Найти все места в web-тестах, где мокается `/payments/config` или объект `PaymentConfig` (CartPageWidget.test.ts, PaypalPayment.test.ts и др.: `grep -r "serverFlow" apps/web/src`) и добавить `external: false`.

- [ ] **Step 2: wooPaymentApi.ts**

```ts
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

export async function createWooPayment(orderId: string): Promise<string> {
  const res = await authFetch('/payments/woo/create-payment', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to start payment'))
  return z.object({ payUrl: z.string().min(1) }).parse(await res.json()).payUrl
}
```

- [ ] **Step 3: WooPayButton.vue**

```vue
<template>
  <div class="woo-pay-button">
    <AppButton
      class="woo-pay-button__button"
      :disabled="busy"
      @click="onPay"
    >
      {{ busy ? 'Redirecting to payment…' : 'Pay with PayPal or card' }}
    </AppButton>
    <p
      v-if="error"
      class="woo-pay-button__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AppButton } from '@/shared'
import { createWooPayment } from './wooPaymentApi'

const props = defineProps<{
  orderId?: string
  onValidate?: () => boolean
  prepareOrder?: () => Promise<{ orderId: string } | null>
}>()
const emit = defineEmits<{ redirecting: [] }>()

const busy = ref(false)
const error = ref('')

async function resolveOrderId(): Promise<string | null> {
  if (props.prepareOrder) {
    const prepared = await props.prepareOrder()
    return prepared?.orderId ?? null
  }
  return props.orderId ?? null
}

async function onPay(): Promise<void> {
  error.value = ''
  if (props.onValidate && !props.onValidate()) return
  busy.value = true
  try {
    const orderId = await resolveOrderId()
    if (!orderId) return
    const payUrl = await createWooPayment(orderId)
    emit('redirecting')
    window.location.assign(payUrl)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.woo-pay-button {
  &__error {
    color: #c0392b;
    margin: 0.5rem 0 0;
  }
}
</style>
```

`index.ts`:

```ts
export { default as WooPayButton } from './WooPayButton.vue'
export { createWooPayment } from './wooPaymentApi'
```

- [ ] **Step 4: Тест**

`wooPayment.test.ts` (мок-стиль — как в `PaypalPayment.test.ts`; проверить и подстроить импорты моков под него):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WooPayButton from './WooPayButton.vue'

vi.mock('./wooPaymentApi', () => ({ createWooPayment: vi.fn() }))
import { createWooPayment } from './wooPaymentApi'

describe('WooPayButton', () => {
  beforeEach(() => {
    vi.mocked(createWooPayment).mockReset()
    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })
  })

  it('клик: prepareOrder → createWooPayment → emit redirecting → location.assign', async () => {
    vi.mocked(createWooPayment).mockResolvedValue('https://pay.example.com/x')
    const prepareOrder = vi.fn().mockResolvedValue({ orderId: 'o1' })
    const wrapper = mount(WooPayButton, { props: { prepareOrder } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).toHaveBeenCalledWith('o1')
    expect(wrapper.emitted('redirecting')).toHaveLength(1)
    expect(window.location.assign).toHaveBeenCalledWith('https://pay.example.com/x')
  })

  it('onValidate=false — ничего не происходит', async () => {
    const wrapper = mount(WooPayButton, { props: { orderId: 'o1', onValidate: () => false } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).not.toHaveBeenCalled()
  })

  it('prepareOrder вернул null — редиректа нет', async () => {
    const wrapper = mount(WooPayButton, { props: { prepareOrder: vi.fn().mockResolvedValue(null) } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).not.toHaveBeenCalled()
  })

  it('ошибка API показывается под кнопкой', async () => {
    vi.mocked(createWooPayment).mockRejectedValue(new Error('External payment is not available'))
    const wrapper = mount(WooPayButton, { props: { orderId: 'o1' } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('External payment is not available')
    expect(wrapper.emitted('redirecting')).toBeUndefined()
  })
})
```

- [ ] **Step 5: Прогон web-тестов**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
Expected: PASS (новые + все существующие после правки конфиг-моков).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): woo-payment feature slice and external flag in payment config"
```

---

### Task 10: Корзина — ветка external

**Files:**
- Modify: `apps/web/src/widgets/cart-page/CartPageWidget.vue`
- Test: `apps/web/src/widgets/cart-page/CartPageWidget.test.ts`

**Interfaces:**
- Consumes: `WooPayButton` из `@/features/woo-payment` (props `prepareOrder`, `onValidate`, emit `redirecting`).

- [ ] **Step 1: Шаблон**

В блоке `<template v-if="paymentsReady">` перед `<PaypalPayment>`:

```vue
          <WooPayButton
            v-if="paymentsEnabled && paymentConfig?.external"
            class="cart-page__pay"
            :on-validate="validateAddress"
            :prepare-order="prepareOrder"
            @redirecting="onExternalRedirect"
          />
```

У `<PaypalPayment>` заменить `v-if="paymentsEnabled"` на `v-else-if="paymentsEnabled"`.

- [ ] **Step 2: Скрипт**

Импорт: `import { WooPayButton } from '@/features/woo-payment'`. Добавить функцию:

```ts
function onExternalRedirect(): void {
  cartStore.reset()
}
```

(Товары уже зафиксированы в PENDING-заказе; корзина очищается, чтобы после возврата не задвоить заказ. Гостевой путь уже делает это внутри `createGuestOrder`.)

- [ ] **Step 3: Тест**

В `CartPageWidget.test.ts` добавить кейс (по образцу существующих тестов виджета; конфиг-мок с `external: true`):

```ts
  it('в external-режиме показывает WooPayButton вместо PayPal-кнопок', async () => {
    // мок fetchPaymentConfig → { enabled: true, clientId: null, mode: 'LIVE', serverFlow: false, external: true }
    // смонтировать виджет как в соседних тестах, дождаться paymentsReady
    // expect(wrapper.findComponent({ name: 'WooPayButton' }).exists()).toBe(true)
    // expect(wrapper.findComponent({ name: 'PaypalPayment' }).exists()).toBe(false)
  })
```

Тело заполнить строго по мок-инфраструктуре, уже используемой в этом файле (как соседние кейсы про `paymentsEnabled`).

- [ ] **Step 4: Прогон + Commit**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/cart-page`
Expected: PASS.

```bash
git add apps/web/src/widgets/cart-page
git commit -m "feat(web): external payment button on cart page"
```

---

### Task 11: Страница подтверждения — ветка external и поллинг

**Files:**
- Modify: `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue`
- Test: `apps/web/src/widgets/order-confirmation/OrderConfirmation.test.ts`

**Interfaces:**
- Consumes: `WooPayButton` (`orderId`), `fetchPaymentConfig` (+`external`), query `?paid=1` из mu-plugin (Task 1).

- [ ] **Step 1: Скрипт**

Импорты: `onUnmounted` из vue, `fetchPaymentConfig` и тип `PaymentConfig` из `@/features/paypal-payment`, `WooPayButton` из `@/features/woo-payment`. Добавить:

```ts
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 10

const paymentConfig = ref<PaymentConfig | null>(null)
const externalMode = computed(() => paymentConfig.value?.external === true)
const returnedFromPayment = ref(route.query.paid === '1')
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollAttempts = 0

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling(): void {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    pollAttempts += 1
    await orderStore.loadOrder(props.orderId)
    if (order.value?.status !== 'PENDING') {
      stopPolling()
      return
    }
    if (pollAttempts >= POLL_MAX_ATTEMPTS) {
      returnedFromPayment.value = false
      stopPolling()
    }
  }, POLL_INTERVAL_MS)
}

onUnmounted(stopPolling)
```

`onMounted` заменить на:

```ts
onMounted(async () => {
  await orderStore.loadOrder(props.orderId)
  try {
    paymentConfig.value = await fetchPaymentConfig()
  } catch {
    paymentConfig.value = null
  }
  if (returnedFromPayment.value && order.value?.status === 'PENDING') startPolling()
})
```

- [ ] **Step 2: Шаблон**

Секцию Payment привести к виду:

```vue
        <p
          v-if="claimed"
          class="order-confirmation__payment-pending"
        >
          Payment received and is being verified. We'll confirm it shortly.
        </p>
        <p
          v-else-if="returnedFromPayment"
          class="order-confirmation__payment-pending"
        >
          Payment is being processed…
        </p>
        <WooPayButton
          v-else-if="externalMode"
          :order-id="order.id"
        />
        <PaypalPayment
          v-else
          :order-id="order.id"
          :order-number="order.orderNumber"
          :amount-usd="order.totalAmount"
          @paid="onPaid"
          @claimed="onClaimed"
        />
```

- [ ] **Step 3: Тесты**

В `OrderConfirmation.test.ts` (по мок-инфраструктуре файла; fake timers):

- `?paid=1` + PENDING → текст «Payment is being processed…», PaypalPayment/WooPayButton не рендерятся;
- поллинг: после `vi.advanceTimersByTime(3000)` вызван `orderStore.loadOrder` повторно; когда стор вернул статус PAID — сообщение исчезло;
- external-конфиг без `?paid=1` → рендерится WooPayButton, PaypalPayment — нет;
- не-external конфиг → PaypalPayment, как раньше (существующие тесты остаются зелёными).

- [ ] **Step 4: Прогон + Commit**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/order-confirmation`
Expected: PASS.

```bash
git add apps/web/src/widgets/order-confirmation
git commit -m "feat(web): external payment and post-payment polling on order confirmation"
```

---

### Task 12: Кабинет — оплата PENDING-заказа

**Files:**
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`
- Test: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.test.ts`

- [ ] **Step 1: Ветка external**

Повторить схему Task 11 без поллинга и без `returnedFromPayment` (query здесь нет): добавить `fetchPaymentConfig` в `onMounted` (загрузка конфига с `catch → null`), computed `externalMode`, в шаблоне перед `<PaypalPayment>` (строка ~107):

```vue
        <WooPayButton
          v-else-if="externalMode"
          :order-id="order.id"
        />
```

(привязать `v-if`/`v-else-if` цепочку так же, как в Task 11: claimed-сообщение → WooPayButton → PaypalPayment).

- [ ] **Step 2: Тест**

Добавить кейс: PENDING-заказ + external-конфиг → WooPayButton есть, PaypalPayment нет (по мок-стилю файла).

- [ ] **Step 3: Прогон + Commit**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/account-page`
Expected: PASS.

```bash
git add apps/web/src/widgets/account-page
git commit -m "feat(web): external payment for pending orders in account"
```

---

### Task 13: Админка — переключатель + финальный прогон web

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/adminPaymentApi.ts`
- Modify: `apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.vue`
- Test: `apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.test.ts`

- [ ] **Step 1: adminPaymentApi.ts**

В `settingsSchema` добавить `externalPageEnabled: z.boolean()`; в `UpdatePaymentSettingsBody` — `externalPageEnabled: boolean`.

- [ ] **Step 2: Форма**

В `form` добавить `externalPageEnabled: false`; в `onMounted` и `onSave`-ответе — `form.externalPageEnabled = s.externalPageEnabled`; в payload `onSave` — `externalPageEnabled: form.externalPageEnabled`. В шаблон после блока «Активный режим» добавить:

```vue
      <label class="payment-settings__row">
        <input
          v-model="form.externalPageEnabled"
          type="checkbox"
        >
        <span>Внешняя страница оплаты (WooCommerce)</span>
      </label>
      <small class="payment-settings__hint">
        Покупатель платит на pay.natsdoll.com. PayPal-ключи ниже в этом режиме не используются.
      </small>
```

- [ ] **Step 3: Тест**

В `AdminPaymentSettings.test.ts` дополнить мок-ответы `externalPageEnabled: false`; добавить кейс: отметить чекбокс → `savePaymentSettings` вызван с `externalPageEnabled: true`.

- [ ] **Step 4: Полный прогон web**

```bash
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck && cd ../..
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic
npx eslint apps/api/src apps/web/app apps/web/src --max-warnings=0
```
Expected: всё зелёное.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): external payment page toggle in admin settings"
```

---

### Task 14: Локальный сквозной прогон (dev, sandbox)

Ручная проверка полного пути. Dev-стек: `docker compose up -d`, `WOO_*` в `apps/api/.env` из Task 2 (рестарт api-контейнера после правки .env — tsx watch не перечитывает env).

- [ ] Включить в админке сайта: Payments enabled ✓, «Внешняя страница оплаты» ✓, режим SANDBOX.
- [ ] Корзина: товар → адрес → «Pay with PayPal or card» → редирект на `localhost:8080/checkout/order-pay/...` с построчным составом и суммой как в корзине.
- [ ] Оплатить sandbox-покупателем → авто-возврат на `localhost:5173/orders/<id>?paid=1` → «Payment is being processed…» → в течение ~10 сек статус становится `PAID` (вебхук), сток списан.
- [ ] Гостевой чекаут: тот же путь без логина.
- [ ] Незавершённая оплата: уйти со страницы Woo → заказ PENDING в кабинете → кнопка Pay ведёт на ТУ ЖЕ Woo-ссылку (дубликат в Woo не создан).
- [ ] Повторное нажатие Pay на корзине после ошибки сети — не плодит Woo-заказы.
- [ ] Выключить external-режим в админке → корзина снова показывает PayPal-кнопки/Place order.
- [ ] Прогнать `tester`-агентом полный тестовый прогон; ревью `code-reviewer` перед пушем.

---

### Task 15: Прод — инфраструктура и деплой

Изменения в git + ручные действия на сервере. ВНИМАНИЕ: push в main запускает авто-деплой — пушить только когда прод-`.env` уже дополнен.

- [ ] **Step 1: docker-compose.prod.yml**

Добавить сервисы (в `volumes:` — `wp_data:`, `wp_db_data:`):

```yaml
  wp-db:
    image: mariadb:11
    environment:
      MARIADB_DATABASE: wordpress
      MARIADB_USER: wordpress
      MARIADB_PASSWORD: ${WP_DB_PASSWORD}
      MARIADB_ROOT_PASSWORD: ${WP_DB_ROOT_PASSWORD}
    volumes:
      - wp_db_data:/var/lib/mysql
    restart: unless-stopped

  wordpress:
    image: wordpress:6
    environment:
      WORDPRESS_DB_HOST: wp-db
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: ${WP_DB_PASSWORD}
      WORDPRESS_CONFIG_EXTRA: |
        if (isset($$_SERVER['HTTP_X_FORWARDED_PROTO']) && $$_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') { $$_SERVER['HTTPS'] = 'on'; }
        define('WP_HOME', 'https://pay.natsdoll.com');
        define('WP_SITEURL', 'https://pay.natsdoll.com');
        define('DISALLOW_FILE_EDIT', true);
    volumes:
      - wp_data:/var/www/html
      - ./infra/wordpress/mu-plugins:/var/www/html/wp-content/mu-plugins:ro
    depends_on:
      - wp-db
    restart: unless-stopped
```

В сервис `api` в `environment` добавить:

```yaml
      WOO_BASE_URL: ${WOO_BASE_URL}
      WOO_CONSUMER_KEY: ${WOO_CONSUMER_KEY}
      WOO_CONSUMER_SECRET: ${WOO_CONSUMER_SECRET}
      WOO_WEBHOOK_SECRET: ${WOO_WEBHOOK_SECRET}
      WOO_PLACEHOLDER_PRODUCT_ID: ${WOO_PLACEHOLDER_PRODUCT_ID}
```

- [ ] **Step 2: Caddyfile**

Перед блоком `stats.natsdoll.com` добавить:

```
pay.natsdoll.com {
	encode gzip zstd
	header {
		X-Frame-Options "SAMEORIGIN"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		X-Robots-Tag "noindex, nofollow"
	}
	reverse_proxy wordpress:80
}
```

- [ ] **Step 3: Подготовка сервера (ДО пуша)**

- Пользователь: докупить место на VPS; добавить в Namecheap A-запись `pay` → `89.127.205.44`.
- Через diag/redeploy-workflow или вручную: дополнить `/home/natalia/natsdoll/.env`: `WP_DB_PASSWORD`, `WP_DB_ROOT_PASSWORD` (openssl rand -hex 16), `WOO_BASE_URL=https://pay.natsdoll.com`, остальные `WOO_*` — ПОКА пустыми (заполнятся после настройки Woo, api переживает пустые значения: create-payment отдаст 503, вебхук — handled:false).

- [ ] **Step 4: Пуш и деплой**

`git push` (по команде пользователя). После деплоя: `docker compose up -d --force-recreate caddy` (новый Caddyfile), `docker compose up -d wp-db wordpress`. Проверить `https://pay.natsdoll.com` — мастер установки WP, заголовок `X-Robots-Tag` в ответе.

- [ ] **Step 5: Настройка прод-WP**

Повторить Task 2 Steps 1–5 и 7 на `https://pay.natsdoll.com` (сильные пароли; Delivery URL вебхука: `https://natsdoll.com/api/payments/woo/webhook`). Заполнить `WOO_*` в прод-`.env` реальными значениями, перезапустить api (`docker compose up -d api`).

- [ ] **Step 6: Прод e2e на sandbox**

В админке сайта включить external + SANDBOX (плагин Woo — в sandbox с нашими ключами). Полный путь: корзина → pay.natsdoll.com → sandbox-оплата → возврат → `PAID`. Проверить, что `pay.natsdoll.com` не попал в sitemap/поиск (noindex-заголовок).

---

### Task 16: Подключение посредника и запуск

- [ ] **Step 1: Письмо посреднику**

Отправить (пользователь): «Мы установили магазин на WooCommerce с плагином PayPal Payments — тот самый вариант подключения через вход в аккаунт PayPal, о котором говорил ваш техотдел. Пришлите, пожалуйста, кому выдать временный доступ в панель управления, или назначьте время — подключение занимает 2–3 минуты: кнопка "Connect to PayPal" → вход в ваш аккаунт PayPal → "Agree & Connect"».

- [ ] **Step 2: Временный доступ**

Создать в WP отдельного пользователя-администратора для посредника; после подключения — деактивировать. Посредник: Plugins → PayPal Payments → Connect to PayPal (Live) → логин → согласие.

- [ ] **Step 3: Включить оплату картой на live-аккаунте**

После Live-подключения посредника: настройки плагина → Payment Methods → отметить **«Credit and debit card payments»** → Save (см. Task 2 Step 5). Для американского бизнес-аккаунта PayPal стандартная гостевая оплата картой доступна по умолчанию, без отдельной заявки. Опционально (лучше вид/комиссии, но требует одобрения PayPal) — Advanced Card Processing с инлайн-полями: подать заявку в аккаунте посредника, дождаться одобрения. Для MVP достаточно стандартного варианта.

- [ ] **Step 4: Переключение в live**

В Woo-плагине выключить sandbox-режим (Live-подключение посредника активно). В админке сайта: режим LIVE (для external-режима PayPal-ключи сайта не используются — переключатель лишь фиксирует боевой статус). Прогнать контрольный платёж на $2–3: проверить, что на странице оплаты **виден выбор «Debit & Credit Cards» / «PayPal»**, оплатить **картой** (гостевой сценарий, без входа в PayPal) → возврат, `PAID`, поступление видно в кабинете «Склад ЮСА». Затем повторить оплату через сам PayPal. Оформить возврат этих платежей вручную в Woo/PayPal (проверить: наш заказ остаётся PAID — рефанды вне скоупа, отменить заказ руками в админке сайта).

- [ ] **Step 5: Память и документация**

Обновить memory (`project_payments_skladusa`): схема запущена, дата, грабли. Проверить `docs/architecture.md` — дополнить раздел платежей внешней страницей.

---

## Self-Review (выполнен)

1. **Spec coverage:** инфраструктура (T1, T2, T15), настройки/данные (T3, T7, T13), поток (T4–T6, T8–T12), ошибки (T4 502/503, T5 409/404, T6 mismatch/идемпотентность, T9 ошибка под кнопкой), безопасность (T1 hardening/noindex, T6 HMAC constant-time, T7 claim-гвард, T15 заголовки), тестирование (юнит в T4–T13, e2e в T14/T15), подключение посредника (T16). Пробелов не нашла.
2. **Placeholder scan:** тела двух web-тестов (T10 Step 3, T11 Step 3) описаны сценарно с привязкой к мок-инфраструктуре конкретного файла — осознанное решение: мок-обвязка виджет-тестов объёмна и уже существует в этих файлах, копировать её в план дороже, чем прочитать на месте. Остальное — полный код.
3. **Type consistency:** `WooClient.createOrder/payUrl`, `CreateWooPayment`, `HandleWooWebhook`, `setWooOrder → boolean`, `external`/`externalPageEnabled` — сквозные имена сверены по T3→T8 и T9→T13.
