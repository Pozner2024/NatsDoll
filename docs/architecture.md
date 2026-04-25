# NatsDoll — Архитектура проекта

**Версия:** 3.0 
**Дата:** 2026-04-05

---

## Обзор

NatsDoll — B2C интернет-магазин хэндмейд изделий. Проект использует **Feature-Sliced Design (ФСД)** для структурирования фронтенда.

**Правило импортов:** только сверху вниз — `pages` → `widgets` → `features` → `entities` → `shared`. Импорт снизу вверх запрещён. Deep imports запрещены — всегда через `index.ts`.

---

## Стек технологий

| Слой        | Технология                  |
| ----------- | --------------------------- |
| Frontend    | Vue 3 + Pinia + Vite + TS   |
| Backend     | Hono + TypeScript + Node.js |
| БД          | PostgreSQL + Prisma ORM     |
| Shared      | npm workspaces + Zod + TS   |
| Auth        | JWT + Google OAuth          |
| Изображения | Яндекс Object Storage (S3)  |
| Платежи     | PayPal REST API             |
| Тесты       | Vitest + Playwright         |
| Deploy      | VPS + Docker Compose        |

---

## Структура проекта

```
NatsDoll/
├── apps/
│   ├── api/              ← Hono backend
│   │   ├── src/
│   │   │   ├── features/ ← бизнес-логика (auth, products, cart, etc)
│   │   │   ├── shared/   ← общие слои (errors, middleware, utils, infrastructure)
│   │   │   └── app.ts    ← composition root (инжекция зависимостей)
│   │   ├── prisma/       ← ORM, миграции, schema
│   │   └── tests/
│   │
│   └── web/              ← Vue 3 frontend
│       ├── src/
│       │   ├── pages/      ← страницы (роутинг)
│       │   ├── widgets/    ← самодостаточные блоки с логикой
│       │   ├── features/   ← действия пользователя
│       │   ├── entities/   ← бизнес-сущности
│       │   ├── shared/     ← UI-примитивы и утилиты
│       │   ├── router/     ← Vue Router
│       │   └── App.vue
│       └── tests/
│           └── e2e/        ← Playwright тесты
│
├── packages/
│   └── shared/           ← npm workspace
│       ├── schemas/      ← Zod валидация
│       ├── types/        ← TS типы
│       └── enums/        ← Role, OrderStatus (string enums)
│
├── docs/                 ← документация
└── package.json          ← npm workspaces
```

---

## ФРОНТЕНД: ФСД слои

### Слои (сверху вниз)

| Слой       | Назначение                                              | Примеры                          |
| ---------- | ------------------------------------------------------- | -------------------------------- |
| `pages`    | Страницы приложения, точки входа роутера                | HomePage, CartPage               |
| `widgets`  | Самодостаточные блоки со своей логикой и состоянием     | AppHeader, HeroSlider            |
| `features` | Действия пользователя (бизнес-операции)                 | AddToCart, Login, Search         |
| `entities` | Бизнес-сущности                                         | Product, User, Order             |
| `shared`   | UI-примитивы без бизнес-логики, утилиты                 | AppButton, AppLogo               |

### Структура слайса (widgets / features / entities)

```
{layer}/{sliceName}/
├── {SliceName}.vue             главный компонент
├── components/                 (опционально) если подкомпонентов 2+
│   └── SubComponent.vue
├── use{SliceName}.ts           (опционально) composable с логикой
├── {sliceName}Api.ts           (опционально) HTTP запросы
├── store.ts                    (опционально) Pinia store
├── types.ts                    (опционально) если тип используется в 2+ файлах
├── {sliceName}.test.ts         unit-тесты рядом с кодом
└── index.ts                    ОБЯЗАТЕЛЕН — публичный API
```

### Структура shared (фронтенд)

```
shared/
├── ui/              Vue компоненты-примитивы (AppButton, AppLogo, etc)
├── lib/             утилиты и helpers
├── api/             базовый HTTP-клиент
├── config/          константы, env
└── index.ts         экспортирует публичный API
```

### Тесты

Unit-тесты живут **рядом с компонентом** в том же слайсе:

```
widgets/hero-slider/
├── HeroSlider.vue
├── HeroSlider.test.ts   ← рядом
└── index.ts
```

E2e-тесты (Playwright) — в `tests/e2e/`, так как тестируют приложение целиком.

### Правильные и неправильные импорты

```typescript
// ✓ ПРАВИЛЬНО — через index.ts, направление сверху вниз
import { AppHeader } from '@/widgets/app-header'
import { HeroSlider } from '@/widgets/hero-slider'
import { AppButton } from '@/shared'

// ✗ ЗАПРЕЩЕНО — deep imports
import AppHeader from '@/widgets/app-header/AppHeader.vue'
import { cartApi } from '@/features/cart/cartApi'

// ✗ ЗАПРЕЩЕНО — импорт снизу вверх
import { HeroSlider } from '@/widgets/hero-slider'  // из shared
```

ESLint правило `no-restricted-imports` проверяет и запрещает deep imports.

### Где используется Pinia store

**Store обязателен в:**

- `auth/` — глобальная сессия пользователя
- `catalog/` — фильтры и состояние каталога
- `cart/` — товары в корзине
- `checkout/` — состояние формы оформления
- `orders/` — список заказов пользователя
- `admin/` — состояние админ-панели

**Store опционален в:**

- `product/` — данные конкретного товара
- `gallery/` — галерея товара
- `reviews/` — отзывы товара
- `profile/` — профиль пользователя

### CSS и стили

Стили пишутся в `<style scoped lang="scss">` компонента, используется **BEM нотация**.
Глобальные стили — в `src/assets/styles/`:

```
assets/styles/
├── variables.scss   ← CSS-переменные (цвета, шрифты, z-index, layout)
└── global.scss      ← глобальный сброс и базовые стили
```

**Правила CSS:**

- `cursor: pointer` — запрещён (`global.scss` сбрасывает его глобально)
- Цвета с прозрачностью — `rgb(r g b / alpha)`, никогда `rgba(r, g, b, alpha)`
- Статичные цвета — hex (`#fdf6ef`), прозрачные — через CSS-переменные с каналами (`rgb(var(--btn-gradient-dark) / 0.2)`)
- Z-index — каскадом через `calc()`:

```scss
--z-slider-slide: 0;
--z-slider-overlay: calc(var(--z-slider-slide) + 1);
--z-slider-controls: calc(var(--z-slider-overlay) + 1);
--z-header: 10;
--z-dropdown: calc(var(--z-header) + 1);
```

---

## БЭКЕНД: Clean Architecture (упрощённая)

### Структура фичи — 3 слоя

```
features/{featureName}/
├── application/                    бизнес-логика (use-cases)
│   ├── login.ts
│   ├── register.ts
│   └── refreshToken.ts
├── infrastructure/                 работа с БД (репозитории)
│   └── {featureName}Repository.ts
├── presentation/                   HTTP маршруты (Hono)
│   └── {featureName}Routes.ts
└── index.ts                        публичный API
```

### Application слой

Содержит бизнес-логику в виде use-cases. Один файл = одна операция:

```typescript
// features/auth/application/login.ts
export async function login(
  email: string,
  password: string,
  userRepository: UserRepository,
) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new NotFoundError("User not found");

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) throw new ValidationError("Invalid password");

  const tokens = generateTokens(user.id);
  return { user, tokens };
}
```

**Правила:**

- Один файл на одну операцию (не один большой сервис)
- Получает репозиторий как параметр (инжекция зависимостей)
- Работает с Prisma-моделями напрямую
- Не зависит от Hono или других фреймворков

### Infrastructure слой

Работает с БД через Prisma:

```typescript
// features/users/infrastructure/userRepository.ts
export class UserRepository {
  async findByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  }

  async create(data: UserCreateInput) {
    return await prisma.user.create({ data });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }
}
```

### Presentation слой

HTTP маршруты и обработчики Hono:

```typescript
// features/auth/presentation/authRoutes.ts
export function registerAuthRoutes(app: HonoApp) {
  app.post("/auth/login", async (c) => {
    const { email, password } = await c.req.json();
    const result = await login(email, password, userRepository);
    return c.json(result);
  });
}
```

### Инжекция зависимостей (composition root)

`app.ts` — единственный файл, который импортирует и application, и infrastructure:

```typescript
// apps/api/src/app.ts
import { registerAuthRoutes } from "./features/auth";
import { userRepository } from "./features/users/infrastructure";

const app = new Hono();
app.use(errorHandler);
registerAuthRoutes(app);
export default app;
```

### Структура shared (бэкенд)

```
shared/
├── errors/                кастомные ошибки
├── infrastructure/        конфиг БД (Prisma client)
├── middleware/            Hono middleware
└── utils/                 помощники
```

---

## npm Workspaces и Shared пакет

```
packages/shared/
├── schemas/               Zod-схемы валидации
├── types/                 TypeScript типы
└── enums/                 String enums (Role, OrderStatus)
```

---

## Ключевые решения

### Аутентификация

- **Access token:** JWT, хранится в памяти браузера
- **Refresh token:** JWT, хранится в httpOnly cookie, хэшируется HMAC-SHA256
- **Google OAuth:** для быстрой регистрации

### База данных

- **Soft delete:** `deletedAt` поле вместо физического DELETE
- **onDelete: Restrict** на FK к Product (заказы и отзывы сохраняются)
- **Явные @@index** на всех FK полях для производительности

### Изображения (Яндекс Object Storage)

- **Загрузка:** бэкенд загружает файл через S3-совместимый API (`@aws-sdk/client-s3`) на эндпоинт `https://storage.yandexcloud.net`
- **Хранение:** в БД сохраняется полный публичный URL изображения (`https://{bucket}.storage.yandexcloud.net/{key}`)
- **Отдача:** фронтенд использует URL напрямую из БД
- **Переменные окружения:**
  - `YANDEX_S3_ACCESS_KEY` — бэкенд (ID ключа доступа)
  - `YANDEX_S3_SECRET_KEY` — бэкенд (секретный ключ)
  - `YANDEX_S3_BUCKET` — бэкенд (имя бакета)
  - `YANDEX_S3_ENDPOINT` — бэкенд (`https://storage.yandexcloud.net`)

### CORS

Настраивается **первым middleware** в `app.ts`, до любых маршрутов.

### Rate limiting

Реализовано in-memory. **Требует одной реплики** `api` в docker-compose.

---

## Правила разработки

### Что обязательно делать

- ✓ Экспортировать публичный API через `index.ts`
- ✓ Импортировать строго сверху вниз по слоям ФСД
- ✓ Писать unit-тесты рядом с компонентом
- ✓ Использовать composables для логики
- ✓ Использовать Zod-схемы из shared для валидации
- ✓ Инжектировать зависимости через параметры

### Что нельзя делать

- ✗ Deep imports (импортировать из подпапок минуя `index.ts`)
- ✗ Импортировать снизу вверх по слоям ФСД
- ✗ Писать логику в компонентах (переносить в composables)
- ✗ Использовать Prisma в presentation слое
- ✗ `cursor: pointer` в стилях
- ✗ `rgba()` — использовать `rgb(r g b / alpha)`
- ✗ Коммитить без явного запроса пользователя
