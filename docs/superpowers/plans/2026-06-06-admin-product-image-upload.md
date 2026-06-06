# Загрузка фото товара файлами — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить ручной ввод URL фотографий в админ-форме товара на загрузку файлов с компьютера (выбор + drag&drop) через бэкенд в Яндекс S3.

**Architecture:** Фронт грузит файл на `POST /admin/products/images` → бэк кладёт его в S3 через готовый `uploadToS3()` в папку `items/new/{uuid}.{ext}` → возвращает ссылку. Ссылки накапливаются в `form.images` и пишутся в БД только при сохранении товара (существующий механизм не меняется). Поле `images` остаётся `string[]`.

**Tech Stack:** Hono + TypeScript (API), Vue 3 + `<script setup>` + SCSS (web), Vitest (тесты), AWS SDK v3 (S3, уже подключён).

**Спека:** `docs/superpowers/specs/2026-06-06-admin-product-image-upload-design.md`

> **Замечание про git (правило проекта CLAUDE.md):** коммиты делаются ТОЛЬКО с явного разрешения пользователя. Шаги «Commit» ниже оставлены по стандарту плана, но при исполнении нужно спросить разрешение перед каждым коммитом.

---

## File Structure

**Новые файлы:**
- `apps/api/src/features/admin/application/uploadProductImage.ts` — use-case: генерирует ключ `items/new/{uuid}.{ext}` и зовёт инжектированную функцию загрузки.
- `apps/api/src/features/admin/application/uploadProductImage.test.ts` — unit-тест use-case.
- `apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue` — компонент загрузки (dropzone, превью, удаление, reorder).
- `apps/web/src/widgets/admin-panel/components/AdminImageUploader.test.ts` — тест компонента.

**Изменяются:**
- `apps/api/src/features/admin/types.ts` — добавить тип `UploadProductImage`.
- `apps/api/src/features/admin/index.ts` — экспорт `makeUploadProductImage`.
- `apps/api/src/features/admin/presentation/adminRoutes.ts` — новый параметр + роут.
- `apps/api/src/features/admin/presentation/adminRoutes.test.ts` — новый позиционный аргумент в `makeApp` и в 403-тесте + тесты роута.
- `apps/api/src/app.ts` — создание use-case и передача в роутер.
- `apps/web/src/widgets/admin-panel/index.ts` — экспорт компонента.
- `apps/web/src/pages/AdminProductFormPage.vue` — замена textarea на компонент + блокировка Save при загрузке.

---

## Task 1: Backend use-case `uploadProductImage`

**Files:**
- Create: `apps/api/src/features/admin/application/uploadProductImage.ts`
- Test: `apps/api/src/features/admin/application/uploadProductImage.test.ts`
- Modify: `apps/api/src/features/admin/types.ts`

- [ ] **Step 1: Добавить тип `UploadProductImage` в `types.ts`**

В конец секции `// ── Admin Products ──` (после `export type GetAdminProduct = ...` на строке ~141) добавить:

```ts
export type UploadProductImage = (input: { bytes: Uint8Array; contentType: string }) => Promise<{ url: string }>
```

- [ ] **Step 2: Написать падающий тест**

Создать `apps/api/src/features/admin/application/uploadProductImage.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { makeUploadProductImage } from './uploadProductImage'

describe('uploadProductImage', () => {
  it('генерирует ключ items/new/<uuid>.jpg и возвращает url', async () => {
    const upload = vi.fn().mockResolvedValue('https://s3/natsdoll/items/new/x.jpg')
    const bytes = new Uint8Array([1, 2, 3])

    const result = await makeUploadProductImage(upload)({ bytes, contentType: 'image/jpeg' })

    expect(upload).toHaveBeenCalledOnce()
    const [key, body, contentType] = upload.mock.calls[0]!
    expect(key).toMatch(/^items\/new\/[0-9a-f-]+\.jpg$/)
    expect(body).toBe(bytes)
    expect(contentType).toBe('image/jpeg')
    expect(result).toEqual({ url: 'https://s3/natsdoll/items/new/x.jpg' })
  })

  it('маппит contentType в расширение', async () => {
    const upload = vi.fn().mockResolvedValue('url')
    await makeUploadProductImage(upload)({ bytes: new Uint8Array(), contentType: 'image/webp' })
    expect(upload.mock.calls[0]![0]).toMatch(/\.webp$/)
  })

  it('бросает 400 на неподдерживаемый тип', async () => {
    const upload = vi.fn()
    await expect(
      makeUploadProductImage(upload)({ bytes: new Uint8Array(), contentType: 'application/pdf' }),
    ).rejects.toThrow('Unsupported file type')
    expect(upload).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application/uploadProductImage.test.ts --reporter=basic`
Expected: FAIL — `Cannot find module './uploadProductImage'`.

- [ ] **Step 4: Реализовать use-case**

Создать `apps/api/src/features/admin/application/uploadProductImage.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import type { UploadProductImage } from '../types'

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

type UploadFn = (key: string, body: Uint8Array, contentType: string) => Promise<string>

export function makeUploadProductImage(upload: UploadFn): UploadProductImage {
  return async ({ bytes, contentType }) => {
    const ext = EXT_BY_CONTENT_TYPE[contentType]
    if (!ext) throw new AppError(400, 'Unsupported file type')
    const key = `items/new/${randomUUID()}.${ext}`
    const url = await upload(key, bytes, contentType)
    return { url }
  }
}
```

> Проверь, что `AppError` лежит в `apps/api/src/shared/errors` (s3Client.ts импортирует его как `'../errors'`). Если конструктор иной — открой `shared/errors` и подставь точную сигнатуру.

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application/uploadProductImage.test.ts --reporter=basic`
Expected: PASS (3 теста).

- [ ] **Step 6: Экспорт из feature-index**

В `apps/api/src/features/admin/index.ts` после строки `export { makeCountProductsInSale } ...` добавить:

```ts
export { makeUploadProductImage } from './application/uploadProductImage'
```

- [ ] **Step 7: Commit** (с разрешения пользователя)

```bash
git add apps/api/src/features/admin/application/uploadProductImage.ts apps/api/src/features/admin/application/uploadProductImage.test.ts apps/api/src/features/admin/types.ts apps/api/src/features/admin/index.ts
git commit -m "feat: add uploadProductImage use-case"
```

---

## Task 2: Backend route + wiring

**Files:**
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Test: `apps/api/src/features/admin/presentation/adminRoutes.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Написать падающие тесты роута**

В `apps/api/src/features/admin/presentation/adminRoutes.test.ts`:

1a. В импорт типов (строки 4–16) добавить `UploadProductImage`:
```ts
  CreateSale, UpdateSale, DeleteSale, ListSales, GetActiveSale, CountProductsInSale, UploadProductImage,
```

1b. В тип-объект `overrides` функции `makeApp` (после `countProductsInSale?: CountProductsInSale`) добавить:
```ts
  uploadProductImage?: UploadProductImage
```

1c. В вызов `makeAdminRouter(...)` внутри `makeApp` последним аргументом (после `overrides.countProductsInSale ?? ...`) добавить:
```ts
    overrides.uploadProductImage ?? vi.fn().mockResolvedValue({ url: 'https://s3/items/new/x.jpg' }),
```

1d. В 403-тесте (`makeAdminRouter(vi.fn(), ... 26 шт ...)`) добавить ещё один `vi.fn()` — итого 27.

1e. Добавить новый describe-блок в конец файла:
```ts
describe('POST /admin/products/images', () => {
  it('загружает файл и возвращает url (201)', async () => {
    const upload = vi.fn().mockResolvedValue({ url: 'https://s3/items/new/abc.png' })
    const app = makeApp({ uploadProductImage: upload })
    const form = new FormData()
    form.append('file', new File([new Uint8Array([1, 2, 3])], 'pic.png', { type: 'image/png' }))
    const res = await app.request('/admin/products/images', { method: 'POST', body: form })
    expect(res.status).toBe(201)
    const body = await res.json() as { url: string }
    expect(body.url).toBe('https://s3/items/new/abc.png')
    const arg = upload.mock.calls[0]![0] as { bytes: Uint8Array; contentType: string }
    expect(arg.contentType).toBe('image/png')
    expect(arg.bytes).toBeInstanceOf(Uint8Array)
  })

  it('возвращает 422 если файл не передан', async () => {
    const app = makeApp()
    const res = await app.request('/admin/products/images', { method: 'POST', body: new FormData() })
    expect(res.status).toBe(422)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/presentation/adminRoutes.test.ts --reporter=basic`
Expected: FAIL — роут `/admin/products/images` отдаёт 404 (ещё не существует), либо TS-ошибка про лишний аргумент.

- [ ] **Step 3: Реализовать роут и параметр**

В `apps/api/src/features/admin/presentation/adminRoutes.ts`:

3a. В импорт типов (строки 5–14) добавить `UploadProductImage`:
```ts
  CreateSale, UpdateSale, DeleteSale, ListSales, GetActiveSale, CountProductsInSale, SaleInput,
  UploadProductImage,
```

3b. В сигнатуру `makeAdminRouter(...)` последним параметром (после `countProductsInSale: CountProductsInSale,` на строке ~114) добавить:
```ts
  uploadProductImage: UploadProductImage,
```

3c. Сразу после блока `router.post('/products', ...)` (после его закрывающей `})` на строке ~168) добавить роут:
```ts
  router.post('/products/images', async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 422)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await uploadProductImage({ bytes, contentType: file.type })
    return c.json(result, 201)
  })
```

> `requireAdmin` уже применён ко всему роутеру (`router.use('*', requireAdmin)`), отдельная защита роуту не нужна.

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/presentation/adminRoutes.test.ts --reporter=basic`
Expected: PASS (включая 2 новых теста).

- [ ] **Step 5: Подключить в composition root `app.ts`**

5a. В импорт из `'./features/admin'` (строки ~111–114) добавить `makeUploadProductImage,`.

5b. Убедиться, что `uploadToS3` импортирован из shared-баррели. Найти существующий импорт из `'./shared/lib'`; если `uploadToS3` там не импортируется — добавить его в этот импорт (он экспортируется из `apps/api/src/shared/lib/index.ts`). Если импорта из `'./shared/lib'` ещё нет — добавить строку:
```ts
import { uploadToS3 } from './shared/lib'
```

5c. Рядом с прочими admin use-case (после `const countProductsInSale = makeCountProductsInSale(adminRepo)` на строке ~292) добавить:
```ts
  const uploadProductImage = makeUploadProductImage(uploadToS3)
```

5d. В вызов `makeAdminRouter(...)` (строки 294–303) последним аргументом (после `countProductsInSale,`) добавить `uploadProductImage`:
```ts
    createSale, updateSale, deleteSale, listSales, getActiveSale, countProductsInSale,
    uploadProductImage,
  ))
```

- [ ] **Step 6: Полный typecheck API**

Run (из корня репозитория):
```bash
node ./node_modules/prisma/build/index.js generate --schema apps/api/prisma/schema.prisma
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json
```
Expected: без ошибок. (Если tsc «ложно-зелёный» — удалить `apps/api/dist` и повторить, см. memory `project_tsc_prisma_stale`.)

- [ ] **Step 7: Commit** (с разрешения пользователя)

```bash
git add apps/api/src/features/admin/presentation/adminRoutes.ts apps/api/src/features/admin/presentation/adminRoutes.test.ts apps/api/src/app.ts
git commit -m "feat: add POST /admin/products/images upload route"
```

---

## Task 3: Frontend компонент `AdminImageUploader`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue`
- Test: `apps/web/src/widgets/admin-panel/components/AdminImageUploader.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/web/src/widgets/admin-panel/components/AdminImageUploader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/shared', () => ({
  authFetch: vi.fn(),
  apiErrorMessage: vi.fn().mockResolvedValue('upload failed'),
}))

import { authFetch } from '@/shared'
import AdminImageUploader from './AdminImageUploader.vue'

const mockAuthFetch = vi.mocked(authFetch)

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
}

describe('AdminImageUploader', () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it('загружает выбранный файл и эмитит обновлённый список', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://s3/items/new/a.png' }),
    } as Response)

    const wrapper = mount(AdminImageUploader, { props: { modelValue: [] } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(mockAuthFetch).toHaveBeenCalledWith('/admin/products/images', expect.objectContaining({ method: 'POST' }))
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![emitted!.length - 1][0]).toEqual(['https://s3/items/new/a.png'])
  })

  it('пропускает файл неподдерживаемого типа и показывает ошибку', async () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: [] } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' })])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(mockAuthFetch).not.toHaveBeenCalled()
    expect(wrapper.find('.image-uploader__error').exists()).toBe(true)
  })

  it('удаляет картинку из списка', async () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: ['a.png', 'b.png'] } })
    await wrapper.findAll('.image-uploader__remove')[0]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![0][0]).toEqual(['b.png'])
  })

  it('первая картинка помечена как Main', () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: ['a.png', 'b.png'] } })
    expect(wrapper.find('.image-uploader__main').text()).toBe('Main')
    expect(wrapper.findAll('.image-uploader__main')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web src/widgets/admin-panel/components/AdminImageUploader.test.ts --reporter=basic`
Expected: FAIL — `Failed to resolve import './AdminImageUploader.vue'`.

> Тесты `.vue` ЗАПУСКАТЬ только с `--root apps/web`, иначе ложная ошибка парсинга (memory `project_web_vitest_root`).

- [ ] **Step 3: Реализовать компонент**

Создать `apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue`:

```vue
<template>
  <div class="image-uploader">
    <div
      class="image-uploader__dropzone"
      :class="{ 'image-uploader__dropzone--over': isOver }"
      @dragover.prevent="isOver = true"
      @dragleave.prevent="isOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        multiple
        class="image-uploader__input"
        @change="onChange"
      />
      <button
        type="button"
        class="image-uploader__choose"
        :disabled="modelValue.length >= MAX_IMAGES"
        @click="inputRef?.click()"
      >
        Choose files
      </button>
      <span class="image-uploader__hint">
        or drag &amp; drop · up to {{ MAX_IMAGES }} · max 5MB each
      </span>
    </div>

    <p
      v-if="error"
      class="image-uploader__error"
    >
      {{ error }}
    </p>

    <ul
      v-if="modelValue.length"
      class="image-uploader__grid"
    >
      <li
        v-for="(url, i) in modelValue"
        :key="url"
        class="image-uploader__item"
        draggable="true"
        @dragstart="dragIndex = i"
        @dragover.prevent
        @drop="onReorder(i)"
      >
        <img
          :src="url"
          class="image-uploader__thumb"
          alt=""
        />
        <span
          v-if="i === 0"
          class="image-uploader__main"
        >
          Main
        </span>
        <button
          type="button"
          class="image-uploader__remove"
          @click="remove(i)"
        >
          ✕
        </button>
      </li>
    </ul>

    <p
      v-if="uploadingCount > 0"
      class="image-uploader__status"
    >
      Uploading… ({{ uploadingCount }})
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { authFetch, apiErrorMessage } from '@/shared'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{
  'update:modelValue': [string[]]
  'update:uploading': [boolean]
}>()

const MAX_IMAGES = 10
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

const inputRef = ref<HTMLInputElement | null>(null)
const isOver = ref(false)
const error = ref<string | null>(null)
const uploadingCount = ref(0)
const dragIndex = ref<number | null>(null)

watch(uploadingCount, (n) => emit('update:uploading', n > 0))

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) handleFiles(Array.from(input.files))
  input.value = ''
}

function onDrop(e: DragEvent) {
  isOver.value = false
  if (e.dataTransfer?.files) handleFiles(Array.from(e.dataTransfer.files))
}

async function handleFiles(files: File[]) {
  error.value = null
  for (const file of files) {
    if (props.modelValue.length + uploadingCount.value >= MAX_IMAGES) {
      error.value = `Maximum ${MAX_IMAGES} images`
      break
    }
    if (!ALLOWED.includes(file.type)) {
      error.value = `Unsupported file type: ${file.name}`
      continue
    }
    if (file.size > MAX_BYTES) {
      error.value = `File is too large: ${file.name}`
      continue
    }
    await uploadOne(file)
  }
}

async function uploadOne(file: File) {
  uploadingCount.value++
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authFetch('/admin/products/images', { method: 'POST', body: formData })
    if (!res.ok) {
      error.value = await apiErrorMessage(res, `Failed to upload ${file.name}`)
      return
    }
    const { url } = await res.json() as { url: string }
    emit('update:modelValue', [...props.modelValue, url])
  } catch {
    error.value = `Failed to upload ${file.name}`
  } finally {
    uploadingCount.value--
  }
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onReorder(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const next = [...props.modelValue]
  const [moved] = next.splice(dragIndex.value, 1)
  next.splice(targetIndex, 0, moved!)
  dragIndex.value = null
  emit('update:modelValue', next)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px;
    border: 1px dashed var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    text-align: center;

    &--over {
      border-color: var(--color-accent);
      background: rgb(var(--color-accent-rgb) / 0.06);
    }
  }

  &__input {
    display: none;
  }

  &__choose {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: var(--font-display);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 18px;
    background: var(--color-white);
    color: var(--color-text);

    &:disabled {
      opacity: 0.5;
    }
  }

  &__hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__error {
    font-size: 0.8rem;
    color: var(--color-error);
  }

  &__status {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__item {
    position: relative;
    width: 88px;
    height: 88px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }

  &__thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__main {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
    padding: 2px 0;
    color: var(--color-white);
    background: rgb(0 0 0 / 0.55);
  }

  &__remove {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    font-size: 0.65rem;
    color: var(--color-white);
    background: rgb(0 0 0 / 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
```

> Перед запуском проверь имена CSS-переменных в `apps/web/src/assets/styles/variables.scss` — `--color-accent-rgb` может называться иначе. Если такой переменной нет, замени `rgb(var(--color-accent-rgb) / 0.06)` на существующий токен (например, `var(--color-bg)` или фон-hover из проекта). Цвета с прозрачностью — только через каналы `rgb(r g b / a)`, никогда `rgba()`.

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web src/widgets/admin-panel/components/AdminImageUploader.test.ts --reporter=basic`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit** (с разрешения пользователя)

```bash
git add apps/web/src/widgets/admin-panel/components/AdminImageUploader.vue apps/web/src/widgets/admin-panel/components/AdminImageUploader.test.ts
git commit -m "feat: add AdminImageUploader component"
```

---

## Task 4: Подключить компонент в форму товара

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/index.ts`
- Modify: `apps/web/src/pages/AdminProductFormPage.vue`

- [ ] **Step 1: Экспорт компонента из index**

В `apps/web/src/widgets/admin-panel/index.ts` добавить строку:
```ts
export { default as AdminImageUploader } from './components/AdminImageUploader.vue'
```

- [ ] **Step 2: Заменить textarea на компонент в форме**

В `apps/web/src/pages/AdminProductFormPage.vue` заменить блок строк 129–138 (label «Images (URLs, one per line)» с `<textarea>`) на:
```html
      <div class="product-form-page__label">
        Images
        <AdminImageUploader
          v-model="form.images"
          v-model:uploading="isUploading"
        />
      </div>
```

- [ ] **Step 3: Обновить импорт и добавить состояние загрузки**

3a. В импорт из `'@/widgets/admin-panel'` (строка 178) добавить `AdminImageUploader`:
```ts
import { useAdminCategories, AdminImageUploader, type AdminProductInput } from '@/widgets/admin-panel'
```

3b. После `const isSaving = ref(false)` (строка 187) добавить:
```ts
const isUploading = ref(false)
```

- [ ] **Step 4: Блокировать Save при загрузке**

В кнопке Save (строка ~165) заменить `:disabled="isSaving"` на:
```html
          :disabled="isSaving || isUploading"
```

- [ ] **Step 5: Typecheck web**

Run (из корня): `node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p apps/web/tsconfig.json`
Expected: без ошибок.

> Если `tsconfig.json` пути отличаются — запусти без `-p`, из каталога `apps/web` через root-бинарь; путь без кириллицы (`D:\Natalia\...`), Glob/tsc работают.

- [ ] **Step 6: Прогнать все web-тесты (на регрессии)**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
Expected: PASS (включая новый компонент, без сломанных существующих).

- [ ] **Step 7: Commit** (с разрешения пользователя)

```bash
git add apps/web/src/widgets/admin-panel/index.ts apps/web/src/pages/AdminProductFormPage.vue
git commit -m "feat: use AdminImageUploader in product form"
```

---

## Финальная проверка (после всех задач)

- [ ] **API тесты целиком:** `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api --reporter=basic` → PASS.
- [ ] **Web тесты целиком:** `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic` → PASS.
- [ ] **Typecheck API:** `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json` → без ошибок.
- [ ] **Typecheck web:** `node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p apps/web/tsconfig.json` → без ошибок.
- [ ] **Ручная проверка (нужны S3-env):** открыть `/admin/listings` → New product → перетащить картинку → дождаться превью → сохранить → проверить, что фото отображается в карточке листинга. Без S3-env загрузка вернёт ошибку — это ожидаемо локально.

## Ручное ревью кода (перед мержем)
- [ ] `code-reviewer` агент: critical/high findings блокируют (правило проекта).

---

## Notes / риски
- **S3-env обязательны** для реальной загрузки (`YANDEX_S3_*`). Локально без них роут отдаёт 500/400 — это нормально для дев-режима без S3.
- **Лимит размера тела запроса:** если на API стоит глобальный `bodyLimit` ниже 5 МБ — загрузка крупных файлов упадёт. На момент написания такого мидлвара в admin-роутере нет; если появится — согласовать лимит с `MAX_UPLOAD_BYTES` (5 МБ) в `s3Client.ts`.
- **Сироты в S3:** удалённые/незаписанные фото остаются в бакете — by design (решение владельца), очистка вне охвата.
- **Reorder через HTML5 drag&drop** не покрыт автотестом (jsdom не эмулирует dnd); проверяется вручную. Логика `onReorder` чистая и тестируема отдельно при желании.
