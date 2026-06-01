# Admin Dashboard — Design Spec

Date: 2026-06-01

## Overview

Реализация рабочего дашборда в админ-панели NatsDoll: 4 карточки статистики и 2 панели с последними заказами и сообщениями. Данные загружаются одним запросом к новому admin API endpoint.

---

## Backend

### 1. Prisma migration

Добавить поле в модель `Message`:

```prisma
isReadByAdmin Boolean @default(false)
```

Все существующие сообщения получат `false`. Поле используется для счётчика "New messages" на дашборде.

### 2. Feature slice `apps/api/src/features/admin/`

```
admin/
├── types.ts
├── infrastructure/adminRepository.ts
├── application/getDashboard.ts
├── presentation/adminRoutes.ts
└── index.ts
```

### 3. Admin middleware

Проверка `role === 'ADMIN'` из JWT перед всеми `/admin/*` маршрутами. Возвращает 403 если роль не совпадает. Подключается в `app.ts` через `adminRoutes` со своим middleware.

### 4. `GET /admin/dashboard`

Требует: аутентификация + роль ADMIN.

**Response type:**

```ts
type DashboardStats = {
  ordersToday: number      // заказы createdAt >= начало сегодняшнего дня (UTC), любой статус
  revenueToday: number     // сумма totalAmount, статус PAID/PROCESSING/SHIPPED/DELIVERED, сегодня
  revenueMonth: number     // то же, за текущий календарный месяц
  newMessages: number      // count(Message.isReadByAdmin = false)
  activeListings: number   // count(Product.isPublished = true AND deletedAt = null)
}

type RecentOrder = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  createdAt: string
  userName: string
}

type RecentMessage = {
  id: string
  text: string
  createdAt: string
  userName: string
  orderNumber: number | null
  isReadByAdmin: boolean
}

type DashboardResponse = {
  stats: DashboardStats
  recentOrders: RecentOrder[]    // последние 10, orderBy createdAt DESC
  recentMessages: RecentMessage[] // последние 10, orderBy createdAt DESC
}
```

**`adminRepository.ts`** содержит один метод `getDashboardData()` — выполняет `prisma.$transaction([...])` с параллельными запросами для всех шести цифр + двух списков.

**`getDashboard.ts`** — use-case, вызывает репозиторий, возвращает `DashboardResponse`.

### 5. `PATCH /admin/messages/mark-all-read`

Устанавливает `isReadByAdmin = true` для всех сообщений. Вызывается со страницы AdminMessages (реализуется позже). В рамках этого спека — только endpoint без UI.

### 6. Подключение в `app.ts`

```ts
// composition root
const adminRepo = makeAdminRepository(prisma)
const getDashboard = makeGetDashboard(adminRepo)
app.route('/api', makeAdminRouter(getDashboard, markAllMessagesRead))
```

---

## Frontend

### 1. `adminDashboardApi.ts`

Расположение: `apps/web/src/widgets/admin-panel/adminDashboardApi.ts`

Экспортирует composable `useDashboard()`:

```ts
function useDashboard(): {
  data: Ref<DashboardResponse | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
}
```

Загружает данные при вызове `refresh()`. `onMounted` в компоненте вызывает `refresh()`.

### 2. `AdminDashboard.vue`

- Подключает `useDashboard()`
- Пока `isLoading === true` — показывает `—` в карточках (текущее поведение)
- При `error !== null` — показывает сообщение об ошибке вместо контента
- Формат выручки: `${{ value.toFixed(2) }}`
- Формат даты: `dd MMM, HH:mm` (например, "31 May, 14:23") — через `Intl.DateTimeFormat`

**Recent Orders** — таблица:

| # | Покупатель | Сумма | Статус | Дата |
|---|-----------|-------|--------|------|

Строки — `<RouterLink to="/admin/orders/{{ id }}">`. Статус — цветной бейдж:
- `PENDING` → серый
- `PAID` → зелёный
- `PROCESSING` → жёлтый
- `SHIPPED` → синий
- `DELIVERED` → зелёный тёмный
- `CANCELLED` / `REFUNDED` → красный

**Recent Messages** — список карточек:
- Имя покупателя + дата
- Текст обрезан до 80 символов (`…`)
- Если `orderNumber !== null` — показать "#N" рядом с именем

**Мобильная адаптация**: таблица заказов на мобиле схлопывается — каждая строка становится карточкой с именем, суммой, статусом и датой.

---

## Error handling

- API возвращает 401 → редирект на `/login` (стандартный fetch interceptor)
- API возвращает 403 → показать "Access denied" в центре страницы
- Network error → показать "Failed to load dashboard data" с кнопкой Retry

---

## Out of scope

- Real-time обновления (polling / WebSocket)
- Полная страница AdminMessages с разметкой "прочитано"
- Страница деталей заказа `/admin/orders/:id`
