<template>
  <div class="product-form-page">
    <div class="product-form-page__topbar">
      <RouterLink
        to="/admin/listings"
        class="product-form-page__back"
      >
        ← Listings
      </RouterLink>
      <h1 class="product-form-page__title">
        {{ isEdit ? 'Edit product' : 'New product' }}
      </h1>
    </div>

    <div
      v-if="loadError"
      class="product-form-page__error"
    >
      {{ loadError }}
    </div>

    <form
      v-else
      class="product-form-page__form"
      @submit.prevent="handleSubmit"
    >
      <div class="product-form-page__row">
        <label class="product-form-page__label">
          Name
          <input
            v-model="form.name"
            class="product-form-page__input"
            required
            @input="autoSlug"
          />
        </label>
        <label class="product-form-page__label">
          Slug
          <input
            v-model="form.slug"
            class="product-form-page__input"
            required
          />
        </label>
      </div>

      <div class="product-form-page__row">
        <label class="product-form-page__label">
          Category
          <select
            v-model="form.categoryId"
            class="product-form-page__input"
            required
          >
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </label>
        <label class="product-form-page__label">
          Price ($)
          <input
            v-model.number="form.price"
            type="number"
            step="0.01"
            min="0"
            class="product-form-page__input"
            required
          />
        </label>
        <label class="product-form-page__label">
          Stock
          <input
            v-model.number="form.stock"
            type="number"
            min="0"
            class="product-form-page__input"
            required
          />
        </label>
      </div>

      <label class="product-form-page__label">
        Description
        <RichTextEditor v-model="form.description" />
      </label>

      <div class="product-form-page__section-title">
        Message options
      </div>
      <div class="product-form-page__tags">
        <span
          v-for="(opt, i) in form.messageOptions"
          :key="i"
          class="product-form-page__tag"
        >
          {{ opt }}
          <button
            type="button"
            @click="removeMessageOption(i)"
          >
            ✕
          </button>
        </span>
        <div
          v-if="form.messageOptions.length < 10"
          class="product-form-page__tag-add"
        >
          <input
            v-model="newMessageOption"
            class="product-form-page__tag-input"
            placeholder="Add option…"
            @keydown.enter.prevent="addMessageOption"
          />
          <button
            type="button"
            class="product-form-page__tag-btn"
            @click="addMessageOption"
          >
            +
          </button>
        </div>
      </div>

      <div class="product-form-page__label">
        Images
        <AdminImageUploader
          v-model="form.images"
          v-model:uploading="isUploading"
        />
      </div>

      <label class="product-form-page__checkbox-label">
        <input
          v-model="form.isPublished"
          type="checkbox"
        />
        Published
      </label>

      <div
        v-if="submitError"
        class="product-form-page__submit-error"
      >
        {{ submitError }}
      </div>

      <div class="product-form-page__footer">
        <RouterLink
          to="/admin/listings"
          class="product-form-page__cancel"
        >
          Cancel
        </RouterLink>
        <button
          type="submit"
          class="product-form-page__save"
          :disabled="isSaving || isUploading"
        >
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { authFetch, apiErrorMessage, RichTextEditor } from '@/shared'
import { useAdminCategories, AdminImageUploader, type AdminProductInput } from '@/widgets/admin-panel'

const router = useRouter()
const route = useRoute()
const { categories, load: loadCategories } = useAdminCategories()

const isEdit = computed(() => !!route.params.id)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const isSaving = ref(false)
const isUploading = ref(false)
const newMessageOption = ref('')

const form = ref<AdminProductInput>({
  name: '',
  slug: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '',
  images: [],
  messageOptions: [],
  isPublished: false,
})

function autoSlug() {
  if (isEdit.value) return
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 7)
    .join('-')
}

function addMessageOption() {
  const val = newMessageOption.value.trim()
  if (val) {
    form.value.messageOptions.push(val)
    newMessageOption.value = ''
  }
}

function removeMessageOption(index: number) {
  form.value.messageOptions.splice(index, 1)
}

async function loadProduct() {
  const id = route.params.id as string
  const res = await authFetch(`/admin/products/${id}`)
  if (!res.ok) {
    loadError.value = await apiErrorMessage(res, 'Failed to load product')
    return
  }
  const data = await res.json() as AdminProductInput & { id: string }
  form.value = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    stock: data.stock,
    categoryId: data.categoryId,
    images: data.images,
    messageOptions: data.messageOptions,
    isPublished: data.isPublished,
  }
}

async function handleSubmit() {
  isSaving.value = true
  submitError.value = null
  try {
    const url = isEdit.value ? `/admin/products/${route.params.id}` : '/admin/products'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res = await authFetch(url, {
      method,
      json: form.value,
    })
    if (!res.ok) {
      submitError.value = await apiErrorMessage(res, 'Failed to save product')
      return
    }
    router.push('/admin/listings')
  } catch {
    submitError.value = 'Failed to save product'
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  if (isEdit.value) await loadProduct()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-form-page {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__topbar {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-white);
    display: flex;
    align-items: center;
    gap: 16px;

    @include tablet {
      padding: 14px 32px;
    }
  }

  &__back {
    font-size: 0.75rem;
    color: var(--color-accent);
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }

  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__error {
    padding: 40px;
    text-align: center;
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__form {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 960px;

    @include tablet {
      padding: 28px 32px;
    }
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @include tablet {
      flex-direction: row;
      gap: 16px;
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__input,
  &__textarea {
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 10px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }
  }

  &__textarea {
    resize: vertical;
  }

  &__section-title {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  &__tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 5px 14px;
    color: var(--color-text);

    button {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      background: none;
      border: none;
    }
  }

  &__tag-add {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__tag-input {
    font-size: 0.8rem;
    border: 1px dashed var(--color-border);
    border-radius: 12px;
    padding: 2px 10px;
    background: none;
    color: var(--color-text);
    font-family: var(--font-display);
    width: 120px;
  }

  &__tag-btn {
    font-size: 0.85rem;
    font-weight: 700;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-white);
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  &__submit-error {
    font-size: 0.8rem;
    color: var(--color-error);
  }

  &__footer {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-top: 8px;
  }

  &__cancel {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__save {
    font-size: 0.85rem;
    background: var(--color-accent);
    color: var(--color-white);
    border: none;
    border-radius: 6px;
    padding: 8px 24px;
    font-weight: 600;
    font-family: var(--font-display);

    &:disabled {
      opacity: 0.6;
    }
  }
}
</style>
