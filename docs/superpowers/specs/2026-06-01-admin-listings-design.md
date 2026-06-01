# Admin Listings — Design Spec

## Overview

Страница `/admin/listings` в админ-панели. Управление товарами и категориями магазина NatsDoll.

## Layout

Страница состоит из двух секций, расположенных вертикально:
1. **Products** — grid карточек с фильтрами и пагинацией
2. **Categories** — список с inline-редактированием, ниже grid

Цветовая палитра совпадает с остальным сайтом: фон `#fdf6ef`, акцент `#8b5e52`, границы `#ecddd5`, текст `#2c1810`.

## Topbar

- Заголовок: "Listings", подзаголовок: "Products & categories"
- Кнопка **«+ New product»** (справа) — переход на `/admin/listings/new`

## Filters bar

Три контрола в строку:
- Поиск по названию (text input)
- Выпадающий список категорий (All categories + список из БД)
- Выпадающий список статуса: All / Published / Draft

Справа — счётчик "N products" (общее кол-во после фильтрации).

## Product Grid

- Отображение: карточки, 2 колонки на мобиле, 3 на планшете/десктопе
- Каждая карточка содержит:
  - Фото товара (первое из массива `images`, или placeholder)
  - Бейдж статуса (Published / Draft) — левый верхний угол фото
  - Бейдж «0 in stock» (красный) — правый верхний угол, только если `stock === 0`
  - Название товара
  - Категория · Цена
  - Количество в наличии (или "Out of stock" если 0)
  - Кнопка **Edit** → переход на `/admin/listings/:id/edit`
  - Кнопка **⋯** (меню) с действиями: Publish/Hide (toggle), Delete

## Пагинация

Цифровая, по центру под grid. Текущая страница — акцентный фон `#8b5e52`. Лимит: 12 карточек/страница.

## Форма товара (отдельная страница)

Маршруты: `/admin/listings/new`, `/admin/listings/:id/edit`.

Поля:
- Название (text)
- Slug (text, автогенерация из названия, редактируемый)
- Категория (select)
- Цена (number)
- Количество в наличии (number)
- Описание (textarea)
- Изображения (загрузка через Яндекс Object Storage, порядок перетаскиванием — scope следующего этапа, пока просто список URL)
- Message options (список строк, добавить/удалить)
- Статус: Published / Draft (toggle/checkbox)

Кнопки: **Save**, **Cancel** (← назад к listings). При создании — после успешного сохранения редирект на `/admin/listings`.

## Секция Categories

Расположена ниже product grid на той же странице. Карточка с заголовком "CATEGORIES" и ссылкой "+ Add category".

Каждая категория — строка:
- Название
- Кол-во товаров в категории (read-only)
- Иконка ✎ (редактировать) — переводит строку в режим inline-редактирования
- Иконка ✕ (удалить) — с подтверждением если в категории есть товары

Inline-редактирование: поле ввода с текущим названием + кнопки **Save** / **Cancel**.

Добавление: "+ Add category" → новая строка в режиме редактирования снизу списка.

## API (необходимые эндпоинты)

Текущие (публичные, без auth):
- `GET /products` — список с фильтрами
- `GET /categories` — список категорий

Необходимо добавить (admin-only):
- `POST /admin/products` — создать товар
- `PUT /admin/products/:id` — обновить товар
- `DELETE /admin/products/:id` — мягкое удаление (`deletedAt`)
- `PATCH /admin/products/:id/publish` — toggle isPublished
- `POST /admin/categories` — создать категорию
- `PUT /admin/categories/:id` — переименовать
- `DELETE /admin/categories/:id` — удалить (с проверкой на товары)

## Frontend структура (FSD)

```
widgets/admin-panel/components/
  AdminListings.vue          — главный компонент вкладки
  AdminListingsFilters.vue   — строка фильтров
  AdminProductCard.vue       — карточка товара
  AdminCategoriesSection.vue — секция категорий

pages/
  AdminListingNewPage.vue    — форма создания
  AdminListingEditPage.vue   — форма редактирования
```

Composable `useAdminListings.ts` — состояние списка, фильтры, пагинация, запросы к API.
Composable `useAdminCategories.ts` — CRUD категорий.

## Состояния

- **Loading** — skeleton или "Loading…" в grid
- **Empty** — "No products yet" с кнопкой "+ New product"
- **Error** — сообщение + кнопка Retry (аналогично AdminDashboard)
