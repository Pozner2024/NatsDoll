# Загрузка фото товара файлами (вместо ввода URL)

Дата: 2026-06-06

## Проблема

В админ-форме товара (`apps/web/src/pages/AdminProductFormPage.vue`) фотографии задаются
текстовым полем «Images (URLs, one per line)» — администратор вручную вставляет ссылки.
Это неудобно. Нужно загружать файлы прямо с компьютера.

На бэкенде уже есть готовый хелпер `uploadToS3()` (`apps/api/src/shared/lib/s3Client.ts`,
Яндекс Object Storage), но он нигде не вызывается — HTTP-роута для загрузки нет.

## Решение

Загрузка файлов с компьютера (выбор + drag&drop) через наш бэкенд (вариант «proxy»):
фронт отправляет файл на API → бэк кладёт его в S3 через `uploadToS3()` → возвращает
ссылку → фронт держит её в форме. В БД ссылки записываются только при сохранении товара
(существующий механизм `POST/PUT /admin/products` не меняется).

Поле `images` остаётся `string[]` в БД и API — меняется только способ получения ссылок.
Существующие товары с уже введёнными URL продолжают работать без изменений.

### Принцип работы (два шага)

1. **Загрузка файла (сразу при выборе фото):** файл летит на `POST /admin/products/images`,
   бэк кладёт в S3 и возвращает ссылку, фронт показывает превью и держит ссылку в `form.images`.
   В БД пока ничего не записано.
2. **Сохранение товара (по кнопке Save):** вся форма, включая список ссылок `images`,
   уходит на `POST/PUT /admin/products` — вот тут ссылки попадают в БД.

Следствие: если фото загружено, но товар не сохранён, файл остаётся в S3 «сиротой».
По решению владельца файлы из S3 **не удаляются** (проще и безопаснее; при объёмах
1–200 пользователей/день накопление сирот несущественно).

## Хранилище

Все новые загрузки кладутся в одну фиксированную папку, без привязки к категории
(категория может быть не выбрана в момент загрузки и может меняться позже —
файлы в S3 не перемещаются):

```
бакет natsdoll → items/new/{uuid}.{ext}
URL: https://storage.yandexcloud.net/natsdoll/items/new/{uuid}.{ext}
```

- Префикс ключа: `items/new/`.
- Имя файла: `crypto.randomUUID()` (без коллизий при одинаковых исходных именах).
- Расширение по `contentType`: `image/jpeg → jpg`, `image/png → png`, `image/webp → webp`,
  `image/avif → avif`, `image/gif → gif`.

Ключ вида `items/new/{uuid}.jpg` проходит существующий `KEY_PATTERN` в `s3Client.ts`.

## Бэкенд

### Use-case `apps/api/src/features/admin/application/uploadProductImage.ts`
- Вход: `{ bytes: Uint8Array; contentType: string }`.
- Генерирует ключ `items/new/{uuid}.{ext}` (расширение по contentType).
- Вызывает `uploadToS3(key, bytes, contentType)`, возвращает `{ url }`.
- Валидация типа/размера (белый список image-типов, ≤ 5 МБ) уже внутри `uploadToS3`
  (бросает `AppError(400)`) — не дублируем. Если contentType не из белого списка
  расширений — это тот же набор, что и в `uploadToS3`, поэтому маппинг расширений
  покрывает ровно допустимые типы.

### Тип в `apps/api/src/features/admin/types.ts`
```ts
export type UploadProductImage = (input: { bytes: Uint8Array; contentType: string }) => Promise<{ url: string }>
```

### Роут в `apps/api/src/features/admin/presentation/adminRoutes.ts`
- `POST /admin/products/images` (под уже включённым `requireAdmin`).
- `multipart/form-data`, поле `file`.
- Парсит `await c.req.parseBody()`, берёт `File`, читает `arrayBuffer()` → `Uint8Array`,
  берёт `file.type` как contentType, вызывает use-case, возвращает `{ url }` со статусом 201.
- Если файла нет в запросе — `c.json({ error: ... }, 422)`.
- Ошибки `AppError(400)` из `uploadToS3` уходят в глобальный error-handler.
- `makeAdminRouter` получает `uploadProductImage` новым параметром.

### Composition root `apps/api/src/app.ts`
- Создаёт `uploadProductImage` (репозиторных зависимостей нет) и передаёт в `makeAdminRouter`.

## Фронтенд

### Компонент `apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue`
Экспорт через `apps/web/src/widgets/admin-panel/index.ts`.

- Props: `modelValue: string[]`.
- Emits: `update:modelValue` (string[]), `update:uploading` (boolean).
- UI:
  - Зона drag&drop + кнопка «Choose files» (скрытый `<input type="file" accept="image/*" multiple>`).
  - Сетка миниатюр: превью, кнопка удаления (✕), перетаскивание для смены порядка.
  - Первое фото = главное (бейдж «Main»).
- Логика:
  - При выборе/перетаскивании: клиентская проверка (тип из белого списка, ≤ 5 МБ) →
    загрузка каждого файла через `authFetch('/admin/products/images', { method: 'POST', body: formData })`
    (где `formData.append('file', file)`); `authFetch` без `json` не ставит `Content-Type`,
    браузер сам проставит multipart-boundary.
  - Полученная ссылка добавляется в `modelValue`.
  - Лимит 10 фото (совпадает с `.max(10)` в `productBodySchema`).
  - Пока есть незавершённые загрузки — `update:uploading=true`.

### Страница `apps/web/src/pages/AdminProductFormPage.vue`
- Блок textarea «Images (URLs, one per line)» заменяется на:
  ```html
  <AdminImageUploader v-model="form.images" v-model:uploading="isUploading" />
  ```
- Добавляется `const isUploading = ref(false)`.
- Кнопка Save блокируется при `isSaving || isUploading`.

## Обработка ошибок

- Неверный тип / больше 5 МБ — инлайн-сообщение под зоной, файл пропускается.
- Ошибка сети/сервера при загрузке — сообщение «Не удалось загрузить {имя}», можно выбрать заново.
- Без S3-env (локальная разработка) роут отдаёт ошибку — это ожидаемо; в проде env настроены.

## Тесты

- **API**:
  - unit на `uploadProductImage` (мок `uploadToS3`) — проверка генерации ключа `items/new/...`
    и маппинга расширения по contentType.
  - роут-тест `POST /admin/products/images` в стиле `adminRoutes.test.ts` — мультипарт,
    admin-guard, успешный ответ `{ url }`, 422 при отсутствии файла.
- **Web**:
  - тест `AdminImageUploader` (vitest `--root apps/web`) — выбор файлов вызывает `authFetch`
    и обновляет список; удаление убирает ссылку; лимит 10 не превышается.

## Затрагиваемые файлы

**Новые:**
- `apps/api/src/features/admin/application/uploadProductImage.ts` (+ `.test.ts`)
- `apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue` (+ `.test.ts`)

**Изменяются:**
- `apps/api/src/features/admin/types.ts`
- `apps/api/src/features/admin/presentation/adminRoutes.ts`
- `apps/api/src/app.ts`
- `apps/web/src/widgets/admin-panel/index.ts`
- `apps/web/src/pages/AdminProductFormPage.vue`

## Вне охвата (YAGNI)

- Удаление файлов из S3 (orphan cleanup).
- Загрузка фото в других местах админки (распродажи только отображают фото товаров).
- Ресайз/оптимизация изображений на сервере.
- presigned-URL (прямая загрузка в S3 минуя бэк).
